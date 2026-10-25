import { test, expect, ids, param, noOverflow } from './helpers.mjs';
const langs = ['zh-CN', 'zh-TW', 'en', 'ja'];
const cloudTitles = ['测试云朵', '測試雲朵', 'Test clouds', 'テストの雲'];
const bodyMarkers = ['中文正文', '繁體中文正文', 'English body', '日本語の本文'];
const openFirst = page => page.locator('.card-button').first().click();

test('fixture ordering, numbering, full-text search and combined archive filters', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#archive-date-by')).toHaveValue('writtenAt');
  await expect(page.locator('#archive-order')).toHaveValue('newest');
  expect(await ids(page)).toEqual(['rain', 'cloud', 'original']);
  expect(await page.locator('.card-number').allTextContents()).toEqual(['01', '02', '03']);
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-order', 'oldest');
  expect(await ids(page)).toEqual(['cloud', 'rain', 'original']);
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-date-by', 'publishedAt');
  expect(await ids(page)).toEqual(['original', 'rain', 'cloud']);
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-date-by', 'writtenAt');
  expect(await ids(page)).toEqual(['cloud', 'rain', 'original']);
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-month', '2026-09');
  expect(await ids(page)).toEqual(['cloud']);
  await page.locator('[data-filter="随笔"]').click();
  await expect(page.locator('#archive-empty')).toBeVisible();
  await page.locator('#archive-reset').click();
  await expect(page.locator('.interest-card')).toHaveCount(3);
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-order', 'newest');
  expect(await ids(page)).toEqual(['rain', 'cloud', 'original']);
  await page.locator('#archive-search').fill('独特原文词');
  expect(await ids(page)).toEqual(['original']);
  await page.locator('#archive-search').fill('test-tag rain');
  expect(await ids(page)).toEqual(['rain']);
  await page.locator('#archive-search').fill('not-found');
  await expect(page.locator('#archive-empty')).toBeVisible();
  await page.locator('#archive-reset').click();
  await page.selectOption('#language-select', 'en');
  await page.locator('#archive-search').fill('starlight');
  expect(await ids(page)).toEqual(['rain', 'cloud']);
});

test('timeline, undated groups, category keys and language changes share the same results', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-view="timeline"]').click();
  await expect(page.locator('.timeline-group')).toHaveCount(3);
  expect(await page.locator('.timeline-entry').evaluateAll(entries => entries.map(entry => entry.dataset.essayId))).toEqual(['rain', 'cloud', 'original']);
  await expect(page.locator('.timeline-heading').last()).toContainText('未填写');
  await page.locator('[data-filter="随笔"]').click();
  for (const lang of langs) {
    await page.selectOption('#language-select', lang);
    await expect(page.locator('[data-filter="随笔"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.timeline-entry')).toHaveCount(1);
    await page.locator('.timeline-button').click();
    expect(param(page, 'post')).toBe('rain');
    await expect(page.locator('#essay-prev')).toBeDisabled();
    await expect(page.locator('#essay-next')).toBeDisabled();
    await page.locator('.dialog-close').click();
  }
});

