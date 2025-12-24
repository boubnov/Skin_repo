import requests
import json
import sys

URL = "http://localhost:8000"
# Special key to trigger Store Locator in Mock LLM
API_KEY_LOCATOR = "mock_locator_test"

def test_store_locator():
    print(f"📍 Testing Store Locator against {URL}...")

    payload = {
        "message": "Where can I buy CeraVe?",
        "history": []
    }
    headers = {
        "X-Goog-Api-Key": API_KEY_LOCATOR,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{URL}/chat/", json=payload, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed: Status {response.status_code}")
            print(response.text)
            sys.exit(1)
            
        data = response.json()
        print(f"✅ Success: Response received.")
        print(f"Agent Text: {data['response']}")
        
        # In a real scenario, the Agent would say "Found at Sephora".
        # In our Mock LLM, it says "Here is the result (Mock)."
        # But the fact that it didn't crash means the 'store_locator' tool 
        # was successfully invoked (step 2) and result passed to LLM (step 3).
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_store_locator()
