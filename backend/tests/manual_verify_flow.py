import requests
import json

BASE_URL = "http://localhost:8000"

def print_result(step, response):
    status = "✅" if response.status_code in [200, 201] else "❌"
    print(f"{status} {step}: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(response.text)
    return response

def run_verification():
    print("--- STARTING VERIFICATION ---")
    
    # 1. Try to login WITHOUT ToS (Should FAIL for new user)
    # Use a random social ID to ensure new user
    import random
    rand_id = f"mock_{random.randint(1000, 9999)}"
    mock_token_no_tos = f"{rand_id}_NO_TOS" 
    # Note: Backend verify_google_token mock check expects "mock_" prefix, but our code splits logic.
    # Actually backend code: if token.startswith("mock_"): returns mock data.
    # We need to simulate distinct users. The backend mock returns static email "mock_user@example.com".
    # Uh oh, the backend mock returns the SAME email every time. 
    # This means I can't easily test "New User" scenario without modifying the backend or restart DB.
    # But I can test the "Existing User" flow if I already logged in.
    
    # Let's check if the user exists first.
    # We can't easily check without a token.
    
    # Let's try to login WITH ToS to ensure we can get in.
    print("\n1. Login with ToS (Should Succeed)")
    payload = {
        "id_token": "mock_valid_token",
        "tos_agreed": True
    }
    res = requests.post(f"{BASE_URL}/auth/google", json=payload)
    print_result("Login", res)
    
    if res.status_code != 200:
        print("CRITICAL: Login failed. Is backend running?")
        return

    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Check Profile
    print("\n2. Check Profile (GET /users/me)")
    res = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print_result("Get Me", res)
    user_data = res.json()
    print("Current Profile:", user_data.get("profile"))
    
    # 3. Update Profile
    print("\n3. Update Profile (PUT /users/me/profile)")
    profile_payload = {
        "age": 30,
        "skin_type": "Oily",
        "ethnicity": "Test",
        "location": "Lab"
    }
    res = requests.put(f"{BASE_URL}/users/me/profile", json=profile_payload, headers=headers)
    print_result("Update Profile", res)
    
    # 4. Verify Update
    print("\n4. Verify Update (GET /users/me)")
    res = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print_result("Get Me Again", res)
    print("Updated Profile:", res.json().get("profile"))
    
    # 5. Legal Gate Test (Login without ToS param)
    # Since user already accepted ToS in step 1, this should SUCCEED now even if tos_agreed=False in payload default
    print("\n5. Legal Gate (Existing User, No ToS param)")
    payload_no_tos = {
        "id_token": "mock_valid_token",
        "tos_agreed": False
    }
    res = requests.post(f"{BASE_URL}/auth/google", json=payload_no_tos)
    print_result("Login No ToS", res)

if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"Verification Failed: {e}")
