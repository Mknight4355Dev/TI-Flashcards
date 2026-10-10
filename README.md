# Tandem Instructor Flashcards

Run `npm start` from this folder, then open http://localhost:3000. No dependencies need to be installed.

Click anywhere on a card to flip between the question and answer. Use Previous/Next or the arrow keys to change cards. Space or Enter also flips the card. Each new card starts on its question side.

Choose the Sigma or USPA deck on the opening screen. Use **Back to decks** or Escape at any point to return to the selection screen. Selecting a deck starts at its first question.

The app reads `sigma-tandem-flashcards.json` and `uspa-ti-evaluation-flashcards.json` directly. Questions retain their original choice order; answers include explanations, review notes, references, and linked procedure steps, and practice prompts when provided. All 84 cards are available, including personal confirmations and questions needing review. This is an unscored study app.

Serve the app using the included server rather than opening index.html directly, because browsers restrict fetching JSON from local file URLs. Stop the server with Ctrl+C.

To add a deck, include its filename in `deckFiles` in `app.js` and add its route to `files` in `server.js`.
