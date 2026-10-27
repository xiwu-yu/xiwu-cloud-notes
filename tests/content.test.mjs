import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parsePost, compilePosts } from '../scripts/content.mjs';
import { build } from '../scripts/build.mjs';

const source = (body='正文。', metadata='') => `---\ntitle: 一篇随笔\ncategory: 日常\ndescription: 一点想法\npublishedAt: "2026-10-23T20:00:00+08:00"\n${metadata}---\n\n${body}\n`;

test('Markdown formats render; reading text excludes markup and link URLs', () => {
  const post = parsePost(source('## 小标题\n\n**加粗**与[链接](https://example.com)\n\n> 引用\n\n- 第一项\n- 第二项\n\n`code`\n\n```js\nconst a = 1;\n```'), 'example.md');
  assert.equal(post.id,'example');
  for(const fragment of ['<h2 id="section-1" data-reader-block="" tabindex="-1">小标题</h2>','<strong>加粗</strong>','<blockquote>','<ul>','class="language-js"']) assert.ok(post.bodyHtml.includes(fragment));
  assert.ok(post.text.includes('第一项'));
  assert.ok(!post.text.includes('https://example.com'));
  assert.ok(!post.text.includes('**'));
});

test('Raw HTML and javascript links cannot become executable article markup', () => {
  const post=parsePost(source('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[点击](javascript:alert(1))'), 'safe.md');
  assert.ok(!post.bodyHtml.includes('<script>'));
  assert.ok(!post.bodyHtml.includes('<img '));
  assert.ok(!post.bodyHtml.includes('href="javascript:'));
  assert.ok(post.bodyHtml.includes('&lt;script&gt;'));
});

test('Invalid metadata fails with the filename rather than silently dropping content', () => {
  assert.throws(()=>parsePost('没有文章资料','bad.md'), /bad.md/);
  assert.throws(()=>parsePost(source().replace('2026-10-23T20:00:00+08:00','2026-02-30T20:00:00+08:00'),'bad.md'), /日期不存在/);
  assert.throws(()=>parsePost(source().replace('2026-10-23T20:00:00+08:00','2026-10-23'),'bad.md'), /带时区/);
  assert.throws(()=>parsePost(source(''),'bad.md'), /正文不能为空/);
  assert.throws(()=>parsePost(source().replace('T20:00:00','T24:00:00'),'bad.md'), /bad.md.*publishedAt.*时间不存在/);
  assert.throws(()=>parsePost(source('正文','source: "javascript:alert(1)"\n'),'bad.md'), /http/);
  assert.throws(()=>parsePost(source('正文','image: "assets/../secret.png"\n'),'bad.md'), /相对路径/);
  assert.throws(()=>parsePost(source('正文','privateNote: 私密内容\n'),'bad.md'), /不认识的字段/);
});

test('Existing sequence is retained and duplicate article IDs are rejected', () => {
  const entries=[{filename:'a.md',source:source('一','order: 2\n')},{filename:'b.md',source:source('二','order: 1\n')}];
  assert.deepEqual(compilePosts(entries).map(post=>post.id),['b','a']);
  assert.throws(()=>compilePosts([entries[0],entries[0]]), /重复的文章 id/);
});

test('The same article id may be translated once per language, but not twice in one language', () => {
  const translated=[{filename:'a.md',source:source('一')},{filename:'a.en.md',source:source('one','id: "a"\nlang: "en"\n')},{filename:'a.ja.md',source:source('一つ','id: "a"\nlang: "ja"\n')}];
  assert.equal(compilePosts(translated).length,3);
  assert.throws(()=>compilePosts([translated[0],{filename:'a.zh.md',source:source('再次','id: "a"\n')}]), /重复的文章 id/);
  assert.throws(()=>parsePost(source('正文','lang: "fr"\n'),'bad.md'), /lang/);
});

test('Article tags are optional, support Chinese text, and reject invalid values', () => {
  assert.deepEqual(parsePost(source(), 'untagged.md').tags, []);
  assert.deepEqual(parsePost(source('正文', 'tags: [HRT, 性别认同, HRT]\n'), 'tagged.md').tags, ['HRT', '性别认同']);
  assert.throws(() => parsePost(source('正文', 'tags: HRT\n'), 'bad.md'), /tags/);
  assert.throws(() => parsePost(source('正文', 'tags: [HRT, 123]\n'), 'bad.md'), /tags/);
});

