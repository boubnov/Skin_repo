import pytest
from fastapi.testclient import TestClient
from main import app
import os
from unittest.mock import MagicMock, patch

client = TestClient(app)

# Mock environment variables if needed, though we want to test the REAL connection to the URL if possible unless it's strictly unit testing.
# The user asked to "make sure the chatbot works and connects to the api and url i sent".
# This implies an INTEGRATION test with the real remote API.

@pytest.fixture
def auth_token():
    # Login to get a valid token
    # We use the mock token flow which is enabled in non-prod environments or via bypass
    payload = {
        "id_token": "mock_token_integration_test",
        "tos_agreed": True
    }
    response = client.post("/auth/google", json=payload)
    assert response.status_code == 200
    return response.json()["access_token"]

def test_gemini_api_connection(auth_token):
    """
    Verifies that the backend can connect to the configured GenAI API URL 
    and receive a valid response.
    """
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "message": "Hello, this is a connection test. Are you online?",
        "history": []
    }
    
    # Use TestClient to call the endpoint
    # Note: TestClient doesn't support streaming perfectly in all versions, 
    # but we can check the response iterator
    with client.stream("POST", "/chat/", json=payload, headers=headers) as response:
        assert response.status_code == 200, f"Chat endpoint failed with {response.status_code}"
        
        # Consuming the stream to verify content
        content_received = False
        for line in response.iter_lines():
            if line:
                import json
                try:
                    data = json.loads(line)
                    if data.get("type") == "text" or data.get("type") == "products":
                        content_received = True
                except ValueError:
                    pass
        
        assert content_received, "Connected to backend, but received no content from Gemini API."

def test_api_configuration():
    """
    Verifies that the backend is configured with the correct URL.
    """
    base_url = os.getenv("OPENAI_BASE_URL")
    model = os.getenv("OPENAI_MODEL")
    
    assert base_url == "https://api.marketplace.novo-genai.com/v1", "Incorrect API Base URL configured"
    assert model == "gemini_3_pro", "Incorrect Model configured"
