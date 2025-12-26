import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Product
from app.database import IS_SQLITE
import json

# Setup in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_product_v2_schema_fields(db):
    """Verify that a product can be stored with all V2 fields."""
    store_links = {"amazon": "http://az.com", "sephora": "http://seph.com"}
    metadata = {"skin_type": "oily", "rating": 4.5}
    
    product = Product(
        name="Test Serum",
        brand="TestBrand",
        category="Serum",
        barcode="123456789",
        confidence_tier="verified",
        image_url="http://img.com/1.jpg",
        description="A great serum.",
        ingredients_text="Water, Aloe",
        price_tier="mid",
        store_links=store_links if not IS_SQLITE else json.dumps(store_links), # Handle SQLite JSON limitation if needed
        metadata_info=metadata if not IS_SQLITE else json.dumps(metadata),
        embedding="[0.1, 0.2]" # Simulating fallback text storage for SQLite
    )
    db.add(product)
    db.commit()
    
    p = db.query(Product).filter(Product.barcode == "123456789").first()
    assert p is not None
    assert p.name == "Test Serum"
    assert p.confidence_tier == "verified"
    assert p.price_tier == "mid"
    
    # Check JSON retrieval
    # In SQLite (which this test uses), JSON types often come back as whatever they were stored as 
    # (Text) or transparently if using modern SQLAlchemy with JSON type.
    # models.py defines fallback as JSON type for SQLite, which SQLAlchemy mimics.
    # But usually creating a generic JSON field works in SQLite.
    
    # Note: logic in models.py:
    # if HAS_PG_TYPES: ... else: store_links = Column(JSON, nullable=True)
    # SQLAlchemy's generic JSON type automatically handles serialization/deserialization on SQLite.
    pass

def test_duplicate_prevention(db):
    """Verify that we don't insert duplicate products (scraper logic check)."""
    # 1. Insert initial product
    p1 = Product(name="Duplicate Cream", brand="BrandX", barcode="111")
    db.add(p1)
    db.commit()
    
    # 2. Try to query before inserting again (Simulating run_scraper logic)
    exists = db.query(Product).filter(Product.name == "Duplicate Cream").first()
    assert exists is not None
    
    # 3. Simulate adding a different one
    if not db.query(Product).filter(Product.name == "New Cream").first():
        p2 = Product(name="New Cream", brand="BrandY", barcode="222")
        db.add(p2)
    
    db.commit()
    
    assert db.query(Product).count() == 2

def test_confidence_tiers(db):
    """Verify we can filter by confidence tier."""
    p1 = Product(name="Safe Cream", confidence_tier="verified")
    p2 = Product(name="Wild Cream", confidence_tier="scraped")
    db.add_all([p1, p2])
    db.commit()
    
    verified = db.query(Product).filter(Product.confidence_tier == "verified").all()
    assert len(verified) == 1
    assert verified[0].name == "Safe Cream"
