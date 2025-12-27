import os
import pandas as pd
import json
import time
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, JSON, text, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker
from langchain_openai import OpenAIEmbeddings
from tqdm import tqdm

# 1. DATABASE CONFIGURATION
# ------------------------------------------------------------------------------
# Default to SQLite for local, but prefer Postgres if env var set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///skincare_app.db")
IS_POSTGRES = "postgresql" in DATABASE_URL

print(f"🔌 Connecting to database: {DATABASE_URL}")
try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    Base = declarative_base()
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    exit(1)

# Define pgvector Type only if using Postgres
if IS_POSTGRES:
    from pgvector.sqlalchemy import Vector
    from sqlalchemy.dialects.postgresql import TSVECTOR
    # 3072 dimensions for openai_text_embedding_3_large
    EmbeddingType = Vector(3072) 
    SearchVectorType = TSVECTOR
else:
    # Fallback for SQLite (store as JSON string)
    EmbeddingType = Text
    SearchVectorType = Text

# 2. DEFINING MODELS
# ------------------------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, index=True)
    description = Column(Text)
    ingredients_text = Column(Text)
    category = Column(String)
    active_ingredients = Column(JSON) # List of strings
    skin_type_compatibility = Column(JSON) # Dict {oily: 0.9}
    metadata_info = Column(JSON) # Flexible attributes (price, rating, volume)
    source = Column(String) # 'kaggle_natasha', 'kaggle_8k', etc.
    embedding = Column(EmbeddingType)
    
    # Missing columns required by app/models.py
    barcode = Column(String, index=True, unique=True, nullable=True)
    confidence_tier = Column(String, default="scraped")
    image_url = Column(String, nullable=True)

    price_tier = Column(String, index=True)
    store_links = Column(JSON)
    source_id = Column(String, nullable=True)
    search_vector = Column(SearchVectorType)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, index=True) # Link by name for now
    brand = Column(String)
    author = Column(String)
    text = Column(Text)
    rating = Column(Float)
    skin_type = Column(String)
    is_verified = Column(Integer) # 1 or 0
    source = Column(String)

# 3. EMBEDDINGS
# ------------------------------------------------------------------------------
embeddings_model = None
try:
    if os.getenv("OPENAI_API_KEY"):
        embeddings_model = OpenAIEmbeddings(model="openai_text_embedding_3_large")
        print("✅ OpenAI Embeddings initialized (openai_text_embedding_3_large)")
    else:
        print("⚠️ OPENAI_API_KEY not found. Embeddings will be skipped.")
except Exception as e:
    print(f"⚠️ Error initializing embeddings: {e}")

def get_embedding(text):
    if not embeddings_model or not text:
        return None
    try:
        # Rate limit safety
        time.sleep(0.02) 
        return embeddings_model.embed_query(text)
    except Exception as e:
        print(f"Error embedding text: {e}")
        return None

# 4. INGESTION LOGIC
# ------------------------------------------------------------------------------
KAGGLE_DIR = "/Users/mbvk/Documents/skin_app/data/Kaggle"
NATASHA_CSV = os.path.join(KAGGLE_DIR, "natahsamessier/clean_data/combined_product_review_data.csv")
PRODUCTS_8K_CSV = os.path.join(KAGGLE_DIR, "products/product_info.csv") # Full dataset

