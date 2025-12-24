import requests
import json

BASE_URL = "http://localhost:8000"

def verify_chat_stream():
    print("--- VERIFYING CHAT STREAM ---")
    
    # 1. Login to get token
    # We'll use the mock token flow we verified earlier
    auth_res = requests.post(f"{BASE_URL}/auth/google", json={"id_token": "mock_token_chat_test", "tos_agreed": True})
    if auth_res.status_code != 200:
        print("Login failed")
        return
    token = auth_res.json()["access_token"]
    
    # 2. Call Chat Endpoint with Mock Key
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Goog-Api-Key": "mock_key_123", # "mock_" prefix triggers the MockLLM in chat.py
        "Content-Type": "application/json"
    }
    
    payload = {
        "message": "Where can I buy a moisturizer?",
        "history": []
    }
    
    print("Sending Chat Request...")
    with requests.post(f"{BASE_URL}/chat/", json=payload, headers=headers, stream=True) as res:
        if res.status_code != 200:
            print(f"Chat failed: {res.status_code}")
            print(res.text)
            return
            
        print("Stream Connected. Reading chunks...")
        found_product = False
        
        for line in res.iter_lines():
            if line:
                try:
                    data = json.loads(line)
                    print(f"Chunk: {data}")
                    
                    if data.get("type") == "products":
                        products = data.get("content", [])
                        if len(products) > 0:
                            p = products[0]
                            print(f"\n✅ Found Product: {p.get('name')} by {p.get('brand')}")
                            if "metadata" in p and "price" in p["metadata"]:
                                print(f"✅ Metadata verified: Price {p['metadata']['price']}")
                                found_product = True
                except ValueError:
                    print(f"Invalid JSON: {line}")

        if found_product:
            print("\nSUCCESS: Rich product data received.")
        else:
            print("\nFAILURE: Did not find product data in stream.")

if __name__ == "__main__":
    verify_chat_stream()
