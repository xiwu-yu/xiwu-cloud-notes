const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sharePanel(ui) {
  const text = key => `<span data-share-text="${key}">${escape(ui[`share.${key}`])}</span>`;
  return `<dialog id="article-share-panel" class="article-share-panel" aria-labelledby="article-share-title">
  <header class="share-heading"><h2 id="article-share-title">${text('card')}</h2><button type="button" class="settings-close" data-share-close aria-label="${escape(ui['share.close'])}"><span aria-hidden="true">×</span></button></header>
  <p class="share-feedback" data-share-status role="status" aria-live="polite"></p>
  <img class="share-preview" data-share-preview hidden alt="${escape(ui['share.preview'])}" width="900" height="1200">
  <p class="settings-hint">${text('hint')}</p>
  <label class="share-url-label" for="article-share-url">${text('link')}</label><input id="article-share-url" type="url" readonly spellcheck="false">
  <div class="share-controls"><a class="glass-surface glass-action" data-share-download hidden download>${text('download')}</a><button type="button" class="glass-surface glass-action" data-share-native hidden>${text('native')}</button><button type="button" class="glass-surface glass-action" data-share-copy>${text('copy')}</button></div>
</dialog>`;
}

export function staticShare(post, author, url, ui) {
  const strings = Object.fromEntries(Object.entries(ui).filter(([key]) => key.startsWith('share.') || ['dialog.shareCopied','dialog.shareManual'].includes(key)));
  return `<div class="static-share" data-share-article data-share-id="${escape(post.id)}" data-share-lang="${post.lang}" data-share-title="${escape(post.title)}" data-share-description="${escape(post.description)}" data-share-category="${escape(post.category)}" data-share-date="${escape(post.writtenAt || post.publishedAt.slice(0,10))}" data-share-author="${escape(author)}" data-share-url="${escape(url)}" data-share-strings="${escape(JSON.stringify(strings))}">
  <div class="article-share-actions"><button type="button" class="glass-surface glass-action" data-static-copy hidden>${escape(ui['dialog.share'])}</button><button type="button" class="glass-surface glass-action" data-static-share hidden aria-haspopup="dialog">${escape(ui['share.card'])}</button></div>
  <p class="dialog-share-status" data-static-share-status role="status" hidden></p>
</div>`;
}
