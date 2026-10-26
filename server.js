'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const files = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/sigma-tandem-flashcards.json': 'sigma-tandem-flashcards.json', '/uspa-ti-evaluation-flashcards.json': 'uspa-ti-evaluation-flashcards.json' };
files['/sigma-ep-study-guide-flashcards.json'] = 'sigma-ep-study-guide-flashcards.json';
files['/tandem-canopy-proficiency-flashcards.json'] = 'tandem-canopy-proficiency-flashcards.json';
files['/tandem-skydive-checklist-flashcards.json'] = 'tandem-skydive-checklist-flashcards.json';
files['/web-pwa.js'] = 'web-pwa.js';
files['/disclaimer.js'] = 'disclaimer.js';
files['/sw.js'] = 'sw.js';
files['/manifest.webmanifest'] = 'manifest.webmanifest';
files['/icons/icon-192.png'] = 'icons/icon-192.png';
files['/icons/icon-512.png'] = 'icons/icon-512.png';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const name = files[req.url.split('?')[0]];
  if (!name) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, name), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read file'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(name)] + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(3000, '127.0.0.1', () => console.log('Flashcards: http://localhost:3000'));
