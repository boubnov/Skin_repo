"""
Ingestion Utilities - Checkpoint Handler & Exponential Backoff

Production-grade utilities for resilient, resumable data ingestion.
"""

import os
import json
import hashlib
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from functools import wraps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ingestion.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Separate error log
error_handler = logging.FileHandler('ingestion_errors.log')
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(error_handler)


class CheckpointHandler:
    """
    Manages ingestion state for resumable data pipelines.
    
    Features:
    - Tracks progress per file and row
    - MD5 hash validation to detect file changes
    - Atomic writes to prevent corruption
    - Post-commit checkpointing
    """
    
    def __init__(self, checkpoint_path: str = "ingestion_state.json"):
        self.checkpoint_path = checkpoint_path
        self.state: Dict[str, Any] = self._load_state()
    
    def _load_state(self) -> Dict[str, Any]:
        """Load existing checkpoint or create new one."""
        if os.path.exists(self.checkpoint_path):
            try:
                with open(self.checkpoint_path, 'r') as f:
                    state = json.load(f)
                    logger.info(f"✅ Loaded checkpoint: {self.checkpoint_path}")
                    return state
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"⚠️ Corrupted checkpoint, starting fresh: {e}")
        
        return {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "last_updated": None,
            "stages": {},
            "file_hashes": {},
            "counts": {
                "products_ingested": 0,
                "reviews_ingested": 0,
                "errors": 0,
                "skipped": 0
            }
        }
    
    def save(self) -> None:
        """Atomically save checkpoint to disk."""
        self.state["last_updated"] = datetime.now().isoformat()
        
        # Write to temp file first, then rename (atomic on most filesystems)
        temp_path = f"{self.checkpoint_path}.tmp"
        with open(temp_path, 'w') as f:
            json.dump(self.state, f, indent=2)
        os.replace(temp_path, self.checkpoint_path)
    
    def get_file_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of a file for change detection."""
        hasher = hashlib.md5()
        with open(file_path, 'rb') as f:
            # Read in chunks for large files
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    
    def should_process_file(self, file_path: str) -> tuple[bool, int]:
        """
        Check if a file should be processed.
        
        Returns:
            (should_process: bool, start_row: int)
        """
        file_name = os.path.basename(file_path)
        current_hash = self.get_file_hash(file_path)
        
        if file_name not in self.state["file_hashes"]:
            # New file, process from start
            self.state["file_hashes"][file_name] = current_hash
            return True, 0
        
        stored_hash = self.state["file_hashes"][file_name]
        if stored_hash != current_hash:
            # File changed, log warning and reprocess
            logger.warning(f"⚠️ File {file_name} has changed (hash mismatch). Reprocessing from start.")
            self.state["file_hashes"][file_name] = current_hash
            # Reset progress for this file
            if file_name in self.state["stages"]:
                del self.state["stages"][file_name]
            return True, 0
        
        # Check if fully processed
        if file_name in self.state["stages"]:
            stage = self.state["stages"][file_name]
            if stage.get("completed", False):
                logger.info(f"⏭️ Skipping {file_name} (already completed)")
                return False, 0
            return True, stage.get("last_row", 0)
        
        return True, 0
    
    def update_progress(self, file_name: str, row_index: int, batch_count: int = 0) -> None:
        """Update progress for a file. Call AFTER successful DB commit."""
        if file_name not in self.state["stages"]:
            self.state["stages"][file_name] = {
                "started_at": datetime.now().isoformat(),
                "last_row": 0,
                "completed": False
            }
        
        self.state["stages"][file_name]["last_row"] = row_index
        self.state["stages"][file_name]["last_updated"] = datetime.now().isoformat()
        
        if batch_count > 0:
            self.state["counts"]["reviews_ingested"] += batch_count
        
        self.save()
    
    def mark_file_complete(self, file_name: str) -> None:
        """Mark a file as fully processed."""
        if file_name not in self.state["stages"]:
            self.state["stages"][file_name] = {}
        
        self.state["stages"][file_name]["completed"] = True
        self.state["stages"][file_name]["completed_at"] = datetime.now().isoformat()
        self.save()
        logger.info(f"✅ Completed: {file_name}")
    
    def increment_count(self, key: str, amount: int = 1) -> None:
        """Increment a counter (products_ingested, errors, skipped)."""
        if key in self.state["counts"]:
            self.state["counts"][key] += amount
    
    def log_error(self, message: str, context: Optional[Dict] = None) -> None:
        """Log an error with context."""
        self.increment_count("errors")
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "context": context or {}
        }
        logger.error(f"❌ {message} | Context: {context}")
    
    def get_summary(self) -> str:
        """Get a human-readable summary of current state."""
        counts = self.state["counts"]
        return (
            f"📊 Ingestion Summary:\n"
            f"   Products: {counts['products_ingested']}\n"
            f"   Reviews: {counts['reviews_ingested']}\n"
            f"   Errors: {counts['errors']}\n"
            f"   Skipped: {counts['skipped']}"
        )


def exponential_backoff(
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator for exponential backoff retry logic.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay cap in seconds
        exceptions: Tuple of exceptions to catch and retry
    
    Usage:
        @exponential_backoff(max_retries=5, exceptions=(RateLimitError,))
        def call_api():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    retries += 1
                    if retries > max_retries:
                        logger.error(f"❌ Max retries ({max_retries}) exceeded for {func.__name__}")
                        raise
                    
                    delay = min(base_delay * (2 ** (retries - 1)), max_delay)
                    # Add jitter to prevent thundering herd
                    jitter = delay * 0.1 * (hash(str(time.time())) % 10) / 10
                    sleep_time = delay + jitter
                    
                    logger.warning(
                        f"⚠️ {func.__name__} failed ({type(e).__name__}). "
                        f"Retry {retries}/{max_retries} in {sleep_time:.1f}s"
                    )
                    time.sleep(sleep_time)
        return wrapper
    return decorator


def build_product_lookup(session, Product) -> Dict[str, int]:
    """
    Build a product_name -> product_id lookup dictionary.
    
    For large datasets, this uses batched queries to reduce memory.
    """
    logger.info("🔍 Building product lookup dictionary...")
    lookup = {}
    
    # Query in batches to manage memory
    batch_size = 10000
    offset = 0
    
    while True:
        products = session.query(Product.id, Product.name).offset(offset).limit(batch_size).all()
        if not products:
            break
        
        for product_id, name in products:
            if name:
                # Normalize name for matching
                normalized = name.strip().lower()
                lookup[normalized] = product_id
        
        offset += batch_size
        logger.info(f"   Loaded {offset} products into lookup...")
    
    logger.info(f"✅ Product lookup ready: {len(lookup)} products")
    return lookup


def validate_prerequisites(session, Product, min_products: int = 1) -> bool:
    """
    Validate that prerequisites are met before starting ingestion.
    
    Args:
        session: Database session
        Product: Product model class
        min_products: Minimum required products in DB
    
    Returns:
        True if validation passes, False otherwise
    """
    product_count = session.query(Product).count()
    
    if product_count < min_products:
        logger.error(
            f"❌ FK Validation Failed: Only {product_count} products in DB. "
            f"Minimum required: {min_products}. Aborting to prevent orphan reviews."
        )
        return False
    
    logger.info(f"✅ Prerequisite check passed: {product_count} products in DB")
    return True
