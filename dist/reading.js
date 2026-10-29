// 首页和独立文章共用主题；在样式加载前恢复，正文不依赖此增强。
(() => {
  const key = 'little-corner-theme', root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['system','light','dark'].includes(value);
  function saved() {
    try {
      const value = localStorage.getItem(key); return valid(value) ? value : null;
    } catch {}
    return null;
  }
  const marker = history.state?.cloudHomeRefresh;
  const returning = marker?.url === location.pathname + location.search;
  // 存储被禁用时，云朵刷新仍保留本次手动选择，不把自动模式锁成某个颜色。
  let mode = saved() || (returning && valid(marker.mode) ? marker.mode : 'system');
  if (!saved() && returning && !valid(marker.mode) && valid(marker.theme)) mode = marker.theme;
  function refresh() {
    const dark = mode === 'dark' || (mode === 'system' && system.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themeMode = mode;
    const strings = window.siteProfile?.ui?.[root.lang];
    document.querySelectorAll('.theme-toggle,.dialog-theme-toggle').forEach(button => {
      button.setAttribute('aria-pressed', String(dark));
      const label = strings?.[dark ? 'theme.toLight' : 'theme.toDark'] || (dark ? button.dataset.toLight : button.dataset.toDark);
      if (label) button.setAttribute('aria-label', label);
    });
    document.querySelectorAll('[data-theme-choice]').forEach(select => { select.value = mode; });
    document.dispatchEvent(new Event('site:theme-changed'));
  }
  function setMode(value) {
    if (!valid(value)) return;
    mode = value;
    try { localStorage.setItem(key, mode); } catch {} // 本页内存偏好仍有效。
    refresh();
  }
  window.siteTheme = {setMode, refresh, get mode() { return mode; }};
  refresh();
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle,.dialog-theme-toggle').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => setMode(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    });
    document.querySelectorAll('[data-theme-choice]').forEach(select => select.addEventListener('change', () => setMode(select.value)));
    refresh();
  }, {once:true});
  addEventListener('pageshow', refresh);
  addEventListener('storage', event => {
    if (event.key === key || event.key === null) { mode = saved() || 'system'; refresh(); }
  });
  document.addEventListener('site:language-changed', refresh);
  const changed = () => { if (mode === 'system') refresh(); };
  if (system.addEventListener) system.addEventListener('change', changed);
  else system.addListener(changed);
})();
