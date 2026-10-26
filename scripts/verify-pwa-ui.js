'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
const documentHandlers = new Map();
const windowHandlers = new Map();
const saved = new Map();
let storageBlocked = false;
const get = id => {
  if (!elements.has(id)) {
    const handlers = new Map();
    elements.set(id, {
      hidden: id === 'install-invitation' || id === 'offline-status', textContent: '',
      addEventListener(type, handler) { handlers.set(type, handler); },
      click() { handlers.get('click')(); }
    });
  }
  return elements.get(id);
};
const document = {
  hidden: false,
  getElementById: get,
  addEventListener(type, listener) { documentHandlers.set(type, listener); }
};
const window = {
  isSecureContext: true,
  addEventListener(type, listener) { windowHandlers.set(type, listener); }
};
let cacheReady = false;
const worker = {
  postMessage(type, ports) {
    assert.equal(type, 'ENSURE_OFFLINE');
    setTimeout(() => ports[0].peer.onmessage({ data: { ready: cacheReady } }), 0);
  }
};
const registration = { active: worker, waiting: null, addEventListener() {}, async update() {} };
const navigator = {
  userAgent: 'Android Chrome', platform: 'Linux armv8l', maxTouchPoints: 5,
  serviceWorker: {
    controller: worker, ready: Promise.resolve(registration),
    register: async () => registration,
    addEventListener() {}
  }
};
class MessageChannel {
  constructor() {
    this.port1 = { onmessage: null, close() {} };
    this.port2 = { peer: this.port1 };
  }
}
const localStorage = {
  getItem(key) { if (storageBlocked) throw new Error('Storage blocked'); return saved.get(key) || null; },
  setItem(key, value) { if (storageBlocked) throw new Error('Storage blocked'); saved.set(key, value); }
};
function loadPage() {
  elements.clear();
  documentHandlers.clear();
  windowHandlers.clear();
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '..', 'web-pwa.js'), 'utf8'), {
    document, window, navigator, MessageChannel, setTimeout, clearTimeout,
    matchMedia: () => ({ matches: false }), localStorage,
    sessionStorage: { getItem: () => null, setItem() {} }
  });
}
loadPage();
const settle = () => new Promise(resolve => setTimeout(resolve, 15));
async function verify() {
  await settle();
  documentHandlers.get('ti-flashcards:study-started')();
  await settle();
  assert.equal(get('install-invitation').hidden, false);
  assert.equal(get('install-action').textContent, 'Add to home screen');
  assert.match(get('install-description').textContent, /Offline study also works in this browser once the decks are ready/);
  assert.match(get('offline-status').textContent, /Offline setup incomplete/);
  cacheReady = true;
  windowHandlers.get('online')();
  await settle();
  assert.equal(get('install-action').textContent, 'Add to home screen');
  assert.match(get('offline-status').textContent, /All decks are ready for offline study/);
  cacheReady = false;
  documentHandlers.get('visibilitychange')();
  await settle();
  assert.equal(get('install-action').textContent, 'Add to home screen');
  assert.match(get('offline-status').textContent, /Offline setup incomplete/);
  get('install-dismiss').click();
  assert.equal(saved.get('ti-flashcards:install-dismissed'), 'yes', 'Continue in browser saves the choice');
  loadPage();
  await settle();
  documentHandlers.get('ti-flashcards:study-started')();
  assert.equal(get('install-invitation').hidden, true, 'Saved choice suppresses later invitations');

  storageBlocked = true;
  loadPage();
  await settle();
  documentHandlers.get('ti-flashcards:study-started')();
  assert.equal(get('install-invitation').hidden, false);
  get('install-dismiss').click();
  documentHandlers.get('ti-flashcards:study-started')();
  assert.equal(get('install-invitation').hidden, true, 'Choice lasts for the current page');
  loadPage();
  await settle();
  documentHandlers.get('ti-flashcards:study-started')();
  assert.equal(get('install-invitation').hidden, false, 'Choice cannot persist without storage');
  console.log('PASS: optional home-screen prompt, saved dismissal, blocked storage, and offline status');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
