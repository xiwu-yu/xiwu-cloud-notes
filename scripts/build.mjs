import { readFile, readdir, writeFile, access, mkdtemp, cp, rm, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { compilePosts, SUPPORTED_LANGS } from './content.mjs';
import { generateStatic, postPath } from './static.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const DEFAULT_LOCALE = 'zh-CN';
const SITE_STRINGS = ['name', 'pronouns', 'intro', 'about', 'email'];

function localizedSite(site, lang) {
  const override = site.locales?.[lang];
  if (override !== undefined && (!override || typeof override !== 'object' || Array.isArray(override))) {
    throw new Error(`content/site.json: locales.${lang} 必须是字段和值`);
  }
  const strings = override || {};
  for (const field of SITE_STRINGS) {
    if (strings[field] !== undefined && typeof strings[field] !== 'string') {
      throw new Error(`content/site.json: locales.${lang}.${field} 必须是文字`);
    }
  }
  if (strings.tags !== undefined && (!Array.isArray(strings.tags) || strings.tags.some(tag => typeof tag !== 'string'))) {
    throw new Error(`content/site.json: locales.${lang}.tags 必须是文字数组`);
  }
  const pick = field => strings[field] ?? site[field];
  return {
    name: pick('name'),
    greetingName: strings.greetingName ?? (lang === DEFAULT_LOCALE ? site.greetingName : undefined) ?? pick('name'),
    pronouns: pick('pronouns'),
    intro: pick('intro'),
    about: pick('about'),
    email: pick('email'),
    tags: strings.tags ?? site.tags
  };
}

function validateUi(ui) {
  if (!ui || typeof ui !== 'object' || Array.isArray(ui)) throw new Error('content/ui.json: 必须是按语言分组的对象');
  for (const lang of Object.keys(ui)) {
    if (!SUPPORTED_LANGS.includes(lang)) throw new Error(`content/ui.json: 不支持的语言 ${lang}`);
  }
  const base = ui[DEFAULT_LOCALE];
  if (!base || typeof base !== 'object' || Array.isArray(base)) throw new Error(`content/ui.json: 缺少 ${DEFAULT_LOCALE} 文案`);
  const keys = Object.keys(base).sort();
  for (const lang of SUPPORTED_LANGS) {
    const dictionary = ui[lang];
    if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) throw new Error(`content/ui.json: 缺少 ${lang} 文案`);
    for (const key of keys) {
      if (typeof dictionary[key] !== 'string') throw new Error(`content/ui.json: ${lang}.${key} 必须是文字`);
    }
    const extra = Object.keys(dictionary).filter(key => !keys.includes(key));
    if (extra.length) throw new Error(`content/ui.json: ${lang} 多出未定义的键 ${extra.join('、')}`);
  }
  return ui;
}

const contentHash = contents => createHash('sha256').update(contents).digest('hex').slice(0, 10);

async function hashAssetFiles(rootPath) {
  const directory = join(rootPath, 'dist/assets');
  const versions = {};
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch { return versions; }
  await Promise.all(entries.filter(entry => entry.isFile()).map(async entry => {
    const relative = `assets/${entry.name}`;
    versions[relative] = contentHash(await readFile(join(directory, entry.name)));
  }));
  return versions;
}

async function versionCssAssets(rootPath, assetVersions) {
  const cssPath = join(rootPath, 'dist/style.css');
  let css;
  try { css = await readFile(cssPath, 'utf8'); }
  catch { return; }
  const updated = css.replace(/url\((["']?)(assets\/[^"')\s?]+)(?:\?[^"')\s]*)?\1\)/g, (whole, quote, reference) => (
    assetVersions[reference] ? `url(${quote}${reference}?v=${assetVersions[reference]}${quote})` : whole
  ));
  if (updated !== css) await writeFile(cssPath, updated);
}

