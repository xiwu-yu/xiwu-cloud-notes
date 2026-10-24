import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// 明确包含项目子路径；静态页与 sitemap 共用，避免部署到用户站点根目录。
export const SITE_URL = 'https://xiwu-yu.github.io/xiwu-cloud-notes/';
export const postPath = post => `posts/${post.id}/${post.lang}.html`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English', ja: '日本語' };
const ogLocale = lang => ({ 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', en: 'en_US', ja: 'ja_JP' }[lang]);
const homeLabel = { 'zh-CN': '回到云间来信', 'zh-TW': '回到雲間來信', en: 'Back to Letters in the Clouds', ja: '雲間の手紙に戻る' };

export async function generateStatic(rootPath, posts, localized, ui, assetVersions) {
  const dist = join(rootPath, 'dist');
  const readingVersion = createHash('sha256').update(await readFile(join(dist, 'reading.js'))).digest('hex').slice(0, 10);
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
  index = index.replace('</head>', `<!-- SITE_META_START -->\n<link rel="canonical" href="${SITE_URL}">\n<!-- SITE_META_END -->\n</head>`);
  await writeFile(indexPath, index);
  for (const post of posts) {
    const variants = byId.get(post.id);
    const absolute = new URL(postPath(post), SITE_URL).href;
    const image = new URL(post.image, SITE_URL);
    if (assetVersions[post.image]) image.searchParams.set('v', assetVersions[post.image]);
    const title = ui[post.lang]['meta.articleTitle'].replace('{title}', post.title).replace('{site}', localized[post.lang].name);
    const alternates = variants.map(variant => `<link rel="alternate" hreflang="${variant.lang}" href="${new URL(postPath(variant), SITE_URL).href}">`).join('\n');
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
<link rel="canonical" href="${absolute}">
${alternates}
<meta property="og:type" content="article">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(post.description)}">
<meta property="og:url" content="${absolute}">
<meta property="og:site_name" content="${escape(localized[post.lang].name)}">
<meta property="og:locale" content="${ogLocale(post.lang)}">
${variants.filter(v => v.lang !== post.lang).map(v => `<meta property="og:locale:alternate" content="${ogLocale(v.lang)}">`).join('\n')}
<meta property="og:image" content="${escape(image.href)}">
<meta property="og:image:alt" content="${escape(post.alt)}">
<meta property="article:published_time" content="${post.publishedAt}">
<meta property="article:modified_time" content="${post.updatedAt}">
<link rel="icon" href="../../assets/favicon.svg?v=${assetVersions['assets/favicon.svg'] || ''}" type="image/svg+xml">
<script src="../../reading.js?v=${readingVersion}"></script>
<link rel="stylesheet" href="../../${escape(css)}">
</head>
<body class="static-reading">
<div class="sky-background" aria-hidden="true"><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span></div>
<header class="wrap"><a class="brand" href="../../?lang=${post.lang}">☁ ${escape(homeLabel[post.lang])}</a><button class="theme-toggle" type="button" hidden aria-label="${escape(ui[post.lang]['theme.toDark'])}" aria-pressed="false" data-to-dark="${escape(ui[post.lang]['theme.toDark'])}" data-to-light="${escape(ui[post.lang]['theme.toLight'])}"><span aria-hidden="true">◐</span></button></header>
<main class="static-article wrap">
<nav aria-label="${escape(ui[post.lang]['language.label'])}">${languageNav}</nav>
<article lang="${post.lang}">
<p class="eyebrow">${escape(post.category)}</p>
<h1>${escape(post.title)}</h1>
<p class="dialog-meta">${post.writtenAt ? `${escape(ui[post.lang]['notes.writtenOn'].replace('{date}', post.writtenAt))} · ` : ''}<time datetime="${post.publishedAt}">${escape(ui[post.lang]['notes.publishedOn'].replace('{date}', post.publishedAt.slice(0, 10)))}</time></p>
<div class="article-body" id="dialog-body">${post.bodyHtml.replace(/(href|src)="(assets\/[^"]*)"/g, '$1="../../$2"')}</div>
${post.source ? `<p><a class="dialog-source" href="${escape(post.source)}" rel="noopener noreferrer">${escape(ui[post.lang]['dialog.source'])}</a></p>` : ''}
</article>
<p><a class="text-link" href="../../?post=${post.id}&amp;lang=${post.lang}">${escape(ui[post.lang]['notes.readMore'])}</a></p>
</main>
</body>
</html>\n`;
    const directory = join(dist, 'posts', post.id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(dist, postPath(post)), html);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE_URL}</loc></url>\n${posts.map(post => `<url><loc>${new URL(postPath(post), SITE_URL).href}</loc><lastmod>${post.updatedAt}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(join(dist, 'sitemap.xml'), xml);
  await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
}
