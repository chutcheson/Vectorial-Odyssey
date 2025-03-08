# Vectorial Odyssey - Example LLM Prompt and Response

## Prompt Sent to LLM:

```
You are playing a word navigation game.

Current word: water
Target word: mountain
Path taken so far: river → lake → water

You have these choices:
- ocean
- stream
- rock
- hill

Game rules: Navigate from your current word to the target word by selecting the best word at each step. For each choice, you are always given exactly four words:
- Two words that are semantically closest to your current word
- Two words that are semantically furthest from your current word
All words come from a corpus of 1000 common nouns.

First, analyze each word choice in 1-2 sentences, explaining its semantic relationship to both the current word and target word.
Then, choose the word that will help you reach the target word "mountain" in the fewest possible steps.

Format your response as follows:
<analysis>
Your reasoning about each word choice...
</analysis>

<choice>word</choice>
```

## Example LLM Response:

```
<analysis>
- ocean: Ocean has a strong semantic connection to "water" as both are bodies of water, but it takes us further from "mountain" since oceans and mountains are typically distant geographic features.

- stream: Stream is closely related to "water" as it's a flowing body of water, and streams can be found on mountains, creating a potential path towards our target.

- rock: Rock is somewhat distant from "water" semantically, but very close to "mountain" since mountains are largely made of rock formations, making this an excellent stepping stone.

- hill: Hill is not closely related to "water" but is extremely close to "mountain" as hills and mountains are both elevated landforms, differing primarily in size and scale.
</analysis>

<choice>rock</choice>
```

## How This Works in the Game:

1. The LLM receives information about the current state of the game: current word, target word, and path taken.

2. It's given four choices: two that are semantically closest to the current word and two that are semantically furthest from it.

3. The LLM analyzes each choice, considering both its relationship to the current word and to the target word.

4. The LLM selects the word it believes will lead to the target in the fewest steps.

5. The game extracts the chosen word from the `<choice>` tags and uses it for the next move.

6. The reasoning from the `<analysis>` tags is stored and can be viewed by clicking "Show reasoning" next to each move.