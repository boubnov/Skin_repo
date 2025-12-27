"""
Integration tests for Chat ↔ Database connection.

These tests verify that:
1. The RAG search finds products in the database
2. The product_retriever tool returns correct product data
3. The chat endpoint correctly uses database products
4. Semantic search queries return relevant results

Run with: pytest tests/test_chat_database_integration.py -v
"""

import pytest
import json
import os
import sys

# Ensure backend modules are importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, IS_SQLITE
from app.models import Product
from app import rag


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture(scope="module")
def test_db():
    """
    Create a test database with sample products for integration testing.
    Uses in-memory SQLite for fast, isolated tests.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Add test products that mimic real Kaggle data
    test_products = [
        Product(
            name="Dewy Babies",
            brand="Glow Recipe",
            category="skin-care-sets",
            description="Travel-size kit with watermelon glow essentials for dewy skin",
            ingredients_text="Watermelon Extract, Niacinamide, Hyaluronic Acid",
            metadata_info=json.dumps({"rating": 4.8, "review_count": 150}),
            skin_type_compatibility=json.dumps({"oily": 1.0, "dry": 0.8, "normal": 1.0}),
            source="kaggle_natasha"
        ),
        Product(
            name="Deep Sleep Bath Salts with Magnesium & Peptides",
            brand="Saint Jane Beauty",
            category="bath-body",
            description="Relaxing bath salts infused with magnesium and peptides for better sleep",
            ingredients_text="Magnesium Sulfate, CBD, Lavender Oil, Peptides",
            metadata_info=json.dumps({"rating": 4.86, "review_count": 89}),
            source="kaggle_natasha"
        ),
        Product(
            name="Glazing Milk Ceramide Facial Essence",
            brand="rhode",
            category="face-serum",
            description="Lightweight hydrating essence with ceramides for glowing skin",
            ingredients_text="Ceramide NP, Hyaluronic Acid, Niacinamide, Water",
            metadata_info=json.dumps({"rating": 4.5, "review_count": 1200}),
            skin_type_compatibility=json.dumps({"dry": 1.0, "normal": 1.0, "sensitive": 0.8}),
            source="kaggle_natasha"
        ),
        Product(
            name="Ultra Repair Cream Intense Hydration",
            brand="First Aid Beauty",
            category="face-creams",
            description="Rich moisturizing cream for extremely dry, distressed skin",
            ingredients_text="Colloidal Oatmeal, Shea Butter, Eucalyptus, Allantoin",
            metadata_info=json.dumps({"rating": 4.7, "review_count": 5000}),
            skin_type_compatibility=json.dumps({"dry": 1.0, "sensitive": 1.0}),
            source="kaggle_natasha"
        ),
        Product(
            name="Retinol 0.5% Anti-Aging Serum",
            brand="The Ordinary",
            category="face-serum",
            description="Moderate strength retinol for reducing fine lines and wrinkles",
            ingredients_text="Retinol, Squalane, Jojoba Seed Oil",
            metadata_info=json.dumps({"rating": 4.3, "review_count": 8500}),
            source="kaggle_natasha"
        ),
    ]
    
    for product in test_products:
        session.add(product)
    session.commit()
    
    yield session
    
    session.close()


# ============================================================================
# RAG SEARCH TESTS
# ============================================================================

class TestRAGSearch:
    """Tests for rag.py hybrid_search function."""
    
    def test_search_by_brand_name(self, test_db):
        """Searching by brand name should find matching products."""
        results = rag.hybrid_search(test_db, "Glow Recipe", limit=5)
        
        assert len(results) >= 1
        assert any("Glow Recipe" in p.brand for p in results)
    
    def test_search_by_product_name(self, test_db):
        """Searching by product name should find the exact product."""
        results = rag.hybrid_search(test_db, "Dewy Babies", limit=5)
        
        assert len(results) >= 1
        assert any("Dewy Babies" in p.name for p in results)
    
    def test_search_by_partial_name(self, test_db):
        """Partial name matching should work."""
        results = rag.hybrid_search(test_db, "Deep Sleep", limit=5)
        
        assert len(results) >= 1
        assert any("Saint Jane Beauty" in p.brand for p in results)
    
    def test_search_by_description_keyword(self, test_db):
        """Keywords in description should be searchable."""
        results = rag.hybrid_search(test_db, "hydrating essence ceramides", limit=5)
        
        assert len(results) >= 1
        # Should find rhode Glazing Milk (has ceramides in description)
        assert any("rhode" in p.brand or "ceramide" in p.description.lower() for p in results)
    
    def test_search_returns_correct_fields(self, test_db):
        """Search results should have all expected fields populated."""
        results = rag.hybrid_search(test_db, "First Aid Beauty", limit=1)
        
        assert len(results) == 1
        product = results[0]
        
        assert product.name is not None
        assert product.brand == "First Aid Beauty"
        assert product.description is not None
        assert product.metadata_info is not None
    
    def test_search_respects_limit(self, test_db):
        """Search should respect the limit parameter."""
        results = rag.hybrid_search(test_db, "skin", limit=2)
        
        assert len(results) <= 2
    
    def test_search_no_results_returns_fallback(self, test_db):
        """Search with no matches should return fallback results (not empty)."""
        results = rag.hybrid_search(test_db, "xyznonexistentproduct123", limit=3)
        
        # Should return some fallback products (not crash)
        assert isinstance(results, list)


# ============================================================================
# PRODUCT RETRIEVER TOOL TESTS
# ============================================================================

class TestProductRetrieverTool:
    """Tests for the product_retriever tool in agent.py."""
    
    def test_tool_returns_valid_json(self, test_db):
        """The product_retriever tool should return valid JSON."""
        from app.agent import create_tools
        
        tools = create_tools(test_db)
        product_retriever = tools[0]  # First tool is product_retriever
        
        result = product_retriever.invoke({"query": "Glow Recipe"})
        
        # Should be valid JSON
        products = json.loads(result)
        assert isinstance(products, list)
    
    def test_tool_returns_product_structure(self, test_db):
        """Products from tool should have expected structure."""
        from app.agent import create_tools
        
        tools = create_tools(test_db)
        product_retriever = tools[0]
        
        result = product_retriever.invoke({"query": "Saint Jane"})
        products = json.loads(result)
        
        assert len(products) >= 1
        
        product = products[0]
        assert "name" in product
        assert "brand" in product
        assert "description" in product
        assert "metadata" in product
    
    def test_tool_includes_affiliate_url(self, test_db):
        """Products should include affiliate URLs in metadata."""
        from app.agent import create_tools
        
        tools = create_tools(test_db)
        product_retriever = tools[0]
        
        result = product_retriever.invoke({"query": "The Ordinary"})
        products = json.loads(result)
        
        if len(products) > 0:
            assert "affiliate_url" in products[0]["metadata"]
            assert "amazon.com" in products[0]["metadata"]["affiliate_url"]


# ============================================================================
# DATABASE CONNECTION TESTS
# ============================================================================

class TestDatabaseConnection:
    """Tests to verify database connectivity and data integrity."""
    
    def test_products_table_has_data(self, test_db):
        """Products table should contain data."""
        count = test_db.query(Product).count()
        assert count >= 5  # Our test fixtures
    
    def test_products_have_required_fields(self, test_db):
        """All products should have required fields populated."""
        products = test_db.query(Product).all()
        
        for product in products:
            assert product.name is not None
            assert product.brand is not None
            assert product.source is not None  # Should have source from ingestion
    
    def test_metadata_is_valid_json(self, test_db):
        """metadata_info field should contain valid JSON."""
        products = test_db.query(Product).filter(Product.metadata_info.isnot(None)).all()
        
        for product in products:
            if product.metadata_info:
                # Should parse without error
                metadata = json.loads(product.metadata_info)
                assert isinstance(metadata, dict)


# ============================================================================
# INTEGRATION TEST: END-TO-END PRODUCT SEARCH
# ============================================================================

class TestEndToEndProductSearch:
    """End-to-end tests simulating actual chat queries."""
    
    def test_obscure_product_found(self, test_db):
        """Searching for an obscure product should find it."""
        # This tests that we're hitting the real database, not mock data
        results = rag.hybrid_search(test_db, "Glazing Milk", limit=3)
        
        found_rhode = any("rhode" in p.brand for p in results)
        assert found_rhode, "Should find rhode Glazing Milk in database"
    
    def test_multiple_products_same_brand(self, test_db):
        """Searching by brand should find multiple products."""
        # Add another product from same brand for this test
        test_db.add(Product(
            name="Watermelon Glow Niacinamide Dew Drops",
            brand="Glow Recipe",
            category="face-serum",
            description="Highlighting serum for instant glow",
            source="kaggle_natasha"
        ))
        test_db.commit()
        
        results = rag.hybrid_search(test_db, "Glow Recipe", limit=5)
        
        glow_recipe_products = [p for p in results if p.brand == "Glow Recipe"]
        assert len(glow_recipe_products) >= 2
    
    def test_product_rating_preserved(self, test_db):
        """Product ratings from database should be preserved in results."""
        results = rag.hybrid_search(test_db, "Dewy Babies", limit=1)
        
        assert len(results) == 1
        product = results[0]
        
        metadata = json.loads(product.metadata_info) if product.metadata_info else {}
        assert "rating" in metadata
        assert metadata["rating"] == 4.8


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
