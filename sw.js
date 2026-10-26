'use strict';

// The staging build replaces this token with a hash of all published assets.
const CACHE_NAME = 'ti-flashcards-__BUILD_VERSION__';
const BASE = new URL('./', self.location.href);
const FILES = [
  './', 'index.html', 'app.js', 'disclaimer.js', 'web-pwa.js', 'styles.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json',
  'sigma-ep-study-guide-flashcards.json',
  'tandem-canopy-proficiency-flashcards.json', 'tandem-skydive-checklist-flashcards.json'
];
const URLS = FILES.map(file => new URL(file, BASE).href);
const ALLOWED = new Set(URLS);
let recovery = null;

async function missingFrom(cache) {
  const entries = await Promise.all(URLS.map(url => cache.match(url)));
  return URLS.filter((url, index) => !entries[index]);
}

async function ensureOfflineCache() {
  if (recovery) return recovery;
  recovery = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const missing = await missingFrom(cache);
    await Promise.all(missing.map(async url => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error('Unable to cache ' + url);
      await cache.put(url, response);
    }));
    return (await missingFrom(cache)).length === 0;
  })();
  try { return await recovery; } finally { recovery = null; }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await Promise.all(URLS.map(async url => {
        const response = await fetch(url, { cache: 'reload' });
        if (!response.ok) throw new Error('Unable to cache ' + url);
        await cache.put(url, response);
      }));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ti-flashcards-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !ALLOWED.has(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) {
      try { await cache.put(event.request, response.clone()); } catch (error) { /* Online study still works. */ }
    }
    return response;
  })());
});

self.addEventListener('message', event => {
  if (!['VERIFY_OFFLINE', 'ENSURE_OFFLINE'].includes(event.data) || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const ready = event.data === 'ENSURE_OFFLINE'
        ? await ensureOfflineCache()
        : (await missingFrom(await caches.open(CACHE_NAME))).length === 0;
      event.ports[0].postMessage({ ready });
    } catch (error) {
      event.ports[0].postMessage({ ready: false });
    }
  })());
});
