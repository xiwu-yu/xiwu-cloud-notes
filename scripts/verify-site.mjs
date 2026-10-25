// 同一校验用于本地构建与发布后只读检查；不执行部署，也不依赖页面 JavaScript。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { resolveSiteUrl } from './static.mjs';

const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => decode(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '');
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(match => match[0]);
const links = html => tags(html, 'link');
const meta = (html, property) => attr(tags(html, 'meta').find(tag => attr(tag, 'property') === property) || '', 'content');

export async function verifySite({siteUrl, load, expectedSha}) {
  siteUrl = resolveSiteUrl(siteUrl);
  const info = JSON.parse(await load('build-info.json'));
  assert.equal(info.siteUrl, siteUrl, 'build-info.siteUrl');
  assert.ok(info.commitSha === null || /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(info.commitSha), 'build-info.commitSha 必须是完整 SHA 或 null');
  assert.ok(info.workingTreeDirty === null || typeof info.workingTreeDirty === 'boolean', 'build-info.workingTreeDirty 必须是 boolean 或 null');
  assert.ok(Number.isFinite(Date.parse(info.builtAt)), 'build-info.builtAt');
  assert.ok(info.source, 'build-info.source');
  if (expectedSha) {
    assert.equal(info.commitSha, expectedSha, '已发布 commit SHA 必须与待核对版本相同');
    assert.equal(info.source, 'github-actions', '正式部署应来自 GitHub Actions');
    assert.equal(info.workingTreeDirty, false, '正式构建必须来源已知且无未提交构建输入（不能是 dirty 或 unknown/null）');
  }
  const sitemap = await load('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
  assert.equal(new Set(urls).size, urls.length, 'sitemap 不应重复');
  assert.ok(urls.includes(siteUrl), 'sitemap 必须含首页');
  assert.ok(urls.length > 1, 'sitemap 必须含真实文章');
  const robots = await load('robots.txt');
  assert.ok(robots.split(/\r?\n/).includes(`Sitemap: ${siteUrl}sitemap.xml`), 'robots Sitemap 基址');
  const assets = new Map();
  const images = new Map();
  for (const absolute of urls) {
    assert.ok(absolute.startsWith(siteUrl), `sitemap 越出站点基址: ${absolute}`);
    const path = absolute.slice(siteUrl.length);
    assert.ok(!path || /^posts\/[a-z0-9-]+\/(zh-CN|zh-TW|en|ja)\.html$/.test(path), `未知静态路径: ${path}`);
    const html = await load(path || 'index.html');
    const canonical = links(html).filter(tag => attr(tag, 'rel') === 'canonical');
    assert.equal(canonical.length, 1, `${path}: canonical 数量`);
    assert.equal(attr(canonical[0], 'href'), absolute, `${path}: canonical`);
    assert.equal(meta(html, 'og:url'), absolute, `${path}: og:url`);
    assert.ok(meta(html, 'og:title') && meta(html, 'og:description'), `${path}: OG 内容`);
    assert.ok(meta(html, 'og:image').startsWith(siteUrl), `${path}: og:image 基址`);
    assert.equal(meta(html, 'og:title'), decode(html.match(/<title>(.*?)<\/title>/)?.[1] || ''), `${path}: 原始 title 与 OG 一致`);
    assert.equal(meta(html, 'og:image:type'), 'image/png', `${path}: 分享图片类型`);
    assert.equal(meta(html, 'og:image:width'), '1200', `${path}: 分享图片宽度`);
    assert.equal(meta(html, 'og:image:height'), '630', `${path}: 分享图片高度`);
    const imageUrl = new URL(meta(html, 'og:image'));
    images.set(imageUrl.pathname, {path:decodeURIComponent(imageUrl.pathname.slice(new URL(siteUrl).pathname.length)),version:imageUrl.searchParams.get('v')});
    const alternates = links(html).filter(tag => attr(tag, 'rel') === 'alternate');
    const language = path.match(/\/(zh-CN|zh-TW|en|ja)\.html$/)?.[1];
    if (language) {
      assert.ok(html.includes(`<html lang="${language}">`), `${path}: 正文语言`);
      const body = html.match(/class="article-body"[^>]*>([\s\S]*?)<\/div>/)?.[1];
      assert.ok(body?.trim(), `${path}: 必须有静态正文（列表或代码也可以独立成文）`);
      assert.ok(alternates.some(tag => attr(tag, 'hreflang') === language && attr(tag, 'href') === absolute), `${path}: 自身 hreflang`);
    } else {
      assert.equal(alternates.length, 0, '单个中文静态首页不能声明查询参数对应静态译本');
      assert.match(html, /<html\b[^>]*lang="zh-CN"/, '首页原始语言');
      assert.match(html, /<h1\b[\s\S]*?[\u3400-\u9fff][\s\S]*?<\/h1>/, '首页原始标题为中文');
      assert.equal(meta(html, 'og:locale'), 'zh_CN', '首页静态 OG 语言');
    }
    for (const tag of alternates) {
      const url = attr(tag, 'href');
      assert.ok(url.startsWith(siteUrl), `${path}: hreflang 基址 ${url}`);
      if (language) {
        assert.ok(urls.includes(url), `${path}: hreflang 指向不存在的译文 ${url}`);
        assert.ok(url.endsWith(`/${attr(tag, 'hreflang')}.html`), `${path}: hreflang 语言不匹配`);
      }
    }
    for (const tag of [...tags(html, 'script'), ...tags(html, 'link'), ...tags(html, 'img')]) {
      const value = attr(tag, 'src') || attr(tag, 'href');
      if (!value || (!tag.startsWith('<script') && !tag.startsWith('<img') && attr(tag, 'rel') !== 'stylesheet' && attr(tag, 'rel') !== 'icon')) continue;
      const url = new URL(value, absolute);
      if (!url.href.startsWith(siteUrl)) continue;
      assets.set(url.pathname, {path:decodeURIComponent(url.pathname.slice(new URL(siteUrl).pathname.length)), version:url.searchParams.get('v')});
    }
  }
  for (const [key, value] of images) assets.set(key, value);
  for (const {path, version} of assets.values()) {
    const data = await load(path, true);
    if (version) assert.equal(createHash('sha256').update(data).digest('hex').slice(0, 10), version, `${path}: 已发布资源与 HTML 内容哈希不符`);
    if ([...images.values()].some(image => image.path === path)) {
      assert.equal(data.subarray(0,8).toString('hex'), '89504e470d0a1a0a', `${path}: 实际 PNG`);
      assert.equal(data.readUInt32BE(16), 1200, `${path}: 实际图片宽度`);
      assert.equal(data.readUInt32BE(20), 630, `${path}: 实际图片高度`);
    }
  }
  const recovery = await load('404.html');
  assert.match(recovery, /<meta name="robots" content="noindex">/, '404 不索引');
  for (const lang of ['zh-CN','zh-TW','en','ja']) assert.ok(recovery.includes(`<section lang="${lang}"`), `404 ${lang} 静态文案`);
  for (const tag of links(recovery).filter(tag => attr(tag, 'rel') === 'stylesheet')) {
    const href = attr(tag, 'href');
    assert.ok(href.startsWith(new URL(siteUrl).pathname), '404 样式须以站点根路径开始');
  }
  return {commitSha:info.commitSha, builtAt:info.builtAt, source:info.source, pages:urls.length, assets:assets.size, siteUrl};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const local = process.argv[2] === '--local';
    const directory = resolve(process.argv[3] || 'dist');
    const siteUrl = local ? JSON.parse(await readFile(join(directory, 'build-info.json'))).siteUrl : process.argv[2];
    const expectedSha = local ? undefined : process.argv[3];
    if (!local && !expectedSha) throw new Error('用法：node scripts/verify-site.mjs --local dist 或 <正式基址> <完整预期 SHA>');
    const load = local ? (path, binary) => readFile(join(directory, path), binary ? undefined : 'utf8') : async (path, binary) => {
      const url = new URL(path, siteUrl);
      url.searchParams.set('build-check', expectedSha); // 避免把 CDN 的旧 build-info 当作最新发布。
      const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(20000), redirect:'error'});
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return binary ? Buffer.from(await response.arrayBuffer()) : response.text();
    };
    console.log(JSON.stringify(await verifySite({siteUrl, load, expectedSha}), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
