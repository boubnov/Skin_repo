#!/usr/bin/env python3
"""
Quick Chat Test - Simple script to test the chat API directly.

Usage:
    python quick_test.py "Your question here"
    python quick_test.py --image path/to/image.jpg "Describe this"
"""

import os
import sys
import json
import base64
import argparse
import requests

BASE_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

def send_message(message: str, image_path: str = None) -> None:
    """Send a message to the chat API and stream the response."""
    
    # Prepare image if provided
    image_base64 = None
    if image_path and os.path.exists(image_path):
        with open(image_path, 'rb') as f:
            image_base64 = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"
        print(f"📷 Image loaded: {image_path}")
    
    # Make request
    payload = {
        "message": message,
        "history": [],
        "user_location": None,
        "image_base64": image_base64
    }
    
    print(f"\n💬 You: {message}")
    print("\n🤖 AI: ", end="", flush=True)
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/",
            json=payload,
            stream=True,
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"\n❌ Error: {response.status_code} - {response.text}")
            return
        
        products = []
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    if data['type'] == 'text':
                        print(data['content'], end="", flush=True)
                    elif data['type'] == 'products':
                        products.extend(data['content'])
                except json.JSONDecodeError:
                    pass
        
        print()  # New line
        
        if products:
            print(f"\n📦 Products recommended ({len(products)}):")
            for p in products[:5]:
                name = p.get('name', 'Unknown')
                brand = p.get('brand', '')
                print(f"   • {name} ({brand})")
                if p.get('metadata', {}).get('affiliate_url'):
                    print(f"     🔗 {p['metadata']['affiliate_url']}")
    
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Could not connect to {BASE_URL}. Is the backend running?")
    except Exception as e:
        print(f"\n❌ Error: {e}")

def interactive_mode():
    """Run in interactive mode."""
    print("\n" + "="*50)
    print("🧴 Skincare AI - Quick Test")
    print("Type your questions. Type 'quit' to exit.")
    print("="*50)
    
    while True:
        try:
            message = input("\n💬 You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if message.lower() in ('quit', 'exit', 'q'):
            break
        elif not message:
            continue
        
        send_message(message)

def main():
    parser = argparse.ArgumentParser(description='Quick Chat Test')
    parser.add_argument('message', nargs='?', help='Message to send')
    parser.add_argument('--image', '-i', type=str, help='Path to image file')
    parser.add_argument('--interactive', action='store_true', help='Interactive mode')
    args = parser.parse_args()
    
    print(f"🔗 Backend: {BASE_URL}")
    
    if args.interactive or not args.message:
        interactive_mode()
    else:
        send_message(args.message, args.image)

if __name__ == '__main__':
    main()
