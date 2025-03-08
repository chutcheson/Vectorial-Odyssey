const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Load word similarity data
let wordSimilarities = {};

try {
    const data = fs.readFileSync(path.join(__dirname, '../annotated_word_similarities.json'), 'utf8');
    wordSimilarities = JSON.parse(data);
    console.log(`Loaded ${Object.keys(wordSimilarities).length} words with similarity data`);
} catch (error) {
    console.error('Error loading word similarities:', error);
    process.exit(1);
}

// Set up API keys
const ANTHROPIC_API_KEY = fs.readFileSync(path.join(__dirname, '../materials/anthropic_api_key.txt'), 'utf8').trim();
const OPENAI_API_KEY = fs.readFileSync(path.join(__dirname, '../materials/openai_api_key.txt'), 'utf8').trim();

// Helper functions
function getRandomWord() {
    const words = Object.keys(wordSimilarities);
    return words[Math.floor(Math.random() * words.length)];
}

function getWordChoices(currentWord, targetWord) {
    if (!wordSimilarities[currentWord]) {
        return { error: `Word '${currentWord}' not found in database` };
    }

    const allSimilarities = wordSimilarities[currentWord];
    
    // Get 2 most similar words
    const mostSimilar = allSimilarities.slice(0, 2).map(item => {
        // Find distance from this word to target
        const distanceToTarget = wordSimilarities[item.word]?.find(w => w.word === targetWord)?.hop_distance || -1;
        
        return {
            word: item.word,
            similarity: item.similarity,
            type: 'similar',
            distanceToTarget: distanceToTarget
        };
    });
    
    // Get 2 least similar words
    const leastSimilar = allSimilarities.slice(-2).map(item => {
        // Find distance from this word to target
        const distanceToTarget = wordSimilarities[item.word]?.find(w => w.word === targetWord)?.hop_distance || -1;
        
        return {
            word: item.word,
            similarity: item.similarity,
            type: 'dissimilar',
            distanceToTarget: distanceToTarget
        };
    });
    
    // Combine and shuffle
    const choices = [...mostSimilar, ...leastSimilar];
    
    // Fisher-Yates shuffle
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    
    return choices;
}

