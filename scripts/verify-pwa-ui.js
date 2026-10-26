'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
const documentHandlers = new Map();
const windowHandlers = new Map();
const get = id => {
  if (!elements.has(id)) elements.set(id, { hidden: id === 'install-invitation' || id === 'offline-status', textContent: '', addEventListener() {} });
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
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '..', 'web-pwa.js'), 'utf8'), {
  document, window, navigator, MessageChannel, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false }),
  sessionStorage: { getItem: () => null, setItem() {} }
});
const settle = () => new Promise(resolve => setTimeout(resolve, 15));
async function verify() {
  await settle();
  documentHandlers.get('ti-flashcards:study-started')();
  await settle();
  assert.equal(get('install-invitation').hidden, false);
  assert.equal(get('install-action').textContent, 'Install app');
  assert.doesNotMatch(get('install-description').textContent, /even without an internet connection/);
  assert.match(get('offline-status').textContent, /Offline setup incomplete/);
  cacheReady = true;
  windowHandlers.get('online')();
  await settle();
  assert.equal(get('install-action').textContent, 'Install for offline study');
  assert.match(get('offline-status').textContent, /All decks are ready for offline study/);
  cacheReady = false;
  documentHandlers.get('visibilitychange')();
  await settle();
  assert.equal(get('install-action').textContent, 'Install app', 'A lost cache removes the offline claim');
  assert.match(get('offline-status').textContent, /Offline setup incomplete/);
  console.log('PASS: installation copy waits for verified offline readiness and rechecks after cache loss');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
