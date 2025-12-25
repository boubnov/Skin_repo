from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import Profile, User

def test_get_profile_new_user(client: TestClient, db_session: Session):
    # 1. Login/Create user
    login_response = client.post("/auth/google", json={
        "id_token": "mock_token_new_user_profile",
        "tos_agreed": True
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Profile (should be empty/default)
    response = client.get("/users/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["age"] is None
    assert data["username"] is None

def test_update_profile_success(client: TestClient, db_session: Session):
    # 1. Login
    login_response = client.post("/auth/google", json={
        "id_token": "mock_token_update_profile",
        "tos_agreed": True
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update Profile
    update_data = {
        "username": "skincare_fan",
        "name": "Jane Doe",
        "age": 30,
        "skin_type": "Oily",
        "phone": "555-0199",
        "instagram": "@janedoe",
        "concerns": ["Acne", "Aging"]
    }
    response = client.put("/users/profile", json=update_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "skincare_fan"
    assert data["age"] == 30
    assert data["concerns"] == ["Acne", "Aging"]

def test_update_profile_username_taken(client: TestClient, db_session: Session):
    # 1. User A takes "user1"
    response_a = client.post("/auth/google", json={"id_token": "mock_user_a", "tos_agreed": True}).json()
    token_a = response_a["access_token"]
    client.put("/users/profile", json={"username": "user1"}, headers={"Authorization": f"Bearer {token_a}"})

    # 2. User B tries to take "user1"
    response_b = client.post("/auth/google", json={"id_token": "mock_user_b", "tos_agreed": True}).json()
    token_b = response_b["access_token"]
    
    response = client.put("/users/profile", json={"username": "user1"}, headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already taken"

    # 3. User B takes "user2" (success)
    response = client.put("/users/profile", json={"username": "user2"}, headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 200
    assert response.json()["username"] == "user2"
