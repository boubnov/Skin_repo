import requests
import json

BASE_URL = "http://localhost:8000"

def verify_history():
    print("--- VERIFYING HISTORY API ---")
    
    # Login
    auth_res = requests.post(f"{BASE_URL}/auth/google", json={"id_token": "mock_token_hist_test", "tos_agreed": True})
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Add Product (Unsafe)
    print("Adding 'Bad Cream' to Blacklist...")
    payload = {
        "product_name": "Bad Cream",
        "brand": "Generic Brand",
        "status": "unsafe",
        "notes": "Caused massive breakout"
    }
    res_post = requests.post(f"{BASE_URL}/history/", json=payload, headers=headers)
    
    if res_post.status_code == 200:
        print("✅ Added successfully:", res_post.json())
    else:
        print("❌ Failed to add:", res_post.text)
        return

    # 2. Fetch History
    print("Fetching History Log...")
    res_get = requests.get(f"{BASE_URL}/history/", headers=headers)
    logs = res_get.json()
    
    found = False
    for item in logs:
        if item["product_name"] == "Bad Cream" and item["status"] == "unsafe":
            print(f"✅ Found in log: {item['product_name']} ({item['status']})")
            found = True
            
    if found:
        print("SUCCESS: History feature working.")
    else:
        print("FAILURE: Log not persisted.")

if __name__ == "__main__":
    verify_history()
