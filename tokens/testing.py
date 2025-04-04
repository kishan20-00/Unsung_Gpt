import requests
import json

# Configuration
ENDPOINT_URL = "https://llm-991598001448.us-central1.run.app/generate"  # Replace with your Cloud Run URL
TEST_PROMPT = "Hi"

# Example 1: Basic Request (Non-streaming)
def test_regular_request():
    payload = {
        "model": "gemma",          # Optional (default: "gemma")
        "prompt": TEST_PROMPT,
        "temperature": 0.7,        # Optional
        "top_p": 0.9,              # Optional
        "top_k": 50,               # Optional
        "max_length": 100,         # Optional
        "stream": False            # Explicitly set False for clarity
    }

    try:
        response = requests.post(ENDPOINT_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("\n=== Non-Streaming Response ===")
        print(f"Response: {data['response']}")
        print(f"Input Tokens: {data['input_tokens']}")
        print(f"Output Tokens: {data['output_tokens']}")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        print(f"Response: {response.text}")

# Example 2: Streaming Request
def test_streaming_request():
    payload = {
        "model": "distilgpt2",     # Testing model switching
        "prompt": TEST_PROMPT,
        "stream": True,             # Enable streaming
        "max_length": 50            # Shorter for demo
    }

    try:
        with requests.post(
            ENDPOINT_URL,
            json=payload,
            stream=True
        ) as response:
            response.raise_for_status()
            
            print("\n=== Streaming Response (Chunks) ===")
            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data:'):
                        chunk = json.loads(decoded[5:])
                        if not chunk['finished']:
                            print(chunk['response'], end='', flush=True)
                        else:
                            print(f"\n\n▲ Stream Complete ▲")
                            print(f"Input Tokens: {chunk['input_tokens']}")
                            print(f"Output Tokens: {chunk['output_tokens']}")
    
    except Exception as e:
        print(f"Streaming Error: {str(e)}")

if __name__ == "__main__":
    print("Testing LLM API Endpoint\n" + "="*40)
    test_regular_request()