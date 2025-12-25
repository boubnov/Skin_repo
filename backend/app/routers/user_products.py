from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from .. import database, models, schemas
from ..dependencies import get_current_user

router = APIRouter(prefix="/products", tags=["user_products"])

@router.get("/", response_model=List[schemas.UserProductResponse])
def get_products(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get all products in user's inventory (Shelf)."""
    return current_user.products

@router.post("/", response_model=schemas.UserProductResponse)
def add_product(
    product: schemas.UserProductCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Add a product to the shelf."""
    db_product = models.UserProduct(
        **product.model_dump(),
        user_id=current_user.id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/{product_id}", response_model=schemas.UserProductResponse)
def update_product(
    product_id: int,
    product_update: schemas.UserProductCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update product details (status, notes, etc)."""
    db_product = db.query(models.UserProduct).filter(
        models.UserProduct.id == product_id,
        models.UserProduct.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    for key, value in product_update.model_dump(exclude_unset=True).items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Remove product from shelf."""
    db_product = db.query(models.UserProduct).filter(
        models.UserProduct.id == product_id,
        models.UserProduct.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(db_product)
    db.commit()
    return {"status": "success"}
