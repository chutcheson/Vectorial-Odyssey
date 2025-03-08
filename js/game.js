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
        gameActive: false,
        currentReasoning: null
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
        toggleReasoning: document.getElementById('toggle-reasoning'),
        
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
    elements.toggleReasoning.addEventListener('click', toggleReasoningPanel);
    
    // Function to toggle reasoning panel
    function toggleReasoningPanel() {
        const reasoningElements = document.querySelectorAll('.reasoning-container');
        console.log('Found reasoning elements:', reasoningElements.length);
        
        // Toggle display of all reasoning containers
        reasoningElements.forEach(el => {
            console.log('Toggling element:', el);
            el.classList.toggle('hidden');
        });
        
        // Always toggle text for more feedback
        const newText = elements.toggleReasoning.textContent.includes('Show') ? 
            'Hide LLM Reasoning' : 'Show LLM Reasoning';
        elements.toggleReasoning.textContent = newText;
        
        // Force reasoning containers to be visible/hidden based on button text
        const shouldBeHidden = elements.toggleReasoning.textContent.includes('Show');
        reasoningElements.forEach(el => {
            if (shouldBeHidden) {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });
    }
    
    // Helper function to check if an element is scrolled to bottom
    function isScrolledToBottom(el) {
        // Allow for a small tolerance of 30px
        const tolerance = 30;
        return el.scrollHeight - el.scrollTop - el.clientHeight <= tolerance;
    }
    
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
        // Clear existing content and recreate
        elements.currentWord.innerHTML = '';
        
        // Create container to hold word and position the indicator properly
        elements.currentWord.style.position = 'relative';
        
        // Create word text
        const wordText = document.createElement('div');
        wordText.className = 'current-word-text';
        wordText.textContent = gameState.currentWord;
        elements.currentWord.appendChild(wordText);
        
        // Add hidden distance info for reference
        const distanceDisplay = document.createElement('div');
        distanceDisplay.className = 'current-word-distance';
        distanceDisplay.textContent = gameState.currentWordDistanceToTarget;
        elements.currentWord.appendChild(distanceDisplay);
        
        // Add distance indicator circle if available
        if (gameState.currentWordDistanceToTarget !== undefined) {
            if (gameState.currentWordDistanceToTarget > 0) {
                // Create indicator circle
                const indicatorEl = document.createElement('div');
                indicatorEl.className = `distance-indicator distance-${gameState.currentWordDistanceToTarget}`;
                indicatorEl.textContent = gameState.currentWordDistanceToTarget;
                elements.currentWord.appendChild(indicatorEl);
            } else if (gameState.currentWordDistanceToTarget === 0) {
                // Target reached
                const indicatorEl = document.createElement('div');
                indicatorEl.className = 'distance-indicator distance-target';
                indicatorEl.textContent = '✓';
                elements.currentWord.appendChild(indicatorEl);
            } else {
                // Unknown distance
                const indicatorEl = document.createElement('div');
                indicatorEl.className = 'distance-indicator distance-unknown';
                indicatorEl.textContent = '?';
                elements.currentWord.appendChild(indicatorEl);
            }
        }
    }

    async function startRound() {
        gameState.gameActive = true;
        gameState.pathTaken = [];
        
        // Update round display
        elements.currentRound.textContent = `${gameState.currentRound} / ${gameState.totalRounds}`;
        elements.currentModel.textContent = getModelDisplayName(gameState.currentModel);
        
        // Reset reasoning state
        gameState.currentReasoning = null;
        
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
            
            // Initialize first history item - empty at first
            elements.wordHistory.innerHTML = '';
            
            // Will be populated properly after getWordChoices is called and we have distance info
            
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
            
            // If this is the first word of the path, add it to history with distance info
            if (gameState.pathTaken.length === 1 && gameState.pathTaken[0] === gameState.currentWord) {
                // Add the first word to history with its distance
                const firstHistoryItem = document.createElement('div');
                firstHistoryItem.className = 'history-item';
                firstHistoryItem.style.position = 'relative';
                
                const wordEl = document.createElement('span');
                wordEl.className = 'history-word';
                wordEl.textContent = gameState.currentWord;
                firstHistoryItem.appendChild(wordEl);
                
                // Add distance indicator
                if (currentWordDistanceToTarget !== undefined && currentWordDistanceToTarget > 0) {
                    const indicatorEl = document.createElement('div');
                    indicatorEl.className = `distance-indicator distance-${currentWordDistanceToTarget}`;
                    indicatorEl.style.width = '18px';
                    indicatorEl.style.height = '18px';
                    indicatorEl.style.fontSize = '10px';
                    indicatorEl.textContent = currentWordDistanceToTarget;
                    firstHistoryItem.appendChild(indicatorEl);
                }
                
                elements.wordHistory.appendChild(firstHistoryItem);
            }
            
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
            
            // Create word element
            const wordEl = document.createElement('span');
            wordEl.className = 'choice-word';
            wordEl.textContent = choice.word;
            choiceEl.appendChild(wordEl);
            
            // Create hidden distance element (for reference when adding to history)
            const distanceEl = document.createElement('span');
            distanceEl.className = 'choice-distance';
            distanceEl.textContent = choice.distanceToTarget;
            choiceEl.appendChild(distanceEl);
            
            // Create distance indicator circle
            if (choice.distanceToTarget > 0) {
                const indicatorEl = document.createElement('div');
                indicatorEl.className = `distance-indicator distance-${choice.distanceToTarget}`;
                indicatorEl.textContent = choice.distanceToTarget;
                choiceEl.appendChild(indicatorEl);
                
                // Add data attribute for easy reference
                choiceEl.setAttribute('data-distance', choice.distanceToTarget);
            } else {
                const indicatorEl = document.createElement('div');
                indicatorEl.className = 'distance-indicator distance-unknown';
                indicatorEl.textContent = '?';
                choiceEl.appendChild(indicatorEl);
                
                // Add data attribute
                choiceEl.setAttribute('data-distance', 'unknown');
            }
            
            elements.wordChoices.appendChild(choiceEl);
        });
    }
    
    async function makeAIChoice(choices) {
        if (!gameState.gameActive) return;
        
        try {
            // Create a thinking indicator in the history panel
            const thinkingItem = document.createElement('div');
            thinkingItem.className = 'history-item thinking';
            thinkingItem.textContent = 'Thinking...';
            
            // Check if user was already scrolled to bottom before adding indicator
            const wasAtBottom = isScrolledToBottom(elements.wordHistory);
            
            // Add the thinking indicator
            elements.wordHistory.appendChild(thinkingItem);
            
            // Only auto-scroll if user was already at the bottom
            if (wasAtBottom) {
                elements.wordHistory.scrollTop = elements.wordHistory.scrollHeight;
            }
            
            const response = await fetch(`${API.BASE_URL}${API.LLM_CHOOSE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: gameState.currentModel,
                    currentWord: gameState.currentWord,
                    targetWord: gameState.targetWord,
                    choices: choices.map(c => ({
                        word: c.word,
                        distanceToTarget: c.distanceToTarget
                    })),
                    pathSoFar: gameState.pathTaken
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const { chosenWord, reasoning } = data;
            
            // Remove thinking indicator
            thinkingItem.remove();
            
            // Format the reasoning for display using our helper function
            const formattedReasoning = formatReasoning(reasoning, chosenWord, targetWord);
            
            // Store the reasoning to be added with the history item later
            gameState.currentReasoning = formattedReasoning;
            
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
    
    // Function to format the reasoning text (in case we need to add any formatting)
    function formatReasoning(reasoning, chosenWord, targetWord) {
        if (!reasoning) {
            return '<p>No reasoning provided by the model.</p>';
        }
        
        // Debug the incoming reasoning
        console.log('Raw reasoning to format:', reasoning);
        
        // More simple formatting approach
        const paragraphs = reasoning.split('\n\n');
        let formatted = '';
        
        paragraphs.forEach(para => {
            para = para.trim();
            if (para) {
                // Handle markdown-style lists
                if (para.match(/^[\*\-]/m)) {
                    // Convert to HTML list
                    const items = para.split(/\n[\*\-] /);
                    formatted += '<ul>';
                    items.forEach(item => {
                        if (item.trim()) {
                            formatted += `<li>${item.replace(/^[\*\-] /, '')}</li>`;
                        }
                    });
                    formatted += '</ul>';
                } else {
                    formatted += `<p>${para.replace(/\n/g, '<br>')}</p>`;
                }
            }
        });
        
        return formatted || '<p>Analysis was formatted but empty.</p>';
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
        
        // Add to history with distance indicator
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.style.position = 'relative'; // For positioning the indicator
        
        // If we have the distance info from the choice, use it
        const choiceInfo = elements.wordChoices.querySelector(`[data-word="${chosenWord}"]`);
        const distanceAttr = choiceInfo?.getAttribute('data-distance');
        
        // Create word element
        const wordEl = document.createElement('span');
        wordEl.className = 'history-word';
        wordEl.textContent = chosenWord;
        historyItem.appendChild(wordEl);
        
        // Add distance indicator if available
        if (distanceAttr) {
            // Get the distance value from the hidden element
            const distanceValue = choiceInfo.querySelector('.choice-distance')?.textContent;
            
            if (distanceValue && !isNaN(parseInt(distanceValue))) {
                const distance = parseInt(distanceValue);
                
                // Create indicator circle
                const indicatorEl = document.createElement('div');
                indicatorEl.className = `distance-indicator distance-${distance}`;
                indicatorEl.style.width = '26px'; // Increased size for better visibility
                indicatorEl.style.height = '26px';
                indicatorEl.style.fontSize = '12px';
                indicatorEl.textContent = distance;
                historyItem.appendChild(indicatorEl);
            } else if (distanceAttr === 'unknown') {
                // Unknown distance
                const indicatorEl = document.createElement('div');
                indicatorEl.className = 'distance-indicator distance-unknown';
                indicatorEl.style.width = '26px'; // Match the size of numbered indicators
                indicatorEl.style.height = '26px';
                indicatorEl.style.fontSize = '12px';
                indicatorEl.textContent = '?';
                historyItem.appendChild(indicatorEl);
            }
        } else {
            // No distance info available, just show the word
            historyItem.textContent = chosenWord;
        }
        
        // Add reasoning for this choice if available
        if (gameState.currentReasoning) {
            // Create a toggle button
            const reasoningToggle = document.createElement('button');
            reasoningToggle.className = 'reasoning-toggle';
            reasoningToggle.textContent = 'Show reasoning';
            historyItem.appendChild(reasoningToggle);
            
            // Create reasoning container (hidden by default)
            const reasoningContainer = document.createElement('div');
            reasoningContainer.className = 'reasoning-container hidden';
            reasoningContainer.innerHTML = gameState.currentReasoning;
            historyItem.appendChild(reasoningContainer);
            
            // Debugging - log the structure we're creating
            console.log('Created reasoning container:', reasoningContainer);
            console.log('With content:', gameState.currentReasoning);
            
            // Add toggle functionality with more robust handling
            reasoningToggle.addEventListener('click', function(event) {
                // Prevent event bubbling to avoid any interference
                event.stopPropagation(); 
                
                console.log('Toggle clicked for:', reasoningContainer);
                const isHidden = reasoningContainer.classList.contains('hidden');
                
                // Explicitly set the visibility instead of toggling
                if (isHidden) {
                    reasoningContainer.classList.remove('hidden');
                    reasoningToggle.textContent = 'Hide reasoning';
                } else {
                    reasoningContainer.classList.add('hidden');
                    reasoningToggle.textContent = 'Show reasoning';
                }
            });
            
            // Clear the current reasoning for the next choice
            gameState.currentReasoning = null;
        }
        
        // Check if user was already scrolled to bottom before adding new item
        const wasAtBottom = isScrolledToBottom(elements.wordHistory);
        
        // Add the item
        elements.wordHistory.appendChild(historyItem);
        
        // Only auto-scroll if user was already at the bottom
        if (wasAtBottom) {
            elements.wordHistory.scrollTop = elements.wordHistory.scrollHeight;
        }
        
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