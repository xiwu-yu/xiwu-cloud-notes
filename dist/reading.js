// 静态正文独立可读；这个小脚本只增强主题，不依赖首页数据或阅读弹窗。
(() => {
  const storageKey = 'little-corner-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let button;
  function savedTheme() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return null;
  }
  function apply(theme) {
    root.dataset.theme = theme;
    if (!button) return;
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? button.dataset.toLight : button.dataset.toDark);
  }
  const refresh = () => apply(savedTheme() || (system.matches ? 'dark' : 'light'));
  // 在样式表和正文渲染前应用主站保存的主题，避免先闪现另一种颜色。
  refresh();
  document.addEventListener('DOMContentLoaded', () => {
    button = document.querySelector('.theme-toggle');
    if (!button) return;
    button.hidden = false;
    refresh();
    button.addEventListener('click', () => {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(storageKey, theme); } catch {}
      apply(theme);
    });
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) refresh();
  });
  system.addEventListener('change', () => { if (!savedTheme()) refresh(); });
})();
