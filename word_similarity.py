import os
import json
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np
from tqdm import tqdm
from sklearn.metrics.pairwise import cosine_similarity

# Step 1: Load the Hugging Face model
def load_model():
    # Load Hugging Face access token
    with open("materials/huggingface_access_token.txt", "r") as f:
        hf_token = f.read().strip()
    
    # Set the token as an environment variable
    os.environ["HUGGINGFACE_TOKEN"] = hf_token
    
    # Load model and tokenizer
    print("Loading model and tokenizer...")
    model_name = "nomic-ai/nomic-embed-text-v1.5"
    tokenizer = AutoTokenizer.from_pretrained(model_name, token=hf_token, trust_remote_code=True)
    model = AutoModel.from_pretrained(model_name, token=hf_token, trust_remote_code=True)
    
    return tokenizer, model

# Step 2: Load and clean dictionary
def load_dictionary(file_path="materials/top_1000_nouns.txt"):
    print("Loading dictionary...")
    words = []
    with open(file_path, "r") as f:
        for line in f:
            if line.strip():
                parts = line.strip().split()
                # If the line has multiple parts (number and word)
                if len(parts) > 1:
                    # The last part should be the word
                    words.append(parts[-1])
                else:
                    # Otherwise just take the whole line
                    words.append(parts[0])
    
    # Clean and standardize words
    words = [word.lower().strip() for word in words]
    
    print(f"Loaded {len(words)} words from dictionary")
    
    return words

# Step 3: Generate embeddings
def generate_embeddings(words, tokenizer, model, batch_size=32):
    print("Generating embeddings...")
    embeddings = []
    
    # Process in batches for efficiency
    for i in tqdm(range(0, len(words), batch_size)):
        batch = words[i:i+batch_size]
        
        # Tokenize
        inputs = tokenizer(batch, padding=True, truncation=True, return_tensors="pt")
        
        # Generate embeddings
        with torch.no_grad():
            outputs = model(**inputs)
            
        # Use [CLS] token embedding or mean of the last hidden state
        batch_embeddings = outputs.last_hidden_state[:, 0, :].numpy()
        embeddings.append(batch_embeddings)
    
    # Concatenate all batches
    all_embeddings = np.vstack(embeddings)
    
    return all_embeddings

# Step 4: Calculate similarities
def calculate_similarities(words, embeddings):
    print("Calculating similarities...")
    # Compute pairwise cosine similarities
    similarity_matrix = cosine_similarity(embeddings)
    
    # Create dictionary to store word similarities
    word_similarities = {}
    
    # For each word, find most similar words
    for i, word in enumerate(words):
        # Get similarity scores for this word
        similarities = similarity_matrix[i]
        
        # Create list of (word, similarity) tuples
        word_sim_pairs = [(words[j], float(similarities[j])) for j in range(len(words)) if i != j]
        
        # Sort by similarity score (descending)
        word_sim_pairs.sort(key=lambda x: x[1], reverse=True)
        
        # Store in dictionary
        word_similarities[word] = word_sim_pairs
    
    return word_similarities

# Step 5: Save results
def save_results(word_similarities, output_file="word_similarities.json"):
    print(f"Saving results to {output_file}...")
    with open(output_file, "w") as f:
        json.dump(word_similarities, f, indent=2)

def main():
    # Step 1: Load model
    tokenizer, model = load_model()
    
    # Step 2: Load dictionary
    words = load_dictionary()
    
    # Step 3: Generate embeddings
    embeddings = generate_embeddings(words, tokenizer, model)
    
    # Step 4: Calculate similarities
    word_similarities = calculate_similarities(words, embeddings)
    
    # Step 5: Save results
    save_results(word_similarities)
    
    print("Done!")

if __name__ == "__main__":
    main()