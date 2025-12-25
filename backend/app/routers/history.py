from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from .. import database, models, auth
from ..dependencies import get_current_user

router = APIRouter(prefix="/history", tags=["history"])

class ProductLogBase(BaseModel):
    product_name: str
    brand: Optional[str] = None
    status: str  # "safe", "unsafe", "wishlist"
    notes: Optional[str] = None
    rating: Optional[int] = None

class ProductLogCreate(ProductLogBase):
    pass

class ProductLogResponse(ProductLogBase):
    id: int
    user_id: int
    
    class Config:
        orm_mode = True

@router.get("/", response_model=List[ProductLogResponse])
def get_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Backward compatibility: Map UserProduct to ProductLogResponse
    # Since we renamed the model, 'current_user.product_logs' doesn't exist.
    # We use 'current_user.products'.
    return current_user.products

@router.post("/", response_model=ProductLogResponse)
def add_log(
    log: ProductLogCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Map old Create schema to new Model
    db_log = models.UserProduct(
        product_name=log.product_name,
        brand=log.brand,
        status=log.status,
        notes=log.notes,
        rating=log.rating,
        user_id=current_user.id
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
