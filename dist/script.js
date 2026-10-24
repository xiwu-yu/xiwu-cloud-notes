// 1. 读取构建生成的资料；所有页面文字和文章都按当前语言重新绘制。
(() => {
  const profile = window.siteProfile;
  const archive = window.essayArchive;
  if (!profile || !archive) return;

  const DEFAULT_LOCALE = profile.defaultLocale || 'zh-CN';
  const LOCALES = Array.isArray(profile.locales) ? profile.locales : [DEFAULT_LOCALE];
  const LANG_STORAGE = 'xiwu-language';
  const THEME_STORAGE = 'little-corner-theme';
  const $ = selector => document.querySelector(selector);
  const siteFor = lang => profile.localized?.[lang] || profile.localized?.[DEFAULT_LOCALE];

  function requestedLocale() {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('lang');
    if (LOCALES.includes(fromUrl)) return fromUrl;
    // 旧版文章链接固定使用原文语言；普通首页才读取浏览器偏好。
    if (params.has('post')) return DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(LANG_STORAGE);
      if (LOCALES.includes(stored)) return stored;
    } catch {}
    return DEFAULT_LOCALE;
  }

  let locale = requestedLocale();
  let site = siteFor(locale);
  let posts = site.interests;
  let ui = profile.ui?.[locale] || profile.ui?.[DEFAULT_LOCALE] || {};

  function t(key, vars = {}) {
    const template = ui[key] ?? profile.ui?.[DEFAULT_LOCALE]?.[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  }
  const formatNumber = value => new Intl.NumberFormat(locale).format(value);
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const formatDay = value => {
    const key = archive.dateKey(value);
    return key ? key.replace(/-/g, '.') : '';
  };
  function formatMonth(key) {
    const [year, month] = key.split('-').map(Number);
    if (locale === 'en') return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
    if (locale === 'ja') return `${year}年${month}月`;
    return `${year} 年 ${month} 月`;
  }
  function readingInfo(item) {
    const words = archive.wordCount(item.text || '');
    const minutes = Math.max(1, Math.ceil(words / (item.lang === 'en' ? 200 : 300)));
    return t('notes.reading', { count: formatNumber(words), minutes: formatNumber(minutes) });
  }
  function dateLine(item) {
    const line = node('span', 'entry-date');
    const written = node('span', 'written-date');
    if (archive.dateKey(item.writtenAt)) {
      const writtenTime = node('time', '', t('notes.writtenOn', { date: formatDay(item.writtenAt) }));
      writtenTime.dateTime = item.writtenAt;
      written.append(writtenTime);
    } else written.textContent = t('notes.writtenUnknown');
    line.append(written, document.createTextNode(' · '));
    const publishedTime = node('time', '', archive.dateKey(item.publishedAt) ? t('notes.publishedOn', { date: formatDay(item.publishedAt) }) : t('notes.publishedUnknown'));
    if (archive.dateKey(item.publishedAt)) publishedTime.dateTime = item.publishedAt;
    line.append(publishedTime, document.createTextNode(' · ' + readingInfo(item)));
    return line;
  }
  function tagLine(item) {
    const line = node('span', 'entry-tags');
    line.setAttribute('aria-label', t('notes.tags'));
    (item.tags || []).forEach(tag => line.append(node('span', 'entry-tag', tag)));
    line.hidden = !item.tags?.length;
    return line;
  }

  const grid = $('#interest-grid');
  const timeline = $('#essay-timeline');
  const dialog = $('#interest-dialog');
  const monthSelect = $('#archive-month');
  const orderSelect = $('#archive-order');
  const dateBySelect = $('#archive-date-by');
  const searchInput = $('#archive-search');
  const languageSelect = $('#language-select');
  const dialogLanguageSelect = $('#dialog-language-select');
  const state = { category: 'all', month: 'all', order: 'newest', view: 'cards', dateBy: 'publishedAt', query: '' };
  let visibleItems = [];
  let currentId = null;
  let openedFrom = null;
  let closingFromHistory = false;

  // 2. 地址栏记录当前文章，复制地址即可分享；前进、后退会重新打开对应文章。
  function writeUrl({ push = false, replace = false } = {}) {
    const url = new URL(location.href);
    if (currentId) url.searchParams.set('post', currentId);
    else url.searchParams.delete('post');
    url.searchParams.set('lang', locale);
    if (push) history.pushState({ post: currentId, lang: locale }, '', url);
    else if (replace) history.replaceState({ post: currentId, lang: locale }, '', url);
  }
  function setDocumentTitle(item) {
    document.title = item ? t('meta.articleTitle', { title: item.title, site: site.name }) : t('meta.title');
    $('#meta-description').content = item?.description || t('meta.description');
  }

  function updateThemeLabel() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('.theme-toggle').setAttribute('aria-label', t(dark ? 'theme.toLight' : 'theme.toDark'));
  }

  function renderDialog(item, { focus = false, scroll = false } = {}) {
    $('#dialog-title').textContent = item.title;
    $('#dialog-category').textContent = item.category;
    const meta = $('#dialog-meta');
    meta.replaceChildren(dateLine(item));
    if (item.updatedAt && Date.parse(item.updatedAt) > Date.parse(item.publishedAt)) {
      meta.append(document.createTextNode(' · ' + t('notes.updatedOn', { date: formatDay(item.updatedAt) })));
    }
    meta.append(tagLine(item));
    const notice = $('#dialog-fallback');
    notice.hidden = !item.fallback;
    notice.textContent = t('notes.fallback');
    const bodyElement = $('#dialog-body');
    bodyElement.lang = item.lang;
    $('#dialog-title').lang = item.lang;
    $('#dialog-category').lang = item.lang;
    $('#dialog-static').href = item.url;
    // bodyHtml 仅来自构建时关闭了原始 HTML 的 Markdown 解析器。
    if (typeof item.bodyHtml === 'string') bodyElement.innerHTML = item.bodyHtml;
    else bodyElement.textContent = item.text || '';
    const sourceLink = $('#dialog-source');
    sourceLink.hidden = !item.source;
    if (item.source) sourceLink.href = item.source;
    const index = visibleItems.findIndex(entry => entry.id === item.id);
    $('#essay-prev').disabled = index <= 0;
    $('#essay-next').disabled = index < 0 || index === visibleItems.length - 1;
    $('#essay-position').textContent = index >= 0 ? (index + 1) + ' / ' + visibleItems.length : '';
    const status = $('#dialog-share-status');
    status.hidden = true;
    status.textContent = '';
    setDocumentTitle(item);
    if (scroll) dialog.scrollTop = 0;
    if (focus) $('.dialog-close').focus({ preventScroll: true });
  }
  function openEssay(item, trigger, { push = true, focus = true, scroll = true } = {}) {
    currentId = item.id;
    if (trigger) openedFrom = trigger;
    renderDialog(item, { focus, scroll });
    if (!dialog.open) dialog.showModal();
    if (push) writeUrl({ push: true });
    if (focus) $('.dialog-close').focus({ preventScroll: true });
  }
  function closeDialogFromHistory() {
    closingFromHistory = true;
    dialog.close();
  }

  function createCard(item, index) {
    const article = node('article', 'interest-card');
    article.dataset.essayId = item.id;
    const button = node('a', 'card-button');
    button.href = item.url;
    button.setAttribute('aria-label', t('notes.readCard', { title: item.title }));
    const imageWrap = node('div', 'card-image');
    const img = node('img');
    img.src = item.image;
    img.alt = item.alt;
    img.width = 600;
    img.height = 350;
    img.loading = 'lazy';
    // 编号跟随当前排序与筛选后的可见顺序，而不是固定的原始数组位置。
    const number = node('span', 'card-number', String(index + 1).padStart(2, '0'));
    imageWrap.append(img, number);
    button.append(imageWrap, node('p', 'card-meta', item.subtitle), node('h3', '', item.title), dateLine(item), node('p', 'card-description', item.description), tagLine(item), node('span', 'card-more', t('notes.readMore')));
    button.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openEssay(item, button);
    });
    article.append(button);
    return article;
  }
  function createTimelineGroup(group) {
    const section = node('section', 'timeline-group');
    const undated = group.key === 'undated';
    const date = undated ? t(state.dateBy === 'writtenAt' ? 'notes.undatedWrittenGroup' : 'notes.undatedPublishedGroup') : group.key.replace(/-/g, '.');
    const heading = node('h3', 'timeline-heading', date);
    heading.append(node('span', '', t('notes.groupCount', { count: group.items.length })));
    section.append(heading);
    const list = node('ol', 'timeline-list');
    group.items.forEach(item => {
      const li = node('li', 'timeline-entry');
      li.dataset.essayId = item.id;
      const button = node('a', 'timeline-button');
      button.href = item.url;
      button.setAttribute('aria-label', t('notes.readCard', { title: item.title }));
      button.append(node('span', 'timeline-category', item.category), node('span', 'timeline-title', item.title), node('span', 'timeline-description', item.description), node('span', 'timeline-reading', readingInfo(item)));
      button.append(tagLine(item));
      button.addEventListener('click', event => {
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openEssay(item, button);
      });
      li.append(button);
      list.append(li);
    });
    section.append(list);
    return section;
  }

  function renderFilters() {
    const categories = [];
    const seen = new Set();
    posts.forEach(item => {
      if (seen.has(item.categoryKey)) return;
      seen.add(item.categoryKey);
      categories.push({ key: item.categoryKey, label: item.category });
    });
    if (state.category !== 'all' && !categories.some(category => category.key === state.category)) state.category = 'all';
    const entries = [{ key: 'all', label: t('notes.all') }, ...categories];
    const group = $('.filters');
    group.replaceChildren(...entries.map(entry => {
      const button = node('button', 'filter', entry.label);
      button.type = 'button';
      button.dataset.filter = entry.key;
      button.addEventListener('click', () => { state.category = entry.key; renderInterests(); });
      return button;
    }));
  }
  function updateMonths() {
    const all = node('option', '', t('notes.allMonths'));
    all.value = 'all';
    monthSelect.replaceChildren(all);
    archive.months(posts, state.dateBy).forEach(month => {
      const option = node('option', '', formatMonth(month));
      option.value = month;
      monthSelect.append(option);
    });
    if (posts.some(item => !archive.dateKey(archive.itemDate(item, state.dateBy)))) {
      const option = node('option', '', t('notes.monthUndated'));
      option.value = 'undated';
      monthSelect.append(option);
    }
    const available = [...monthSelect.options].map(option => option.value);
    if (!available.includes(state.month)) state.month = 'all';
    monthSelect.value = state.month;
    $('#archive-month-label').textContent = t(state.dateBy === 'writtenAt' ? 'notes.writtenMonth' : 'notes.publishedMonth');
  }
  function renderInterests() {
    visibleItems = archive.select(posts, state);
    grid.replaceChildren(...visibleItems.map(createCard));
    grid.classList.toggle('single-entry', visibleItems.length === 1);
    timeline.replaceChildren(...archive.groups(visibleItems, state.dateBy).map(createTimelineGroup));
    $('.archive-note').textContent = t(state.dateBy === 'writtenAt' ? 'notes.noteWritten' : 'notes.notePublished');
    grid.hidden = state.view !== 'cards';
    timeline.hidden = state.view !== 'timeline';
    $('#archive-empty').hidden = visibleItems.length > 0;
    $('#item-count').textContent = t('notes.count', { count: String(visibleItems.length).padStart(2, '0') });
    document.querySelectorAll('.filter').forEach(button => {
      const active = button.dataset.filter === state.category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  }

  function applyStaticText() {
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
    document.querySelectorAll('[data-i18n-alt]').forEach(element => { element.setAttribute('alt', t(element.dataset.i18nAlt)); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => { element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder)); });
    $('#meta-description').content = t('meta.description');
    document.title = t('meta.title');
  }
  function applySite() {
    document.querySelectorAll('[data-site-name]').forEach(element => { element.textContent = site.name; });
    $('#brand-home').setAttribute('aria-label', t('brand.homeLabel', { name: site.name }));
    $('#profile-name').textContent = site.greetingName || site.name;
    $('#profile-intro').textContent = site.intro;
    $('#profile-about').textContent = site.about;
    $('#identity-name').textContent = site.name;
    $('#identity-avatar').textContent = site.name.slice(0, 1);
    $('#identity-pronouns').textContent = t('identity.pronouns', { pronouns: site.pronouns });
    document.querySelectorAll('.pronoun').forEach(element => { element.textContent = site.pronouns; });
    $('#copy-profile').setAttribute('aria-label', t('copy.button'));
    const tags = $('#profile-tags');
    tags.replaceChildren(...site.tags.map(text => node('span', '', text)));
    $('.draft-note').hidden = !profile.isDemo;
    $('.dialog-note').hidden = !profile.isDemo;
    const email = site.email.trim();
    const emailLink = $('#email-link');
    const placeholder = $('#contact-placeholder');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailLink.href = 'mailto:' + encodeURIComponent(email);
      emailLink.hidden = false;
      placeholder.hidden = true;
      $('#email-label').textContent = t('contact.email', { name: site.name, email });
    } else {
      emailLink.hidden = true;
      placeholder.hidden = false;
    }
  }
  function applyLanguage(next, { updateUrl = true } = {}) {
    if (!LOCALES.includes(next)) next = DEFAULT_LOCALE;
    locale = next;
    site = siteFor(locale);
    posts = site.interests;
    ui = profile.ui?.[locale] || profile.ui?.[DEFAULT_LOCALE] || {};
    try { localStorage.setItem(LANG_STORAGE, locale); } catch {}
    document.documentElement.lang = locale;
    document.documentElement.dataset.lang = locale;
    languageSelect.value = locale;
    dialogLanguageSelect.value = locale;
    applyStaticText();
    applySite();
    $('#copy-status').textContent = '';
    renderFilters();
    updateMonths();
    updateThemeLabel();
    renderInterests();
    if (dialog.open && currentId) {
      const item = posts.find(entry => entry.id === currentId);
      if (item) renderDialog(item);
      else closeDialogFromHistory();
    }
    if (updateUrl) writeUrl({ replace: true });
  }

  // 3. 筛选、排序与视图切换共用同一份可见结果。
  renderFilters();
  updateMonths();
  dateBySelect.addEventListener('change', () => { state.dateBy = dateBySelect.value; state.month = 'all'; updateMonths(); renderInterests(); });
  monthSelect.addEventListener('change', () => { state.month = monthSelect.value; renderInterests(); });
  orderSelect.addEventListener('change', () => { state.order = orderSelect.value; renderInterests(); });
  searchInput.addEventListener('input', () => { state.query = searchInput.value; renderInterests(); });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; renderInterests(); }));
  $('#archive-reset').addEventListener('click', () => { state.category = 'all'; state.month = 'all'; state.query = ''; searchInput.value = ''; updateMonths(); renderInterests(); });

  [languageSelect, dialogLanguageSelect].forEach(select => select.addEventListener('change', () => applyLanguage(select.value)));

  // 4. 弹窗翻页、关闭与地址栏历史保持同步。
  ['prev', 'next'].forEach(direction => $('#essay-' + direction).addEventListener('click', () => {
    const index = visibleItems.findIndex(item => item.id === currentId) + (direction === 'next' ? 1 : -1);
    if (visibleItems[index]) openEssay(visibleItems[index], null);
  }));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    currentId = null;
    if (!closingFromHistory) writeUrl({ replace: true });
    closingFromHistory = false;
    setDocumentTitle(null);
    const originId = openedFrom?.closest('[data-essay-id]')?.dataset.essayId;
    const container = state.view === 'timeline' ? timeline : grid;
    const replacement = originId ? container.querySelector(`[data-essay-id="${originId}"] a`) : null;
    const returnTarget = openedFrom?.isConnected ? openedFrom : replacement || container.querySelector('a') || languageSelect;
    returnTarget.focus({ preventScroll: true });
    openedFrom = null;
  });
  $('#essay-share').addEventListener('click', async () => {
    const status = $('#dialog-share-status');
    const item = posts.find(entry => entry.id === currentId);
    if (!item) return;
    // 使用实际正文版本的静态地址，让分享爬虫直接取得正文与元数据。
    const shareUrl = new URL(item.url, location.href).href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      status.textContent = t('dialog.shareCopied');
    } catch {
      status.textContent = t('dialog.shareManual') + ' ' + shareUrl;
    }
    status.hidden = false;
  });
  function syncFromUrl() {
    const url = new URL(location.href);
    const nextLocale = requestedLocale();
    if (nextLocale !== locale) applyLanguage(nextLocale, { updateUrl: false });
    const id = url.searchParams.get('post');
    const item = id ? posts.find(entry => entry.id === id) : null;
    if (item) {
      openEssay(item, null, { push: false, focus: false, scroll: false });
      writeUrl({ replace: true });
    }
    else if (dialog.open) closeDialogFromHistory();
  }
  window.addEventListener('popstate', syncFromUrl);

  // 5. 主题：优先本地偏好，其次系统设置；文案随界面语言更新。
  const themeButton = $('.theme-toggle');
  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeButton.setAttribute('aria-pressed', String(dark));
    updateThemeLabel();
  }
  let initialDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  try { const stored = localStorage.getItem(THEME_STORAGE); if (stored) initialDark = stored === 'dark'; } catch {}
  setTheme(initialDark);
  themeButton.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    setTheme(dark);
    try { localStorage.setItem(THEME_STORAGE, dark ? 'dark' : 'light'); } catch {}
  });

  // 6. 称呼卡只写入剪贴板，不发送给任何人。
  $('#copy-profile').addEventListener('click', async () => {
    const status = $('#copy-status');
    const text = t('copy.text', { name: site.name, pronouns: site.pronouns });
    try {
      status.textContent = t('copy.copying');
      await Promise.race([navigator.clipboard.writeText(text), new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard timeout')), 1800))]);
      status.textContent = t('copy.copied', { text });
    } catch {
      status.textContent = t('copy.manual', { text });
    }
  });

  // 7. 初次进入：先应用语言和地址中的文章，再开放交互。
  applyLanguage(locale, { updateUrl: false });
  const initialPost = new URLSearchParams(location.search).get('post');
  if (initialPost) {
    const item = posts.find(entry => entry.id === initialPost);
    if (item) {
      openEssay(item, null, { push: false });
      writeUrl({ replace: true });
    }
    else writeUrl({ replace: true });
  }
})();
