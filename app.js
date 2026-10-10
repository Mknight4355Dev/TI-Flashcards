'use strict';
(function () {
  const get = id => document.getElementById(id);
  let deck, index = 0, showingAnswer = false;
  const deckFiles = ['sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json'];
  let selectedButton;
  function selectDeck(data, button) {
    deck = data;
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
    deck = null;
    get('study').hidden = true;
    get('selection').hidden = false;
    document.title = 'Tandem Instructor Flashcards';
    selectedButton.focus();
  }
  const statuses = { verified: 'Verified', derived: 'Derived answer', needs_review: 'Needs review', self_attestation: 'Personal confirmation' };
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
    const card = deck.cards[index], content = get('content');
    content.textContent = '';
    get('position').textContent = 'Card ' + (index + 1) + ' of ' + deck.cards.length;
    get('category').textContent = card.category || '';
    get('question-number').textContent = 'Q' + (card.examQuestionNumber != null ? card.examQuestionNumber : (index + 1));
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
    get('hint').textContent = showingAnswer ? 'Click the card to return to the question' : 'Click the card to reveal the answer';
    get('flip').textContent = showingAnswer ? 'Show question' : 'Show answer';
    get('previous').disabled = index === 0;
    get('next').disabled = false;
    get('next').textContent = index === deck.cards.length - 1 ? 'Start over' : 'Next →';
  }
  function flip() { if (deck) { showingAnswer = !showingAnswer; render(); } }
  function move(delta) {
    if (!deck || index + delta < 0 || index + delta >= deck.cards.length) return;
    index += delta; showingAnswer = false; render();
  }
  get('card').addEventListener('click', flip);
  get('card').addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); flip(); }
  });
  get('flip').addEventListener('click', flip);
  get('back-to-decks').addEventListener('click', showSelection);
  get('previous').addEventListener('click', () => move(-1));
  get('next').addEventListener('click', () => {
    if (!deck) return;
    if (index === deck.cards.length - 1) {
      index = 0; showingAnswer = false; render();
    } else {
      move(1);
    }
  });
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
      ? '' : 'Unable to load decks. Start the app with npm start and open http://localhost:3000.';
    results.forEach(({ file, data, error }) => {
      if (error) {
        add('p', 'Unable to load ' + file + ': ' + error.message, get('deck-list'), 'review');
        return;
      }
      const button = add('button', '', get('deck-list'), 'deck-choice');
      add('h2', data.title || 'Flashcards', button);
      if (data.description) add('p', data.description, button);
      add('span', data.cards.length + ' cards ? Start studying ?', button);
      button.addEventListener('click', () => selectDeck(data, button));
    });
  });
}());