test('explicit Chinese share overrides saved English, including reload and clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.selectOption('#language-select', 'en');
  expect(await page.evaluate(() => localStorage.getItem('xiwu-language'))).toBe('en');
  await page.goto('./?post=cloud&lang=zh-CN');
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.locator('#dialog-title')).toHaveText(cloudTitles[0]);
    await expect(page.locator('#dialog-body')).toContainText(bodyMarkers[0]);
    await expect(page).toHaveTitle(/测试云朵/);
    expect(param(page, 'lang')).toBe('zh-CN');
    if (!attempt) await page.reload();
  }
  await page.locator('#essay-share').click();
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(shared.pathname).toBe('/xiwu-cloud-notes/posts/cloud/zh-CN.html');
  expect(shared.search).toBe('');
  expect(shared.hash).toBe('');
  await page.locator('.dialog-close').click();
  await page.selectOption('#language-select', 'en');
  await page.goto('./?post=cloud');
  await expect(page.locator('#dialog-title')).toHaveText(cloudTitles[0]);
  expect(param(page, 'lang')).toBe('zh-CN');
  await page.locator('.dialog-close').click();
  await page.selectOption('#language-select', 'en');
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('opening, changing language, pagination, history, closing and focus remain consistent', async ({ page }) => {
  await page.goto('./');
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-date-by', 'publishedAt');
  await openFirst(page);
  for (let i = 0; i < langs.length; i++) {
    await page.selectOption('#dialog-language-select', langs[i]);
    expect(param(page, 'lang')).toBe(langs[i]);
    expect(param(page, 'post')).toBe('cloud');
    await expect(page.locator('#dialog-title')).toHaveText(cloudTitles[i]);
    await expect(page.locator('#dialog-body')).toContainText(bodyMarkers[i]);
    await expect(page.locator('#dialog-body')).toHaveAttribute('lang', langs[i]);
    await expect(page).toHaveTitle(new RegExp(cloudTitles[i]));
  }
  await page.locator('#essay-next').click();
  expect(param(page, 'post')).toBe('rain');
  await expect(page.locator('#dialog-title')).toHaveText('テストの雨');
  await page.selectOption('#dialog-language-select', 'zh-CN');
  await page.reload();
  await expect(page.locator('#dialog-title')).toHaveText('测试小雨');
  await page.goBack();
  await expect(page.locator('#dialog-title')).toHaveText('テストの雲');
  await expect(page.locator('#dialog-body')).toContainText('日本語の本文');
  expect(param(page, 'lang')).toBe('ja');
  await page.goForward();
  await expect(page.locator('#dialog-title')).toHaveText('测试小雨');
  expect(param(page, 'lang')).toBe('zh-CN');
  await page.keyboard.press('Escape');
  await expect(page.locator('#interest-dialog')).not.toBeVisible();
  await expect.poll(() => param(page, 'post')).toBeNull();
  await expect(page.locator('.card-button').first()).toBeFocused();
  await page.goBack();
  await expect(page.locator('#dialog-title')).toHaveText('テストの雲');
  await page.goBack();
  await expect(page.locator('#interest-dialog')).not.toBeVisible();
  await page.goForward();
  await expect(page.locator('#dialog-body')).toContainText('日本語の本文');
  await page.locator('.dialog-close').click();
  // 语言切换会重建卡片，关闭后应恢复到仍存在的可操作入口。
  await expect(page.locator('.card-button').first()).toBeFocused();
});

test('missing translation announces fallback and uses actual body language for reading time', async ({ page }) => {
  await page.goto('./?post=original&lang=en');
  await expect(page.locator('#dialog-fallback')).toBeVisible();
  await expect(page.locator('#dialog-fallback')).toContainText('Simplified Chinese');
  await expect(page.locator('#dialog-body')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('#dialog-meta')).toContainText('3 min');
  await expect(page.locator('#dialog-static')).toHaveAttribute('href', 'posts/original/zh-CN.html');
  await page.selectOption('#dialog-language-select', 'zh-CN');
  await expect(page.locator('#dialog-fallback')).toBeHidden();
  await page.selectOption('#dialog-language-select', 'ja');
  await expect(page.locator('#dialog-fallback')).toBeVisible();
  await page.locator('.dialog-close').click();
  await page.locator('#archive-search').fill('独特原文词');
  await page.locator('[data-filter="生活"]').click();
  if (await page.locator('#archive-advanced').getAttribute('open') === null) await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-month', 'undated');
  expect(await ids(page)).toEqual(['original']);
  await openFirst(page);
  await expect(page.locator('#essay-prev')).toBeDisabled();
  await expect(page.locator('#essay-next')).toBeDisabled();
});

for (const width of [320, 375, 768, 1440]) {
  test(`${width}px: four languages, both themes, navigation, dialogs and keyboard focus`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const lang of langs) {
      await page.selectOption('#language-select', lang);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await noOverflow(page, width);
        await expect(page.locator('.site-header nav')).toBeVisible();
        const navBox = await page.locator('.site-header nav').boundingBox();
        expect(navBox.x).toBeGreaterThanOrEqual(0);
        expect(navBox.x + navBox.width).toBeLessThanOrEqual(width + 1);
        const widths = await page.locator('.hero-button').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width));
        expect(Math.abs(widths[0] - widths[1])).toBeLessThan(1);
        await openFirst(page);
        const dialog = page.locator('#interest-dialog');
        await expect(dialog).toBeVisible();
        const box = await dialog.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        expect(await dialog.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1);
        await expect(page.locator('.dialog-close')).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator('#interest-dialog .transparency-toggle')).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator('#dialog-language-select')).toBeFocused();
        expect(await page.locator('#dialog-language-select').evaluate(n => getComputedStyle(n).outlineStyle)).not.toBe('none');
        await page.keyboard.press('Escape');
        await expect(page.locator('.card-button').first()).toBeFocused();
        await noOverflow(page, width);
      }
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
}

