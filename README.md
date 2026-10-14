# Tandem Instructor Flashcards

Run `npm start` from this folder, then open http://localhost:3000. No dependencies need to be installed.

Click anywhere on a card to flip between the question and answer. Use Previous/Next, the arrow keys, or swipe left/right on a card to change cards. Swipe left advances (and restarts after the last card); swipe right goes back. Space or Enter also flips the card. Each new card starts on its question side.

Choose from the Sigma, USPA, EP Knowledge / Performance Test, EP Study Guide, Tandem Canopy Piloting Proficiency, and Tandem Skydive Checklist decks on the opening screen. Use **Back to decks** or Escape at any point to return to the selection screen. Selecting a deck starts at its first question.

The app reads the six `*-flashcards.json` data sets directly. Questions retain their original choice order; answers include explanations, review notes, references, and linked procedure steps, and practice prompts when provided. All 323 cards are available across the six decks, including personal confirmations and questions needing review. This is an unscored study app.

Serve the app using the included server rather than opening index.html directly, because browsers restrict fetching JSON from local file URLs. Stop the server with Ctrl+C.

To add a deck, include its filename in `deckFiles` in `app.js` and add its route to `files` in `server.js`.

The separate [Android version](mobile/README.md) lives in `mobile/`. Its build tools and dependencies do not affect `npm start` or the PC app.

Use **Hide card** beside **Back to decks** to remove the current card from that deck's study rotation. **Reset deck** restores all cards and starts at the first question. Hidden card IDs are saved separately for each deck on this browser or device and restored after reloading or restarting. Reset deck also clears that deck's saved progress. New cards appear automatically and reordering cards preserves progress. Clearing browser/app data or uninstalling the app removes saved progress; progress does not sync between devices. If saving is unavailable, hiding still works for the current session.
