import pytest
from app import models
import json

@pytest.fixture
def journey_client(module_client, db_session):
    """
    Fresh client for the journey.
    """
    # Clean DB (Truncate tables relevant to user)
    db_session.query(models.UserProduct).delete()
    db_session.query(models.JournalEntry).delete()
    db_session.query(models.RoutineItem).delete()
    db_session.query(models.Profile).delete()
    db_session.query(models.User).delete()
    db_session.commit()
    return module_client

def test_critical_user_journey(journey_client):
    """
    Simulates a Real User Lifecycle:
    1. Register
    2. Setup Profile
    3. Add Product to Shelf
    4. Log Journal Entry
    5. Chat with AI (Verify Context)
    """
    
    # 1. Register & Login
    # Using mock id token flow from verify_google_token mock
    mock_token = "mock_token_journey_user"
    login_res = journey_client.post("/auth/google", json={"id_token": mock_token, "tos_agreed": True})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Goog-Api-Key": "mock_key"}
    
    # 2. Setup Profile
    profile_payload = {
        "skin_type": "Combination",
        "concerns": ["Redness", "Aging"]
    }
    res = journey_client.put("/users/profile", json=profile_payload, headers=headers)
    assert res.status_code == 200
    
    # Verify Profile
    res = journey_client.get("/users/profile", headers=headers)
    assert res.status_code == 200
    assert res.json().get("skin_type") == "Combination"
    
    # 3. Add Product to Shelf (Inventory)
    product_payload = {
        "product_name": "Super Calming Toner",
        "brand": "K-Beauty Co",
        "category": "Toner",
        "status": "active"
    }
    res = journey_client.post("/products/", json=product_payload, headers=headers)
    assert res.status_code == 200
    
    # 4. Log Journal Entry (History)
    journal_payload = {
        "overall_condition": 2,
        "notes": "Had a bad reaction to sushi.",
        "tags": ["reaction"]
    }
    res = journey_client.post("/journal/", json=journal_payload, headers=headers)
    assert res.status_code == 200
    
    # 5. Chat with AI (Context Check)
    # We ask "CONTEXT_CHECK" to trigger our debug hook
    chat_payload = {
        "message": "CONTEXT_CHECK please",
        "history": []
    }
    
    # Using the streaming endpoint
    # We need to collect the stream output
    import httpx
    # Since TestClient manages its own connection, standard requests work. 
    # But streaming response in TestClient can be iterated.
    
    res = journey_client.post("/chat/", json=chat_payload, headers=headers)
    assert res.status_code == 200
    
    full_response = ""
    for line in res.iter_lines():
        if line:
            # Parse NDjson
            try:
                data = json.loads(line)
                if data.get("type") == "text":
                    full_response += data.get("content", "")
            except:
                pass
                
    print(f"DEBUG RESPONSE: {full_response}")
    
    # 6. Verify Context
    # Expectations: 
    # - Inventory should contain "Super Calming Toner"
    # - History should contain "reaction to sushi"
    
    assert "Super Calming Toner" in full_response
    assert "K-Beauty Co" in full_response
    assert "reaction to sushi" in full_response
    assert "Condition 2/5" in full_response
    assert "Combination" in full_response # Profile check (default or from login)

