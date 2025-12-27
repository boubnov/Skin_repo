from sqlalchemy.orm import Session
from sqlalchemy import select, func, text
from .models import Product
from .database import IS_SQLITE
import numpy as np

# Mock embedding function (replace with OpenAI in prod)
def get_mock_embedding(text):
    vec = np.random.rand(1536)
    return vec / np.linalg.norm(vec)

def hybrid_search(db: Session, query_text: str, filters: dict = None, limit: int = 5):
    """
    Performs Hybrid Search:
    1. Filter by Metadata (exact match)
    2. Vector Search (Semantic) - PostgreSQL only
    3. Keyword Search (SQLite fallback)
    """
    
    # 1. VECTOR SEARCH (PostgreSQL only)
    if not IS_SQLITE:
        try:
            # Generate embedding for the query
            from langchain_openai import OpenAIEmbeddings
            import os
            
            if os.getenv("OPENAI_API_KEY"):
                embeddings_model = OpenAIEmbeddings(model="openai_text_embedding_3_large")
                query_vec = embeddings_model.embed_query(query_text)
                
                # Semantic Search with Cosine Distance
                stmt_vector = select(Product).order_by(
                    Product.embedding.cosine_distance(query_vec)
                ).limit(limit)
                
                # Apply Filters (JSONB in Postgres)
                if filters:
                    for key, value in filters.items():
                        stmt_vector = stmt_vector.filter(
                            Product.metadata_info[key].astext == str(value)
                        )
                
                results = db.execute(stmt_vector).scalars().all()
                if results:
                    return results
        except Exception as e:
            # CRITICAL: Rollback the failed transaction before keyword fallback
            db.rollback()
            print(f"⚠️ Vector search failed (falling back to keyword): {e}")

    # 2. KEYWORD SEARCH (Fallback for SQLite or if Vector fails)
    stmt_keyword = select(Product).filter(
        (Product.name.ilike(f"%{query_text}%")) | 
        (Product.brand.ilike(f"%{query_text}%")) |
        (Product.description.ilike(f"%{query_text}%"))
    )
    
    # Apply Filters if needed
    if filters:
        for key, value in filters.items():
            if IS_SQLITE:
                # Simple string match for SQLite JSON
                stmt_keyword = stmt_keyword.filter(
                    Product.metadata_info.contains(f'"{key}": "{value}"')
                )
            else:
                # JSONB containment for Postgres
                stmt_keyword = stmt_keyword.filter(
                    Product.metadata_info.contains({key: value})
                )
    
    # Execute keyword search
    keyword_results = db.execute(stmt_keyword.limit(limit)).scalars().all()
    
    if keyword_results:
        return keyword_results
    
    # If no results, try broader terms
    broad_terms = query_text.lower().split()
    for term in broad_terms:
        if len(term) < 3: continue
        broad_stmt = select(Product).filter(
            (Product.name.ilike(f"%{term}%")) | 
            (Product.brand.ilike(f"%{term}%"))
        ).limit(limit)
        results = db.execute(broad_stmt).scalars().all()
        if results: return results
        
    return []

def get_product_by_name(db: Session, name: str):
    return db.query(Product).filter(Product.name.ilike(f"%{name}%")).first()
