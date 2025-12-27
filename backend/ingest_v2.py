"""
Production-Grade Data Ingestion Pipeline v2

Features:
- Checkpoint-based resumption
- MD5 file hash validation
- Exponential backoff for API calls
- FK-linked reviews (product_id instead of product_name)
- Dry-run mode for testing
- Aggregated review embeddings (optional)
"""

import os
import sys
import argparse
import pandas as pd
import json
import time
from typing import Dict, Optional
from tqdm import tqdm
from sqlalchemy import create_engine, text, Column, Integer, String, Text, JSON, DateTime, Float, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion_utils import (
    CheckpointHandler,
    exponential_backoff,
    build_product_lookup,
    validate_prerequisites,
    logger
)

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/skincare_app")
IS_POSTGRES = "postgresql" in DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# Define models locally to match actual DB schema (created by ingest_kaggle.py)
if IS_POSTGRES:
    from pgvector.sqlalchemy import Vector
    from sqlalchemy.dialects.postgresql import TSVECTOR
    EmbeddingType = Vector(3072)
    SearchVectorType = TSVECTOR
else:
    EmbeddingType = Text
    SearchVectorType = Text


class Product(Base):
    """Product model matching actual Postgres schema."""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, index=True)
    description = Column(Text)
    ingredients_text = Column(Text)
    category = Column(String)
    active_ingredients = Column(JSON)
    skin_type_compatibility = Column(JSON)
    metadata_info = Column(JSON)
    source = Column(String)
    embedding = Column(EmbeddingType)
    barcode = Column(String, index=True, unique=True, nullable=True)
    confidence_tier = Column(String, default="scraped")
    image_url = Column(String, nullable=True)
    price_tier = Column(String, index=True)
    store_links = Column(JSON)
    source_id = Column(String, nullable=True)
    search_vector = Column(SearchVectorType)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())


class Review(Base):
    """Review model matching actual Postgres schema."""
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, index=True)  # Current schema uses name, not FK
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # Optional FK for new data
    brand = Column(String)
    author = Column(String)
    text = Column(Text)
    rating = Column(Float)
    skin_type = Column(String)
    is_verified = Column(Integer)
    source = Column(String)

# Embedding Configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai_text_embedding_3_large")
EMBEDDING_BATCH_SIZE = 50  # Batch embeddings for efficiency

# Kaggle Data Paths
KAGGLE_DIR = os.getenv("KAGGLE_DIR", "/Users/mbvk/Documents/skin_app/data/Kaggle")
PRODUCTS_8K_CSV = os.path.join(KAGGLE_DIR, "products/product_info.csv")
NATASHA_CSV = os.path.join(KAGGLE_DIR, "natahsamessier/clean_data/combined_product_review_data.csv")


