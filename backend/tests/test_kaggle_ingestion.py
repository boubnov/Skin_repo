
import pytest
from unittest.mock import MagicMock, patch
import pandas as pd
import os
import sys

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from ingest_kaggle import ingest, load_ingredients_metadata, get_embedding
from app.models import Product, Review, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def mock_data():
    # Mock Ingredients CSV Data
    ingredients_df = pd.DataFrame([{
        'brand': 'TestBrand',
        'name': 'TestProduct',
        'Ingredients': 'Water, Glycerin',
        'Combination': 1, 'Dry': 0, 'Normal': 1, 'Oily': 0, 'Sensitive': 0
    }])
    
    # Mock Natasha CSV Data
    natasha_data = [{
        'brand': 'TestBrand',
        'name': 'TestProduct',
        'category': 'Moisturizer',
        'price': '30.0',
        'description': 'A great moisturizer.',
        'review_id': '123',
        'aggregate_rating': 4.5,
        'review_count': 10,
        'text': 'Loved it!',
        'title': 'Great',
        'rating_value': 5,
        'polarity_score': 0.9
    }]
    natasha_df = pd.DataFrame(natasha_data)
    
    return ingredients_df, natasha_df

@patch('ingest_kaggle.pd.read_csv')
@patch('ingest_kaggle.get_embedding')
def test_ingest_flow(mock_embed, mock_read_csv, mock_data):
    ingredients_df, natasha_df = mock_data
    
    # Setup Mocks
    mock_read_csv.side_effect = [ingredients_df, natasha_df]
    mock_embed.return_value = [0.1] * 1536
    
    # Create In-Memory DB
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(test_engine)
    TestSession = sessionmaker(bind=test_engine)
    
    # Patch the global engine and SessionLocal in the module
    with patch('ingest_kaggle.engine', test_engine), \
         patch('ingest_kaggle.SessionLocal', TestSession):
        
        # Run Ingest
        # Note: ingest() drops/creates tables. 
        # Since we use :memory:, it's fine, but our fixture created them.
        # ingest() will drop them and recreate. That's fine.
        ingest()
        
        # Verify Verification
        session = TestSession()
        products = session.query(Product).all()
        reviews = session.query(Review).all()
        
        assert len(products) == 1
        p = products[0]
        print(f"Verified Product: {p.name} - Brand: {p.brand}")
        
        # Check Enrichment
        assert p.name == 'TestProduct'
        assert p.brand == 'TestBrand'
        assert p.ingredients_text == 'Water, Glycerin'
        assert p.skin_type_compatibility['combination'] == 1.0
        assert p.source == 'kaggle_natasha'
        
        # Check Reviews
        assert len(reviews) == 1
        r = reviews[0]
        assert r.rating == 5
        assert "Great" in r.text
        assert r.product_id == p.id
        
        print("✅ Ingestion Logic Verification Passed!")

if __name__ == "__main__":
    # Manually run if executed as script
    pass