// 部署到 GitHub Pages 后 HTML、CSS 和图片都可能仍被缓存；给本地静态资源自动加上内容版本号。
async function versionAssets(rootPath, assetVersions = {}) {
  const indexPath = join(rootPath, 'dist/index.html');
  let html;
  try { html = await readFile(indexPath, 'utf8'); }
  catch { return; }
  // 先改写 CSS 里的图片地址，再计算 CSS 自身的哈希。
  await versionCssAssets(rootPath, assetVersions);
  const references = new Set([...html.matchAll(/(?:href|src)="([^"?#]+)(?:\?[^"]*)?"/g)].map(match => match[1]));
  const versions = { ...assetVersions };
  await Promise.all([...references].map(async reference => {
    if (versions[reference] || !/\.(?:css|js)$/i.test(reference)) return;
    if (/^(?:[a-z]+:)?\/\//i.test(reference) || reference.startsWith('/')) return;
    try { versions[reference] = contentHash(await readFile(join(rootPath, 'dist', reference))); }
    catch {}
  }));
  html = html.replace(/(href|src)="([^"?#]+)(?:\?v=[^"]*)?"/g, (whole, attribute, reference) => (
    versions[reference] ? `${attribute}="${reference}?v=${versions[reference]}"` : whole
  ));
  await writeFile(indexPath, html);
}

export async function build(rootPath = root) {
  const directory = join(rootPath, 'content/posts');
  const files = (await readdir(directory)).filter(name => name.endsWith('.md')).sort();
  if (!files.length) throw new Error('content/posts 中至少需要一篇 Markdown 随笔');
  const entries = await Promise.all(files.map(async filename => ({ filename, source: await readFile(join(directory, filename), 'utf8') })));
  const posts = compilePosts(entries);

  const basePosts = posts.filter(post => post.lang === DEFAULT_LOCALE).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (!basePosts.length) throw new Error(`content/posts 至少需要一篇 ${DEFAULT_LOCALE} 原文`);
  await Promise.all(posts.map(async post => {
    try { await access(join(rootPath, 'dist', post.image)); }
    catch { throw new Error(`${post.filename}: image 找不到配图 dist/${post.image}`); }
  }));
  const assetVersions = await hashAssetFiles(rootPath);

  const site = JSON.parse(await readFile(join(rootPath, 'content/site.json'), 'utf8'));
  for (const field of SITE_STRINGS) {
    if (typeof site[field] !== 'string') throw new Error(`content/site.json: ${field} 必须是文字`);
  }
  if (!Array.isArray(site.tags) || site.tags.some(tag => typeof tag !== 'string')) throw new Error('content/site.json: tags 必须是文字数组');
  if (site.greetingName !== undefined && typeof site.greetingName !== 'string') throw new Error('content/site.json: greetingName 必须是文字');
  if (site.locales !== undefined && (!site.locales || typeof site.locales !== 'object' || Array.isArray(site.locales))) {
    throw new Error('content/site.json: locales 必须是按语言分组的对象');
  }
  const ui = validateUi(JSON.parse(await readFile(join(rootPath, 'content/ui.json'), 'utf8')));

  const localized = {};
  for (const lang of SUPPORTED_LANGS) {
    const siteStrings = localizedSite(site, lang);
    const interests = basePosts.map(base => {
      const variant = posts.find(post => post.id === base.id && post.lang === lang) || base;
      const { body, order, filename, ...post } = variant;
      return {
        ...post,
        image: assetVersions[post.image] ? `${post.image}?v=${assetVersions[post.image]}` : post.image,
        categoryKey: base.category,
        fallback: variant.lang !== lang,
        url: postPath(variant)
      };
    });
    localized[lang] = { ...siteStrings, interests };
  }

  const data = {
    defaultLocale: DEFAULT_LOCALE,
    locales: SUPPORTED_LANGS,
    isDemo: site.isDemo === true,
    ui,
    localized
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  // 内容与元数据全部校验完再写临时构建；失败不会覆盖上次成功的网页。
  const staging = await mkdtemp(join(rootPath, '.build-'));
  try {
    await cp(join(rootPath, 'dist'), join(staging, 'dist'), { recursive: true });
    await rm(join(staging, 'dist/posts'), { recursive: true, force: true });
    await writeFile(join(staging, 'dist/profile.js'), '// 自动生成，请修改 content/ 后运行 pnpm build。\nwindow.siteProfile = ' + json + ';\n');
    await versionAssets(staging, assetVersions);
    await generateStatic(staging, posts, localized, ui, assetVersions);
    for (const file of ['style.css', 'index.html', 'profile.js', 'sitemap.xml', 'robots.txt']) {
      try { await rename(join(staging, 'dist', file), join(rootPath, 'dist', file)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await rm(join(rootPath, 'dist/posts'), { recursive: true, force: true });
    await rename(join(staging, 'dist/posts'), join(rootPath, 'dist/posts'));
  } finally { await rm(staging, { recursive: true, force: true }); }
  console.log(`已从 Markdown 生成 ${basePosts.length} 篇随笔、${SUPPORTED_LANGS.length} 种语言。`);
  return posts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch(error => { console.error(error.message); process.exitCode = 1; });
}
