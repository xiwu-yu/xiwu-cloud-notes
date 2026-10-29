import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { appearancePanel } from './appearance.mjs';
import { likeMarkup } from './likes.mjs';
import { sharePanel, staticShare } from './sharing.mjs';

// 一个入口配置所有可抓取 URL；相对文章/资源链接继续兼容项目子路径。
export const DEFAULT_SITE_URL = 'https://cloud.xiwu.space/';
export function resolveSiteUrl(value = DEFAULT_SITE_URL) {
  let url;
  try { url = new URL(value); } catch {}
  if (typeof value !== 'string' || !url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('SITE_URL / content/site.json: baseUrl 必须是无账号、查询参数和片段的 HTTPS 目录地址');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}
export const postPath = post => `posts/${post.id}/${post.lang}.html`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English', ja: '日本語' };
const ogLocale = lang => ({ 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', en: 'en_US', ja: 'ja_JP' }[lang]);
const homeLabel = { 'zh-CN': '回到云间来信', 'zh-TW': '回到雲間來信', en: 'Back to Letters in the Clouds', ja: '雲間の手紙に戻る' };

export async function generateStatic(rootPath, posts, localized, ui, assetVersions, siteUrl = DEFAULT_SITE_URL, likes = null) {
  const SITE_URL = resolveSiteUrl(siteUrl);
  const dist = join(rootPath, 'dist');
  const coverPath = 'assets/share-cover.png';
  const cover = await readFile(join(dist, coverPath));
  if (cover.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || cover.readUInt32BE(16) !== 1200 || cover.readUInt32BE(20) !== 630) throw new Error('dist/assets/share-cover.png: 分享封面必须为 1200×630 PNG');
  const coverUrl = new URL(coverPath, SITE_URL);
  if (assetVersions[coverPath]) coverUrl.searchParams.set('v', assetVersions[coverPath]);
  const imageMeta = lang => `<meta property="og:image" content="${escape(coverUrl.href)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(ui[lang]['meta.shareImageAlt'])}">`;
  const readingVersion = createHash('sha256').update(await readFile(join(dist, 'reading.js'))).digest('hex').slice(0, 10);
  const sharingVersion = createHash('sha256').update(await readFile(join(dist, 'sharing.js'))).digest('hex').slice(0, 10);
  const readerVersion = createHash('sha256').update(await readFile(join(dist, 'reader.js'))).digest('hex').slice(0, 10);
  const likesVersion = createHash('sha256').update(await readFile(join(dist, 'likes.js'))).digest('hex').slice(0, 10);
  const appearanceVersion = createHash('sha256').update(await readFile(join(dist, 'appearance.js'))).digest('hex').slice(0, 10);
  const transparency = lang => `<button class="transparency-toggle glass-action" type="button" hidden aria-haspopup="dialog" aria-expanded="false" aria-controls="glass-settings" aria-label="${escape(ui[lang]['appearance.open'])}" title="${escape(ui[lang]['appearance.open'])}"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="12" r="6" fill="currentColor" opacity=".65"/></svg></button>`;
  const css = (await readFile(join(dist, 'index.html'), 'utf8')).match(/href="(style\.css[^\"]*)"/)?.[1] || 'style.css';
  const byId = new Map();
  for (const post of posts) {
    if (!byId.has(post.id)) byId.set(post.id, []);
    byId.get(post.id).push(post);
  }
  const links = (variants, prefix = '') => variants.map(post => `<a lang="${post.lang}" hreflang="${post.lang}" href="${prefix}${postPath(post)}">${escape(labels[post.lang])} · ${escape(post.title)}</a>`).join(' · ');
  const archive = `<details class="static-archive" id="static-archive"><summary>静态文章目录 / Static archive / 記事一覧</summary><ul>${[...byId.values()].map(variants => `<li>${links(variants)}</li>`).join('\n')}</ul><p>无需 JavaScript 即可阅读。 / Read without JavaScript.</p></details>`;
  const indexPath = join(dist, 'index.html');
  let index = await readFile(indexPath, 'utf8');
  index = index.replace(/<!-- STATIC_ARCHIVE_START -->[\s\S]*?<!-- STATIC_ARCHIVE_END -->/, `<!-- STATIC_ARCHIVE_START -->\n${archive}\n<!-- STATIC_ARCHIVE_END -->`);
  // 首页也提供可抓取的 canonical；文章的元数据完全在构建时输出。
  index = index.replace(/\n<!-- SITE_META_START -->[\s\S]*?<!-- SITE_META_END -->/, '');
  const homeTitle = index.match(/<title>(.*?)<\/title>/)?.[1] || escape(localized['zh-CN'].name);
  const homeDescription = index.match(/<meta name="description"[^>]*content="([^"]*)"/)?.[1] || '';
  // 本轮保留单个中文静态首页；?lang= 仍是界面增强，不声明不存在的静态译本。
  index = index.replace('</head>', `<!-- SITE_META_START -->
<link rel="canonical" href="${escape(SITE_URL)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${homeTitle}">
<meta property="og:description" content="${homeDescription}">
<meta property="og:url" content="${escape(SITE_URL)}">
${imageMeta('zh-CN')}
<meta property="og:locale" content="zh_CN">
<!-- SITE_META_END -->
</head>`);
  await writeFile(indexPath, index);
  const orderedIds = posts.filter(post => post.lang === 'zh-CN').sort((a,b) => a.writtenAt === b.writtenAt ? 0 : a.writtenAt === null ? 1 : b.writtenAt === null ? -1 : b.writtenAt.localeCompare(a.writtenAt)).map(post=>post.id);
  for (const post of posts) {
    const variants = byId.get(post.id);
    const position = orderedIds.indexOf(post.id);
    const neighbor = (offset,key) => {
      const candidates = byId.get(orderedIds[position+offset]);
      const item = candidates?.find(variant=>variant.lang===post.lang) || candidates?.find(variant=>variant.lang==='zh-CN');
      return item ? `<a class="glass-surface glass-action" href="../../${postPath(item)}" lang="${item.lang}" hreflang="${item.lang}"><span>${escape(ui[post.lang][key])}</span><strong>${escape(item.title)}</strong>${item.lang!==post.lang ? `<small>${escape(ui[post.lang]['reader.original'])}</small>` : ''}</a>` : '';
    };
    const toc = post.headings.length < 2 ? '' : `<details class="reader-toc" open><summary>${escape(ui[post.lang]['reader.toc'])}</summary><nav aria-label="${escape(ui[post.lang]['reader.toc'])}">${post.headings.map(heading=>`<a data-reader-anchor="${heading.id}" href="#${heading.id}" style="--toc-indent:${Math.min(3,heading.level-Math.min(...post.headings.map(h=>h.level)))*12}px">${escape(heading.text)}</a>`).join('')}</nav></details>`;
    const absolute = new URL(postPath(post), SITE_URL).href;
    const title = ui[post.lang]['meta.articleTitle'].replace('{title}', post.title).replace('{site}', localized[post.lang].name);
    const alternates = variants.map(variant => `<link rel="alternate" hreflang="${variant.lang}" href="${escape(new URL(postPath(variant), SITE_URL).href)}">`).join('\n');
    const languageNav = Object.keys(labels).map(lang => {
      const variant = variants.find(item => item.lang === lang);
      return variant ? `<a href="../../${postPath(variant)}" lang="${lang}" hreflang="${lang}"${lang === post.lang ? ' aria-current="page"' : ''}>${labels[lang]}</a>` : `<span lang="${lang}">${labels[lang]} (暂无译文 / unavailable)</span>`;
    }).join(' · ');
    // 正文、语言和元数据均在 HTML 中；reading.js 仅增强主题切换。
    const html = `<!doctype html>
<html lang="${post.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(post.description)}">
<link rel="canonical" href="${escape(absolute)}">
${alternates}
<meta property="og:type" content="article">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(post.description)}">
<meta property="og:url" content="${escape(absolute)}">
<meta property="og:site_name" content="${escape(localized[post.lang].name)}">
<meta property="og:locale" content="${ogLocale(post.lang)}">
${variants.filter(v => v.lang !== post.lang).map(v => `<meta property="og:locale:alternate" content="${ogLocale(v.lang)}">`).join('\n')}
${imageMeta(post.lang)}
<meta property="article:published_time" content="${post.publishedAt}">
<meta property="article:modified_time" content="${post.updatedAt}">
<link rel="icon" href="../../assets/favicon.svg?v=${assetVersions['assets/favicon.svg'] || ''}" type="image/svg+xml">
<script src="../../appearance.js?v=${appearanceVersion}"></script>
<script src="../../reading.js?v=${readingVersion}"></script>
<script defer src="../../reader.js?v=${readerVersion}"></script>
<script defer src="../../likes.js?v=${likesVersion}"></script>
<script defer src="../../sharing.js?v=${sharingVersion}"></script>
<link rel="stylesheet" href="../../${escape(css)}">
</head>
<body class="static-reading">
<div class="sky-background" aria-hidden="true"><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span></div>
<header class="wrap static-reader-toolbar glass-surface"><a class="brand" href="../../?lang=${post.lang}">☁ ${escape(homeLabel[post.lang])}</a><button class="theme-toggle" type="button" hidden aria-label="${escape(ui[post.lang]['theme.toDark'])}" aria-pressed="false" data-to-dark="${escape(ui[post.lang]['theme.toDark'])}" data-to-light="${escape(ui[post.lang]['theme.toLight'])}"><span aria-hidden="true">◐</span></button>${transparency(post.lang)}</header>
<main class="static-layout wrap">
${toc}
<div class="static-article reader-surface">
<nav aria-label="${escape(ui[post.lang]['language.label'])}">${languageNav}</nav>
<article lang="${post.lang}">
<p class="eyebrow">${escape(post.category)}</p>
<h1>${escape(post.title)}</h1>
<p class="dialog-meta">${post.writtenAt ? `${escape(ui[post.lang]['notes.writtenOn'].replace('{date}', post.writtenAt))} · ` : ''}<time datetime="${post.publishedAt}">${escape(ui[post.lang]['notes.publishedOn'].replace('{date}', post.publishedAt.slice(0, 10)))}</time></p>
<div class="article-body" id="dialog-body">${post.bodyHtml.replace(/(href|src)="(assets\/[^"]*)"/g, '$1="../../$2"')}</div>
${post.source ? `<p><a class="dialog-source" href="${escape(post.source)}" rel="noopener noreferrer">${escape(ui[post.lang]['dialog.source'])}</a></p>` : ''}
</article>
${likeMarkup(post.id, likes, ui[post.lang])}
${staticShare(post, localized[post.lang].name, absolute, ui[post.lang])}
<nav class="static-pagination" aria-label="${escape(ui[post.lang]['reader.backToList'])}">${neighbor(-1,'reader.previous')}${neighbor(1,'reader.next')}</nav>
<p class="static-back"><a class="text-link" href="../../?lang=${post.lang}#interests">${escape(ui[post.lang]['reader.backToList'])}</a></p>
</div>
</main>
${appearancePanel(ui[post.lang])}
${sharePanel(ui[post.lang])}
</body>
</html>\n`;
    const directory = join(dist, 'posts', post.id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(dist, postPath(post)), html);
  }
  // 404 使用从站点根开始的路径，未知深路径和本地预览都能加载样式、目录。
  const recoveryPath = value => { const url = new URL(value, SITE_URL); return url.pathname + url.search + url.hash; };
  const recovery = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>404 · ${escape(ui['zh-CN']['error.title'])} · ${escape(localized['zh-CN'].name)}</title>
<link rel="icon" href="${escape(recoveryPath('assets/favicon.svg'))}" type="image/svg+xml">
<script src="${escape(recoveryPath(`appearance.js?v=${appearanceVersion}`))}"></script>
<script src="${escape(recoveryPath(`reading.js?v=${readingVersion}`))}"></script>
<link rel="stylesheet" href="${escape(recoveryPath(css))}">
</head>
<body class="static-reading recovery-page">
<div class="sky-background" aria-hidden="true"><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span></div>
<header class="wrap"><a class="brand" href="${escape(recoveryPath("./"))}">☁ ${escape(localized['zh-CN'].name)} · 云间来信</a><button class="theme-toggle" type="button" hidden aria-label="${escape(ui['zh-CN']['theme.toDark'])}" data-to-dark="${escape(ui['zh-CN']['theme.toDark'])}" data-to-light="${escape(ui['zh-CN']['theme.toLight'])}"><span aria-hidden="true">◐</span></button></header>
<main class="wrap"><p class="recovery-code" aria-hidden="true">404 ☁</p>
<nav class="recovery-languages" aria-label="Language">${Object.keys(labels).map(lang => `<a href="#recovery-${lang}" lang="${lang}">${labels[lang]}</a>`).join(' · ')}</nav>
${Object.keys(labels).map((lang, i) => `<section lang="${lang}" id="recovery-${lang}"><${i ? 'h2' : 'h1'}>${escape(ui[lang]['error.title'])}</${i ? 'h2' : 'h1'}><p>${escape(ui[lang]['error.description'])}</p><p><a class="text-link" href="${escape(recoveryPath(`?lang=${lang}`))}">${escape(ui[lang]['error.home'])} ↗</a> · <a class="text-link" href="${escape(recoveryPath(`?lang=${lang}#static-archive`))}">${escape(ui[lang]['error.archive'])} ↗</a></p></section>`).join('\n')}
${archive.replace(/href="posts\//g, `href="${escape(recoveryPath("./"))}posts/`)}
</main>
</body>
</html>\n`;
  await writeFile(join(dist, '404.html'), recovery);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${escape(SITE_URL)}</loc></url>\n${posts.map(post => `<url><loc>${escape(new URL(postPath(post), SITE_URL).href)}</loc><lastmod>${post.updatedAt}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(join(dist, 'sitemap.xml'), xml);
  await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
}
