import requests
import sys

def verify_cors():
    url = "http://localhost:8000/auth/google"
    origin = "http://localhost:8081" # Simulate Expo Web
    
    print(f"Testing CORS at: {url}")
    print(f"Simulating Origin: {origin}")
    
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    
    try:
        # Send Preflight OPTIONS request
        response = requests.options(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print("Response Headers:")
        for k, v in response.headers.items():
            if "access-control" in k.lower():
                print(f"  {k}: {v}")
        
        # Rigorous Checks
        if response.status_code != 200:
            print("❌ FAILED: Preflight request was not 200 OK")
            return False
            
        cors_origin = response.headers.get("access-control-allow-origin")
        if not cors_origin:
            print("❌ FAILED: No 'Access-Control-Allow-Origin' header found")
            return False
            
        print("✅ SUCCESS: CORS Headers present and correct.")
        return True
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to localhost:8000. Is the backend running?")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

if __name__ == "__main__":
    success = verify_cors()
    if not success:
        sys.exit(1)
