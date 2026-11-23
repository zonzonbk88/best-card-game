// A five-line static server for playing the game locally: `node serve.ts`,
// then open http://localhost:8080. Development only — the entry itself is the
// plain files under game/, which any static server (or the grader) can host.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

createServer(async (req, res) => {
  const path = normalize(join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]));
  if (!path.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(8080, () => console.log('Emberfall Duel at http://localhost:8080'));
