import pytest
from app.agent import SkincareAgent
from app import models
from unittest.mock import MagicMock

def test_build_system_context_structure(db_session):
    # 1. Setup User Data
    user = models.User(email="context_test@example.com", social_provider="test", social_id="123")
    db_session.add(user)
    db_session.commit()
    
    # Profile
    profile = models.Profile(user_id=user.id, name="Test User", skin_type="Dry", concerns=["Acne"])
    db_session.add(profile)
    
    # Shelf (Inventory)
    prod = models.UserProduct(user_id=user.id, product_name="Magic Cream", brand="Wizards", status="active")
    db_session.add(prod)
    
    # Journal
    entry = models.JournalEntry(user_id=user.id, overall_condition=2, notes="My face hurts")
    db_session.add(entry)
    db_session.commit()
    
    # 2. Initialize Agent (Mock LLM)
    mock_llm = MagicMock()
    agent = SkincareAgent(llm=mock_llm, db_session=db_session)
    
    # 3. Build Context
    context = agent.build_system_context(user_id=user.id)
    
    # 4. Verify XML and Data injection
    print(context) # For debugging/visibility
    
    assert "<role>" in context
    assert "<user_profile>" in context
    assert "Test User" in context
    assert "Dry" in context
    
    assert "<inventory>" in context
    assert "Magic Cream" in context
    assert "Wizards" in context
    
    assert "<skin_history>" in context
    assert "Condition 2/5" in context
    assert "My face hurts" in context
