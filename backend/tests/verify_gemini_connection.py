import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def verify_gemini_connection():
    print("--- VERIFYING GEMINI/NOVO-GENAI CONNECTION ---")
    
    # 1. Login to get token
    # We'll use the mock token flow we verified earlier
    try:
        auth_res = requests.post(f"{BASE_URL}/auth/google", json={"id_token": "mock_token_chat_test", "tos_agreed": True})
        if auth_res.status_code != 200:
            print(f"Login failed: {auth_res.status_code}")
            return
        token = auth_res.json()["access_token"]
    except Exception as e:
        print(f"Failed to connect to auth endpoint: {e}")
        return

    # 2. Call Chat Endpoint WITHOUT Mock Key
    # This forces the backend to use its configured OPENAI_API_KEY / Gemini connection
    headers = {
        "Authorization": f"Bearer {token}",
        # "X-Goog-Api-Key": "mock_key_123",  <-- COMMENTED OUT to test real backend
        "Content-Type": "application/json"
    }
    
    payload = {
        "message": "Hello, are you connected to Gemini?",
        "history": []
    }
    
    print("Sending Chat Request to Real Backend...")
    try:
        with requests.post(f"{BASE_URL}/chat/", json=payload, headers=headers, stream=True) as res:
            if res.status_code != 200:
                print(f"Chat failed: {res.status_code}")
                # Print the error detail
                print(f"Response: {res.text}")
                return
            
            print(f"Status Code: {res.status_code}")
            print("Stream Connected. Reading chunks...")
            
            content_received = False
            for line in res.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    try:
                        data = json.loads(decoded_line)
                        print(f"Chunk: {data}")
                        if data.get("type") == "text":
                            content_received = True
                    except ValueError:
                        print(f"Raw: {decoded_line}")
                        # Sometimes raw text might come through if not JSON
                        content_received = True

            if content_received:
                print("\nSUCCESS: Received response from backend configuration.")
            else:
                print("\nWARNING: Connection open but no text received.")
                
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    verify_gemini_connection()