test('Writing dates accept real calendar dates without inventing a time or upload fallback', () => {
  assert.equal(parsePost(source(), 'unknown.md').writtenAt,null);
  assert.equal(parsePost(source('正文', 'writtenAt: null\n'), 'unknown.md').writtenAt,null);
  assert.equal(parsePost(source('正文', 'writtenAt: "2026-10-14"\n'), 'old.md').writtenAt,'2026-10-14');
  assert.equal(parsePost(source('正文', 'writtenAt: "2024-02-29"\n'), 'leap.md').writtenAt,'2024-02-29');
  for (const date of ['2026-02-29','2026-02-30','2026-13-01','2026-10-14T00:00:00Z']) {
    assert.throws(()=>parsePost(source('正文', `writtenAt: "${date}"\n`),'bad.md'), /writtenAt/);
  }
});

test('Adding and removing Markdown updates the build; a bad file preserves the last good output', async () => {
  const root=await mkdtemp(join(tmpdir(),'xiwu-content-'));
  try {
    await mkdir(join(root,'content/posts'),{recursive:true});
    await mkdir(join(root,'dist/assets'),{recursive:true});
    await writeFile(join(root,'dist/assets/cloud-blue.svg'),'<svg/>');
    await writeFile(join(root,'dist/assets/share-cover.png'),await readFile(new URL('../dist/assets/share-cover.png',import.meta.url)));
    await writeFile(join(root,'content/site.json'),JSON.stringify({name:'夕雾',pronouns:'她',intro:'介绍',about:'关于',email:'',tags:[]}));
    await writeFile(join(root,'content/ui.json'),await readFile(new URL('../content/ui.json',import.meta.url),'utf8'));
    await writeFile(join(root,'dist/index.html'),'<!-- STATIC_ARCHIVE_START --><!-- STATIC_ARCHIVE_END --><link rel="stylesheet" href="style.css?v=old"><script src="script.js?v=old"></script><img src="assets/cloud-blue.svg" alt="">');
    await writeFile(join(root,'dist/style.css'),'body{background:url("assets/cloud-blue.svg")}');
    await writeFile(join(root,'dist/script.js'),'console.log(1);');
    await writeFile(join(root,'dist/appearance.js'),await readFile(new URL('../dist/appearance.js',import.meta.url)));
    await writeFile(join(root,'dist/reading.js'),await readFile(new URL('../dist/reading.js',import.meta.url)));
    await writeFile(join(root,'dist/reader.js'),await readFile(new URL('../dist/reader.js',import.meta.url)));
    await writeFile(join(root,'content/posts/one.md'),source('第一篇'));
    await writeFile(join(root,'dist/likes.js'),await readFile(new URL('../dist/likes.js',import.meta.url)));
    await build(root);
    await writeFile(join(root,'content/posts/two.md'),source('第二篇'));
    await build(root);
    let context={window:{}};
    runInNewContext(await readFile(join(root,'dist/profile.js'),'utf8'),context);
    assert.equal(context.window.siteProfile.localized['zh-CN'].interests.length,2);
    assert.equal(context.window.siteProfile.localized.en.interests.length,2);
    assert.equal(context.window.siteProfile.localized.en.interests[0].categoryKey,'日常');
    assert.match(context.window.siteProfile.localized['zh-CN'].interests[0].image,/^assets\/cloud-blue\.svg\?v=[a-f0-9]{10}$/);
    const versioned=await readFile(join(root,'dist/index.html'),'utf8');
    assert.match(versioned,/style\.css\?v=[a-f0-9]{10}/);
    assert.match(versioned,/script\.js\?v=[a-f0-9]{10}/);
    assert.match(versioned,/assets\/cloud-blue\.svg\?v=[a-f0-9]{10}/);
    assert.doesNotMatch(versioned,/v=old/);
    const versionedCss=await readFile(join(root,'dist/style.css'),'utf8');
    assert.match(versionedCss,/assets\/cloud-blue\.svg\?v=[a-f0-9]{10}/);
    const firstVersion=versioned;
    await build(root);
    assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),firstVersion);
    await rm(join(root,'content/posts/one.md'));
    await build(root);
    const good=await readFile(join(root,'dist/profile.js'),'utf8');
    context={window:{}}; runInNewContext(good,context);
    assert.equal(context.window.siteProfile.localized['zh-CN'].interests[0].id,'two');
    assert.equal(context.window.siteProfile.localized['zh-CN'].interests.length,1);
    await writeFile(join(root,'content/posts/bad.md'),'有错');
    await assert.rejects(build(root),/bad.md/);
    assert.equal(await readFile(join(root,'dist/profile.js'),'utf8'),good);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('shared metadata mismatch reports both files, field and conflicting values', () => {
  const original = { filename: 'cloud.md', source: source('正文', 'id: cloud\nwrittenAt: "2026-09-16"\norder: 1\n') };
  const translated = source('English', 'id: cloud\nlang: en\nwrittenAt: "2026-09-16"\norder: 1\n');
  for (const [field, wrong] of [
    ['publishedAt', translated.replace('2026-10-23T20:00:00+08:00', '2026-10-24T20:00:00+08:00')],
    ['writtenAt', translated.replace('2026-09-16', '2026-09-17')],
    ['writtenAt', translated.replace('writtenAt: "2026-09-16"', 'writtenAt: null')],
    ['order', translated.replace('order: 1', 'order: 2')],
    ['image', translated.replace('---\n\nEnglish', 'image: assets/cloud-pink.svg\n---\n\nEnglish')]
  ]) {
    assert.throws(() => compilePosts([original, {filename:'cloud.en.md',source:wrong}]), error => error.message.includes('cloud.en.md') && error.message.includes('cloud.md') && error.message.includes(field) && error.message.includes('一致'));
  }
  const result = compilePosts([original, { filename: 'cloud.en.md', source: translated.replace('---\n\nEnglish', 'updatedAt: "2026-10-25T12:00:00+08:00"\n---\n\nEnglish') }]);
  assert.notEqual(result[0].updatedAt, result[1].updatedAt);
  assert.throws(() => compilePosts([{ filename:'orphan.en.md', source:translated }]), /orphan.en.md.*id.*缺少 zh-CN 原文/);
  assert.throws(() => compilePosts([original, {filename:'duplicate.md',source:original.source}]), /duplicate.md.*重复.*cloud.md/);
});

test('real Markdown meets the content contract without fixing the article count', async () => {
  const { readdir } = await import('node:fs/promises');
  const directory = new URL('../content/posts/', import.meta.url);
  const files = (await readdir(directory)).filter(file => file.endsWith('.md'));
  const posts = compilePosts(await Promise.all(files.map(async filename => ({ filename, source: await readFile(new URL(filename, directory), 'utf8') }))));
  assert.ok(posts.some(post => post.lang === 'zh-CN'));
  for (const post of posts) {
    assert.ok(post.bodyHtml.length > 0);
    assert.ok(post.text.length > 0);
    await readFile(new URL(`../dist/${post.image}`, import.meta.url));
  }
});

test('new article, missing translations, static metadata, deletion and failed rebuild preserve all outputs', async () => {
  const { cp, readdir } = await import('node:fs/promises');
  const root = await mkdtemp(join(tmpdir(), 'xiwu-static-'));
  async function snapshot(path) {
    const result = {};
    for (const entry of await readdir(path, {withFileTypes:true})) {
      if (entry.isDirectory()) result[entry.name] = await snapshot(join(path, entry.name));
      else result[entry.name] = await readFile(join(path, entry.name), 'utf8');
    }
    return result;
  }
  try {
    await cp(new URL('../content/', import.meta.url), join(root,'content'), {recursive:true});
    await cp(new URL('../dist/', import.meta.url), join(root,'dist'), {recursive:true});
    await writeFile(join(root,'content/posts/new-day.md'),source('## 新文章\n\n一篇没有译文的新文章。', 'writtenAt: "2026-10-01"\n'));
    await build(root);
    const ctx = {window:{}};
    runInNewContext(await readFile(join(root,'dist/profile.js'),'utf8'),ctx);
    assert.equal(ctx.window.siteProfile.interests, undefined);
    assert.equal(ctx.window.siteProfile.localized.en.interests.find(p=>p.id==='new-day').fallback, true);
    assert.equal(ctx.window.siteProfile.localized.en.interests.find(p=>p.id==='new-day').lang, 'zh-CN');
    assert.equal(ctx.window.siteProfile.localized.en.interests.find(p=>p.id==='new-day').body, undefined);
    const html = await readFile(join(root,'dist/posts/new-day/zh-CN.html'),'utf8');
    assert.match(html, /<h2[^>]*id="section-1"[^>]*>新文章<\/h2>/);
    assert.match(html, /<html lang="zh-CN">/);
    assert.match(html, /<title>一篇随笔/);
    assert.match(html, /<link rel="canonical" href="https:\/\/cloud.xiwu.space\/posts\/new-day\/zh-CN.html">/);
    assert.match(html, /property="og:locale" content="zh_CN"/);
    assert.match(html, /name="description" content="一点想法"/);
    assert.match(html, /<script src="\.\.\/\.\.\/reading\.js\?v=[a-f0-9]{10}"><\/script>/);
    assert.doesNotMatch(html, /(?:profile|archive|script)\.js/);
    const sitemap = await readFile(join(root,'dist/sitemap.xml'),'utf8');
    assert.match(sitemap, /cloud.xiwu.space\/posts\/new-day\/zh-CN.html/);
    assert.doesNotMatch(sitemap, /new-day\/en.html/);
    const before = await snapshot(join(root,'dist'));
    await build(root, {builtAt: JSON.parse(before['build-info.json']).builtAt});
    assert.deepEqual(await snapshot(join(root,'dist')), before, '正文和资源可确定性重建；构建时间显式固定');
    const translationPath = join(root,'content/posts/new-day.en.md');
    const translation = source('English', 'id: new-day\nlang: en\nwrittenAt: "2026-10-01"\n');
    for (const bad of [
      translation.replace('2026-10-01','2026-10-02'),
      translation.replace('2026-10-23T20:00:00+08:00','2026-10-24T20:00:00+08:00'),
      source('duplicate','id: new-day\n'),
      source('orphan','id: orphan\nlang: en\n')
    ]) {
      await writeFile(translationPath,bad);
      await assert.rejects(build(root), /new-day.en.md/);
      assert.deepEqual(await snapshot(join(root,'dist')), before, '失败必须保留上次全部成功输出');
    }
    await writeFile(translationPath,translation);
    await build(root);
    assert.match(await readFile(join(root,'dist/posts/new-day/en.html'),'utf8'), /<p[^>]*id="passage-1"[^>]*>English<\/p>/);
    await rm(translationPath);
    await rm(join(root,'content/posts/new-day.md'));
    await build(root);
    await assert.rejects(readFile(join(root,'dist/posts/new-day/zh-CN.html')), /ENOENT/);
    assert.doesNotMatch(await readFile(join(root,'dist/sitemap.xml'),'utf8'), /new-day/);
    assert.doesNotMatch(await readFile(join(root,'dist/index.html'),'utf8'), /posts\/new-day/);
  } finally { await rm(root, {recursive:true,force:true}); }
});

test('headings and passages have safe unique anchors without rewriting article text', () => {
  const post = parsePost(source('## **重复**标题\n\n正文中的[链接](https://example.com)。\n\n## **重复**标题\n\n### <img src=x>\n\n~~~\n[a+b]\n~~~'), 'anchors.md');
  assert.deepEqual(post.headings.map(h=>[h.id,h.level,h.text]),[['section-1',2,'重复标题'],['section-2',2,'重复标题'],['section-3',3,'<img src=x>']]);
  const ids=[...post.bodyHtml.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  assert.ok(post.bodyHtml.includes('id="passage-1"'));
  assert.ok(post.bodyHtml.includes('&lt;img src=x&gt;'));
  assert.ok(!post.bodyHtml.includes('<img '));
  assert.ok(!post.text.includes('section-1'));
  assert.ok(post.text.includes('正文中的链接'));
});
