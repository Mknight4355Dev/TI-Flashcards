'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
const listeners = new Map();
const appEvents = [];
function element(id = '') {
  const handlers = new Map();
  return {
    id, hidden: id === 'selection' || id === 'study', disabled: false,
    textContent: '', children: [],
    classList: { toggle() {} },
    addEventListener(type, handler) { handlers.set(type, handler); },
    appendChild(child) { this.children.push(child); },
    removeAttribute() {}, setAttribute() {}, focus() {},
    click() { handlers.get('click')?.({ detail: 0 }); }
  };
}
const get = id => {
  if (!elements.has(id)) elements.set(id, element(id));
  return elements.get(id);
};
const document = {
  title: '', body: {}, documentElement: {},
  getElementById: get, createElement: () => element(),
  addEventListener() {}, dispatchEvent(event) { appEvents.push(event.type); }
};
const window = { addEventListener(type, handler) { listeners.set(type, handler); } };
const entries = [null];
let position = 0;
const history = {
  get state() { return entries[position]; },
  pushState(state) { entries.splice(++position, Infinity, state); },
  back() { if (position > 0) { position--; listeners.get('popstate')({ state: this.state }); } },
  forward() { if (position < entries.length - 1) { position++; listeners.get('popstate')({ state: this.state }); } }
};
let requests = 0;
const fetch = async file => {
  requests++;
  return { ok: true, async json() {
    return { title: file, cards: [{ id: 'one', question: 'Question', answer: 'Answer' }] };
  } };
};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8'), {
  document, window, history, fetch, Event, Date,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false })
});

setImmediate(() => {
  const firstDeck = get('deck-list').children[0];
  assert.ok(firstDeck, 'Deck picker loaded');
  get('disclaimer').hidden = true;
  get('selection').hidden = false;
  const initialRequests = requests;

  firstDeck.click();
  assert.equal(get('study').hidden, false);
  assert.equal(history.state.tiFlashcardsDeck, 'sigma-tandem-flashcards.json');
  history.back();
  assert.equal(get('selection').hidden, false, 'System Back returns to deck picker');
  assert.ok(appEvents.includes('ti-flashcards:selection-shown'), 'Returning to picker announces an update-safe point');
  assert.equal(get('study').hidden, true);
  assert.equal(requests, initialRequests, 'Back navigation needs no network request');

  history.forward();
  assert.equal(get('study').hidden, false, 'Forward restores the deck');
  get('back-to-decks').click();
  assert.equal(get('selection').hidden, false, 'In-app Back returns to picker');
  assert.equal(history.state, null, 'In-app Back clears the deck history entry');
  firstDeck.click();
  history.back();
  assert.equal(get('selection').hidden, false, 'A second deck visit also supports system Back');
  console.log('PASS: system and in-app Back return to the picker without a network request');
});
