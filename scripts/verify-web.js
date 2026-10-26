'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site-dist');
const expected = [
  'index.html', 'app.js', 'web-pwa.js', 'styles.css', 'manifest.webmanifest', 'sw.js',
  'icons/icon-192.png', 'icons/icon-512.png',
  'sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json',
  'sigma-ep-study-guide-flashcards.json',
  'tandem-canopy-proficiency-flashcards.json', 'tandem-skydive-checklist-flashcards.json'
].sort();
function list(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? list(path.join(directory, entry.name), name) : [name];
  });
}
assert.deepEqual(list(site).sort(), expected, 'Only production assets are published');
for (const file of expected.filter(name => name !== 'sw.js')) {
  assert.deepEqual(fs.readFileSync(path.join(site, file)), fs.readFileSync(path.join(root, file)), file + ' changed during staging');
}
const manifest = JSON.parse(fs.readFileSync(path.join(site, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
const worker = fs.readFileSync(path.join(site, 'sw.js'), 'utf8');
assert.doesNotMatch(worker, /__BUILD_VERSION__/);
for (const file of expected.filter(name => name !== 'sw.js'))
  assert.ok(worker.includes("'" + file + "'"), 'Offline cache omits ' + file);
assert.match(worker, /const CACHE_NAME = 'ti-flashcards-[a-f0-9]{16}'/);
for (const size of [192, 512]) {
  const png = fs.readFileSync(path.join(site, 'icons', 'icon-' + size + '.png'));
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
console.log('PASS: Pages artifact, unchanged decks, complete offline asset list, manifest paths, icon sizes, and cache version');