test('static pages work without JavaScript, and with either app script or data missing', async ({ browser }) => {
  for (const failure of ['javascript', 'profile.js', 'script.js']) {
    const context = await browser.newContext({ javaScriptEnabled: failure !== 'javascript' });
    const page = await context.newPage();
    if (failure !== 'javascript') await page.route(`**/${failure}*`, route => route.abort('failed'));
    await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
    await page.locator('#static-archive summary').click();
    const link = page.locator('#static-archive a[lang="en"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.locator('.article-body')).toContainText('English body');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/cloud\.xiwu\.space\/posts\/cloud\/en\.html$/);
    expect(await page.locator('meta[property="og:locale"]').getAttribute('content')).toBe('en_US');
    await context.close();
  }
});

test('static reading layouts cover four languages and both system themes', async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const lang of langs) {
      await page.goto(`./posts/rain/${lang}.html`);
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await noOverflow(page, width);
        await expect(page.locator('.article-body')).toBeVisible();
        await expect(page.locator('article')).toHaveAttribute('lang', lang);
      }
    }
  }
});

test('static archive follows the site language; theme persists through reading, reload and history', async ({ page }) => {
  for (const lang of langs) {
    for (const theme of ['light', 'dark']) {
      await page.goto(`./?lang=${lang}`);
      // 保存的选择应优先于相反的系统主题。
      if (await page.locator('html').getAttribute('data-theme') === theme) await page.locator('.theme-toggle').click();
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.locator('#static-archive summary').click();
      await expect(page.locator('#static-archive a')).toHaveCount(3);
      const link = page.locator(`#static-archive a[href="posts/cloud/${lang}.html"]`);
      await expect(link).toHaveAttribute('lang', lang);
      const expectedLabel = await page.locator('.theme-toggle').getAttribute('aria-label');
      await link.click();
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('nav a[aria-current="page"]')).toHaveAttribute('lang', lang);
      await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-label', expectedLabel);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('.article-body')).toContainText(bodyMarkers[langs.indexOf(lang)]);
      await page.locator('.theme-toggle').click();
      const opposite = theme === 'dark' ? 'light' : 'dark';
      await expect(page.locator('html')).toHaveAttribute('data-theme', opposite);
      await page.goBack();
      await expect(page.locator('html')).toHaveAttribute('data-theme', opposite);
      await expect(page.locator('#language-select')).toHaveValue(lang);
    }
  }
  await page.goto('./posts/cloud/en.html');
  await page.locator('nav a[lang="ja"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await page.locator('.brand').click();
  await expect(page.locator('#language-select')).toHaveValue('ja');
  await page.selectOption('#language-select', 'en');
  await page.locator('#static-archive summary').click();
  const fallback = page.locator('#static-archive li').filter({hasText:'尚无译文的原文'});
  await expect(fallback).toContainText('No translation is available');
  await expect(fallback.locator('a')).toHaveAttribute('href', 'posts/original/zh-CN.html');
  // 独立页路径的语言确定性也必须保留，不能被主站保存的英文覆盖。
  await page.goto('./posts/cloud/zh-CN.html');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('.article-body')).toContainText('中文正文');
});

test('FAQ starts collapsed and reload collapses every opened answer', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.faq details')).toHaveCount(3);
  await expect(page.locator('.faq details[open]')).toHaveCount(0);
  for (const summary of await page.locator('.faq summary').all()) await summary.click();
  await expect(page.locator('.faq details[open]')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.faq details[open]')).toHaveCount(0);
  await expect(page.locator('#archive-date-by')).toHaveValue('writtenAt');
  expect(await ids(page)).toEqual(['rain', 'cloud', 'original']);
});

test('static reading remains usable with blocked preferences, no JavaScript or missing enhancement', async ({ browser }) => {
  for (const failure of ['storage', 'javascript', 'reading.js']) {
    const context = await browser.newContext({ javaScriptEnabled: failure !== 'javascript', colorScheme:'dark' });
    const page = await context.newPage();
    if (failure === 'storage') await page.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
    });
    if (failure === 'reading.js') await page.route('**/reading.js*', route => route.abort());
    await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/posts/rain/en.html');
    await expect(page.locator('.article-body')).toContainText('English body');
    expect(await page.locator('body').evaluate(el => {
      const style=getComputedStyle(el);
      return style.colorScheme==='dark' && style.backgroundColor.match(/\d+/g).slice(0,3).every(value=>Number(value)<100);
    })).toBe(true);
    if (failure === 'storage') {
      await page.locator('.theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme','light');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    } else await expect(page.locator('.theme-toggle')).toBeHidden();
    await context.close();
  }
});

test('closing after a language change restores focus to the corresponding article link', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-essay-id="rain"] .card-button').click();
  await page.selectOption('#dialog-language-select', 'en');
  await page.locator('.dialog-close').click();
  await expect(page.locator('[data-essay-id="rain"] .card-button')).toBeFocused();
});

