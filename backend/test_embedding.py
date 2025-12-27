import os
import sys

def test_embedding():
    api_key = os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("OPENAI_BASE_URL")
    model = "openai_text_embedding_3_large"
    
    print(f"Testing embedding with:")
    print(f"URL: {base_url}")
    print(f"Model: {model}")
    print(f"Key (masked): {api_key[:8]}... if present")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)
        print("Sending request...")
        resp = client.embeddings.create(
            input=["This is a test product description for skin care."],
            model=model
        )
        vec = resp.data[0].embedding
        print(f"✅ Success! Generated embedding of length {len(vec)}")
        print(f"First 5 values: {vec[:5]}...")
    except ImportError:
        print("❌ OpenAI library not installed.")
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    test_embedding()
