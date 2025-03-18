import requests

# Define the URL of the Flask app
url = "http://127.0.0.1:5000/count_tokens"

# Sample inputs to test
sample_inputs = [
    "Hi",
    "This is a test sentence.",
    "The quick brown fox jumps over the lazy dog.",
    "GPT-4 is amazing!",
    "Tokenization is an important step in NLP."
]

# Function to send a request and print the response
def test_token_count(text):
    # Prepare the JSON payload
    payload = {"text": text}
    
    # Send the POST request
    response = requests.post(url, json=payload)
    
    # Check if the request was successful
    if response.status_code == 200:
        # Print the token count
        token_count = response.json().get("token_count")
        print(f"Text: '{text}'")
        print(f"Token Count: {token_count}\n")
    else:
        # Print the error message
        print(f"Error: {response.status_code}")
        print(response.json().get("error", "Unknown error"))

# Test each sample input
for text in sample_inputs:
    test_token_count(text)