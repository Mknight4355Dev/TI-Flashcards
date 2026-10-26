'use strict';

// The staging build replaces this token with a hash of all published assets.
const CACHE_NAME = 'ti-flashcards-__BUILD_VERSION__';
const BASE = new URL('./', self.location.href);
const FILES = [
  './', 'index.html', 'app.js', 'web-pwa.js', 'styles.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json',
  'sigma-ep-performance-test-flashcards.json', 'sigma-ep-study-guide-flashcards.json',
  'tandem-canopy-proficiency-flashcards.json', 'tandem-skydive-checklist-flashcards.json'
];
const URLS = FILES.map(file => new URL(file, BASE).href);
const ALLOWED = new Set(URLS);

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
    return await cache.match(event.request) || fetch(event.request);
  })());
});

self.addEventListener('message', event => {
  if (event.data !== 'VERIFY_OFFLINE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const entries = await Promise.all(URLS.map(url => cache.match(url)));
      event.ports[0].postMessage({ ready: entries.every(Boolean) });
    } catch (error) {
      event.ports[0].postMessage({ ready: false });
    }
  })());
});
