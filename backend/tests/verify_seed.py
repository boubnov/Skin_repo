import requests
import json

BASE_URL = "http://localhost:8000"

def verify_seed_search():
    print("--- VERIFYING SEED DATA SEARCH ---")
    
    # Login (Mock)
    auth_res = requests.post(f"{BASE_URL}/auth/google", json={"id_token": "mock_token_seed_test", "tos_agreed": True})
    token = auth_res.json()["access_token"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Goog-Api-Key": "mock_key_123", # Use Mock Agent
        "Content-Type": "application/json"
    }
    
    # Search for specific new product (Keyword Match)
    product_name = "EltaMD"
    payload = {
        "message": f"I want to buy {product_name}",
        "history": []
    }
    
    print(f"Searching for: {product_name}...")
    found = False
    with requests.post(f"{BASE_URL}/chat/", json=payload, headers=headers, stream=True) as res:
        for line in res.iter_lines():
            if line:
                try:
                    data = json.loads(line)
                    if data.get("type") == "products":
                        products = data.get("content", [])
                        for p in products:
                            print(f"  Found: {p.get('name')} (${p.get('metadata', {}).get('price')})")
                            if product_name in p.get("name") or product_name in p.get("brand"):
                                found = True
                except:
                    pass

    if found:
        print("\nSUCCESS: Found EltaMD via keyword search.")
    else:
        print("\nFAILURE: EltaMD not found.")

if __name__ == "__main__":
    verify_seed_search()
