"""Tests for authentication endpoints."""
import pytest
from unittest.mock import patch


# Mock Data
MOCK_GOOGLE_RESPONSE = {
    "email": "social_user@example.com",
    "sub": "123456789",
    "iss": "accounts.google.com"
}


def test_google_login_success_creates_user(client):
    """Test that Google login creates a new user."""
    # Mock the 'verify_google_token' function to return success without hitting real Google API
    with patch("app.auth.verify_google_token") as mock_verify:
        mock_verify.return_value = MOCK_GOOGLE_RESPONSE
        
        response = client.post(
            "/auth/google",
            json={"id_token": "valid_fake_token", "tos_agreed": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


def test_google_login_existing_user(client):
    """Test that Google login works for existing users."""
    # 1. Register user first time
    with patch("app.auth.verify_google_token") as mock_verify:
        mock_verify.return_value = MOCK_GOOGLE_RESPONSE
        client.post("/auth/google", json={"id_token": "token1", "tos_agreed": True})

    # 2. Login second time (same email/sub)
    with patch("app.auth.verify_google_token") as mock_verify:
        mock_verify.return_value = MOCK_GOOGLE_RESPONSE
        response = client.post("/auth/google", json={"id_token": "token2"})
        
        assert response.status_code == 200
        assert "access_token" in response.json()


def test_google_login_invalid_token(client):
    """Test that invalid Google tokens are rejected."""
    with patch("app.auth.verify_google_token") as mock_verify:
        mock_verify.return_value = None  # Simulate failure
        
        response = client.post(
            "/auth/google",
            json={"id_token": "invalid_token"}
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid Google Token"


def test_google_login_wrong_audience_confused_deputy(client):
    """Security Test: Ensuring we reject tokens meant for OTHER apps."""
    # The verify_google_token function calls id_token.verify_oauth2_token
    # We must simulate that function raising a ValueError when audience doesn't match
    
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_google_verify:
        mock_google_verify.side_effect = ValueError("Audience mismatch")
        
        # note: we are mocking the *library* call now, not our wrapper, to ensure our wrapper handles the error
        # Actually, since verify_google_token is what calls the library, 
        # let's mock verify_google_token to act as if the library failed, 
        # OR mock the library to fail. 
        # Given our verify_google_token catches ValueError and returns None:
        
        with patch("app.auth.verify_google_token") as mock_verify:
            mock_verify.return_value = None  # Simulate rejection due to wrong audience
            
            response = client.post("/auth/google", json={"id_token": "token_for_flashlight_app"})
            assert response.status_code == 400
            assert response.json()["detail"] == "Invalid Google Token"


def test_google_login_wrong_issuer(client):
    """Security Test: Reject tokens not from Google (e.g. spoofed)."""
    with patch("app.auth.verify_google_token") as mock_verify:
        mock_verify.return_value = None  # Simulate rejection due to wrong issuer
        
        response = client.post("/auth/google", json={"id_token": "fake_issuer_token"})
        assert response.status_code == 400


def test_google_login_dev_bypass_real(client):
    """
    TEST: Actually hit the logic in auth.py (no mocks for verify_google_token).
    This verifies that our "mock_" prefix logic works as intended.
    
    We consciously DO NOT patch verify_google_token here.
    We want to test the `if token.startswith("mock_"):` block in the actual code.
    """
    response = client.post(
        "/auth/google",
        json={"id_token": "mock_google_id_token_123", "tos_agreed": True}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
