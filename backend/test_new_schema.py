from app.database import SessionLocal
from app.models import Product
import json

def test_schema():
    db = SessionLocal()
    try:
        # Get one product
        p = db.query(Product).first()
        print(f"✅ Product Found: {p.name}")
        print(f"   Barcode: {p.barcode}")
        print(f"   Confidence: {p.confidence_tier}")
        print(f"   Price Tier: {p.price_tier}")
        print(f"   Store Links: {p.store_links}")
        
        # Verify JSON
        if isinstance(p.store_links, str):
            links = json.loads(p.store_links)
            print(f"   (JSON parsed): {links.keys()}")
        elif isinstance(p.store_links, dict):
            print(f"   (Dict): {p.store_links.keys()}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_schema()
