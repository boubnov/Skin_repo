from fastapi.testclient import TestClient
from app.database import get_db, Base, engine
from app.models import Product
import pytest
from sqlalchemy.orm import Session

# Fixture to mock DB with a known product
@pytest.fixture(scope="module")
def sample_product():
    # Setup: Create table and add product
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        # Check if exists first to avoid duplicates in persistent test.db
        existing = db.query(Product).filter(Product.barcode == "3606000537439").first()
        if not existing:
            product = Product(
                name="CeraVe Moisturizing Cream",
                brand="CeraVe",
                category="Moisturizer",
                barcode="3606000537439",
                confidence_tier="verified",
                description="Test description",
                ingredients_text="Water, Glycerin...",
                price_tier="budget",
                store_links={"amazon": "http://example.com"}
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            yield product
            
            # Teardown (optional, using persistent test.db usually implies separate cleanup or recreations)
            # db.delete(product)
            # db.commit()
        else:
            yield existing

def test_get_product_by_barcode(client, sample_product):
    """
    Test that the barcode endpoint returns the correct product.
    """
    barcode = "3606000537439"
    response = client.get(f"/products/barcode/{barcode}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CeraVe Moisturizing Cream"
    assert data["brand"] == "CeraVe"
    assert data["barcode"] == barcode

def test_get_product_by_barcode_not_found(client):
    """
    Test that a non-existent barcode returns 404.
    """
    barcode = "0000000000000"
    response = client.get(f"/products/barcode/{barcode}")
    
    assert response.status_code == 404
    assert response.json()["detail"] == f"Product with barcode {barcode} not found"
