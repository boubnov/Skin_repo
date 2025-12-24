import requests
import sys

BASE_URL = "http://localhost:8000"

def verify_routine():
    print("--- VERIFYING ROUTINE API ---")
    
    # 1. Login (Get Token)
    try:
        req = requests.post(f"{BASE_URL}/auth/google", json={"id_token": "mock_token_123", "tos_agreed": True})
        token = req.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login Successful")
    except Exception as e:
        print(f"❌ Login Failed: {e}")
        return

    # 2. Get Routine (Should Seed)
    res = requests.get(f"{BASE_URL}/routine/", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print(f"✅ Routine Fetched. Streak: {data['streak']}")
        print(f"   AM Items: {len(data['am'])}")
        print(f"   PM Items: {len(data['pm'])}")
        
        # 3. Toggle Item
        if data['am']:
            item_id = data['am'][0]['id']
            print(f"   Toggling Item ID: {item_id}...")
            requests.post(f"{BASE_URL}/routine/toggle/{item_id}", headers=headers)
            
            # 4. Verify Toggled
            res2 = requests.get(f"{BASE_URL}/routine/", headers=headers)
            updated_item = next(i for i in res2.json()['am'] if i['id'] == item_id)
            if updated_item['is_completed']:
                print("✅ Toggle Successful (Marked Complete)")
            else:
                print("❌ Toggle Failed")
                
            # 5. Verify Streak Update (If counting today)
            if res2.json()['streak'] >= 1:
                print("✅ Streak Logic Working")
            else:
                print(f"⚠️ Streak Logic check: {res2.json()['streak']} (Might need yesterday's data to fully test streaks)")
    else:
        print(f"❌ Failed to fetch routine: {res.text}")

if __name__ == "__main__":
    verify_routine()
