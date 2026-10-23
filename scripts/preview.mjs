import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';
import { build } from './build.mjs';

await build();
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp'};
const server = createServer(async (request, response) => {
  let filename;
  try { filename = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  const path = resolve(root, '.' + (filename === '/' ? '/index.html' : filename));
  if (!path.startsWith(root.endsWith(sep) ? root : root+sep)) { response.writeHead(403).end('Forbidden'); return; }
  try {
    const data = await readFile(path);
    response.writeHead(200, {'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    response.end(data);
  } catch { response.writeHead(404).end('Not found'); }
});
let pending;
let rebuilding = Promise.resolve();
const watchers = ['../content/', '../content/posts/'].map(path => watch(new URL(path, import.meta.url), () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    rebuilding = rebuilding.then(() => build()).then(() => console.log('内容已更新，请刷新浏览器。')).catch(error => console.error(error.message));
  }, 150);
}));
server.listen(8080, '127.0.0.1', () => console.log('Local: http://127.0.0.1:8080 — 修改 Markdown 后刷新查看，Ctrl+C 停止。'));
process.on('SIGINT', () => { clearTimeout(pending); watchers.forEach(watcher=>watcher.close()); server.close(); });