async function getAnthropicChoices(currentWord, targetWord, choices, pathSoFar) {
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-7-sonnet-20250219',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: `You are playing a word navigation game.

Current word: ${currentWord}
Target word: ${targetWord}
Path taken so far: ${pathSoFar.join(' → ')}

You have these choices:
${choices.map(c => `- ${c.word}`).join('\n')}

Game rules: Navigate from your current word to the target word by selecting the best word at each step. For each choice, you are always given exactly four words:
- Two words that are semantically closest to your current word
- Two words that are semantically furthest from your current word
All words come from a corpus of 1000 common nouns.

Analyze the word choices and select the one that will help you reach the target word "${targetWord}" in the fewest possible steps.

Format your response as follows:
<analysis>
Your reasoning...
</analysis>

<choice>word</choice>`
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                }
            }
        );
        
        const fullResponse = response.data.content[0].text.trim();
        
        // Extract choice and analysis
        let analysis = "";
        let chosenWord = "";
        
        const analysisMatch = fullResponse.match(/<analysis>([\s\S]*?)<\/analysis>/);
        if (analysisMatch && analysisMatch[1]) {
            analysis = analysisMatch[1].trim();
        }
        
        const choiceMatch = fullResponse.match(/<choice>(.*?)<\/choice>/);
        if (choiceMatch && choiceMatch[1]) {
            chosenWord = choiceMatch[1].trim();
        } else {
            // Fallback: just get the last word if no tags found
            chosenWord = fullResponse.split('\n').pop().trim();
        }
        
        return { chosenWord, reasoning: analysis };
    } catch (error) {
        console.error('Error with Anthropic API:', error.response?.data || error.message);
        return { chosenWord: choices[0].word, reasoning: "Error getting reasoning" }; // Fallback
    }
}

async function getOpenAIChoices(model, currentWord, targetWord, choices, pathSoFar) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are playing a word navigation game that requires semantic reasoning.'
                    },
                    {
                        role: 'user',
                        content: `You are playing a word navigation game.

Current word: ${currentWord}
Target word: ${targetWord}
Path taken so far: ${pathSoFar.join(' → ')}

You have these choices:
${choices.map(c => `- ${c.word}`).join('\n')}

Game rules: Navigate from your current word to the target word by selecting the best word at each step. For each choice, you are always given exactly four words:
- Two words that are semantically closest to your current word
- Two words that are semantically furthest from your current word
All words come from a corpus of 1000 common nouns.

Analyze the word choices and select the one that will help you reach the target word "${targetWord}" in the fewest possible steps.

Format your response as follows:
<analysis>
Your reasoning...
</analysis>

<choice>word</choice>`
                    }
                ],
                temperature: 0
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            }
        );
        
        const fullResponse = response.data.choices[0].message.content.trim();
        
        // Extract choice and analysis
        let analysis = "";
        let chosenWord = "";
        
        const analysisMatch = fullResponse.match(/<analysis>([\s\S]*?)<\/analysis>/);
        if (analysisMatch && analysisMatch[1]) {
            analysis = analysisMatch[1].trim();
        }
        
        const choiceMatch = fullResponse.match(/<choice>(.*?)<\/choice>/);
        if (choiceMatch && choiceMatch[1]) {
            chosenWord = choiceMatch[1].trim();
        } else {
            // Fallback: just get the last word if no tags found
            chosenWord = fullResponse.split('\n').pop().trim();
        }
        
        return { chosenWord, reasoning: analysis };
    } catch (error) {
        console.error('Error with OpenAI API:', error.response?.data || error.message);
        return { chosenWord: choices[0].word, reasoning: "Error getting reasoning" }; // Fallback
    }
}

// Routes
app.get('/api/words/random', (req, res) => {
    const count = req.query.count || 2;
    const result = [];
    
    for (let i = 0; i < count; i++) {
        result.push(getRandomWord());
    }
    
    res.json(result);
});

app.get('/api/words/:word/choices', (req, res) => {
    const word = req.params.word.toLowerCase();
    const targetWord = req.query.target?.toLowerCase();
    
    if (!targetWord) {
        return res.status(400).json({ error: "Missing 'target' query parameter" });
    }
    
    const choices = getWordChoices(word, targetWord);
    
    if (choices.error) {
        return res.status(404).json(choices);
    }
    
    // Also add the current word's distance to target
    const currentWordDistanceToTarget = wordSimilarities[word]?.find(w => w.word === targetWord)?.hop_distance || -1;
    
    res.json({
        choices,
        currentWordDistanceToTarget
    });
});

app.post('/api/llm/choose', async (req, res) => {
    const { model, currentWord, targetWord, choices, pathSoFar } = req.body;
    
    if (!model || !currentWord || !targetWord || !choices || !pathSoFar) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        let result;
        
        if (model === 'claude-3-7-sonnet-20250219') {
            result = await getAnthropicChoices(currentWord, targetWord, choices, pathSoFar);
        } else if (model === 'gpt-4o' || model === 'gpt-4o-mini') {
            result = await getOpenAIChoices(model, currentWord, targetWord, choices, pathSoFar);
        } else {
            return res.status(400).json({ error: 'Invalid model specified' });
        }
        
        let { chosenWord, reasoning } = result;
        
        // Verify the chosen word is in the list of choices
        const validWord = choices.find(c => c.word.toLowerCase() === chosenWord.toLowerCase());
        
        if (!validWord) {
            // If LLM returns invalid word, just use the first choice as fallback
            chosenWord = choices[0].word;
            reasoning += "\n\n(Note: The model initially selected an invalid word, so the first choice was used instead.)";
        }
        
        res.json({ chosenWord, reasoning });
    } catch (error) {
        console.error('Error in LLM choice:', error);
        res.status(500).json({ error: 'Error processing LLM choice' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});