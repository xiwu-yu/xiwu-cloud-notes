import { readFile, readdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { compilePosts } from './content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function build(rootPath = root) {
  const directory = join(rootPath, 'content/posts');
  const files = (await readdir(directory)).filter(name => name.endsWith('.md')).sort();
  if (!files.length) throw new Error('content/posts 中至少需要一篇 Markdown 随笔');
  const entries = await Promise.all(files.map(async filename => ({ filename, source: await readFile(join(directory, filename), 'utf8') })));
  const posts = compilePosts(entries);
  await Promise.all(posts.map(async post => {
    try { await access(join(rootPath, 'dist', post.image)); }
    catch { throw new Error(`${post.id}: 找不到配图 dist/${post.image}`); }
  }));
  const site = JSON.parse(await readFile(join(rootPath, 'content/site.json'), 'utf8'));
  for (const field of ['name', 'pronouns', 'intro', 'about', 'email']) {
    if (typeof site[field] !== 'string') throw new Error(`content/site.json: ${field} 必须是文字`);
  }
  if (!Array.isArray(site.tags) || site.tags.some(tag => typeof tag !== 'string')) throw new Error('content/site.json: tags 必须是文字数组');
  if (site.greetingName !== undefined && typeof site.greetingName !== 'string') throw new Error('content/site.json: greetingName 必须是文字');
  // body 兼容浏览器缓存中的旧版阅读脚本，仍只由 Markdown 生成。
  const interests = posts.map(({body, order, ...post}) => ({...post, body:post.text}));
  const data = {name:site.name, greetingName:site.greetingName || site.name, pronouns:site.pronouns, intro:site.intro, about:site.about, email:site.email, tags:site.tags, isDemo:site.isDemo === true, interests};
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  await writeFile(join(rootPath, 'dist/profile.js'), '// 自动生成，请修改 content/site.json 或 content/posts/*.md，再运行 pnpm build。\nwindow.siteProfile = '+json+';\n');
  console.log(`已从 Markdown 生成 ${posts.length} 篇随笔。`);
  return posts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch(error => { console.error(error.message); process.exitCode = 1; });
}
