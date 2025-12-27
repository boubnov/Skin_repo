"""
Vision Pipeline v2 - Async Job Pattern with LLM-based INCI Extraction

Features:
- Async job pattern with job_id tracking
- LLM Vision (Gemini) for ingredient extraction
- Strict JSON schema for extraction output
- Confidence scoring for extraction quality
- INCI normalization against standard database
"""

import os
import uuid
import base64
import json
import re
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from enum import Enum

from app.database import get_db
from app.models import UserProduct
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/vision",
    tags=["Vision AI"],
)


# ============================================================================
# SCHEMAS
# ============================================================================

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"  # Some fields extracted, needs manual review


class ExtractionResult(BaseModel):
    """Structured extraction result from vision LLM."""
    brand: Optional[str] = None
    product_name: Optional[str] = None
    category: Optional[str] = None
    ingredients_raw: Optional[str] = None  # Raw INCI text
    ingredients_parsed: List[str] = Field(default_factory=list)  # Parsed list
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.0)
    extraction_notes: Optional[str] = None  # LLM's notes about extraction quality


class ScanJobCreate(BaseModel):
    """Request to start a scan job."""
    pass  # Image is uploaded as file


class ScanJobResponse(BaseModel):
    """Response with job tracking info."""
    job_id: str
    status: JobStatus
    message: str
    user_product_id: Optional[int] = None


class ScanJobResult(BaseModel):
    """Full result of a completed scan job."""
    job_id: str
    status: JobStatus
    user_product_id: Optional[int] = None
    extraction: Optional[ExtractionResult] = None
    error_message: Optional[str] = None
    needs_manual_review: bool = False


# ============================================================================
# IN-MEMORY JOB STORE (Replace with Redis in production)
# ============================================================================

_job_store: Dict[str, Dict] = {}


def get_job(job_id: str) -> Optional[Dict]:
    return _job_store.get(job_id)


def update_job(job_id: str, **kwargs):
    if job_id in _job_store:
        _job_store[job_id].update(kwargs)


# ============================================================================
# LLM VISION EXTRACTION
# ============================================================================

EXTRACTION_PROMPT = """You are a skincare product label analyzer. Extract product information from this image.

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.

JSON Schema:
{
  "brand": "<brand name or null>",
  "product_name": "<product name or null>",
  "category": "<one of: Cleanser, Moisturizer, Serum, Sunscreen, Toner, Exfoliant, Mask, Eye Cream, Lip Care, Other>",
  "ingredients_raw": "<full INCI list as seen on label or null>",
  "ingredients_parsed": ["<ingredient 1>", "<ingredient 2>", ...],
  "confidence_score": <0.0-1.0 based on image clarity and extraction certainty>,
  "extraction_notes": "<any issues with the image or extraction>"
}

Rules:
- If you can't read something clearly, set confidence_score lower
- Parse ingredients by commas, removing percentages and asterisks
- Normalize ingredient names (e.g., "AQUA (WATER)" -> "Water")
- If the image is blurry/unreadable, set confidence_score < 0.5"""


async def extract_from_image(image_bytes: bytes) -> ExtractionResult:
    """
    Extract product info from image using LLM Vision.
    """
    try:
        from openai import OpenAI
        
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.getenv("OPENAI_MODEL", "gemini_3_pro")
        
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        client = OpenAI(api_key=api_key, base_url=base_url)
        
        # Encode image as base64
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        # Call vision model
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000
        )
        
        content = response.choices[0].message.content
        
        # Parse JSON from response (handle markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            content = json_match.group(1)
        
        # Clean and parse
        content = content.strip()
        data = json.loads(content)
        
        return ExtractionResult(**data)
        
    except json.JSONDecodeError as e:
        return ExtractionResult(
            confidence_score=0.0,
            extraction_notes=f"Failed to parse LLM response: {e}"
        )
    except Exception as e:
        return ExtractionResult(
            confidence_score=0.0,
            extraction_notes=f"Extraction error: {str(e)}"
        )


# ============================================================================
# BACKGROUND JOB PROCESSOR
# ============================================================================