class EmbeddingClient:
    """Wrapper for embedding API calls with exponential backoff."""
    
    def __init__(self):
        self.client = None
        self._init_client()
    
    def _init_client(self):
        try:
            from openai import OpenAI
            api_key = os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
            
            if api_key:
                self.client = OpenAI(api_key=api_key, base_url=base_url)
                logger.info(f"✅ Embedding client initialized (model: {EMBEDDING_MODEL})")
            else:
                logger.warning("⚠️ OPENAI_API_KEY not set. Embeddings will be skipped.")
        except ImportError:
            logger.warning("⚠️ OpenAI library not installed. Embeddings will be skipped.")
    
    @exponential_backoff(max_retries=5, base_delay=1.0, exceptions=(Exception,))
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch of texts."""
        if not self.client or not texts:
            return [None] * len(texts)
        
        response = self.client.embeddings.create(
            input=texts,
            model=EMBEDDING_MODEL
        )
        return [item.embedding for item in response.data]
    
    def embed_single(self, text: str) -> Optional[list[float]]:
        """Generate embedding for a single text."""
        if not text:
            return None
        results = self.embed([text])
        return results[0] if results else None


def ingest_products(
    session,
    checkpoint: CheckpointHandler,
    embedding_client: EmbeddingClient,
    dry_run: bool = False
) -> int:
    """
    Ingest products from CSV files.
    
    Returns:
        Number of products ingested
    """
    count = 0
    
    # Process 8K Products Dataset
    if os.path.exists(PRODUCTS_8K_CSV):
        should_process, start_row = checkpoint.should_process_file(PRODUCTS_8K_CSV)
        
        if should_process:
            logger.info(f"📦 Processing 8K Products: {PRODUCTS_8K_CSV} (starting at row {start_row})")
            
            df = pd.read_csv(PRODUCTS_8K_CSV)
            
            for idx, row in tqdm(df.iterrows(), total=len(df), desc="📦 Products", initial=start_row):
                if idx < start_row:
                    continue
                
                name = str(row.get('product_name', '')).strip()
                if not name or name == 'nan':
                    continue
                
                # Check for duplicates
                exists = session.query(Product).filter_by(name=name).first()
                if exists:
                    checkpoint.increment_count("skipped")
                    continue
                
                # Build product data
                desc = str(row.get('description', ''))
                ingredients = str(row.get('ingredients', ''))
                concept_text = f"{name} {row.get('brand_name', '')} {ingredients} {desc}"
                
                # Generate embedding
                embedding = embedding_client.embed_single(concept_text) if not dry_run else None
                
                meta = {
                    "price": row.get('price_usd', None),
                    "rating": row.get('loves_count', 0),
                    "limited_edition": row.get('limited_edition', 0),
                    "online_only": row.get('online_only', 0),
                }
                
                product = Product(
                    name=name,
                    brand=str(row.get('brand_name', 'Unknown')),
                    description=desc,
                    ingredients_text=ingredients,
                    category=str(row.get('primary_category', 'Uncategorized')),
                    metadata_info=meta,
                    embedding=embedding,
                    source="kaggle_8k"
                )
                
                if not dry_run:
                    session.add(product)
                    
                    # Commit every 50 products
                    if (idx + 1) % 50 == 0:
                        session.commit()
                        checkpoint.update_progress(os.path.basename(PRODUCTS_8K_CSV), idx)
                
                count += 1
                checkpoint.increment_count("products_ingested")
            
            if not dry_run:
                session.commit()
            checkpoint.mark_file_complete(os.path.basename(PRODUCTS_8K_CSV))
    
    return count


def ingest_reviews(
    session,
    checkpoint: CheckpointHandler,
    product_lookup: Dict[str, int],
    dry_run: bool = False
) -> int:
    """
    Ingest reviews with FK linking to products.
    
    Returns:
        Number of reviews ingested
    """
    reviews_dir = os.path.join(KAGGLE_DIR, "reviews")
    if not os.path.exists(reviews_dir):
        logger.warning(f"⚠️ Reviews directory not found: {reviews_dir}")
        return 0
    
    review_files = sorted([f for f in os.listdir(reviews_dir) if f.endswith(".csv")])
    logger.info(f"🗣️ Found {len(review_files)} review files")
    
    total_count = 0
    orphan_count = 0
    
    for r_file in review_files:
        path = os.path.join(reviews_dir, r_file)
        should_process, start_row = checkpoint.should_process_file(path)
        
        if not should_process:
            continue
        
        logger.info(f"   📄 Processing {r_file} (starting at row {start_row})")
        
        try:
            df = pd.read_csv(path, low_memory=False)
        except Exception as e:
            checkpoint.log_error(f"Failed to read {r_file}", {"error": str(e)})
            continue
        
        batch = []
        batch_start_row = start_row
        
        for idx, row in tqdm(df.iterrows(), total=len(df), desc=f"🗣️ {r_file}", initial=start_row):
            if idx < start_row:
                continue
            
            text_content = str(row.get('review_text', ''))
            if len(text_content) < 5:
                continue
            
            # Look up product_id by name
            product_name = str(row.get('product_name', '')).strip().lower()
            product_id = product_lookup.get(product_name)
            
            if not product_id:
                orphan_count += 1
                checkpoint.increment_count("skipped")
                # Log first 10 orphans for debugging
                if orphan_count <= 10:
                    logger.warning(f"   ⚠️ Orphan review: product '{product_name}' not found")
                continue
            
            review = Review(
                product_id=product_id,
                product_name=product_name,  # Keep for backwards compatibility
                author=str(row.get('author_id', 'anon')),
                text=text_content,
                rating=float(row.get('rating', 0) or 0),
                skin_type=str(row.get('skin_type', '')),
                source="kaggle_reviews"
            )
            batch.append(review)
            
            # Commit in batches of 1000
            if len(batch) >= 1000:
                if not dry_run:
                    session.add_all(batch)
                    session.commit()
                    # Checkpoint AFTER successful commit
                    checkpoint.update_progress(r_file, idx, batch_count=len(batch))
                
                total_count += len(batch)
                batch = []
                batch_start_row = idx + 1
        
        # Commit remaining batch
        if batch:
            if not dry_run:
                session.add_all(batch)
                session.commit()
                checkpoint.update_progress(r_file, idx, batch_count=len(batch))
            total_count += len(batch)
        
        checkpoint.mark_file_complete(r_file)
    
    if orphan_count > 0:
        logger.warning(f"⚠️ Total orphan reviews (product not found): {orphan_count}")
    
    return total_count


def main():
    parser = argparse.ArgumentParser(description="Production-grade data ingestion pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Process data without committing to DB")
    parser.add_argument("--products-only", action="store_true", help="Only ingest products")
    parser.add_argument("--reviews-only", action="store_true", help="Only ingest reviews")
    parser.add_argument("--reset", action="store_true", help="Reset checkpoint and start fresh")
    args = parser.parse_args()
    
    # Initialize checkpoint
    checkpoint_path = os.path.join(os.path.dirname(__file__), "ingestion_state.json")
    if args.reset and os.path.exists(checkpoint_path):
        os.remove(checkpoint_path)
        logger.info("🔄 Checkpoint reset")
    
    checkpoint = CheckpointHandler(checkpoint_path)
    
    # Initialize session
    session = SessionLocal()
    
    # Enable vector extension if Postgres
    if IS_POSTGRES:
        try:
            session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            session.commit()
        except Exception as e:
            logger.warning(f"⚠️ Could not enable vector extension: {e}")
            session.rollback()
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize embedding client
    embedding_client = EmbeddingClient()
    
    try:
        # Phase 1: Products
        if not args.reviews_only:
            logger.info("=" * 50)
            logger.info("PHASE 1: PRODUCT INGESTION")
            logger.info("=" * 50)
            
            product_count = ingest_products(session, checkpoint, embedding_client, dry_run=args.dry_run)
            logger.info(f"✅ Products ingested: {product_count}")
        
        # Phase 2: Reviews
        if not args.products_only:
            logger.info("=" * 50)
            logger.info("PHASE 2: REVIEW INGESTION")
            logger.info("=" * 50)
            
            # Validate prerequisites
            if not validate_prerequisites(session, Product, min_products=100):
                logger.error("❌ Aborting review ingestion due to failed prerequisites")
                return
            
            # Build product lookup
            product_lookup = build_product_lookup(session, Product)
            
            review_count = ingest_reviews(session, checkpoint, product_lookup, dry_run=args.dry_run)
            logger.info(f"✅ Reviews ingested: {review_count}")
        
        # Summary
        logger.info("=" * 50)
        logger.info(checkpoint.get_summary())
        
        if args.dry_run:
            logger.info("🏃 DRY RUN MODE - No data was committed to database")
    
    except KeyboardInterrupt:
        logger.info("⚠️ Interrupted by user. Progress saved to checkpoint.")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        checkpoint.log_error("Fatal error", {"error": str(e)})
        raise
    finally:
        session.close()
        checkpoint.save()


if __name__ == "__main__":
    main()
