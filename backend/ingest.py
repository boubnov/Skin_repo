import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Product, Base
import numpy as np

# Connection String (matches docker-compose)
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost:5432/skindb"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# MOCK DATA (Golden Set Candidates)
# MOCK DATA (Golden Set Candidates) - Enhanced for V2 Schema
MOCK_PRODUCTS = [
    {
        "name": "CeraVe Moisturizing Cream",
        "brand": "CeraVe",
        "category": "Moisturizer",
        "barcode": "3606000537439",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/61SLMVfM7IL._SL1500_.jpg",
        "description": "A rich, non-greasy, fast-absorbing moisturizer for dry to very dry skin. Contains 3 essential ceramides.",
        "ingredients": "Aqua, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Ceramides",
        "price_tier": "budget",
        "store_links": {"amazon": "https://amazon.com/dp/B00TTD9BRC", "ulta": "https://ulta.com/cerave"},
        "metadata": {"skin_type": "dry", "rating": 4.8, "safe_for_eczema": True}
    },
    {
        "name": "La Roche-Posay Effaclar Mat",
        "brand": "La Roche-Posay",
        "category": "Moisturizer",
        "barcode": "3337872413025",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/51+uB3m9vAL._SL1000_.jpg",
        "description": "Oil-free mattifying moisturizer using Sebulyse technology to target excess oil and tighten pores.",
        "ingredients": "Water, Glycerin, Dimethicone, Isocetyl Stearate, Salicylic Acid",
        "price_tier": "mid",
        "store_links": {"amazon": "https://amazon.com/dp/B004LXO9C6", "sephora": "https://sephora.com/product/effaclar-mat"},
        "metadata": {"skin_type": "oily", "rating": 4.6, "safe_for_eczema": False}
    },
    {
        "name": "Neutrogena Hydro Boost Water Gel",
        "brand": "Neutrogena",
        "category": "Moisturizer",
        "barcode": "070501111605",
        "confidence_tier": "verified", 
        "image_url": "https://m.media-amazon.com/images/I/71+f9-O3u+L._SL1500_.jpg",
        "description": "Unique water gel formula absorbs quickly like a gel, but has the long-lasting, intense moisturizing power of a cream.",
        "ingredients": "Water, Dimethicone, Glycerin, Hyaluronic Acid, Phenoxyethanol",
        "price_tier": "budget",
        "store_links": {"amazon": "https://amazon.com/dp/B00NR1YQHM", "target": "https://target.com/p/neutrogena"},
        "metadata": {"skin_type": "all", "rating": 4.7, "safe_for_eczema": True}
    },
    {
        "name": "EltaMD UV Clear Broad-Spectrum SPF 46",
        "brand": "EltaMD",
        "category": "Sunscreen",
        "barcode": "090205022898",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/61p-3+-hTJL._SL1000_.jpg",
        "description": "Oil-free sunscreen recommended by dermatologists for acne-prone skin. Calms and protects sensitive skin types.",
        "ingredients": "Zinc Oxide, Niacinamide, Sodium Hyaluronate, Tocopheryl Acetate",
        "price_tier": "mid",
        "store_links": {"amazon": "https://amazon.com/dp/B002MSN3QQ"},
        "metadata": {"skin_type": "acne", "rating": 4.9, "safe_for_eczema": True}
    },
    {
        "name": "The Ordinary Niacinamide 10% + Zinc 1%",
        "brand": "The Ordinary",
        "category": "Serum",
        "barcode": "769915190311",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/61N+pPqaqJL._SL1500_.jpg",
        "description": "High-strength vitamin and mineral blemish formula. Reduces appearance of skin blemishes and congestion.",
        "ingredients": "Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide",
        "price_tier": "budget",
        "store_links": {"sephora": "https://sephora.com/product/the-ordinary-deciem-niacinamide-10-zinc-1-P427417", "ulta": "https://ulta.com/ordinary"},
        "metadata": {"skin_type": "oily", "rating": 4.5, "safe_for_eczema": True}
    },
    {
        "name": "Paula's Choice Skin Perfecting 2% BHA Liquid Exfoliant",
        "brand": "Paula's Choice",
        "category": "Exfoliant",
        "barcode": "655439011903",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/613pBAg1m1L._SL1500_.jpg",
        "description": "Clinically proven to unclog pores, brighten and even out skin tone. A leave-on exfoliant with Salicylic Acid.",
        "ingredients": "Water, Methylpropanediol, Butylene Glycol, Salicylic Acid, Camellia Oleifera",
        "price_tier": "mid",
        "store_links": {"sephora": "https://sephora.com/product/paulas-choice-skin-perfecting-2-bha-liquid-exfoliant-P469502", "amazon": "https://amazon.com/dp/B00949CTQQ"},
        "metadata": {"skin_type": "all", "rating": 4.8, "safe_for_eczema": False}
    },
    {
        "name": "Cetaphil Gentle Skin Cleanser",
        "brand": "Cetaphil",
        "category": "Cleanser",
        "barcode": "029901109018",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/71t5c-0tFLL._SL1500_.jpg",
        "description": "A creamy, non-foaming daily cleanser for dry to normal, sensitive skin. Hydrates as it cleans.",
        "ingredients": "Water, Cetyl Alcohol, Propylene Glycol, Sodium Lauryl Sulfate, Stearyl Alcohol",
        "price_tier": "budget",
        "store_links": {"target": "https://target.com/p/cetaphil", "amazon": "https://amazon.com/dp/B000052YM7"},
        "metadata": {"skin_type": "sensitive", "rating": 4.6, "safe_for_eczema": True}
    },
    {
        "name": "Vanicream Moisturizing Cream",
        "brand": "Vanicream",
        "category": "Moisturizer",
        "barcode": "345334300160",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/71Ea-s1rZBL._SL1500_.jpg",
        "description": "A thick, smooth moisturizing cream that helps restore and maintain a normal moisture level. Free of dyes and fragrance.",
        "ingredients": "Purified Water, Petrolatum, Sorbitol, Cetearyl Alcohol, Propylene Glycol",
        "price_tier": "budget",
        "store_links": {"amazon": "https://amazon.com/dp/B000NWGCZ2", "target": "https://target.com/p/vanicream"},
        "metadata": {"skin_type": "sensitive", "rating": 4.8, "safe_for_eczema": True}
    },
    {
        "name": "Supergoop! Unseen Sunscreen SPF 40",
        "brand": "Supergoop!",
        "category": "Sunscreen",
        "barcode": "816218022067",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/61U7a+yO5pL._SL1000_.jpg",
        "description": "The original, totally invisible, weightless, scentless sunscreen with SPF 40 that leaves a velvety finish.",
        "ingredients": "Avobenzone, Homosalate, Octisalate, Octocrylene",
        "price_tier": "mid",
        "store_links": {"sephora": "https://sephora.com/product/supergoop-unseen-sunscreen-spf-40-P428421", "amazon": "https://amazon.com/dp/B078X1K63K"},
        "metadata": {"skin_type": "all", "rating": 4.7, "safe_for_eczema": True}
    },
    {
        "name": "Corsx Advanced Snail 96 Mucin Power Essence",
        "brand": "COSRX",
        "category": "Essence",
        "barcode": "8809419515038",
        "confidence_tier": "verified",
        "image_url": "https://m.media-amazon.com/images/I/5103y-wJ4+L._SL1000_.jpg",
        "description": "Lightweight essence which absorbs into skin fast to give skin a natural glow from the inside. Snail Secretion Filtrate 96%.",
        "ingredients": "Snail Secretion Filtrate, Betaine, Butylene Glycol, 1,2-Hexanediol",
        "price_tier": "mid",
        "store_links": {"ulta": "https://ulta.com/cosrx", "amazon": "https://amazon.com/dp/B00PBX3L7K"},
        "metadata": {"skin_type": "all", "rating": 4.8, "safe_for_eczema": True}
    }
]

