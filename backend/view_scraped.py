from app.database import SessionLocal
from app.models import Product
import os

def list_scraped():
    db = SessionLocal()
    print(f"🔌 Connected to: {os.getenv('DATABASE_URL', 'default-sqlite')}")
    try:
        products = db.query(Product).filter(Product.confidence_tier == "scraped").all()
        
        if not products:
            print("❌ No scraped products found in this database.")
        else:
            print(f"✅ Found {len(products)} Scraped Products:\n")
            for p in products:
                print(f"🧴 {p.name}")
                print(f"   Brand: {p.brand}")
                print(f"   Price: {p.price_tier}")
                print(f"   Links: {p.store_links}")
                print("-" * 40)
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_scraped()
