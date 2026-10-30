const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function commentsConfig(value) {
  if (value == null || value.enabled === false) return null;
  if (value.enabled !== true) throw new Error('content/comments.json: enabled 必须是布尔值');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repo || '')) throw new Error('content/comments.json: repo 必须为 owner/repository');
  for (const key of ['repoId','categoryId']) {
    if (typeof value[key] !== 'string' || !/^[A-Za-z0-9_=-]+$/.test(value[key]) || value[key].length > 160) throw new Error(`content/comments.json: ${key} 必须是 GitHub 返回的实际 ID`);
  }
  if (typeof value.category !== 'string' || !value.category.trim() || value.category.length > 100) throw new Error('content/comments.json: category 必须是实际讨论分类名称');
  return {repo:value.repo,repoId:value.repoId,category:value.category,categoryId:value.categoryId};
}

export function commentsMarkup(id, config, ui) {
  if (!config) return '';
  const attrs = Object.entries(config).map(([key,value]) => `data-${key.replace(/[A-Z]/g, c=>'-'+c.toLowerCase())}="${escape(value)}"`).join(' ');
  const labels = Object.keys(ui).filter(key=>key.startsWith('comments.')).map(key=>`data-${key.replace('.','-')}="${escape(ui[key])}"`).join(' ');
  const search = `https://github.com/${config.repo}/discussions?discussions_q=${encodeURIComponent('"xiwu-article:'+id+'"')}`;
  return `<section class="article-comments" data-article-comments data-article-id="${escape(id)}" ${attrs} ${labels} aria-label="${escape(ui['comments.title'])}"><h2>${escape(ui['comments.title'])}</h2><p class="comments-hint">${escape(ui['comments.hint'])}</p><button type="button" class="comments-load glass-surface glass-action" hidden>${escape(ui['comments.load'])}</button><p class="comments-status" role="status" aria-live="polite" hidden></p><div class="comments-embed"></div><p class="comments-fallback"><a class="text-link" href="${escape(search)}" target="_blank" rel="noopener noreferrer">${escape(ui['comments.github'])}</a></p></section>`;
}
