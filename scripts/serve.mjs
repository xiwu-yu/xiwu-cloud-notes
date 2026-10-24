import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

export function serve({ root = defaultRoot, port = Number(process.env.PORT) || 4173 } = {}) {
  root = resolve(root);
  return createServer(async (request, response) => {
    let filename;
    try { filename = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end('Bad request'); return; }
    // 同时测试本地根目录和真实 GitHub Pages 子路径。
    filename = filename.replace(/^\/xiwu-cloud-notes(?=\/|$)/, '') || '/';
    if (filename.endsWith('/')) filename += 'index.html';
    const path = resolve(root, '.' + filename);
    if (!path.startsWith(root + sep)) { response.writeHead(403).end('Forbidden'); return; }
    try {
      const data = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(data);
    } catch { response.writeHead(404).end('Not found'); }
  }).listen(port, '127.0.0.1', () => console.log(`Test server: http://127.0.0.1:${port}`));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) serve();
