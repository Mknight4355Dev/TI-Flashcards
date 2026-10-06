'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const files = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/sigma-tandem-flashcards.json': 'sigma-tandem-flashcards.json' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
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
