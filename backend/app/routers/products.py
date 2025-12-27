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
    Look up a product by its UPC/EAN barcode with Waterfall Retrieval.
    1. Check local DB cache.
    2. (Stub) Trigger parallelized external API fetch if null.
    """
    product = db.query(Product).filter(Product.barcode == barcode).first()
    
    if not product:
        # In a real app, this would trigger background tasks to Google Shopping/Amazon API
        # For now, we simulate a "Found externally" scenario for specific test barcodes
        if barcode == "00000000":
             mock_product = Product(
                 name="Simulated Product",
                 brand="External Brand",
                 barcode="00000000",
                 category="Moisturizer",
                 confidence_tier="scraped",
                 is_verified=False,
                 ingredients_text="Water, Glycerin, Simulated Acid"
             )
             db.add(mock_product)
             db.commit()
             db.refresh(mock_product)
             return mock_product

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with barcode {barcode} not found in cache or external sources"
        )
    
    return product
    
@router.get("/search")
def search_products(q: str, db: Session = Depends(get_db)):
    """
    Enhanced search with simple entity resolution (fuzzy-ish matching).
    """
    # Simple normalization for search
    query = q.strip().lower()
    
    # Exact match check first
    exact = db.query(Product).filter(Product.name.ilike(query)).all()
    if exact:
        return exact

    # ILIKE search (Levenshtein would be better in PG, but this is cross-platform friendly)
    products = db.query(Product).filter(
        (Product.name.ilike(f"%{query}%")) | (Product.brand.ilike(f"%{query}%"))
    ).limit(10).all()
    
    return products
