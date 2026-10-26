import MarkdownIt from 'markdown-it';
import { parse } from 'yaml';
import { basename } from 'node:path';

// Markdown 在发布前转换；关闭原始 HTML，保留解析器默认的危险链接检查。
const markdown = new MarkdownIt({ html: false, breaks: false, typographer: false });
markdown.renderer.rules.code_block = (tokens,index,options,env,renderer) =>
  '<pre'+renderer.renderAttrs(tokens[index])+'><code>'+markdown.utils.escapeHtml(tokens[index].content)+'</code></pre>\n';
const fields = new Set(['id', 'lang', 'title', 'category', 'tags', 'writtenAt', 'publishedAt', 'updatedAt', 'description', 'subtitle', 'image', 'alt', 'order', 'source']);
export const SUPPORTED_LANGS = ['zh-CN', 'zh-TW', 'en', 'ja'];

function requireDate(value, field, filename) {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/);
  if (!match || !Number.isFinite(Date.parse(value))) throw new Error(`${filename}: ${field} 请填写带时区的时间，例如 2026-10-23T20:00:00+08:00`);
  const [, year, month, day] = match;
  const [hour, minute, second] = value.slice(11, 19).split(':').map(Number);
  if (hour > 23 || minute > 59 || second > 59) throw new Error(`${filename}: ${field} 的时间不存在`);
  if (+day > new Date(Date.UTC(+year, +month, 0)).getUTCDate()) throw new Error(`${filename}: ${field} 的日期不存在`);
}

function plainText(tokens) {
  return tokens.map(token => {
    if (token.children) return plainText(token.children);
    if (['text', 'code_inline', 'code_block', 'fence'].includes(token.type)) return token.content;
    if (['softbreak', 'hardbreak'].includes(token.type) || token.block) return '\n';
    return '';
  }).join('');
}

export function parsePost(source, filename) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: 文件开头需要用两行 --- 包住文章资料`);
  let data;
  try { data = parse(match[1], { maxAliasCount: 0 }); }
  catch (error) { throw new Error(`${filename}: 文章资料格式有误：${error.message}`); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${filename}: 文章资料必须是字段和值`);
  for (const field of Object.keys(data)) {
    if (!fields.has(field)) throw new Error(`${filename}: 不认识的字段 ${field}`);
  }
  const id = data.id ?? basename(filename, '.md');
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${filename}: id 请使用小写英文字母、数字和连字符`);
  const lang = data.lang ?? 'zh-CN';
  if (!SUPPORTED_LANGS.includes(lang)) throw new Error(`${filename}: lang 只能是 ${SUPPORTED_LANGS.join('、')}`);
  for (const field of ['title', 'category', 'description']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${filename}: 缺少 ${field}`);
  }
  requireDate(data.publishedAt, 'publishedAt', filename);
  if (data.writtenAt != null) {
    if (typeof data.writtenAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.writtenAt) || !Number.isFinite(Date.parse(data.writtenAt)) || new Date(data.writtenAt).toISOString().slice(0, 10) !== data.writtenAt) throw new Error(`${filename}: writtenAt 请填写真实的写作日期，例如 2026-10-14；未知时留空或填 null`);
  }
  if (data.updatedAt !== undefined) {
    requireDate(data.updatedAt, 'updatedAt', filename);
    if (Date.parse(data.updatedAt) < Date.parse(data.publishedAt)) throw new Error(`${filename}: updatedAt 不能早于收录时间`);
  }
  for (const field of ['subtitle', 'image', 'alt', 'source']) {
    if (data[field] !== undefined && typeof data[field] !== 'string') throw new Error(`${filename}: ${field} 必须是文字`);
  }
  if (data.order !== undefined && (!Number.isSafeInteger(data.order) || data.order < 1)) throw new Error(`${filename}: order 必须是正整数`);
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string' || !tag.trim()))) throw new Error(`${filename}: tags 必须是非空文字组成的数组`);
  if (data.source && !/^https?:\/\//i.test(data.source)) throw new Error(`${filename}: source 只能使用 http 或 https 链接`);
  const image = data.image || 'assets/cloud-blue.svg';
  if (!/^assets\/[a-zA-Z0-9_./-]+$/.test(image) || image.split('/').includes('..')) throw new Error(`${filename}: 配图请使用 dist/assets 内的相对路径`);
  const body = match[2].trim();
  if (!body) throw new Error(`${filename}: 正文不能为空`);
  const tokens = markdown.parse(body, {});
  const headings = [];
  let passage = 0;
  // 数字锚点只来自解析后的块，不信任作者输入的 HTML/id；重复标题也不会冲突。
  tokens.forEach((token, index) => {
    if (token.type === 'heading_open') {
      const id = `section-${headings.length + 1}`;
      token.attrSet('id', id);
      headings.push({id, level:Number(token.tag.slice(1)), text:plainText([tokens[index + 1]]).trim()});
    } else if (['paragraph_open', 'th_open', 'td_open', 'fence', 'code_block'].includes(token.type)) {
      token.attrSet('id', `passage-${++passage}`);
    } else return;
    token.attrSet('data-reader-block', '');
    token.attrSet('tabindex', '-1');
  });
  return {
    filename, id, lang, title: data.title, category: data.category, tags: [...new Set((data.tags || []).map(tag => tag.trim()))],
    description: data.description, subtitle: data.subtitle || (lang === 'zh-CN' ? `随笔 / ${data.category}` : data.category),
    image, alt: data.alt || '淡蓝与浅粉色的云朵',
    writtenAt: data.writtenAt ?? null, publishedAt: data.publishedAt, updatedAt: data.updatedAt || data.publishedAt,
    order: data.order ?? Number.MAX_SAFE_INTEGER,
    ...(data.source ? { source: data.source } : {}),
    body, headings, text: plainText(tokens).trim(), bodyHtml: markdown.renderer.render(tokens, markdown.options, {})
  };
}

export function compilePosts(entries) {
  const posts = entries.map(({source, filename}) => parsePost(source, filename));
  const ids = new Map();
  for (const post of posts) {
    const key = `${post.lang}:${post.id}`;
    if (ids.has(key)) throw new Error(`${post.filename}: 重复的文章 id ${post.id}（${post.lang}），已在 ${ids.get(key)} 定义`);
    ids.set(key, post.filename);
  }
  const originals = new Map(posts.filter(post => post.lang === 'zh-CN').map(post => [post.id, post]));
  for (const post of posts) {
    const original = originals.get(post.id);
    if (!original) throw new Error(`${post.filename}: id ${post.id} 缺少 zh-CN 原文；译文需要使用相同的 id`);
    for (const field of ['publishedAt', 'writtenAt', 'order', 'image']) {
      if (post[field] !== original[field]) throw new Error(`${post.filename}: ${field} (${JSON.stringify(post[field])}) 必须与原文 ${original.filename} (${JSON.stringify(original[field])}) 一致`);
    }
  }
  return posts.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id) || a.lang.localeCompare(b.lang));
}
