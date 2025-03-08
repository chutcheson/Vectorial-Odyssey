# Word Traverse

Word Traverse is a game that challenges Language Learning Models (LLMs) to navigate from a starting word to a target word by choosing intermediate words ("hops") that minimize semantic distance to the target.

## Game Concept

The game tests an LLM's ability to navigate semantic space by choosing the best next word from a set of options. At each step, the LLM is provided with four word choices:
- 2 words most similar to the current word
- 2 words least similar to the current word

The LLM must determine which word will get it closest to the target word.

## Features

- Support for multiple LLMs: Claude-3.7-Sonnet, GPT-4o, GPT-4o-mini
- Configurable number of game rounds (1, 5, or 10)
- Real-time visualization of word choices and decisions
- Scoring system based on completion time
- Summary of game performance

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3 (for word embedding generation)

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/word-traverse.git
   cd word-traverse
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. If you haven't already generated the word similarities:
   ```
   python word_similarity.py
   python hop_distance_calculator.py
   ```

4. Make sure your API keys are in the right location:
   - Anthropic API key in `materials/anthropic_api_key.txt`
   - OpenAI API key in `materials/openai_api_key.txt`

### Running the Game

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Game Mechanics

1. **Rounds**: Select 1, 5, or 10 rounds per game.
2. **Timing**: Each round lasts either 2 minutes or until the LLM reaches the target word.
3. **Scoring**: The round score is calculated as 120 minus the number of elapsed seconds until successful completion.
4. **Gameplay Flow**: 
   - The game starts with random start and target words
   - At each step, the LLM selects the best hop from 4 word choices
   - Selected words are tracked visually in sequence

## Technology Stack

- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js with Express
- APIs: OpenAI API, Anthropic API
- Word Embeddings: Generated using nomic-ai/nomic-embed-text-v1.5

## Design

The game's visual design is inspired by:
- Wabi-Sabi (appreciation for imperfection and natural simplicity)
- Brutalism (emphasis on raw functionality and visual clarity)

## Files Structure

- `/css` - Style sheets
- `/js` - Frontend JavaScript
- `/server` - Backend Node.js code
- `/materials` - API keys and word list
- `word_similarities.json` - Generated semantic similarities
- `annotated_word_similarities.json` - Similarities with hop distances

## License

MIT License