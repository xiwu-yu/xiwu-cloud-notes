// 只生成网易云官方歌单入口，不接受任意 iframe URL 或音频解析地址。
export function musicConfig(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('content/site.json: music 必须是歌单配置对象');
  if (typeof value.playlistId !== 'string' || !/^[1-9]\d*$/.test(value.playlistId)) {
    throw new Error('content/site.json: music.playlistId 必须是正整数形式的字符串');
  }
  for (const field of ['title', 'creator']) {
    if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`content/site.json: music.${field} 必须是非空文字`);
  }
  return {
    playlistId: value.playlistId,
    title: value.title.trim(),
    creator: value.creator.trim(),
    iframeUrl: `https://music.163.com/outchain/player?type=0&id=${value.playlistId}&auto=0&height=430`,
    playlistUrl: `https://music.163.com/playlist?id=${value.playlistId}`
  };
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function musicMarkup(config, ui) {
  if (!config) return '';
  const t = key => escape(ui[key]);
  const link = `<a href="${escape(config.playlistUrl)}" target="_blank" rel="noopener noreferrer" data-i18n="music.openPlaylist">${t('music.openPlaylist')}</a>`;
  return `<p id="music-static-link" class="music-static-link wrap">${link}</p>
<aside id="music-widget" class="music-widget" aria-label="${t('music.region')}" data-i18n-aria-label="music.region" hidden>
  <button id="music-toggle" class="music-toggle" type="button" aria-expanded="false" aria-controls="music-panel" aria-label="${t('music.open')}"><svg width="28" height="24" viewBox="0 0 32 28" aria-hidden="true"><path d="M8 24a6 6 0 0 1-1-12 9 9 0 0 1 17-3 7 7 0 0 1 1 15Z" fill="currentColor" opacity=".55"/><path d="M18 6v12m0-10 6-2v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><ellipse cx="15.5" cy="19" rx="3" ry="2" fill="currentColor"/><ellipse cx="21.5" cy="17" rx="3" ry="2" fill="currentColor"/></svg><span data-i18n="music.button">${t('music.button')}</span></button>
  <section id="music-panel" class="music-panel" aria-labelledby="music-title" hidden>
    <div class="music-heading"><div><h2 id="music-title" data-i18n="music.title">${t('music.title')}</h2><p class="music-byline">${escape(config.title)} · ${escape(config.creator)}</p></div><button id="music-close" class="music-close" type="button" aria-label="${t('music.close')}" data-i18n-aria-label="music.close"><span aria-hidden="true">×</span></button></div>
    <p class="music-hint" data-i18n="music.hint">${t('music.hint')}</p>
    <div class="music-frame-viewport"><iframe id="music-frame" title="${t('music.iframeTitle')}" data-i18n-title="music.iframeTitle" data-src="${escape(config.iframeUrl)}" width="330" height="450" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <p class="music-help" data-i18n="music.fallback">${t('music.fallback')}</p>
    <div class="music-fallback">${link}</div>
  </section>
</aside>`;
}
