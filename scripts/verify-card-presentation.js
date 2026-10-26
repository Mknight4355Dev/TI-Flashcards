'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
class Element {
  constructor() {
    this.children = [];
    this.handlers = new Map();
    this.classList = { toggle() {} };
    this._textContent = '';
  }
  set textContent(value) { this._textContent = value; this.children = []; }
  get textContent() { return this._textContent; }
  appendChild(child) { this.children.push(child); }
  addEventListener(type, handler) { this.handlers.set(type, handler); }
  removeAttribute() {} setAttribute() {} focus() {}
  click() { this.handlers.get('click')({ detail: 0 }); }
}
const allText = element => [element.textContent, ...element.children.map(allText)].join(' ');

async function loadApp(file) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const document = {
    getElementById: get, createElement: () => new Element(),
    addEventListener() {}, dispatchEvent() {}
  };
  const history = { state: null, pushState(state) { this.state = state; }, back() { this.state = null; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
    document, history, window: { addEventListener() {} }, Event,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: async name => ({ ok: true, async json() {
      return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
    } })
  });
  await new Promise(resolve => setImmediate(resolve));
  return get;
}

async function verify(file) {
  const get = await loadApp(file);
  get('deck-list').children[2].click();
  for (let count = 0; count < 3; count++) get('next').click();
  get('flip').click();
  const card = JSON.parse(fs.readFileSync(path.join(root, 'sigma-ep-study-guide-flashcards.json'), 'utf8')).cards[3];
  const parts = get('content').children;
  const answer = parts.find(part => part.className === 'answer-text');
  const comparison = parts.find(part => part.className === 'explanation');
  const heading = parts.find(part => part.className === 'comparison-heading');
  assert.equal(answer.textContent, card.answer.slice(0, -('\n\n' + card.explanation).length), file + ': only the core answer uses large text');
  assert.equal(heading.textContent, 'Official-manual comparison');
  assert.equal(comparison.textContent, card.comparison.summary, file + ': comparison is shown once without a duplicate citation line');
  assert.equal(allText(get('content')).split(card.comparison.summary).length - 1, 1);
  assert.match(allText(get('content')), /page 56/);

  get('back-to-decks').click();
  get('deck-list').children[3].click();
  get('flip').click();
  const canopy = JSON.parse(fs.readFileSync(path.join(root, 'tandem-canopy-proficiency-flashcards.json'), 'utf8')).cards[0];
  assert.equal(allText(get('content')).split(canopy.reviewNote).length - 1, 1, file + ': review note is not repeated');

  get('back-to-decks').click();
  get('deck-list').children[0].click();
  get('flip').click();
  assert.ok(get('content').children.some(part => part.className === 'explanation'), file + ': distinct explanations remain visible');
}

(async () => {
  for (const file of ['app.js', 'mobile/src/app.js']) await verify(file);
  console.log('PASS: web and Android answer, comparison, review note, and reference presentation');
})().catch(error => { console.error(error); process.exitCode = 1; });
