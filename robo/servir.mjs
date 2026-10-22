#!/usr/bin/env node
// Servidor estático mínimo para desenvolvimento: node robo/servir.mjs [porta]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const porta = +(process.argv[2] || 8126);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.normalize(path.join(raiz, p));
    if (!f.startsWith(raiz)) throw new Error('fora da raiz');
    const s = await stat(f);
    if (s.isDirectory()) { res.writeHead(302, { Location: p + '/' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(f));
  } catch (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 ' + e.message); }
}).listen(porta, '127.0.0.1', () => console.log(`Mister 26 em http://127.0.0.1:${porta}/`));
