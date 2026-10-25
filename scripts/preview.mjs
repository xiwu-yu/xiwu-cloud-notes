import { watch } from 'node:fs';
import { build } from './build.mjs';
import { serve } from './serve.mjs';

await build();
const server = serve({port:8080});
let pending;
let rebuilding = Promise.resolve();
const watchers = ['../content/', '../content/posts/'].map(path => watch(new URL(path, import.meta.url), () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    rebuilding = rebuilding.then(() => build()).then(() => console.log('内容已更新，请刷新浏览器。')).catch(error => console.error(error.message));
  }, 150);
}));
console.log('修改 Markdown 后刷新查看，Ctrl+C 停止。');
process.on('SIGINT', () => { clearTimeout(pending); watchers.forEach(watcher=>watcher.close()); server.close(); });
