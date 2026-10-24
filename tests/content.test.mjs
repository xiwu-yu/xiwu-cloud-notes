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
  for(const fragment of ['<h2>小标题</h2>','<strong>加粗</strong>','<blockquote>','<ul>','<pre><code class="language-js">']) assert.ok(post.bodyHtml.includes(fragment));
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
  assert.throws(()=>parsePost(source('正文','source: "javascript:alert(1)"\n'),'bad.md'), /http/);
  assert.throws(()=>parsePost(source('正文','image: "assets/../secret.png"\n'),'bad.md'), /相对路径/);
  assert.throws(()=>parsePost(source('正文','privateNote: 私密内容\n'),'bad.md'), /不认识的字段/);
});

test('Existing sequence is retained and duplicate article IDs are rejected', () => {
  const entries=[{filename:'a.md',source:source('一','order: 2\n')},{filename:'b.md',source:source('二','order: 1\n')}];
  assert.deepEqual(compilePosts(entries).map(post=>post.id),['b','a']);
  assert.throws(()=>compilePosts([entries[0],entries[0]]), /重复的文章 id/);
});

test('Article tags are optional, support Chinese text, and reject invalid values', () => {
  assert.deepEqual(parsePost(source(), 'untagged.md').tags, []);
  assert.deepEqual(parsePost(source('正文', 'tags: [HRT, 性别认同, HRT]\n'), 'tagged.md').tags, ['HRT', '性别认同']);
  assert.throws(() => parsePost(source('正文', 'tags: HRT\n'), 'bad.md'), /tags/);
  assert.throws(() => parsePost(source('正文', 'tags: [HRT, 123]\n'), 'bad.md'), /tags/);
});

test('Adding and removing Markdown updates the build; a bad file preserves the last good output', async () => {
  const root=await mkdtemp(join(tmpdir(),'xiwu-content-'));
  try {
    await mkdir(join(root,'content/posts'),{recursive:true});
    await mkdir(join(root,'dist/assets'),{recursive:true});
    await writeFile(join(root,'dist/assets/cloud-blue.svg'),'<svg/>');
    await writeFile(join(root,'content/site.json'),JSON.stringify({name:'夕雾',pronouns:'她',intro:'介绍',about:'关于',email:'',tags:[]}));
    await writeFile(join(root,'content/posts/one.md'),source('第一篇'));
    await build(root);
    await writeFile(join(root,'content/posts/two.md'),source('第二篇'));
    await build(root);
    let context={window:{}};
    runInNewContext(await readFile(join(root,'dist/profile.js'),'utf8'),context);
    assert.equal(context.window.siteProfile.interests.length,2);
    await rm(join(root,'content/posts/one.md'));
    await build(root);
    const good=await readFile(join(root,'dist/profile.js'),'utf8');
    context={window:{}}; runInNewContext(good,context);
    assert.equal(context.window.siteProfile.interests[0].id,'two');
    assert.equal(context.window.siteProfile.interests.length,1);
    await writeFile(join(root,'content/posts/bad.md'),'有错');
    await assert.rejects(build(root),/bad.md/);
    assert.equal(await readFile(join(root,'dist/profile.js'),'utf8'),good);
  } finally { await rm(root,{recursive:true,force:true}); }
});
