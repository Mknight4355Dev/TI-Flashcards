'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
assert.ok(['web', 'android'].includes(mode), 'Specify web or android');
const sourceHtml = path.join(root, mode === 'web' ? 'index.html' : 'mobile/src/index.html');
const built = path.join(root, mode === 'web' ? 'site-dist' : 'mobile/www');
const htmlFiles = [sourceHtml, path.join(built, 'index.html')];
const script = fs.readFileSync(path.join(root, 'disclaimer.js'), 'utf8');
assert.deepEqual(fs.readFileSync(path.join(built, 'disclaimer.js')), Buffer.from(script), 'Shared disclaimer script must be bundled');
assert.deepEqual(fs.readFileSync(path.join(built, 'icons', 'icon-192.png')),
  fs.readFileSync(path.join(root, 'icons', 'icon-192.png')), 'App icon must be bundled with the notice');

const sources = [
  ['Sigma Tandem Operations Manual', 'https://uptvector.com/wp-content/uploads/2025/12/Man016_Rev2-Sigma-Tandem-Operations-Manual.pdf'],
  ['Sigma II Tandem Owner’s Manual', 'https://uptvector.com/wp-content/uploads/2026/06/Man013-Rev4-SigmaII-Tandem-Owners-Manual.pdf'],
  ['USPA Skydiver’s Information Manual', 'https://www.uspa.org/SIM'],
  ['USPA Instructional Rating Manual', 'https://www.uspa.org/IRM']
];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /<section id="disclaimer"/);
  assert.match(html, /<img class="disclaimer-icon" src="icons\/icon-192\.png" alt="TI Flashcards app icon" width="96" height="96">/);
  assert.match(html, /<section id="selection"[^>]* hidden>/, 'Deck picker must start hidden');
  assert.ok(html.indexOf('src="disclaimer.js"') < html.indexOf('src="app.js"'), 'Acknowledgement runs before the study app');
  assert.match(html, /created by a Tandem Instructor \(TI\) candidate/);
  assert.match(html, /current as of October 25, 2026/);
  assert.match(html, /not produced by UPT or USPA/);
  assert.match(html, /Consult the official sources for current requirements and procedures/);
  for (const [label, url] of sources)
    assert.ok(html.includes('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>'), label + ' link missing');
}

const key = 'ti-flashcards:disclaimer:v1';
function launch(storage) {
  const elements = Object.fromEntries([
    'disclaimer', 'selection', 'acknowledge-disclaimer', 'return-to-decks',
    'review-sources', 'selection-title', 'disclaimer-title'
  ].map(id => [id, {
    hidden: ['selection', 'return-to-decks'].includes(id),
    handlers: {},
    addEventListener(type, handler) { this.handlers[type] = handler; },
    focus() { this.focused = true; },
    click() { this.handlers.click(); }
  }]));
  vm.runInNewContext(script, { document: { getElementById: id => elements[id] }, localStorage: storage });
  return elements;
}

const values = new Map([['ti-flashcards:hidden:v1:sigma-tandem-flashcards.json', '["card-1"]']]);
const storage = {
  getItem: name => values.get(name) || null,
  setItem: (name, value) => values.set(name, value)
};
let page = launch(storage);
assert.equal(page.selection.hidden, true, 'First launch is gated');
assert.equal(page.disclaimer.hidden, false);
page['acknowledge-disclaimer'].click();
assert.equal(page.selection.hidden, false, 'Explicit acknowledgement opens decks');
assert.equal(page.disclaimer.hidden, true);
assert.equal(values.get(key), 'accepted');
page['review-sources'].click();
assert.equal(page.disclaimer.hidden, false, 'Notice remains available from the picker');
assert.equal(page['acknowledge-disclaimer'].hidden, true, 'Review does not ask for acknowledgement again');
page['return-to-decks'].click();
assert.equal(page.selection.hidden, false);
assert.equal(values.get('ti-flashcards:hidden:v1:sigma-tandem-flashcards.json'), '["card-1"]', 'Review leaves progress untouched');
page = launch(storage);
assert.equal(page.selection.hidden, false, 'Saved acknowledgement bypasses notice on next launch');
assert.equal(page.disclaimer.hidden, true);

const unavailable = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
page = launch(unavailable);
assert.equal(page.selection.hidden, true);
page['acknowledge-disclaimer'].click();
assert.equal(page.selection.hidden, false, 'Storage failure still allows this session');
page['review-sources'].click();
page['return-to-decks'].click();
assert.equal(page.selection.hidden, false, 'Review still works in the current session');
assert.equal(launch(unavailable).selection.hidden, true, 'Next launch asks again when storage is unavailable');
console.log('PASS: ' + mode + ' first launch, saved acknowledgement, unavailable storage, source review, and bundled notice');
