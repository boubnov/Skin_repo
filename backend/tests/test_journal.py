import pytest
from app import models

@pytest.fixture
def mock_id_token():
    return "mock_token_journal_test"

def test_journal_flow(module_client, db_session, mock_id_token):
    # 1. Login
    login_res = module_client.post("/auth/google", json={"id_token": mock_id_token, "tos_agreed": True})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Entry (Check-in)
    payload = {
        "overall_condition": 4,
        "notes": "Skin feels good, slightly dry.",
        "tags": ["dry", "clear"]
    }
    res = module_client.post("/journal/", json=payload, headers=headers)
    assert res.status_code == 200
    entry = res.json()
    assert entry["overall_condition"] == 4
    assert "dry" in entry["tags"]
    entry_id = entry["id"]
    
    # 3. List Entries
    res = module_client.get("/journal/", headers=headers)
    assert res.status_code == 200
    entries = res.json()
    assert len(entries) >= 1
    assert entries[0]["id"] == entry_id
    
    # 4. Delete Entry
    res = module_client.delete(f"/journal/{entry_id}", headers=headers)
    assert res.status_code == 200
    
    # 5. Verify Deletion
    res = module_client.get("/journal/", headers=headers)
    entries = res.json()
    assert all(e["id"] != entry_id for e in entries)
