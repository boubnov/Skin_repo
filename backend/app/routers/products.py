from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from typing import Optional

from app.schemas import ProductResponse

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Product not found"}},
)

@router.get("/barcode/{barcode}", response_model=ProductResponse)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """
    Look up a product by its UPC/EAN barcode.
    """
    product = db.query(Product).filter(Product.barcode == barcode).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with barcode {barcode} not found"
        )
    
    return product
    
@router.get("/search")
def search_products(q: str, db: Session = Depends(get_db)):
    """
    Simple name search for debugging/testing.
    """
    products = db.query(Product).filter(Product.name.ilike(f"%{q}%")).limit(10).all()
    return products
