import requests
import sys

def verify_login():
    url = "http://localhost:8000/auth/google"
    payload = {
        "id_token": "mock_google_id_token_123",
        "tos_agreed": True
    }
    
    print(f"Testing Login Endpoint: {url}")
    print(f"Payload: {payload}")
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login SUCCESS")
            token = response.json().get("access_token")
            if token:
                print(f"Received Token: {token[:15]}...")
                return True
            else:
                print("❌ No access_token in response")
                return False
        else:
            print("❌ Login FAILED")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to localhost:8000. Is the backend running?")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

if __name__ == "__main__":
    success = verify_login()
    if not success:
        sys.exit(1)
