# Word Traverse Project Summary

## Project Overview

Word Traverse is an interactive web game that challenges Language Learning Models (LLMs) to navigate semantic pathways between words. The game tests an LLM's ability to understand semantic relationships by making it choose words that help it move closer to a target word.

## Project Components

### 1. Word Embedding Generation
- `word_similarity.py`: Generates word embeddings using nomic-ai/nomic-embed-text-v1.5 model
- `hop_distance_calculator.py`: Calculates minimum hop distances between words in semantic space
- `find_longest_paths.py`: Analyzes the longest semantic paths in the word graph

### 2. Backend Infrastructure
- `server/server.js`: Express server providing API endpoints for:
  - Getting random words
  - Retrieving word choices based on similarity
  - Requesting LLM decisions through Anthropic and OpenAI APIs
- API connections to Anthropic (Claude-3.7-Sonnet) and OpenAI (GPT-4o, GPT-4o-mini)

### 3. Frontend Implementation
- `index.html`: Game structure with start, gameplay, and results screens
- `css/style.css`: Wabi-Sabi and Brutalist-inspired design system
- `js/game.js`: Game logic, UI interactions, and API communication

### 4. Documentation
- `README.md`: Project overview, setup instructions, and game mechanics
- `game_screenshots.md`: Descriptions of the game's visual appearance
- `PROJECT_SUMMARY.md`: Comprehensive project summary (this file)

## Technical Implementation Details

### Word Embeddings and Semantic Data
1. The 1,000 most common English nouns were embedded using the nomic-ai/nomic-embed-text-v1.5 model
2. Semantic similarities were calculated using cosine similarity between word vectors
3. Graph analysis showed the minimum number of hops required to get from one word to another
4. For each word, we store:
   - Semantic similarity to all other words
   - Minimum hop distance using synonym/antonym connections

### Game Mechanics
1. **Word Selection**: For each step, four words are presented:
   - 2 most semantically similar words to the current word (synonyms)
   - 2 least semantically similar words to the current word (antonyms)
2. **LLM Navigation**: The selected LLM must choose which word gets it closer to the target
3. **Scoring**: Based on completion time (120 seconds maximum per round)
4. **Multiple Rounds**: Options for 1, 5, or 10 rounds of play

### Design Philosophy
The game's aesthetic combines two design approaches:
1. **Wabi-Sabi**:
   - Appreciation for imperfection and natural simplicity
   - Rough textures and naturally imperfect borders
   - Muted, earthy color palette
2. **Brutalism**:
   - Emphasis on raw functionality
   - Bold, clear typography
   - Intentional rawness in layout and interactions

## Running the Project

### Setup Requirements
- Node.js and npm for the backend server
- API keys for Anthropic and OpenAI
- Pre-generated word similarities database

### Startup Process
1. Install dependencies with `npm install`
2. Start the server with `npm start`
3. Access the game at http://localhost:3000

## Future Enhancements

Possible future improvements include:
1. Multiplayer mode for pitting different LLMs against each other
2. Additional word sets beyond the 1,000 most common nouns
3. Visualization of the semantic graph and pathways
4. Performance analytics to compare different LLM strategies
5. Custom difficulty levels by manipulating the similarity choices

## Conclusion

Word Traverse demonstrates how LLMs understand and navigate semantic relationships between words. The game provides an engaging visualization of how these models make decisions when traversing semantic space, while offering insights into the strengths and limitations of different LLM approaches to semantic navigation.

This project combines cutting-edge NLP technologies with an aesthetically pleasing game interface, making abstract concepts like semantic embeddings and vector space accessible and entertaining.