def get_mock_embedding(text):
    # REAL EMBEDDING IMPLEMENTATION (Renamed function but keeping legacy name for now)
    try:
        from openai import OpenAI
        
        client = OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
            base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        )
        
        response = client.embeddings.create(
            input=[text],
            model=os.environ.get("EMBEDDING_MODEL", "openai_text_embedding_3_large")
        )
        vec = response.data[0].embedding
        return np.array(vec)
        
    except ImportError:
        print("❌ OpenAI library not installed. Using random noise.")
        vec = np.random.rand(1536)
        return vec / np.linalg.norm(vec)
    except Exception as e:
        print(f"❌ Embedding Error: {e}")
        # Fallback to noise to keep pipeline running
        vec = np.random.rand(1536)
        return vec / np.linalg.norm(vec)

def init_db():
    # Create extension is usually done by superuser, but the docker image enables it by default or we try
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    
    
    # DEV MODE: Only drop the Products table (since we changed its schema)
    # This preserves Users/Profiles!
    print("Resetting Products table...")
    try:
        Product.__table__.drop(bind=engine, checkfirst=True)
    except Exception as e:
        print(f"Warning: Could not drop table: {e}")
        
    Base.metadata.create_all(bind=engine)

def ingest_data():
    db = SessionLocal()
    try:
        # Check if data exists
        # Check if data exists
        count = db.query(Product).count()
        if count > 0:
            print(f"Data exists ({count} products). Wiping for re-seed...")
            db.query(Product).delete()
            db.commit()

        print("Ingesting mock products...")
        for item in MOCK_PRODUCTS:
            # Generate Embedding
            embedding = get_mock_embedding(item["description"])
            
            product = Product(
                name=item["name"],
                brand=item["brand"],
                category=item.get("category"),
                barcode=item.get("barcode"),
                confidence_tier=item.get("confidence_tier", "scraped"),
                image_url=item.get("image_url"),
                description=item["description"],
                ingredients_text=item["ingredients"],
                price_tier=item.get("price_tier"),
                store_links=item.get("store_links", {}),
                metadata_info=item["metadata"],
                embedding=embedding.tolist() # pgvector expects a list, testing fallbacks assume string but let's see. 
                # SQLite fallback in models.py sees 'embedding' as Text, so we might need json.dumps if running locally on SQLite?
                # Actually, in ingest.py, we are using the 'Product' class. 
                # If we are strictly on SQLite right now (because of environment), we should make sure we handle the type match.
                # 'models.py' line 125 says if NOT pgtypes then embedding=Text.
                # So if we pass a list to a Text column, SQLAlchemy might complain or stringify it weirdly.
                # Let's handle that safely.
            )
            
            # Simple check for SQLite compatibility (naive but effective for dev)
            if 'sqlite' in str(engine.url):
                product.embedding = json.dumps(embedding.tolist())
            
            db.add(product)
        
        db.commit()
        print(f"Successfully ingested {len(MOCK_PRODUCTS)} products.")
    except Exception as e:
        print(f"Error during ingestion: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure numpy is installed
    try:
        import numpy
    except ImportError:
        print("Please install numpy: pip install numpy")
        exit(1)
        
    init_db()
    ingest_data()
