import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { serve } from './serve.mjs';
const real = process.argv.includes('--real');
const root = fileURLToPath(new URL(`../.test-site/${real ? 'real' : 'fixture'}/`, import.meta.url));
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp(new URL('../dist/', import.meta.url), `${root}/dist`, { recursive: true });
await cp(new URL('../content/', import.meta.url), `${root}/content`, { recursive: true });
// 测试隔离生产 API；likes.spec 使用真正 Worker handler + 独立 SQLite。
await writeFile(`${root}/content/likes.json`, JSON.stringify({apiUrl:null}));
if (!real) {
  await rm(`${root}/content/posts`, { recursive: true });
  await cp(new URL('../tests/fixtures/posts/', import.meta.url), `${root}/content/posts`, { recursive: true });
}
await build(root);
serve({ root: `${root}/dist`, port: real ? 4173 : 4174 });
