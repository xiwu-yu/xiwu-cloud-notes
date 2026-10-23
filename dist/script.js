// 1. 从资料文件读取内容，用 textContent 安全地更新文字。
const profile = window.siteProfile;
document.querySelector('#profile-name').textContent = profile.name;
document.querySelector('#profile-intro').textContent = profile.intro;
document.querySelector('#profile-about').textContent = profile.about;
const tags = document.querySelector('#profile-tags');
tags.replaceChildren(...profile.tags.map(text => { const tag = document.createElement('span'); tag.textContent = text; return tag; }));
document.querySelector('.draft-note').hidden = !profile.isDemo;
document.querySelector('.dialog-note').hidden = !profile.isDemo;
const email = profile.email.trim();
if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  const link = document.querySelector('#email-link');
  link.href = 'mailto:' + encodeURIComponent(email);
  link.hidden = false;
  document.querySelector('#contact-placeholder').hidden = true;
}

// 2. 同一份筛选结果用于卡片、时间轴和上一篇／下一篇。
const archive = window.essayArchive;
const grid = document.querySelector('#interest-grid');
const timeline = document.querySelector('#essay-timeline');
const dialog = document.querySelector('#interest-dialog');
const monthSelect = document.querySelector('#archive-month');
const orderSelect = document.querySelector('#archive-order');
const state = { category: '全部', month: 'all', order: 'newest', view: 'cards' };
let visibleItems = [];
let currentId = null;
let openedFrom = null;
const node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
const formatDay = value => { const key = archive.dateKey(value); return key ? key.replace(/-/g, '.') : '日期待补充'; };
const readingInfo = item => { const words = archive.wordCount(item.body); return words.toLocaleString('zh-CN') + ' 字 · 约 ' + Math.max(1, Math.ceil(words / 300)) + ' 分钟'; };
function dateLine(item) {
  const line = node('span', 'entry-date');
  const time = node('time', '', formatDay(item.publishedAt));
  if (archive.dateKey(item.publishedAt)) time.dateTime = item.publishedAt;
  line.append(time, document.createTextNode(' 收录 · ' + readingInfo(item)));
  return line;
}
function openEssay(item, trigger) {
  currentId = item.id;
  if (trigger) openedFrom = trigger;
  document.querySelector('#dialog-title').textContent = item.title;
  document.querySelector('#dialog-category').textContent = item.category;
  const meta = document.querySelector('#dialog-meta');
  meta.replaceChildren(dateLine(item));
  if (item.updatedAt && Date.parse(item.updatedAt) > Date.parse(item.publishedAt)) meta.append(document.createTextNode(' · ' + formatDay(item.updatedAt) + ' 更新'));
  document.querySelector('#dialog-body').replaceChildren(...item.body.split(/\n\n+/).map(text => node('p', '', text)));
  const sourceLink = document.querySelector('#dialog-source');
  sourceLink.hidden = !item.source;
  if (item.source) sourceLink.href = item.source;
  const index = visibleItems.findIndex(entry => entry.id === item.id);
  document.querySelector('#essay-prev').disabled = index <= 0;
  document.querySelector('#essay-next').disabled = index === visibleItems.length - 1;
  document.querySelector('#essay-position').textContent = (index + 1) + ' / ' + visibleItems.length;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  document.querySelector('.dialog-close').focus({preventScroll: true});
}
function createCard(item) {
  const article = node('article', 'interest-card');
  article.dataset.essayId = item.id;
  const button = node('button', 'card-button'); button.type = 'button';
  button.setAttribute('aria-label', '阅读：' + item.title);
  const imageWrap = node('div', 'card-image');
  const img = node('img'); img.src = item.image; img.alt = item.alt; img.width = 600; img.height = 350; img.loading = 'lazy';
  const number = node('span', 'card-number', String(profile.interests.indexOf(item) + 1).padStart(2, '0'));
  imageWrap.append(img, number);
  button.append(imageWrap, node('p','card-meta',item.subtitle), node('h3','',item.title), dateLine(item), node('p','card-description',item.description), node('span','card-more','继续读 ↗'));
  button.addEventListener('click', () => openEssay(item, button));
  article.append(button); return article;
}
function createTimelineGroup(group) {
  const section = node('section', 'timeline-group');
  const date = group.key === 'undated' ? '日期待补充' : group.key.replace(/-/g, '.');
  const heading = node('h3','timeline-heading',date);
  heading.append(node('span','',' / ' + group.items.length + ' 篇'));
  section.append(heading);
  const list = node('ol','timeline-list');
  group.items.forEach(item => {
    const li = node('li','timeline-entry'); li.dataset.essayId = item.id;
    const button = node('button','timeline-button'); button.type = 'button'; button.setAttribute('aria-label','阅读：'+item.title);
    button.append(node('span','timeline-category',item.category),node('span','timeline-title',item.title),node('span','timeline-description',item.description),node('span','timeline-reading',readingInfo(item)));
    button.addEventListener('click',()=>openEssay(item,button)); li.append(button); list.append(li);
  });
  section.append(list); return section;
}
function renderInterests() {
  visibleItems = archive.select(profile.interests, state);
  grid.replaceChildren(...visibleItems.map(createCard));
  timeline.replaceChildren(...archive.groups(visibleItems).map(createTimelineGroup));
  grid.hidden = state.view !== 'cards'; timeline.hidden = state.view !== 'timeline';
  document.querySelector('#archive-empty').hidden = visibleItems.length > 0;
  document.querySelector('#item-count').textContent = String(visibleItems.length).padStart(2,'0') + ' 篇随笔';
  document.querySelectorAll('.filter').forEach(button=>{const active=button.dataset.filter===state.category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===state.view)));
}
const filterGroup = document.querySelector('.filters'); filterGroup.replaceChildren();
['全部',...new Set(profile.interests.map(item=>item.category))].forEach(category=>{
  const button=node('button','filter',category);button.type='button';button.dataset.filter=category;
  button.addEventListener('click',()=>{state.category=category;renderInterests();});filterGroup.append(button);
});
const months=[...new Set(profile.interests.map(item=>archive.dateKey(item.publishedAt)?.slice(0,7)).filter(Boolean))].sort().reverse();
months.forEach(month=>{const option=node('option','',month.replace('-',' 年 ')+' 月');option.value=month;monthSelect.append(option);});
if(profile.interests.some(item=>!archive.dateKey(item.publishedAt))){const option=node('option','','日期待补充');option.value='undated';monthSelect.append(option);}
monthSelect.addEventListener('change',()=>{state.month=monthSelect.value;renderInterests();});
orderSelect.addEventListener('change',()=>{state.order=orderSelect.value;renderInterests();});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;renderInterests();}));
document.querySelector('#archive-reset').addEventListener('click',()=>{state.category='全部';state.month='all';monthSelect.value='all';renderInterests();});
['prev','next'].forEach(direction=>document.querySelector('#essay-'+direction).addEventListener('click',()=>{
  const index=visibleItems.findIndex(item=>item.id===currentId)+(direction==='next'?1:-1);
  if(visibleItems[index])openEssay(visibleItems[index]);
}));
renderInterests();
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{if(openedFrom?.isConnected)openedFrom.focus({preventScroll:true});});
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});

// 3. 用浏览器本地存储记住主题；存储不可用也不会影响页面。
const themeButton = document.querySelector('.theme-toggle');
function setTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
}
let initialDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
try { const stored = localStorage.getItem('little-corner-theme'); if (stored) initialDark = stored === 'dark'; } catch {}
setTheme(initialDark);
themeButton.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark'; setTheme(dark);
  try { localStorage.setItem('little-corner-theme', dark ? 'dark' : 'light'); } catch {}
});

// 4. 称呼卡：只复制到剪贴板，不会发送给任何人。
document.querySelectorAll('.pronoun').forEach(el => { el.textContent = profile.pronouns; });
document.querySelector('#identity-name').textContent = profile.name;
document.querySelector('#identity-pronouns').textContent = '称呼代词：' + profile.pronouns;
document.querySelector('#copy-profile').addEventListener('click', async () => {
  const text = profile.name + '｜代词：' + profile.pronouns;
  try {
    document.querySelector('#copy-status').textContent = '正在复制…';
    await Promise.race([navigator.clipboard.writeText(text), new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard timeout')), 1800))]);
    document.querySelector('#copy-status').textContent = '已复制：' + text;
  }
  catch { document.querySelector('#copy-status').textContent = '请手动复制：' + text; }
});