def ingest_data():
    session = SessionLocal()
    
    # Enable Vector Extension if Postgres
    if IS_POSTGRES:
        try:
            session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            session.commit()
            print("✅ 'vector' extension enabled.")
        except Exception as e:
            print(f"⚠️ Could not enable vector extension (might already exist): {e}")
            session.rollback()

    # Create Tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created.")

    # A. INGEST 8K PRODUCTS DATASET (New Primary Source)
    # -------------------------------------------------------
    if os.path.exists(PRODUCTS_8K_CSV):
        print(f"\n📦 Processing 8K Products Dataset: {PRODUCTS_8K_CSV}")
        try:
            df = pd.read_csv(PRODUCTS_8K_CSV)
            print(f"   Found {len(df)} rows.")
            
            count = 0
            skipped = 0
            for _, row in tqdm(df.iterrows(), total=len(df), desc="📦 Ingesting 8K Products"):
                name = str(row.get('product_name', '')).strip()
                if not name or name == 'nan': continue

                # Check duplicates in DB
                exists = session.query(Product).filter_by(name=name).first()
                if exists:
                    skipped += 1
                    continue

                # Metadata
                meta = {
                    "price": row.get('price_usd', None),
                    "rating": row.get('loves_count', 0), # Using loves as proxy
                    "limited_edition": row.get('limited_edition', 0),
                    "online_only": row.get('online_only', 0),
                    "variation_type": str(row.get('variation_type', ''))
                }

                # Embed Concept
                desc = str(row.get('description', ''))
                ingredients = str(row.get('ingredients', ''))
                concept_text = f"{name} {row.get('brand_name', '')} {ingredients} {desc}"
                vector = get_embedding(concept_text)

                # SQLite needs JSON string for vector column fallback
                embedding_val = vector
                if not IS_POSTGRES and vector:
                    embedding_val = json.dumps(vector)

                product = Product(
                    name=name,
                    brand=str(row.get('brand_name', 'Unknown')),
                    description=desc,
                    ingredients_text=ingredients,
                    category=str(row.get('primary_category', 'Uncategorized')),
                    metadata_info=json.dumps(meta),
                    embedding=embedding_val,
                    source="kaggle_8k"
                )
                session.add(product)
                count += 1
                
                if count % 50 == 0:
                    session.commit()
                    print(f"   Saved {count} products...")
            
            session.commit()
            print(f"✅ Finished 8K dataset. Added {count} new products. Skipped {skipped} existing.")
            
        except Exception as e:
            print(f"❌ Error processing 8K dataset: {e}")

    # B. INGEST NATASHA DATASET (Enrichment/Legacy)
    # -------------------------------------------------------
    if os.path.exists(NATASHA_CSV):
        print(f"\n📦 Processing Natasha Dataset: {NATASHA_CSV}")
        try:
            df = pd.read_csv(NATASHA_CSV)
            # Dedup by name + brand
            unique_rows = df.drop_duplicates(subset=['brand', 'name'])
            
            count = 0
            skipped = 0
            for _, row in tqdm(unique_rows.iterrows(), total=len(unique_rows), desc="📦 Ingesting Natasha Dataset"):
                name = str(row.get('name', '')).strip()
                brand = str(row.get('brand', '')).strip()
                
                # Check duplicates
                exists = session.query(Product).filter_by(name=name).first()
                if exists:
                    skipped += 1
                    continue

                desc = str(row.get('description', ''))
                concept_text = f"{name} {brand} {desc}"
                vector = get_embedding(concept_text)
                
                embedding_val = vector
                if not IS_POSTGRES and vector:
                    embedding_val = json.dumps(vector)

                product = Product(
                    name=name,
                    brand=brand,
                    description=desc,
                    category=str(row.get('category', 'Skincare')),
                    metadata_info=json.dumps({"rating": float(row.get('aggregate_rating', 0) or 0)}),
                    embedding=embedding_val,
                    source="kaggle_natasha"
                )
                session.add(product)
                count += 1
                if count % 50 == 0:
                    session.commit()
                    print(f"   Saved {count} products form Natasha...")
            
            session.commit()
            session.commit()
            print(f"✅ Finished Natasha dataset. Added {count} new products. Skipped {skipped} existing.")
        
        except Exception as e:
            print(f"❌ Error processing Natasha dataset: {e}")

    # C. INGEST REVIEWS (Iterate all CSVs)
    # -------------------------------------------------------
    reviews_dir = os.path.join(KAGGLE_DIR, "reviews")
    if os.path.exists(reviews_dir):
        review_files = [f for f in os.listdir(reviews_dir) if f.endswith(".csv")]
        print(f"\n🗣️ Found {len(review_files)} review files. Processing...")
        
        total_reviews = 0
        for r_file in review_files:
            path = os.path.join(reviews_dir, r_file)
            print(f"   -> Loading {r_file}...")
            try:
                df_reviews = pd.read_csv(path)
                
                batch = []
                for _, row in tqdm(df_reviews.iterrows(), total=len(df_reviews), desc=f"🗣️  {r_file}"):
                    # Check if text is valid
                    text_content = str(row.get('review_text', ''))
                    if len(text_content) < 5: continue
                    
                    review = Review(
                        product_name=str(row.get('product_name', '')),
                        brand=str(row.get('brand_name', '')),
                        author=str(row.get('author_id', 'anon')),
                        text=text_content,
                        rating=float(row.get('rating', 0) or 0),
                        skin_type=str(row.get('skin_type', '')),
                        is_verified=int(row.get('is_verified', 0) or 0),
                        source="kaggle_reviews"
                    )
                    batch.append(review)
                    
                    if len(batch) >= 1000:
                        session.add_all(batch)
                        session.commit()
                        total_reviews += len(batch)
                        batch = []
                        print(f"      Saved {total_reviews} reviews so far...")
                
                if batch:
                    session.add_all(batch)
                    session.commit()
                    total_reviews += len(batch)
                    
            except Exception as e:
                print(f"   ❌ Error reading {r_file}: {e}")

    print(f"✅ Ingestion Complete! Total Reviews: {total_reviews}")
    session.close()

if __name__ == "__main__":
    ingest_data()
