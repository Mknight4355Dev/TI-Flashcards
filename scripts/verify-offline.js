'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const origin = 'https://mknight4355dev.github.io';
const base = origin + '/TI-Flashcards/';
const site = path.resolve(__dirname, '..', 'site-dist');
const handlers = {};
const stores = new Map();
const missing = new Set();
let online = true;
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async put(url, response) { entries.set(url, response); },
      async match(request) { return entries.get(typeof request === 'string' ? request : request.url); }
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); }
};
vm.runInNewContext(fs.readFileSync(path.join(site, 'sw.js'), 'utf8'), {
  URL, caches,
  fetch: async (url, options) => {
    if (!online) throw Error('Offline');
    assert.equal(options.cache, 'reload', 'Updates bypass stale HTTP cache');
    if (missing.has(url)) return { ok: false };
    const file = new URL(url).pathname.slice('/TI-Flashcards/'.length) || 'index.html';
    return { ok: true, body: fs.readFileSync(path.join(site, file)) };
  },
  self: {
    location: { href: base + 'sw.js' },
    clients: { claim: async () => {} },
    addEventListener: (type, handler) => { handlers[type] = handler; }
  }
});
async function dispatch(type, extra = {}) {
  let task;
  handlers[type]({ ...extra, waitUntil: promise => { task = promise; }, respondWith: promise => { task = promise; } });
  return task;
}
async function verify() {
  const cacheName = fs.readFileSync(path.join(site, 'sw.js'), 'utf8').match(/const CACHE_NAME = '([^']+)'/)[1];
  missing.add(base + 'sigma-tandem-flashcards.json');
  await assert.rejects(dispatch('install'));
  assert.equal(stores.has(cacheName), false, 'Incomplete offline cache is removed');
  missing.clear();
  await dispatch('install');
  stores.set('ti-flashcards-old-version', new Map());
  await dispatch('activate');
  assert.equal(stores.has('ti-flashcards-old-version'), false, 'Old cache is removed');
  let message;
  await dispatch('message', { data: 'VERIFY_OFFLINE', ports: [{ postMessage: value => { message = value; } }] });
  assert.equal(message.ready, true, 'Readiness requires every cached file');
  online = false;
  assert.ok(await dispatch('fetch', { request: { method: 'GET', url: base + 'sigma-tandem-flashcards.json' } }), 'Deck works offline');
  assert.ok(await dispatch('fetch', { request: { method: 'GET', url: base } }), 'Launch works offline');
  stores.get(cacheName).delete(base + 'tandem-skydive-checklist-flashcards.json');
  await dispatch('message', { data: 'VERIFY_OFFLINE', ports: [{ postMessage: value => { message = value; } }] });
  assert.equal(message.ready, false, 'Missing deck cannot report offline readiness');
  console.log('PASS: failed caching, complete offline launch and decks, cache cleanup, and readiness verification');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
