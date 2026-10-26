'use strict';
(function () {
  const get = id => document.getElementById(id);
  let deck, index = 0, showingAnswer = false;
  const deckFiles = ['sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json',
    'sigma-ep-study-guide-flashcards.json',
    'tandem-canopy-proficiency-flashcards.json',
    'tandem-skydive-checklist-flashcards.json'];
  let selectedButton, cardAnimation, activeCards = [], hiddenCards, deckStorageKey;
  const hiddenByDeck = new WeakMap();
  const deckSummaries = new WeakMap();
  function updateDeckSummary(data) {
    const count = hiddenByDeck.get(data).size;
    deckSummaries.get(data).textContent = data.cards.length + ' cards - ' + count + ' hidden - Start studying';
  }
  function loadHiddenCards(data, key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(saved)) return new Set();
      const validIds = new Set(data.cards.map(card => card.id));
      return new Set(saved.filter(id => typeof id === 'string' && validIds.has(id)));
    } catch (error) {
      return new Set();
    }
  }
  function saveHiddenCards() {
    updateDeckSummary(deck);
    try {
      if (hiddenCards.size) localStorage.setItem(deckStorageKey, JSON.stringify([...hiddenCards]));
      else localStorage.removeItem(deckStorageKey);
      get('storage-status').textContent = '';
    } catch (error) {
      get('storage-status').textContent = 'Progress could not be saved on this device. Hidden cards will be remembered for this session only.';
    }
  }
  function selectDeck(data, button, file) {
    deck = data;
    deckStorageKey = 'ti-flashcards:hidden:v1:' + file;
    get('storage-status').textContent = '';
    hiddenCards = hiddenByDeck.get(deck) || loadHiddenCards(deck, deckStorageKey);
    hiddenByDeck.set(deck, hiddenCards);
    activeCards = deck.cards.filter(card => !hiddenCards.has(card.id));
    get('review-comparisons').hidden = !deck.cards.some(card => card.reviewLabel);
    selectedButton = button;
    index = 0;
    showingAnswer = false;
    get('title').textContent = deck.title || 'Flashcards';
    document.title = deck.title || 'Flashcards';
    get('description').textContent = deck.description || '';
    get('policy').textContent = deck.sourcePolicy || '';
    get('card').removeAttribute('aria-disabled');
    get('flip').disabled = false;
    get('selection').hidden = true;
    get('study').hidden = false;
    render();
    get('title').focus();
  }
  function showSelection() {
    if (!deck) return;
    if (cardAnimation) cardAnimation.cancel();
    deck = null;
    get('study').hidden = true;
    get('selection').hidden = false;
    document.title = 'Tandem Instructor Flashcards';
    selectedButton.focus();
  }
  const statuses = { verified: 'Verified', source_verified: 'Source verified', derived: 'Derived answer', needs_review: 'Needs review', self_attestation: 'Personal confirmation' };
  function add(tag, text, parent, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }
  function references(items, parent) {
    if (!items || !items.length) return;
    add('h3', 'References', parent);
    const list = add('ul', '', parent, 'references');
    items.forEach(ref => {
      const source = (deck.sources || []).find(item => item.id === ref.sourceId);
      const parts = [source ? source.title : ref.sourceId];
      if (ref.printedPage) parts.push('page ' + ref.printedPage);
      if (ref.pdfPage) parts.push('PDF page ' + ref.pdfPage);
      if (ref.section) parts.push(ref.section);
      add('li', parts.join(' · '), list);
    });
  }
  function render() {
    if (cardAnimation) cardAnimation.cancel();
    const card = activeCards[index], content = get('content');
    const empty = activeCards.length === 0;
    get('card').hidden = empty;
    get('card-navigation').hidden = empty;
    get('empty-deck').hidden = !empty;
    get('hide-card').disabled = empty;
    get('reset-deck').disabled = hiddenCards.size === 0;
    get('review-comparisons').disabled = !activeCards.some(item => item.reviewLabel);
    get('flip').disabled = empty;
    get('previous').disabled = empty || index === 0;
    get('next').disabled = empty;
    get('position').textContent = empty ? '0 cards remaining' : 'Card ' + (index + 1) + ' of ' + activeCards.length;
    if (hiddenCards.size) get('position').textContent += ' (' + hiddenCards.size + ' hidden)';
    if (empty) {
      content.textContent = '';
      get('category').textContent = '';
      return;
    }
    content.textContent = '';
    get('category').textContent = [card.category, card.reviewLabel].filter(Boolean).join(' · ');
    get('question-number').textContent = 'Q' + (card.examQuestionNumber != null ? card.examQuestionNumber : (deck.cards.indexOf(card) + 1));
    get('side').textContent = showingAnswer ? 'ANSWER' : 'QUESTION';
    get('card').classList.toggle('answer', showingAnswer);
    get('card').setAttribute('aria-label', showingAnswer ? 'Answer shown. Activate to show question.' : 'Question shown. Activate to reveal answer.');
    if (showingAnswer) {
      add('div', statuses[card.status] || card.status || '', content, 'status');
      add('h2', (card.correctOptionId ? card.correctOptionId + '. ' : '') + card.answer, content);
      if (card.explanation) add('p', card.explanation, content);
      if (card.reviewNote) add('p', card.reviewNote, content, 'review');
      if (card.practicePrompt) {
        add('h3', 'Practice prompt', content);
        add('p', card.practicePrompt, content);
      }
      const procedure = (deck.procedures || []).find(item => item.id === card.procedureId);
      if (procedure) {
        add('h3', procedure.name, content);
        if (procedure.definition) add('p', procedure.definition, content);
        const steps = add('ol', '', content);
        (procedure.steps || []).forEach(step => add('li', step, steps));
        references(procedure.references, content);
      }
      references(card.references, content);
    } else {
      if (card.context) add('p', card.context, content, 'context');
      add('h2', card.question, content);
      const options = add('ul', '', content, 'options');
      (card.options || []).forEach(option => {
        const row = add('li', '', options);
        add('strong', option.id + '.', row);
        add('span', option.text, row);
      });
    }
    get('hint').textContent = showingAnswer ? 'Tap the card to return to the question' : 'Tap the card to reveal the answer';
    get('flip').textContent = showingAnswer ? 'Show question' : 'Show answer';
    get('previous').disabled = index === 0;
    get('next').disabled = false;
    get('next').textContent = index === activeCards.length - 1 ? 'Start over' : 'Next →';
  }
  function flip() { if (deck && activeCards.length) { showingAnswer = !showingAnswer; render(); } }
  function animateCard(direction) {
    const card = get('card');
    if (typeof card.animate !== 'function' ||
        (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    cardAnimation = card.animate([
      { transform: 'translateX(' + (direction * 64) + 'px) rotate(' + (direction * 1.5) + 'deg)', opacity: 0 },
      { transform: 'translateX(0) rotate(0deg)', opacity: 1 }
    ], { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
  function move(delta) {
    if (!deck || index + delta < 0 || index + delta >= activeCards.length) return;
    index += delta; showingAnswer = false; render();
    animateCard(delta);
  }
  const cardElement = get('card');
  let gesture = null, suppressClickUntil = 0;
  cardElement.addEventListener('pointerdown', event => {
    if (!event.isPrimary) { gesture = null; return; }
    if (!deck || !activeCards.length || event.pointerType === 'mouse') return;
    suppressClickUntil = 0;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    cardElement.setPointerCapture(event.pointerId);
  });
  cardElement.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // A swipe must not also trigger the card's tap-to-flip action.
    suppressClickUntil = Date.now() + 500;
    if (dx < 0) next();
    else move(-1);
  });
  cardElement.addEventListener('pointercancel', () => { gesture = null; });
  cardElement.addEventListener('lostpointercapture', () => { gesture = null; });
  cardElement.addEventListener('click', event => {
    if (event.detail !== 0 && Date.now() < suppressClickUntil) return;
    flip();
  });
  get('card').addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); flip(); }
  });
  get('flip').addEventListener('click', flip);
  get('back-to-decks').addEventListener('click', showSelection);
  get('hide-card').addEventListener('click', () => {
    if (!deck || !activeCards.length) return;
    hiddenCards.add(activeCards[index].id);
    saveHiddenCards();
    activeCards.splice(index, 1);
    index = Math.min(index, Math.max(0, activeCards.length - 1));
    showingAnswer = false;
    render();
    if (activeCards.length) animateCard(1);
    else get('reset-deck').focus();
  });
  get('reset-deck').addEventListener('click', () => {
    if (!deck) return;
    hiddenCards.clear();
    saveHiddenCards();
    activeCards = deck.cards.slice();
    index = 0;
    showingAnswer = false;
    render();
  });
  get('review-comparisons').addEventListener('click', () => {
    if (!deck) return;
    const first = activeCards.findIndex(item => item.reviewLabel);
    if (first < 0) return;
    index = first;
    showingAnswer = false;
    render();
    get('card').focus();
  });
  get('previous').addEventListener('click', () => move(-1));
  function next() {
    if (!deck || !activeCards.length) return;
    if (index === activeCards.length - 1) {
      index = 0; showingAnswer = false; render();
      animateCard(1);
    } else {
      move(1);
    }
  }
  get('next').addEventListener('click', next);
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !deck) return;
    if (event.key === 'Escape') { event.preventDefault(); showSelection(); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    if ((event.key === ' ' || event.key === 'Enter') && (event.target === document.body || event.target === document.documentElement)) { event.preventDefault(); flip(); }
  });
  Promise.all(deckFiles.map(async file => {
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.cards) || !data.cards.length) throw new Error('No flashcards found');
      return { file, data };
    } catch (error) {
      return { file, error };
    }
  })).then(results => {
    get('selection-status').textContent = results.some(result => result.data)
      ? '' : 'Unable to load the bundled decks. Please reinstall the app.';
    results.forEach(({ file, data, error }) => {
      if (error) {
        add('p', 'Unable to load ' + file + ': ' + error.message, get('deck-list'), 'review');
        return;
      }
      const button = add('button', '', get('deck-list'), 'deck-choice');
      add('h2', data.title || 'Flashcards', button);
      if (data.description) add('p', data.description, button);
      hiddenByDeck.set(data, loadHiddenCards(data, 'ti-flashcards:hidden:v1:' + file));
      deckSummaries.set(data, add('span', '', button));
      updateDeckSummary(data);
      button.addEventListener('click', () => selectDeck(data, button, file));
    });
  });
}());
