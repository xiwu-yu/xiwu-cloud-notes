import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../scripts/build.mjs';
import { buildInfo } from '../scripts/build-info.mjs';
import { resolveSiteUrl } from '../scripts/static.mjs';
import { verifySite } from '../scripts/verify-site.mjs';

test('site base URL accepts HTTPS roots and subpaths, rejecting unsafe or ambiguous bases', () => {
  assert.equal(resolveSiteUrl(), 'https://cloud.xiwu.space/');
  assert.equal(resolveSiteUrl('https://xiwu-yu.github.io/xiwu-cloud-notes'), 'https://xiwu-yu.github.io/xiwu-cloud-notes/');
  for (const value of ['', null, 123, 'javascript:alert(1)', 'http://example.com/', 'https://u:p@example.com/', 'https://example.com/?lang=en', 'https://example.com/#home']) {
    assert.throws(() => resolveSiteUrl(value), /baseUrl.*HTTPS/);
  }
  assert.throws(() => buildInfo('.', 'https://cloud.xiwu.space/', {commitSha:'short'}), /commitSha/);
  assert.throws(() => buildInfo('.', 'https://cloud.xiwu.space/', {builtAt:'invalid'}), /builtAt/);
});

test('production and subpath builds have consistent static metadata, provenance and hashed resources; failure preserves outputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xiwu-deployment-'));
  const options = {commitSha:'a'.repeat(40), builtAt:'2026-10-25T08:00:00Z', source:'github-actions'};
  const previousEnv = process.env.SITE_URL;
  try {
    delete process.env.SITE_URL;
    await cp(new URL('../content/', import.meta.url), join(root, 'content'), {recursive:true});
    await cp(new URL('../dist/', import.meta.url), join(root, 'dist'), {recursive:true});
    await writeFile(join(root, 'content/posts/list-only.md'), '---\ntitle: 清单\ncategory: 日常\ndescription: 只有列表的合法文章\npublishedAt: "2026-10-25T16:00:00+08:00"\n---\n\n- 一条记录\n- 另一条记录\n');
    const load = (path, binary) => readFile(join(root, 'dist', path), binary ? undefined : 'utf8');
    const site = JSON.parse(await readFile(join(root, 'content/site.json')));
    for (const siteUrl of ['https://cloud.xiwu.space/', 'https://example.org/notes/']) {
      site.baseUrl = siteUrl;
      await writeFile(join(root, 'content/site.json'), JSON.stringify(site));
      await build(root, options);
      const result = await verifySite({siteUrl, load, expectedSha:options.commitSha});
      assert.ok(result.pages > 1);
      assert.ok(result.assets > 5);
      assert.equal(result.builtAt, '2026-10-25T08:00:00.000Z');
      const html = await load('posts/xiwu/zh-CN.html');
      assert.ok(html.includes(`${siteUrl}posts/xiwu/zh-CN.html`));
      assert.ok(html.includes('href="../../?lang=zh-CN"'), '相对返回链接不能丢掉子路径或语言');
      assert.doesNotMatch(await load('index.html'), /xiwu-yu\.github\.io/);
    }
    process.env.SITE_URL = 'https://preview.example.org/branch/';
    await build(root, options);
    await verifySite({siteUrl:process.env.SITE_URL, load, expectedSha:options.commitSha});
    const before = await load('build-info.json');
    const index = await load('index.html');
    process.env.SITE_URL = 'https://example.org/?unsafe=1';
    await assert.rejects(build(root, options), /baseUrl/);
    assert.equal(await load('build-info.json'), before);
    assert.equal(await load('index.html'), index);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/', load, expectedSha:'b'.repeat(40)}), /commit SHA/);
    const corrupt = (path, binary) => path === 'posts/xiwu/zh-CN.html' ? load(path).then(html => html.replace(/rel="canonical" href="[^"]+"/, 'rel="canonical" href="https://wrong.example/"')) : load(path, binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/', load:corrupt}), /canonical/);
    const missing = (path, binary) => path === 'script.js' ? Promise.reject(new Error('HTTP 404 script.js')) : load(path, binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/', load:missing}), /404 script/);
    const changed = (path, binary) => path === 'script.js' ? Promise.resolve(Buffer.from('changed')) : load(path, binary);
    await assert.rejects(verifySite({siteUrl:'https://preview.example.org/branch/', load:changed}), /内容哈希不符/);
  } finally {
    if (previousEnv === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previousEnv;
    await rm(root, {recursive:true, force:true});
  }
});
