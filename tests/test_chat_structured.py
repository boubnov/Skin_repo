import requests
import json
import sys

URL = "http://localhost:8000"
TOKEN_BYPASS = "mock_token_test_struct"
API_KEY_BYPASS = "mock_api_key_123"

def test_chat_structure():
    print(f"🔥 Testing Chat Structure against {URL}...")

    # 1. Login (Just in case, though Chat uses API Key)
    # Actually Chat endpoint uses X-Goog-Api-Key, not Bearer token, but let's be safe.
    
    # 2. Send Chat Message
    payload = {
        "message": "Recommend a moisturizer for oily skin",
        "history": []
    }
    headers = {
        "X-Goog-Api-Key": API_KEY_BYPASS,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{URL}/chat/", json=payload, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed: Status {response.status_code}")
            print(response.text)
            sys.exit(1)
            
        data = response.json()
        
        # 3. Verify Structure
        if "response" not in data:
            print("❌ Failed: 'response' key missing")
            sys.exit(1)
            
        if "products" not in data:
            print("❌ Failed: 'products' key missing")
            sys.exit(1)
            
        if not isinstance(data["products"], list):
            print("❌ Failed: 'products' is not a list")
            sys.exit(1)
            
        print("✅ Success: Structure is valid.")
        print(f"Response: {data['response'][:50]}...")
        print(f"Products Found: {len(data['products'])}")
        
        if len(data["products"]) > 0:
            print(f"Example Product: {data['products'][0].get('name')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_chat_structure()