test('copy shares the static page of each actual language, including fallback and clipboard failure', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./?post=cloud&lang=zh-CN#interests');
  for (let i = 0; i < langs.length; i++) {
    await page.selectOption('#dialog-language-select', langs[i]);
    const currentUrl = page.url();
    await page.locator('#essay-share').click();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(shared).pathname).toBe(`/xiwu-cloud-notes/posts/cloud/${langs[i]}.html`);
    expect(page.url()).toBe(currentUrl);
    const response = await page.request.get(shared);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`<html lang="${langs[i]}">`);
    expect(html).toContain(`<title>${cloudTitles[i]}`);
    expect(html).toContain(bodyMarkers[i]);
    expect(html).toContain('property="og:type" content="article"');
  }
  await page.goto('./?post=original&lang=en');
  await page.locator('#essay-share').click();
  const original = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(original).pathname).toBe('/xiwu-cloud-notes/posts/original/zh-CN.html');
  expect(param(page, 'lang')).toBe('en');
  await expect(page.locator('#dialog-fallback')).toBeVisible();
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new Error('Clipboard denied'); } }));
  await page.locator('#essay-share').click();
  await expect(page.locator('#dialog-share-status')).toContainText(original);
  await expect(page.locator('#dialog-share-status')).not.toContainText('?post=');
});


test('informative hero illustration follows all four languages', async ({ page }) => {
  await page.goto('./');
  for (const lang of langs) {
    await page.selectOption('#language-select',lang);
    const expected=await page.evaluate(lang=>window.siteProfile.ui[lang]['hero.artAlt'],lang);
    await expect(page.locator('.hero-art img')).toHaveAttribute('alt',expected);
    expect(expected.length).toBeGreaterThan(15);
  }
});

test('motion is progressive, pauses offscreen and when hidden, and responds to reduced motion live', async ({ page }) => {
  await page.goto('./');
  await expect.poll(()=>page.locator('html').evaluate(el=>el.classList.contains('clouds-running'))).toBe(true);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('html')).not.toHaveClass(/clouds-running/);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('html')).toHaveClass(/clouds-running/);
  await page.locator('#interests').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).not.toHaveClass(/clouds-running/);
  await expect(page.locator('.interest-card').first()).toHaveClass(/card-enter/);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.interest-card').first()).not.toHaveClass(/card-enter/);
  await page.locator('.hero').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).not.toHaveClass(/clouds-running/);
  expect(await page.locator('.cloud-one').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await openFirst(page);
  expect(await page.locator('dialog').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.locator('.dialog-close').click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.hero').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveClass(/clouds-running/);
});

test('missing optional motion script leaves cards visible and readable', async ({ browser }) => {
  const context=await browser.newContext();const page=await context.newPage();
  await page.route('**/motion.js*',route=>route.abort());
  await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
  expect(await page.locator('.interest-card').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await openFirst(page);
  await expect(page.locator('#dialog-body')).toContainText('中文正文');
  await context.close();
});

test('text and link tokens meet normal-text contrast on composed cloud and component surfaces', async ({ page }) => {
  await page.goto('./');
  for (const theme of ['light','dark']) {
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    const failures=await page.evaluate(()=>{
      const style=getComputedStyle(document.documentElement);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const rgb=token=>{
        ctx.clearRect(0,0,1,1);ctx.fillStyle=style.getPropertyValue(token).trim();ctx.fillRect(0,0,1,1);
        return [...ctx.getImageData(0,0,1,1).data].slice(0,3);
      };
      const blend=(a,b,alpha)=>a.map((v,i)=>v*alpha+b[i]*(1-alpha));
      const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      const paper=rgb('--paper'),blue=rgb('--blue'),pink=rgb('--pink');
      // 实际组件底色和装饰叠加的保守上界，含称呼卡、便笺、音乐框与云层。
      const surfaces=[paper,rgb('--wash'),blend(blue,paper,.5),blend(pink,paper,.5),blend(pink,blend(blue,paper,.38),.3)];
      const failures=[];
      for (const token of ['--ink','--muted','--accent'])for(const surface of surfaces) {
        const ratio=contrast(rgb(token),surface);if(ratio<4.5)failures.push({token,surface,ratio});
      }
      const active=contrast(rgb('--primary'),paper);if(active<4.5)failures.push({token:'active',ratio:active});
      return failures;
    });
    expect(failures,theme).toEqual([]);
    expect(await page.locator('.card-description').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(15);
    expect(await page.locator('.entry-date').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
  }
});
