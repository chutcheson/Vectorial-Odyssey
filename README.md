# Word Traverse - Semantic Word Similarities

This project calculates semantic similarities between words using the `nomic-ai/nomic-embed-text-v1.5` model from Hugging Face.

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Ensure your Hugging Face access token is in `materials/huggingface_access_token.txt`.

3. The word list is loaded from `materials/top_1000_nouns.txt`.

## Usage

Run the script:
```
python word_similarity.py
```

This will:
1. Load the Hugging Face model
2. Process the dictionary words
3. Generate embeddings for each word
4. Calculate pairwise similarities
5. Save the results to `word_similarities.json`

## Output

The output is a JSON file containing each word and its semantically similar words, ordered by similarity score:

```json
{
  "word1": [["word2", 0.92], ["word3", 0.85], ...],
  "word2": [["word1", 0.92], ["word4", 0.78], ...],
  ...
}
```

Each word entry contains a list of [word, similarity_score] pairs, sorted by similarity in descending order.