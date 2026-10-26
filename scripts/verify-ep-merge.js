'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const merged = JSON.parse(fs.readFileSync(path.join(root, 'sigma-ep-study-guide-flashcards.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'source-decks', 'sigma-ep-performance-test-flashcards.json'), 'utf8'));
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const byId = new Map(merged.cards.map(card => [card.id, card]));
assert.equal(merged.cards.length, 83);
assert.equal(byId.size, 83, 'Card IDs must stay unique');
assert.equal(merged.cards.filter(card => card.id.startsWith('sigma-ep-study-guide-')).length, 72, 'Every Study Guide card remains');
assert.deepEqual(merged.cards.filter(card => card.id.startsWith('sigma-ep-study-guide-')).map(card => card.id),
  Array.from({ length: 72 }, (_, index) => 'sigma-ep-study-guide-' + String(index + 1).padStart(3, '0')),
  'Study Guide cards must retain the examiner-provided order');
assert.ok(merged.sources.some(item => item.id === source.id), 'Original Performance Test source is retained');

let identical = 0, differing = 0, unique = 0;
for (const original of source.cards) {
  const match = merged.cards.find(card => card.id.startsWith('sigma-ep-study-guide-') && normalize(card.question) === normalize(original.question));
  if (!match) {
    assert.deepEqual(byId.get(original.id), original, 'Unique Performance Test card must be unchanged');
    unique++;
  } else if (match.answer === original.answer) {
    assert.equal(byId.has(original.id), false, 'Identical Performance Test card should not be repeated');
    for (const reference of original.references)
      assert.ok(match.references.some(item => JSON.stringify(item) === JSON.stringify(reference)), 'Both source citations remain');
    identical++;
  } else {
    const variant = byId.get(original.id);
    assert.ok(variant, 'Differing Performance Test card must remain');
    assert.equal(variant.answer, original.answer, 'Performance Test answer must be unchanged');
    assert.deepEqual(variant.references, original.references, 'Performance Test citations must be unchanged');
    assert.equal(match.includeInQuiz, false);
    assert.equal(variant.includeInQuiz, false);
    assert.match(match.reviewLabel, /Study Guide \(1 of 2\)/);
    assert.match(variant.reviewLabel, /Performance Test \(2 of 2\)/);
    const position = merged.cards.indexOf(match);
    assert.ok(position >= 0 && merged.cards[position + 1] === variant, 'Differing variant must immediately follow its Study Guide card');
    differing++;
  }
}
assert.deepEqual([identical, differing, unique], [53, 10, 1]);
assert.equal(merged.cards.at(-1).id, 'sigma-ep-performance-test-010', 'Unmatched Performance Test card belongs at the end');
assert.equal(merged.cards.filter(card => card.includeInQuiz === false).length, 20);
assert.equal(merged.counts.total, merged.cards.length);
assert.equal(merged.counts.quizReady, merged.cards.filter(card => card.includeInQuiz && card.status === 'verified').length);
assert.equal(merged.counts.needsReview, merged.cards.filter(card => card.requiresExaminerReview).length);
console.log('PASS: 83 merged EP cards, original Study Guide order, 10 adjacent review pairs, source citations, and quiz flags');
