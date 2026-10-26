'use strict';
(function () {
  const storageKey = 'ti-flashcards:disclaimer:v1';
  const notice = document.getElementById('disclaimer');
  const picker = document.getElementById('selection');
  const acknowledge = document.getElementById('acknowledge-disclaimer');
  const returnButton = document.getElementById('return-to-decks');
  const reviewButton = document.getElementById('review-sources');
  let accepted = false;

  try { accepted = localStorage.getItem(storageKey) === 'accepted'; } catch (error) { /* Acknowledgement stays in memory only. */ }

  function showPicker() {
    notice.hidden = true;
    picker.hidden = false;
    reviewButton.focus();
  }

  if (accepted) showPicker();

  acknowledge.addEventListener('click', () => {
    accepted = true;
    try { localStorage.setItem(storageKey, 'accepted'); } catch (error) { /* Continue for this page session. */ }
    showPicker();
    document.getElementById('selection-title').focus();
  });

  reviewButton.addEventListener('click', () => {
    if (!accepted) return;
    picker.hidden = true;
    notice.hidden = false;
    acknowledge.hidden = true;
    returnButton.hidden = false;
    document.getElementById('disclaimer-title').focus();
  });

  returnButton.addEventListener('click', () => {
    if (!accepted) return;
    showPicker();
  });
}());
