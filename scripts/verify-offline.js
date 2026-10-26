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
let activationsRequested = 0;
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async put(url, response) { entries.set(typeof url === 'string' ? url : url.url, response); },
      async match(request) { return entries.get(typeof request === 'string' ? request : request.url); }
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); }
};
vm.runInNewContext(fs.readFileSync(path.join(site, 'sw.js'), 'utf8'), {
  URL, caches,
  fetch: async (request, options) => {
    if (!online) throw Error('Offline');
    if (options) assert.equal(options.cache, 'reload', 'Updates bypass stale HTTP cache');
    const url = typeof request === 'string' ? request : request.url;
    if (missing.has(url)) return { ok: false };
    const file = new URL(url).pathname.slice('/TI-Flashcards/'.length) || 'index.html';
    return { ok: true, body: fs.readFileSync(path.join(site, file)), clone() { return this; } };
  },
  self: {
    location: { href: base + 'sw.js' },
    skipWaiting: async () => { activationsRequested++; },
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
  assert.equal(activationsRequested, 0, 'Incomplete updates cannot take over');
  missing.clear();
  await dispatch('install');
  assert.equal(activationsRequested, 1, 'Fully cached updates activate even while old pages remain open');
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
  await dispatch('message', { data: 'ENSURE_OFFLINE', ports: [{ postMessage: value => { message = value; } }] });
  assert.equal(message.ready, false, 'Offline recovery cannot make an incomplete cache ready');
  online = true;
  await dispatch('message', { data: 'ENSURE_OFFLINE', ports: [{ postMessage: value => { message = value; } }] });
  assert.equal(message.ready, true, 'Online recovery restores all missing assets');
  online = false;
  assert.ok(await dispatch('fetch', { request: { method: 'GET', url: base + 'tandem-skydive-checklist-flashcards.json' } }), 'Recovered deck works offline');
  online = true;
  stores.get(cacheName).delete(base + 'sigma-ep-study-guide-flashcards.json');
  assert.ok(await dispatch('fetch', { request: { method: 'GET', url: base + 'sigma-ep-study-guide-flashcards.json' } }), 'Online cache miss still serves a deck');
  online = false;
  assert.ok(await dispatch('fetch', { request: { method: 'GET', url: base + 'sigma-ep-study-guide-flashcards.json' } }), 'Online cache miss is stored for offline use');
  console.log('PASS: failed caching, safe update activation, offline launch, cache cleanup, recovery, and cache-miss storage');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
