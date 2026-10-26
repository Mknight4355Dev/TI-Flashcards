# Tandem Instructor Flashcards

Study online at https://mknight4355dev.github.io/TI-Flashcards/ after GitHub Pages is enabled. Adding the app to the home screen is optional. Once the page reports **All decks are ready for offline study**, all five decks can be used without a connection in that browser. On Android, use **Add to home screen** for quicker access (the browser may call this **Install app**); on iPhone Safari, use **Share > Add to Home Screen**. Choosing **Continue in browser** saves that preference on the device so the invitation stays dismissed on later visits. If browser storage is unavailable, it remains dismissed for the current page session only. Browser storage also keeps hidden cards on the same device, including across ordinary updates.

On first launch, the web and Android apps show an independent-study notice with links to the Sigma and USPA source manuals. Select **I acknowledge** to open the decks. The acknowledgement is saved on that browser or device, so later launches open the deck picker directly. If storage is unavailable, the acknowledgement works until the page or app is restarted and the notice appears again. Use **Review sources and notice** on the deck picker to reopen it without changing hidden-card progress. The notice and links are bundled for offline viewing; opening an external source requires an internet connection.

## Local development and deployment

Run `npm start` for the local browser app. Run `npm run test:web` to stage and verify the production site in `site-dist/`. The production site contains only the browser shell, PWA files, icons, and five deck JSON files. Node is needed to build or serve locally, not to run the deployed site.

To enable public deployment after approving and merging the feature branch, open repository **Settings > Pages** and select **GitHub Actions** as the build and deployment source. The workflow runs `npm run test:web` on pushes to `main` and deploys only if the checks pass. Its first successful run publishes the project site at the URL above. Do not use the repository root as the published artifact; the workflow uploads `site-dist/`.

The service worker caches the complete site before reporting offline readiness. If a cached file goes missing, it refetches missing files while online and checks the full asset list again. Until that succeeds, the page says **Offline setup incomplete** and offers home-screen access without promising offline study. A new deployment receives a new cache version automatically. The app checks for updates when opened or brought back into view. Once a new version is fully cached, it activates without interrupting an open study deck. Return to the deck picker to refresh automatically, or select **Reload to update** when ready. Reopening the app also uses the new version. An app window still running the previous updater may need one manual browser refresh after this release. If caching fails or storage is unavailable, online study still works.

Manual release checks: open the published URL, study and reset all decks, reload in airplane mode after the offline-ready message, and check install and standalone launch on Android Chrome and iPhone Safari. Verify the Capacitor APK on a physical Android device as described in [mobile/README.md](mobile/README.md).

For local development, open http://localhost:3000 after `npm start`. No dependencies need to be installed.

Click anywhere on a card to flip between the question and answer. Use Previous/Next, the arrow keys, or swipe left/right on a card to change cards. Swipe left advances (and restarts after the last card); swipe right goes back. Space or Enter also flips the card. Each new card starts on its question side.

After acknowledging the notice, choose from the Sigma, USPA, combined EP Study Guide and Performance Test, Tandem Canopy Piloting Proficiency, and Tandem Skydive Checklist decks. Use **Back to decks** or Escape at any point to return to the selection screen. Selecting a deck starts at its first question.

The app reads the five root `*-flashcards.json` data sets directly. Questions retain their original choice order; answers include explanations, review notes, references, and linked procedure steps, and practice prompts when provided. All 270 cards are available across the five decks, including personal confirmations and questions needing review. This is an unscored study app.

The combined EP deck has 83 cards. The Study Guide cards remain in their original examiner-provided order; 53 identical-question/answer pairs appear once, and each of the 10 Performance Test cards with a differing answer follows its matching Study Guide card. The nine Study Guide-only cards stay in place, and the one Performance Test-only card is at the end. Use **Review source differences** to jump to the first paired card. Exactly one card in each differing pair has `includeInQuiz: true`; both have visible source-comparison labels and remain available for ordinary study. The original Performance Test data is retained in `source-decks/` for provenance and is not published or packaged into Android. Existing hidden-card progress for the Study Guide remains under its original storage key. The separate Performance Test progress does not transfer to the combined deck.

Serve the app using the included server rather than opening index.html directly, because browsers restrict fetching JSON from local file URLs. Stop the server with Ctrl+C.

To add a deck, include its filename in `deckFiles` in `app.js` and add its route to `files` in `server.js`.

The separate [Android version](mobile/README.md) lives in `mobile/`. Its build tools and dependencies do not affect `npm start` or the PC app.

Use **Hide card** beside **Back to decks** to remove the current card from that deck's study rotation. **Reset deck** restores all cards and starts at the first question. Hidden card IDs are saved separately for each deck on this browser or device and restored after reloading or restarting. Reset deck also clears that deck's saved progress. New cards appear automatically and reordering cards preserves progress. Clearing browser/app data or uninstalling the app removes saved progress; progress does not sync between devices. If saving is unavailable, hiding still works for the current session.
