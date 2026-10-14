'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
class Element {
  constructor() { this.children = []; this.handlers = {}; this.classList = { toggle() {} }; }
  appendChild(child) { this.children.push(child); }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  setAttribute() {} removeAttribute() {} focus() {}
  click() { this.handlers.click({ detail: 0 }); }
}
async function start(file, storage, decks) {
  const elements = {};
  const document = {
    getElementById: id => elements[id] || (elements[id] = new Element()),
    createElement: () => new Element(), addEventListener() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
    document, localStorage: storage,
    fetch: async filename => ({ ok: true, json: async () => JSON.parse(JSON.stringify(decks[filename])) })
  });
  await new Promise(resolve => setImmediate(resolve));
  return elements;
}
async function verify(file) {
  const decks = Object.fromEntries(fs.readdirSync(root).filter(name => name.endsWith('-flashcards.json')).map(name =>
    [name, JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''))]));
  const saved = new Map();
  const storage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  const filename = 'sigma-tandem-flashcards.json', key = 'ti-flashcards:hidden:v1:' + filename;
  const firstId = decks[filename].cards[0].id;
  let app = await start(file, storage, decks);
  app['deck-list'].children[0].click();
  app['hide-card'].click();
  assert.deepEqual(JSON.parse(saved.get(key)), [firstId]);
  app = await start(file, storage, decks);
  app['deck-list'].children[0].click();
  assert.ok(app.position.textContent.includes('(1 hidden)'), 'Progress survives a fresh app instance');
  app['back-to-decks'].click();
  app['deck-list'].children[1].click();
  assert.ok(!app.position.textContent.includes('hidden'), 'Other decks are unaffected');
  decks[filename].cards.reverse();
  decks[filename].cards.unshift({ id: 'new-card', question: 'New material', answer: 'New answer' });
  app = await start(file, storage, decks);
  app['deck-list'].children[0].click();
  assert.ok(app.position.textContent.includes('(1 hidden)'), 'Reordering preserves hidden IDs');
  assert.equal(app.content.children.at(-2).textContent, 'New material', 'New cards remain visible');
  saved.set(key, JSON.stringify([firstId, 'removed-card', 42, firstId]));
  app = await start(file, storage, decks);
  app['deck-list'].children[0].click();
  assert.ok(app.position.textContent.includes('(1 hidden)'), 'Stale, duplicate and invalid IDs are ignored');
  app['reset-deck'].click();
  assert.equal(saved.has(key), false, 'Reset clears persisted progress');
  app = await start(file, storage, decks);
  app['deck-list'].children[0].click();
  assert.ok(!app.position.textContent.includes('hidden'), 'Reset survives restart');
  saved.set(key, JSON.stringify(decks[filename].cards.map(card => card.id)));
  app = await start(file, storage, decks);
  app['deck-list'].children[0].click();
  assert.equal(app.card.hidden, true, 'Fully hidden deck survives restart');
  app['reset-deck'].click();
  assert.equal(app.card.hidden, false);
  for (const value of ['broken JSON', '{}', 'null']) {
    saved.set(key, value);
    app = await start(file, storage, decks);
    app['deck-list'].children[0].click();
    assert.ok(!app.position.textContent.includes('hidden'), 'Malformed storage safely restores a full deck');
  }
  const unavailable = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Full'); }, removeItem() { throw Error('Blocked'); } };
  app = await start(file, unavailable, decks);
  app['deck-list'].children[0].click();
  app['hide-card'].click();
  assert.ok(app.position.textContent.includes('(1 hidden)'));
  assert.ok(app['storage-status'].textContent.includes('could not be saved'));
  app['reset-deck'].click();
  assert.ok(!app.position.textContent.includes('hidden'));
}
(async () => {
  for (const file of ['app.js', 'mobile/src/app.js']) await verify(file);
  console.log('PASS: web and Android persistence, reset, updated decks, empty decks, corrupt data, and unavailable storage');
})().catch(error => { console.error(error); process.exitCode = 1; });
