const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function likesConfig(value) {
  if (value == null || value.apiUrl === null) return null;
  let url;
  try { url = new URL(value.apiUrl); } catch {}
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('content/likes.json: apiUrl 必须是 HTTPS 服务根地址，未配置时使用 null');
  }
  return url.origin;
}

export function likeMarkup(id, endpoint, ui) {
  const labels = Object.keys(ui).filter(key => key.startsWith('likes.')).map(key => `data-${key.replace('.', '-')}="${escape(ui[key])}"`).join(' ');
  return `<div class="article-like" data-article-like data-article-id="${escape(id)}" data-api-url="${escape(endpoint || '')}" ${labels} hidden></div>`;
}
