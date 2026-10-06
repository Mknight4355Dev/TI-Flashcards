# Sigma Tandem Flashcards

Run `npm start` from this folder, then open http://localhost:3000. No dependencies need to be installed.

Click anywhere on a card to flip between the question and answer. Use Previous/Next or the arrow keys to change cards. Space or Enter also flips the card. Each new card starts on its question side.

The app reads `sigma-tandem-flashcards.json` directly. Questions retain their original choice order; answers include explanations, review notes, references, and linked procedure steps. All 84 cards are available, including personal confirmations and questions needing review. This is an unscored study app.

Serve the app using the included server rather than opening index.html directly, because browsers restrict fetching JSON from local file URLs. Stop the server with Ctrl+C.
