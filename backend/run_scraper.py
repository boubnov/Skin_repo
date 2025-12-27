from scrapers.multi_store_scraper import MultiStoreScraper
from app.database import SessionLocal, engine
from app.models import Product, Base
from ingest import get_mock_embedding

def run_and_save():
    # Force fresh table creation (Drop old schema if exists)
    print("🗑️  Cleaning old schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    scraper = MultiStoreScraper()
    print("🕷️  Starting Multi-Store Scraper...")
    products = scraper.scrape_products()
    
    print(f"📦 Found {len(products)} new products.")
    
    db = SessionLocal()
    try:
        added_count = 0
        for p_data in products:
            # Check for duplicate by name
            exists = db.query(Product).filter(Product.name == p_data["name"]).first()
            if exists:
                print(f"   Skipping duplicate: {p_data['name']}")
                continue
                
            # Create Embedding
            embedding = get_mock_embedding(p_data["description"])
            
            # Serialize for SQLite if needed (simple check)
            embedding_val = embedding.tolist()
            if 'sqlite' in str(engine.url):
               import json
               embedding_val = json.dumps(embedding_val)

            p = Product(
                name=p_data["name"],
                brand=p_data["brand"],
                category=p_data["category"],
                price_tier=p_data["price_tier"],
                confidence_tier=p_data["confidence_tier"],
                description=p_data["description"],
                ingredients_text=p_data["ingredients"],
                store_links=p_data["store_links"],
                metadata_info=p_data["metadata"],
                embedding=embedding_val
            )
            db.add(p)
            added_count += 1
            print(f"   + Added: {p.name} [{p.brand}]")
            
        db.commit()
        print(f"✅ Successfully ingested {added_count} new products from 'The Wild'.")
        
        # Show Total Count
        total_count = db.query(Product).count()
        print(f"\n📊 Total Unique Products in Database: {total_count}")
        
    except Exception as e:
        print(f"❌ Error saving to DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_and_save()
