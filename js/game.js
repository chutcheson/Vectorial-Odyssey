document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const gameState = {
        currentModel: '',
        totalRounds: 0,
        currentRound: 0,
        startTime: 0,
        currentScore: 0,
        totalScore: 0,
        roundsData: [],
        currentWord: '',
        targetWord: '',
        pathTaken: [],
        timerInterval: null,
        gameActive: false
    };
    
    // DOM Elements
    const elements = {
        startScreen: document.getElementById('start-screen'),
        gameplayScreen: document.getElementById('gameplay-screen'),
        resultsScreen: document.getElementById('results-screen'),
        
        // Selection elements
        llmSelect: document.getElementById('llm-select'),
        roundsSelect: document.getElementById('rounds-select'),
        
        // Gameplay elements
        currentModel: document.getElementById('current-model'),
        currentRound: document.getElementById('current-round'),
        targetWord: document.getElementById('target-word'),
        currentScore: document.getElementById('current-score'),
        timer: document.getElementById('timer'),
        currentWord: document.getElementById('current-word'),
        wordChoices: document.getElementById('word-choices'),
        wordHistory: document.getElementById('word-history'),
        
        // Button elements
        startGameBtn: document.getElementById('start-game'),
        nextRoundBtn: document.getElementById('next-round'),
        endGameBtn: document.getElementById('end-game'),
        playAgainBtn: document.getElementById('play-again'),
        
        // Results elements
        finalScore: document.getElementById('final-score'),
        roundsSummary: document.getElementById('rounds-summary')
    };
    
    // API endpoints (assuming server is running on localhost:3002)
    const API = {
        BASE_URL: 'http://localhost:3002/api',
        RANDOM_WORDS: '/words/random',
        WORD_CHOICES: '/words/:word/choices',
        LLM_CHOOSE: '/llm/choose'
    };
    
    // Event Listeners
    elements.startGameBtn.addEventListener('click', startGame);
    elements.nextRoundBtn.addEventListener('click', startNextRound);
    elements.endGameBtn.addEventListener('click', endGame);
    elements.playAgainBtn.addEventListener('click', resetGame);
    
    // Timer functions
    function startTimer() {
        let timeLeft = 120; // 2 minutes in seconds
        gameState.startTime = Date.now();
        
        elements.timer.textContent = formatTime(timeLeft);
        
        gameState.timerInterval = setInterval(() => {
            timeLeft = 120 - Math.floor((Date.now() - gameState.startTime) / 1000);
            
            if (timeLeft <= 0) {
                clearInterval(gameState.timerInterval);
                timeLeft = 0;
                handleRoundEnd(false); // Round ended due to time expiration
            }
            
            elements.timer.textContent = formatTime(timeLeft);
        }, 1000);
    }
    
    function stopTimer() {
        clearInterval(gameState.timerInterval);
        const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        return timeElapsed;
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
    
    // Game functions
    async function startGame() {
        gameState.currentModel = elements.llmSelect.value;
        gameState.totalRounds = parseInt(elements.roundsSelect.value);
        gameState.currentRound = 1;
        gameState.totalScore = 0;
        gameState.roundsData = [];
        
        updateUI('start-game');
        await startRound();
    }
    
    // Function to update the current word display with distance info
    function updateCurrentWordDisplay() {
        const distanceDisplay = document.createElement('div');
        distanceDisplay.className = 'current-word-distance';
        
        // Clear existing content and recreate
        elements.currentWord.innerHTML = '';
        
        // Create word text
        const wordText = document.createElement('div');
        wordText.className = 'current-word-text';
        wordText.textContent = gameState.currentWord;
        elements.currentWord.appendChild(wordText);
        
        // Add distance info if available
        if (gameState.currentWordDistanceToTarget !== undefined) {
            // Create and add distance element
            if (gameState.currentWordDistanceToTarget > 0) {
                distanceDisplay.textContent = `${gameState.currentWordDistanceToTarget} hop${gameState.currentWordDistanceToTarget !== 1 ? 's' : ''} to target`;
                
                // Add color classes based on distance
                if (gameState.currentWordDistanceToTarget === 1) {
                    distanceDisplay.classList.add('distance-close');
                } else if (gameState.currentWordDistanceToTarget === 2) {
                    distanceDisplay.classList.add('distance-medium');
                } else {
                    distanceDisplay.classList.add('distance-far');
                }
            } else if (gameState.currentWordDistanceToTarget === 0) {
                distanceDisplay.textContent = `Target reached!`;
                distanceDisplay.classList.add('distance-target');
            } else {
                distanceDisplay.textContent = 'Unknown distance';
                distanceDisplay.classList.add('distance-unknown');
            }
            
            elements.currentWord.appendChild(distanceDisplay);
        }
    }

    async function startRound() {
        gameState.gameActive = true;
        gameState.pathTaken = [];
        
        // Update round display
        elements.currentRound.textContent = `${gameState.currentRound} / ${gameState.totalRounds}`;
        elements.currentModel.textContent = getModelDisplayName(gameState.currentModel);
        
        // Get random start and target words
        try {
            const response = await fetch(`${API.BASE_URL}${API.RANDOM_WORDS}?count=2`);
            const [startWord, targetWord] = await response.json();
            
            gameState.currentWord = startWord;
            gameState.targetWord = targetWord;
            gameState.pathTaken.push(startWord);
            
            // Update UI
            elements.currentWord.textContent = startWord; // Initial display without distance
            elements.targetWord.textContent = targetWord;
            
            // Initialize first history item
            const firstHistoryItem = document.createElement('div');
            firstHistoryItem.className = 'history-item';
            
            const wordEl = document.createElement('span');
            wordEl.className = 'history-word';
            wordEl.textContent = startWord;
            
            firstHistoryItem.appendChild(wordEl);
            elements.wordHistory.innerHTML = '';
            elements.wordHistory.appendChild(firstHistoryItem);
            
            // Get initial word choices (this will also update the current word display with distance)
            await getWordChoices();
            
            // Start timer
            startTimer();
        } catch (error) {
            console.error('Error starting round:', error);
            alert('Error starting round. Please try again.');
        }
    }
    
    async function getWordChoices() {
        try {
            const response = await fetch(`${API.BASE_URL}/words/${gameState.currentWord}/choices?target=${gameState.targetWord}`);
            const data = await response.json();
            
            // Extract choices and current word's distance to target
            const { choices, currentWordDistanceToTarget } = data;
            
            // Store the current word's distance
            gameState.currentWordDistanceToTarget = currentWordDistanceToTarget;
            
            // Update the current word display with distance info
            updateCurrentWordDisplay();
            
            // Display choices
            displayWordChoices(choices);
            
            // If LLM, automatically make a choice
            if (gameState.gameActive) {
                setTimeout(() => makeAIChoice(choices), 1000);
            }
        } catch (error) {
            console.error('Error getting word choices:', error);
        }
    }
    
    function displayWordChoices(choices) {
        elements.wordChoices.innerHTML = '';
        
        choices.forEach(choice => {
            const choiceEl = document.createElement('div');
            choiceEl.className = 'word-choice';
            choiceEl.setAttribute('data-word', choice.word);
            
            // Create word and distance elements
            const wordEl = document.createElement('span');
            wordEl.className = 'choice-word';
            wordEl.textContent = choice.word;
            
            const distanceEl = document.createElement('span');
            distanceEl.className = 'choice-distance';
            
            if (choice.distanceToTarget > 0) {
                distanceEl.textContent = `${choice.distanceToTarget} hop${choice.distanceToTarget !== 1 ? 's' : ''} to target`;
                
                // Add color classes based on distance
                if (choice.distanceToTarget === 1) {
                    distanceEl.classList.add('distance-close');
                } else if (choice.distanceToTarget === 2) {
                    distanceEl.classList.add('distance-medium');
                } else {
                    distanceEl.classList.add('distance-far');
                }
            } else {
                distanceEl.textContent = 'Unknown distance';
                distanceEl.classList.add('distance-unknown');
            }
            
            choiceEl.appendChild(wordEl);
            choiceEl.appendChild(distanceEl);
            
            elements.wordChoices.appendChild(choiceEl);
        });
    }
    
    async function makeAIChoice(choices) {
        if (!gameState.gameActive) return;
        
        try {
            const response = await fetch(`${API.BASE_URL}${API.LLM_CHOOSE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: gameState.currentModel,
                    currentWord: gameState.currentWord,
                    targetWord: gameState.targetWord,
                    choices: choices,
                    pathSoFar: gameState.pathTaken
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const { chosenWord } = data;
            
            // Highlight the chosen word
            highlightChoice(chosenWord);
            
            // Process the choice after a delay (for animation)
            setTimeout(() => processChoice(chosenWord), 1000);
        } catch (error) {
            console.error('Error making AI choice:', error);
            
            // If there's an error, just pick the first choice
            if (choices.length > 0) {
                const firstWord = choices[0].word;
                highlightChoice(firstWord);
                setTimeout(() => processChoice(firstWord), 1000);
            }
        }
    }
    
    function highlightChoice(word) {
        const choiceElements = document.querySelectorAll('.word-choice');
        
        choiceElements.forEach(el => {
            if (el.getAttribute('data-word').toLowerCase() === word.toLowerCase()) {
                el.classList.add('selected');
            } else {
                el.classList.add('fade-out');
            }
        });
    }
    
    function processChoice(chosenWord) {
        // Add to path
        gameState.pathTaken.push(chosenWord);
        
        // Add to history with distance if available
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // If we have the distance info from the choice, use it
        const choiceInfo = elements.wordChoices.querySelector(`[data-word="${chosenWord}"]`);
        const distanceEl = choiceInfo?.querySelector('.choice-distance');
        
        if (distanceEl) {
            // Create word element
            const wordEl = document.createElement('span');
            wordEl.className = 'history-word';
            wordEl.textContent = chosenWord;
            
            // Create distance element
            const historyDistance = document.createElement('span');
            historyDistance.className = distanceEl.className;
            historyDistance.textContent = distanceEl.textContent;
            
            // Add to history item
            historyItem.appendChild(wordEl);
            historyItem.appendChild(historyDistance);
        } else {
            // Simple fallback
            historyItem.textContent = chosenWord;
        }
        
        elements.wordHistory.appendChild(historyItem);
        elements.wordHistory.scrollTop = elements.wordHistory.scrollHeight;
        
        // Check if target reached
        if (chosenWord.toLowerCase() === gameState.targetWord.toLowerCase()) {
            handleRoundEnd(true);
            return;
        }
        
        // Update current word and continue
        gameState.currentWord = chosenWord;
        
        // Don't update the display directly here, as getWordChoices will do it with distance info
        
        // Get new choices (which will also update the current word display)
        getWordChoices();
    }
    
    function handleRoundEnd(success) {
        gameState.gameActive = false;
        
        // Stop timer
        const timeElapsed = stopTimer();
        
        // Calculate score
        const roundScore = success ? Math.max(0, 120 - timeElapsed) : 0;
        gameState.currentScore = roundScore;
        gameState.totalScore += roundScore;
        
        // Update score display
        elements.currentScore.textContent = roundScore;
        
        // Save round data
        gameState.roundsData.push({
            round: gameState.currentRound,
            startWord: gameState.pathTaken[0],
            targetWord: gameState.targetWord,
            success: success,
            score: roundScore,
            path: [...gameState.pathTaken],
            timeElapsed: timeElapsed
        });
        
        // Show appropriate button
        if (gameState.currentRound < gameState.totalRounds) {
            elements.nextRoundBtn.classList.remove('hidden');
        } else {
            elements.endGameBtn.classList.remove('hidden');
        }
        
        // Show result message
        const resultMessage = document.createElement('div');
        resultMessage.className = 'result-message';
        
        if (success) {
            resultMessage.textContent = `Target reached! Score: ${roundScore}`;
            resultMessage.classList.add('success');
        } else {
            resultMessage.textContent = 'Time\'s up!';
            resultMessage.classList.add('failure');
        }
        
        elements.gameplayScreen.appendChild(resultMessage);
    }
    
    function startNextRound() {
        gameState.currentRound++;
        elements.nextRoundBtn.classList.add('hidden');
        
        // Remove result message
        const resultMessage = document.querySelector('.result-message');
        if (resultMessage) {
            resultMessage.remove();
        }
        
        startRound();
    }
    
    function endGame() {
        updateUI('end-game');
        displayResults();
    }
    
    function displayResults() {
        // Display final score
        elements.finalScore.textContent = `Final Score: ${gameState.totalScore}`;
        
        // Display rounds summary
        elements.roundsSummary.innerHTML = '';
        
        gameState.roundsData.forEach(round => {
            const roundEl = document.createElement('div');
            roundEl.className = 'round-summary';
            
            roundEl.innerHTML = `
                <div class="round-info">
                    <div class="round-number">Round ${round.round}</div>
                    <div class="round-path">${round.startWord} → ${round.targetWord}</div>
                </div>
                <div class="round-result">
                    <div class="round-success">${round.success ? 'Success' : 'Failed'}</div>
                    <div class="round-score">Score: ${round.score}</div>
                </div>
            `;
            
            elements.roundsSummary.appendChild(roundEl);
        });
    }
    
    function resetGame() {
        updateUI('reset');
    }
    
    function updateUI(action) {
        switch (action) {
            case 'start-game':
                elements.startScreen.classList.add('hidden');
                elements.gameplayScreen.classList.remove('hidden');
                elements.resultsScreen.classList.add('hidden');
                break;
                
            case 'end-game':
                elements.startScreen.classList.add('hidden');
                elements.gameplayScreen.classList.add('hidden');
                elements.resultsScreen.classList.remove('hidden');
                break;
                
            case 'reset':
                elements.startScreen.classList.remove('hidden');
                elements.gameplayScreen.classList.add('hidden');
                elements.resultsScreen.classList.add('hidden');
                elements.nextRoundBtn.classList.add('hidden');
                elements.endGameBtn.classList.add('hidden');
                elements.currentScore.textContent = '0';
                elements.timer.textContent = '02:00';
                break;
        }
    }
    
    function getModelDisplayName(modelId) {
        switch (modelId) {
            case 'claude-3-7-sonnet-20250219':
                return 'Claude 3.7 Sonnet';
            case 'gpt-4o':
                return 'GPT-4o';
            case 'gpt-4o-mini':
                return 'GPT-4o-mini';
            default:
                return modelId;
        }
    }
});