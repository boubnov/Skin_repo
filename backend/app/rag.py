from sqlalchemy.orm import Session
from sqlalchemy import select, func, text
from .models import Product
import numpy as np
# from pgvector.sqlalchemy import l2_distance # If we wanted L2
from sqlalchemy.dialects.postgresql import JSONB

# Mock embedding function (replace with OpenAI in prod)
def get_mock_embedding(text):
    vec = np.random.rand(1536)
    return vec / np.linalg.norm(vec)

def hybrid_search(db: Session, query_text: str, filters: dict = None, limit: int = 5):
    """
    Performs Hybrid Search:
    1. Filter by Metadata (exact match)
    2. Vector Search (Semantic)
    """
    query_vec = get_mock_embedding(query_text).tolist()
    
    # 1. Base Query: Vector Similarity (Mock logic, random results essentially)
    stmt_vector = select(Product).order_by(Product.embedding.cosine_distance(query_vec))
    
    # 2. Base Query: Keyword Search (Reliable for demo)
    # Search in Name or Brand
    stmt_keyword = select(Product).filter(
        (Product.name.ilike(f"%{query_text}%")) | 
        (Product.brand.ilike(f"%{query_text}%"))
    )
    
    # Apply Filters to both if needed
    if filters:
        for key, value in filters.items():
            stmt_vector = stmt_vector.filter(Product.metadata_info.contains({key: value}))
            stmt_keyword = stmt_keyword.filter(Product.metadata_info.contains({key: value}))
            
    # Execute both
    # In a real system, we'd use Reciprocal Rank Fusion (RRF)
    # Here, we just check if Keyword found anything. If yes, return it. If no, return Vector.
    
    keyword_results = db.execute(stmt_keyword.limit(limit)).scalars().all()
    
    if keyword_results:
        # If we found exact matches, return them!
        # Maybe fill the rest with vector results if we have fewer than limit
        if len(keyword_results) < limit:
            vector_results = db.execute(stmt_vector.limit(limit)).scalars().all()
            # De-dupe
            existing_ids = {p.id for p in keyword_results}
            for p in vector_results:
                if p.id not in existing_ids and len(keyword_results) < limit:
                    keyword_results.append(p)
        return keyword_results
    else:
        # Fallback to vector (mock)
        return db.execute(stmt_vector.limit(limit)).scalars().all()

def get_product_by_name(db: Session, name: str):
    return db.query(Product).filter(Product.name.ilike(f"%{name}%")).first()
