// Plain HTTP server for the whiteboard: one static page + PNG saves.
// No framework, no packages. Port defaults to 8788 (the agenda server uses 8787).
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const page = path.join(here, 'app.html');
const saves = path.join(here, 'saves');
const PORT = Number(process.env.BOARD_PORT) || 8788;
const MAX_SAVE = 8 * 1024 * 1024;

fs.mkdirSync(saves, { recursive: true });

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal) out.push(net.address);
    }
  }
  return out;
}

http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/favicon.ico') { res.writeHead(204); res.end(); return; }

  if (url === '/save' && req.method === 'POST') {
    const auto = /\?.*\bauto=1/.test(req.url || '');
    const body = [];
    let size = 0, tooBig = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SAVE) { tooBig = true; return; }
      body.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) { res.writeHead(413); res.end('Too large\n'); return; }
      const png = Buffer.concat(body);
      fs.writeFileSync(path.join(saves, 'latest.png'), png);
      if (!auto) {
        const name = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..*/, '') + '.png';
        fs.writeFileSync(path.join(saves, name), png);
        console.log('Saved ' + name + '.');
      }
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('saved\n');
    });
    return;
  }

  if (url === '/latest.png') {
    const file = path.join(saves, 'latest.png');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('No save yet\n'); return; }
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
    return;
  }

  if (url !== '/' && url !== '/index.html') { res.writeHead(404); res.end('Not found\n'); return; }

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(page));
}).listen(PORT, '0.0.0.0', () => {
  console.log('Whiteboard listening on port ' + PORT + '.');
  for (const address of lanAddresses()) console.log('On the frame, open http://' + address + ':' + PORT + '/');
});
