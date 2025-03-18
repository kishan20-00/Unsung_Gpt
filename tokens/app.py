from flask import Flask, request, jsonify
import tiktoken
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize the tokenizer
encoding = tiktoken.get_encoding("cl100k_base")

@app.route('/count_tokens', methods=['POST'])
def count_tokens():
    # Get the JSON data from the request
    data = request.json
    
    # Check if 'text' is in the JSON data
    if 'text' not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400
    
    # Get the input text
    text = data['text']
    print("Sent text: ", text)
    
    # Tokenize the text and count the tokens
    tokens = encoding.encode(text)
    token_count = len(tokens)
    print("Predicted Token Counts: ", token_count)
    
    # Return the token count as a JSON response
    return jsonify({"token_count": token_count})

if __name__ == '__main__':
    app.run(debug=True)