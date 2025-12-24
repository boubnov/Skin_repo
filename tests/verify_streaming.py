import requests
import json
import sys

# URL of the local backend
URL = "http://localhost:8000/chat/"

# Mock Key that triggers the MockLLM in chat.py
HEADERS = {
    "X-Goog-Api-Key": "mock_test_key",
    "Content-Type": "application/json"
}

DATA = {
    "message": "Where can I buy this?",
    "history": [],
    "user_location": "New York"
}

def test_streaming():
    print(f"Connecting to {URL}...")
    try:
        with requests.post(URL, json=DATA, headers=HEADERS, stream=True) as response:
            if response.status_code != 200:
                print(f"Error: Status Code {response.status_code}")
                print(response.text)
                return False

            print("Connection established. Reading stream...\n")
            
            chunk_count = 0
            for line in response.iter_lines():
                if line:
                    chunk_count += 1
                    decoded_line = line.decode('utf-8')
                    print(f"Chunk {chunk_count}: {decoded_line}")
                    
                    # Verify JSON structure
                    try:
                        data = json.loads(decoded_line)
                        if "type" not in data or "content" not in data:
                            print("FAIL: Invalid JSON structure")
                            return False
                    except json.JSONDecodeError:
                        print("FAIL: Could not decode JSON")
                        return False
            
            if chunk_count < 2:
                print(f"\nFAIL: Expected multiple chunks, got {chunk_count}. Streaming might not be working.")
                return False
            
            print(f"\nSUCCESS: Received {chunk_count} chunks.")
            return True

    except Exception as e:
        print(f"Exception during test: {e}")
        return False

if __name__ == "__main__":
    success = test_streaming()
    sys.exit(0 if success else 1)
