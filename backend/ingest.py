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
MOCK_PRODUCTS = [
    {
        "name": "CeraVe Moisturizing Cream",
        "brand": "CeraVe",
        "description": "A rich, non-greasy, fast-absorbing moisturizer for dry to very dry skin. Contains 3 essential ceramides.",
        "ingredients": "Aqua, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Ceramides",
        "metadata": {"skin_type": "dry", "price": 19.99, "rating": 4.8, "safe_for_eczema": True}
    },
    {
        "name": "La Roche-Posay Effaclar Mat",
        "brand": "La Roche-Posay",
        "description": "Oil-free mattifying moisturizer using Sebulyse technology to target excess oil and tighten pores.",
        "ingredients": "Water, Glycerin, Dimethicone, Isocetyl Stearate, Salicylic Acid",
        "metadata": {"skin_type": "oily", "price": 32.00, "rating": 4.6, "safe_for_eczema": False}
    },
    {
        "name": "Neutrogena Hydro Boost Water Gel",
        "brand": "Neutrogena",
        "description": "Unique water gel formula absorbs quickly like a gel, but has the long-lasting, intense moisturizing power of a cream.",
        "ingredients": "Water, Dimethicone, Glycerin, Hyaluronic Acid, Phenoxyethanol",
        "metadata": {"skin_type": "all", "price": 24.99, "rating": 4.7, "safe_for_eczema": True}
    },
    {
        "name": "EltaMD UV Clear Broad-Spectrum SPF 46",
        "brand": "EltaMD",
        "description": "Oil-free sunscreen recommended by dermatologists for acne-prone skin. Calms and protects sensitive skin types.",
        "ingredients": "Zinc Oxide, Niacinamide, Sodium Hyaluronate, Tocopheryl Acetate",
        "metadata": {"skin_type": "acne", "price": 43.00, "rating": 4.9, "safe_for_eczema": True}
    },
    {
        "name": "The Ordinary Niacinamide 10% + Zinc 1%",
        "brand": "The Ordinary",
        "description": "High-strength vitamin and mineral blemish formula. Reduces appearance of skin blemishes and congestion.",
        "ingredients": "Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide",
        "metadata": {"skin_type": "oily", "price": 6.00, "rating": 4.5, "safe_for_eczema": True}
    },
    {
        "name": "Paula's Choice Skin Perfecting 2% BHA Liquid Exfoliant",
        "brand": "Paula's Choice",
        "description": "Clinically proven to unclog pores, brighten and even out skin tone. A leave-on exfoliant with Salicylic Acid.",
        "ingredients": "Water, Methylpropanediol, Butylene Glycol, Salicylic Acid, Camellia Oleifera",
        "metadata": {"skin_type": "all", "price": 34.00, "rating": 4.8, "safe_for_eczema": False}
    },
    {
        "name": "Cetaphil Gentle Skin Cleanser",
        "brand": "Cetaphil",
        "description": "A creamy, non-foaming daily cleanser for dry to normal, sensitive skin. Hydrates as it cleans.",
        "ingredients": "Water, Cetyl Alcohol, Propylene Glycol, Sodium Lauryl Sulfate, Stearyl Alcohol",
        "metadata": {"skin_type": "sensitive", "price": 14.49, "rating": 4.6, "safe_for_eczema": True}
    },
    {
        "name": "Vanicream Moisturizing Cream",
        "brand": "Vanicream",
        "description": "A thick, smooth moisturizing cream that helps restore and maintain a normal moisture level. Free of dyes and fragrance.",
        "ingredients": "Purified Water, Petrolatum, Sorbitol, Cetearyl Alcohol, Propylene Glycol",
        "metadata": {"skin_type": "sensitive", "price": 16.49, "rating": 4.8, "safe_for_eczema": True}
    },
    {
        "name": "Supergoop! Unseen Sunscreen SPF 40",
        "brand": "Supergoop!",
        "description": "The original, totally invisible, weightless, scentless sunscreen with SPF 40 that leaves a velvety finish.",
        "ingredients": "Avobenzone, Homosalate, Octisalate, Octocrylene",
        "metadata": {"skin_type": "all", "price": 38.00, "rating": 4.7, "safe_for_eczema": True}
    },
    {
        "name": "Corsx Advanced Snail 96 Mucin Power Essence",
        "brand": "COSRX",
        "description": "Lightweight essence which absorbs into skin fast to give skin a natural glow from the inside. Snail Secretion Filtrate 96%.",
        "ingredients": "Snail Secretion Filtrate, Betaine, Butylene Glycol, 1,2-Hexanediol",
        "metadata": {"skin_type": "all", "price": 25.00, "rating": 4.8, "safe_for_eczema": True}
    }
]

def get_mock_embedding(text):
    # In production, call OpenAI: 
    # client.embeddings.create(input=[text], model="text-embedding-3-small").data[0].embedding
    # Here we return a random normalized vector for testing flow
    vec = np.random.rand(1536)
    return vec / np.linalg.norm(vec)

def init_db():
    # Create extension is usually done by superuser, but the docker image enables it by default or we try
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
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
                description=item["description"],
                ingredients_text=item["ingredients"],
                metadata_info=item["metadata"],
                embedding=embedding.tolist() # pgvector expects a list
            )
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
