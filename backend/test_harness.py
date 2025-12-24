#!/usr/bin/env python3
"""
Chat Testing Harness
Run tests against the skincare agent with different configurations.

Usage:
    python test_harness.py                    # Run all test cases
    python test_harness.py --interactive      # Interactive chat mode
    python test_harness.py --compare          # Compare multiple models
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import Optional
import yaml

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_config(config_path: str = "config.yaml") -> dict:
    """Load configuration from YAML file."""
    if not os.path.exists(config_path):
        config_path = "config.example.yaml"
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Substitute environment variables
    api_key = config['api'].get('api_key', '')
    if api_key.startswith('${') and api_key.endswith('}'):
        env_var = api_key[2:-1]
        config['api']['api_key'] = os.getenv(env_var, '')
    
    return config

def create_llm(config: dict):
    """Create LLM instance based on config."""
    from langchain_openai import ChatOpenAI
    
    return ChatOpenAI(
        model=config['api']['model'],
        api_key=config['api']['api_key'],
        base_url=config['api']['base_url'],
        temperature=config.get('agent', {}).get('temperature', 0),
    )

def run_single_test(agent, test_case: dict, verbose: bool = True) -> dict:
    """Run a single test case and return results."""
    name = test_case.get('name', 'Unnamed test')
    user_input = test_case.get('input', '')
    expected = test_case.get('expected_behavior', '')
    image_path = test_case.get('image', None)
    
    if verbose:
        print(f"\n{'='*50}")
        print(f"Test: {name}")
        print(f"Input: {user_input}")
        print(f"Expected: {expected}")
        print("-"*50)
    
    # Prepare image if provided
    image_base64 = None
    if image_path and os.path.exists(image_path):
        import base64
        with open(image_path, 'rb') as f:
            image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    # Run the agent
    start_time = datetime.now()
    response_parts = []
    products = []
    
    try:
        for chunk in agent.run_stream(user_input, [], image_base64=image_base64):
            data = json.loads(chunk.strip())
            if data['type'] == 'text':
                response_parts.append(data['content'])
            elif data['type'] == 'products':
                products.extend(data['content'])
    except Exception as e:
        response_parts.append(f"ERROR: {str(e)}")
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    full_response = ''.join(response_parts)
    
    if verbose:
        print(f"Response: {full_response[:500]}...")
        if products:
            print(f"Products found: {len(products)}")
            for p in products[:3]:
                print(f"  - {p.get('name', 'Unknown')}")
        print(f"Duration: {duration:.2f}s")
    
    return {
        'name': name,
        'input': user_input,
        'expected': expected,
        'response': full_response,
        'products': products,
        'duration': duration,
        'timestamp': datetime.now().isoformat()
    }

def run_interactive(agent):
    """Interactive chat mode for manual testing."""
    print("\n" + "="*50)
    print("Interactive Chat Mode")
    print("Type 'quit' to exit, 'clear' to reset history")
    print("="*50)
    
    history = []
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
        except EOFError:
            break
            
        if user_input.lower() == 'quit':
            break
        elif user_input.lower() == 'clear':
            history = []
            print("History cleared.")
            continue
        elif not user_input:
            continue
        
        print("AI: ", end="", flush=True)
        
        response_parts = []
        for chunk in agent.run_stream(user_input, history):
            data = json.loads(chunk.strip())
            if data['type'] == 'text':
                print(data['content'], end="", flush=True)
                response_parts.append(data['content'])
            elif data['type'] == 'products':
                print(f"\n[Found {len(data['content'])} products]", end="")
        
        print()  # New line after response
        
        # Add to history
        history.append({'role': 'user', 'content': user_input})
        history.append({'role': 'model', 'content': ''.join(response_parts)})

def main():
    parser = argparse.ArgumentParser(description='Chat Testing Harness')
    parser.add_argument('--config', default='config.yaml', help='Config file path')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    parser.add_argument('--test', '-t', type=str, help='Run specific test by name')
    parser.add_argument('--output', '-o', type=str, help='Output results to JSON file')
    parser.add_argument('--quiet', '-q', action='store_true', help='Quiet mode')
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)
    
    print(f"Model: {config['api']['model']}")
    print(f"Base URL: {config['api']['base_url']}")
    
    # Create LLM and agent
    llm = create_llm(config)
    
    # Import agent
    from app.agent import SkincareAgent
    
    # Create mock DB session for testing (no actual DB needed for chat)
    class MockDB:
        pass
    
    agent = SkincareAgent(llm=llm, db_session=MockDB())
    
    if args.interactive:
        run_interactive(agent)
    else:
        # Run test cases
        test_cases = config.get('test_cases', [])
        
        if args.test:
            test_cases = [t for t in test_cases if t.get('name') == args.test]
        
        results = []
        for test_case in test_cases:
            result = run_single_test(agent, test_case, verbose=not args.quiet)
            results.append(result)
        
        # Save results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\nResults saved to {args.output}")
        
        # Summary
        print(f"\n{'='*50}")
        print(f"Completed {len(results)} tests")
        avg_duration = sum(r['duration'] for r in results) / len(results) if results else 0
        print(f"Average response time: {avg_duration:.2f}s")

if __name__ == '__main__':
    main()
