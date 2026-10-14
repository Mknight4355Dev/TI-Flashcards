'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

class Element {
  constructor() {
    this.children = [];
    this.handlers = {};
    this.hidden = false;
    this.textContent = '';
    this.classList = { toggle() {} };
  }
  appendChild(element) { this.children.push(element); }
  addEventListener(name, listener) { this.handlers[name] = listener; }
  setAttribute() {}
  removeAttribute() {}
  focus() {}
  setPointerCapture() {}
  animate(frames, options) {
    const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
    this.animations = this.animations || [];
    this.animations.push(animation);
    return animation;
  }
  click() { this.handlers.click({ detail: 0 }); }
}

async function verify() {
  const elements = {};
  const document = {
    getElementById: id => elements[id] || (elements[id] = new Element()),
    createElement: () => new Element(),
    addEventListener() {}
  };
  let back, exits = 0;
  const App = {
    addListener(name, listener) {
      assert.equal(name, 'backButton');
      back = listener;
      return Promise.resolve();
    },
    exitApp() { exits++; }
  };
  const context = {
    document, console, App,
    matchMedia: () => ({ matches: false }),
    Capacitor: { getPlatform: () => 'android' },
    fetch: async file => {
      const packaged = fs.readFileSync(path.join(root, 'www', file));
      assert.deepEqual(packaged, fs.readFileSync(path.join(root, '..', file)));
      return { ok: true, json: async () => JSON.parse(packaged.toString().replace(/^\uFEFF/, '')) };
    }
  };
  document.getElementById('study').hidden = true;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'www', 'app.js'), 'utf8'), context);
  const native = fs.readFileSync(path.join(root, 'src', 'native.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(native, context);
  await new Promise(resolve => setImmediate(resolve));
  const choices = elements['deck-list'].children;
  assert.equal(choices.length, 6);
  back();
  assert.equal(exits, 1, 'Back closes the app at the picker');
  for (const choice of choices) {
    choice.click();
    assert.equal(elements.study.hidden, false);
    assert.match(elements.position.textContent, /^Card 1 of /);
    assert.equal(elements.side.textContent, 'QUESTION');
    const card = elements.card;
    const swipe = (dx, dy = 0) => {
      card.handlers.pointerdown({ isPrimary: true, pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 200 });
      card.handlers.pointerup({ pointerId: 1, clientX: 200 + dx, clientY: 200 + dy });
    };
    swipe(-100);
    assert.ok(card.animations.at(-1).frames[0].transform.includes('translateX(64px)'), 'Next card enters from the right');
    const forwardAnimation = card.animations.at(-1);
    assert.match(elements.position.textContent, /^Card 2 of /);
    card.handlers.click({ detail: 1 });
    assert.equal(elements.side.textContent, 'QUESTION', 'Swipe does not flip the new card');
    swipe(100);
    assert.match(elements.position.textContent, /^Card 1 of /);
    swipe(100);
    assert.match(elements.position.textContent, /^Card 1 of /, 'Right swipe stops at the first card');
    swipe(-20);
    assert.match(elements.position.textContent, /^Card 1 of /, 'Small movements do not navigate');
    swipe(-60, 100);
    assert.match(elements.position.textContent, /^Card 1 of /, 'Vertical scrolling does not navigate');
    card.handlers.pointerdown({ isPrimary: true, pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 200 });
    card.handlers.pointercancel();
    card.handlers.pointerup({ pointerId: 1, clientX: 50, clientY: 200 });
    assert.match(elements.position.textContent, /^Card 1 of /, 'Cancelled gestures do not navigate');
    context.matchMedia = () => ({ matches: true });
    const animationCount = card.animations.length;
    swipe(-100);
    swipe(100);
    assert.equal(card.animations.length, animationCount, 'Reduced motion skips card animations');
    context.matchMedia = () => ({ matches: false });
    elements.flip.click();
    assert.equal(elements.side.textContent, 'ANSWER');
    back();
    assert.equal(elements.study.hidden, true);
    assert.equal(elements.selection.hidden, false);
    assert.equal(exits, 1, 'Back returns from a deck without closing the app');
    choice.click();
    const count = Number(elements.position.textContent.split(' ').pop());
    for (let index = 1; index < count; index++) elements.next.click();
    assert.equal(elements.next.textContent, 'Start over');
    elements.next.click();
    assert.match(elements.position.textContent, /^Card 1 of /);
    elements['hide-card'].click();
    assert.equal(elements.position.textContent, 'Card 1 of ' + (count - 1) + ' (1 hidden)');
    const nextQuestion = elements['question-number'].textContent;
    elements['back-to-decks'].click();
    choice.click();
    assert.equal(elements['question-number'].textContent, nextQuestion, 'Hidden cards stay hidden when reopening');
    for (let remaining = count - 1; remaining > 0; remaining--) elements['hide-card'].click();
    assert.equal(elements.position.textContent, '0 cards remaining (' + count + ' hidden)');
    assert.equal(elements.card.hidden, true);
    assert.equal(elements['empty-deck'].hidden, false);
    assert.equal(elements['hide-card'].disabled, true);
    elements.next.click();
    elements.flip.click();
    elements['reset-deck'].click();
    assert.equal(elements.card.hidden, false);
    assert.equal(elements['empty-deck'].hidden, true);
    assert.equal(elements.position.textContent, 'Card 1 of ' + count);
    assert.equal(elements['reset-deck'].disabled, true);
    assert.equal(elements.side.textContent, 'QUESTION');
    for (let step = 1; step < count; step++) elements.next.click();
    elements['hide-card'].click();
    assert.equal(elements.position.textContent, 'Card ' + (count - 1) + ' of ' + (count - 1) + ' (1 hidden)', 'Hiding last card selects previous');
    elements['reset-deck'].click();
    elements['back-to-decks'].click();
    assert.equal(elements.study.hidden, true);
  }
  choices[0].click();
  elements['hide-card'].click();
  elements['back-to-decks'].click();
  choices[1].click();
  assert.ok(!elements.position.textContent.includes('hidden'), 'Decks have independent hidden cards');
  elements['back-to-decks'].click();
  choices[0].click();
  assert.ok(elements.position.textContent.includes('(1 hidden)'));
  elements['reset-deck'].click();
  const html = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');
  assert.match(html, /src="native.js"/);
  assert.ok(fs.statSync(path.join(root, 'www', 'native.js')).size > 0);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  assert.equal(config.webDir, 'www');
  assert.equal(config.server, undefined, 'APK must use local assets');
  console.log('PASS: offline decks, all six study flows and swipe navigation, hide/reset controls, last-card restart, native Back, and wrapper assets');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