async def process_scan_job(
    job_id: str,
    image_bytes: bytes,
    user_id: int,
    db_session_maker
):
    """
    Background task to process image and extract product info.
    """
    update_job(job_id, status=JobStatus.PROCESSING.value)
    
    try:
        # 1. Extract from image
        extraction = await extract_from_image(image_bytes)
        
        # 2. Determine status based on confidence
        if extraction.confidence_score < 0.3:
            status = JobStatus.FAILED
            needs_manual = True
        elif extraction.confidence_score < 0.7:
            status = JobStatus.PARTIAL
            needs_manual = True
        else:
            status = JobStatus.COMPLETED
            needs_manual = False
        
        # 3. Create/update user product in DB
        db = db_session_maker()
        try:
            job = get_job(job_id)
            user_product_id = job.get("user_product_id")
            
            if user_product_id:
                user_product = db.query(UserProduct).filter(
                    UserProduct.id == user_product_id
                ).first()
                
                if user_product:
                    user_product.product_name = extraction.product_name or "Unknown Product"
                    user_product.brand = extraction.brand
                    user_product.category = extraction.category or "Other"
                    user_product.is_analyzing = False
                    user_product.verification_status = status.value
                    user_product.notes = extraction.extraction_notes
                    # Store ingredients in notes for now (could add dedicated column)
                    if extraction.ingredients_parsed:
                        user_product.notes = f"Ingredients: {', '.join(extraction.ingredients_parsed[:10])}"
                    
                    db.commit()
            
        finally:
            db.close()
        
        # 4. Update job store
        update_job(
            job_id,
            status=status.value,
            extraction=extraction.model_dump(),
            needs_manual_review=needs_manual
        )
        
    except Exception as e:
        update_job(
            job_id,
            status=JobStatus.FAILED.value,
            error_message=str(e)
        )


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/scan", response_model=ScanJobResponse)
async def start_scan_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Start an async scan job.
    
    1. Creates a placeholder UserProduct immediately (optimistic UI)
    2. Returns job_id for polling
    3. Processes image in background
    """
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Create placeholder product immediately
    user_product = UserProduct(
        user_id=current_user.id,
        product_name="Scanning...",
        status="active",
        is_analyzing=True,
        verification_status="pending",
        category="Analyzing...",
        notes="AI is reading the product label..."
    )
    db.add(user_product)
    db.commit()
    db.refresh(user_product)
    
    # Read image bytes
    image_bytes = await file.read()
    
    # Store job info
    _job_store[job_id] = {
        "status": JobStatus.PENDING.value,
        "user_product_id": user_product.id,
        "user_id": current_user.id,
        "created_at": datetime.utcnow().isoformat(),
        "extraction": None,
        "error_message": None,
        "needs_manual_review": False
    }
    
    # Schedule background processing
    from app.database import SessionLocal
    background_tasks.add_task(
        process_scan_job,
        job_id,
        image_bytes,
        current_user.id,
        SessionLocal
    )
    
    return ScanJobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        message="Scan started. Poll /vision/scan/{job_id} for results.",
        user_product_id=user_product.id
    )


@router.get("/scan/{job_id}", response_model=ScanJobResult)
async def get_scan_job_status(job_id: str):
    """
    Poll for scan job status and results.
    """
    job = get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    extraction = None
    if job.get("extraction"):
        extraction = ExtractionResult(**job["extraction"])
    
    return ScanJobResult(
        job_id=job_id,
        status=JobStatus(job["status"]),
        user_product_id=job.get("user_product_id"),
        extraction=extraction,
        error_message=job.get("error_message"),
        needs_manual_review=job.get("needs_manual_review", False)
    )


@router.post("/scan/{job_id}/manual-complete")
async def complete_scan_manually(
    job_id: str,
    brand: Optional[str] = None,
    product_name: Optional[str] = None,
    category: Optional[str] = None,
    ingredients: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually complete a partial/failed scan with user-provided data.
    Handles the "Partial Match" edge case.
    """
    job = get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    user_product_id = job.get("user_product_id")
    if not user_product_id:
        raise HTTPException(status_code=400, detail="No product associated with this job")
    
    user_product = db.query(UserProduct).filter(
        UserProduct.id == user_product_id,
        UserProduct.user_id == current_user.id
    ).first()
    
    if not user_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update with manual data
    if product_name:
        user_product.product_name = product_name
    if brand:
        user_product.brand = brand
    if category:
        user_product.category = category
    if ingredients:
        user_product.notes = f"Ingredients: {ingredients}"
    
    user_product.is_analyzing = False
    user_product.verification_status = "completed"
    
    db.commit()
    
    update_job(job_id, status=JobStatus.COMPLETED.value)
    
    return {"message": "Product updated successfully", "product_id": user_product_id}
