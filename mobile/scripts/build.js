'use strict';
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

async function build() {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'www');
  const decks = ['sigma-tandem-flashcards.json', 'uspa-ti-evaluation-flashcards.json',
    'sigma-ep-study-guide-flashcards.json',
    'tandem-canopy-proficiency-flashcards.json',
    'tandem-skydive-checklist-flashcards.json'];
  // Validate all decks before producing assets. The original JSON files remain shared.
  for (const file of decks) {
    const data = JSON.parse(fs.readFileSync(path.join(root, '..', file), 'utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(data.cards) || !data.cards.length) throw new Error(file + ' has no flashcards');
  }
  fs.mkdirSync(output, { recursive: true });
  for (const file of ['index.html', 'app.js', 'styles.css']) {
    fs.copyFileSync(path.join(root, 'src', file), path.join(output, file));
  }
  for (const file of decks) fs.copyFileSync(path.join(root, '..', file), path.join(output, file));
  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'native.js')],
    outfile: path.join(output, 'native.js'),
    bundle: true,
    platform: 'browser',
    target: 'chrome89'
  });
  console.log('Built offline Android web assets in mobile/www');
}
build().catch(error => { console.error(error); process.exitCode = 1; });
