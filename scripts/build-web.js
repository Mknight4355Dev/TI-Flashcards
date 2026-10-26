'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'site-dist');
if (path.dirname(output) !== root) throw new Error('Invalid site output directory');
const files = [
  'index.html', 'app.js', 'disclaimer.js', 'web-pwa.js', 'styles.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json',
  'sigma-ep-study-guide-flashcards.json',
  'tandem-canopy-proficiency-flashcards.json', 'tandem-skydive-checklist-flashcards.json'
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const hash = crypto.createHash('sha256');
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file));
  if (file.endsWith('-flashcards.json')) {
    const deck = JSON.parse(source.toString('utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(deck.cards) || !deck.cards.length) throw new Error(file + ' has no cards');
  }
  hash.update(file).update(source);
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, source);
}
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!worker.includes('__BUILD_VERSION__')) throw new Error('Service worker build token missing');
hash.update('sw.js').update(worker);
const version = hash.digest('hex').slice(0, 16);
fs.writeFileSync(path.join(output, 'sw.js'), worker.replaceAll('__BUILD_VERSION__', version));
console.log('Staged GitHub Pages assets in site-dist (cache ' + version + ')');
