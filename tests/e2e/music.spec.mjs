import { readFile } from 'node:fs/promises';
import { devices } from '@playwright/test';
import { test, expect, noOverflow } from './helpers.mjs';
const ui=JSON.parse(await readFile(new URL('../../content/ui.json',import.meta.url),'utf8'));
const {music}=JSON.parse(await readFile(new URL('../../content/site.json',import.meta.url),'utf8'));
const playerUrl=`https://music.163.com/outchain/player?type=0&id=${music.playlistId}&auto=0&height=430`;
// CI 不依赖网易云网络、地区限制或真实音频；此响应只验证宿主面板生命周期。
const stub='<!doctype html><html><meta charset="utf-8"><style>body{margin:0}p{margin:0;height:400px}button{height:44px}</style><body><p>External player test fixture</p><button>Native bottom control fixture</button></body></html>';
async function stubPlayer(page,onRequest=()=>{}) {
  await page.route('https://music.163.com/outchain/player?**',route=>{
    onRequest();
    return route.fulfill({contentType:'text/html',body:stub});
  });
}

test('music loads on demand once and preserves its iframe across folding, languages, filters and reading dialogs', async ({ page }) => {
  let requests=0;
  await stubPlayer(page,()=>requests++);
  await page.goto('./');
  const frame=page.locator('#music-frame');
  await expect(page.locator('#music-toggle')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#music-panel')).toBeHidden();
  expect(await frame.getAttribute('src')).toBeNull();
  expect(requests).toBe(0);
  await page.locator('#music-toggle').click();
  await expect(frame).toHaveAttribute('src',playerUrl);
  await expect.poll(()=>requests).toBe(1);
  await page.evaluate(()=>{
    window.musicNode=document.querySelector('#music-frame');
    window.musicWindow=window.musicNode.contentWindow;
  });
  const unchanged=async()=>{
    expect(await page.evaluate(()=>window.musicNode===document.querySelector('#music-frame') && window.musicWindow===window.musicNode.contentWindow)).toBe(true);
    await expect(frame).toHaveAttribute('src',playerUrl);
    expect(requests).toBe(1);
  };
  await page.locator('#music-close').click();
  await expect(page.locator('#music-panel')).toBeHidden();
  await expect(page.locator('#music-toggle')).toBeFocused();
  await unchanged();
  await page.locator('#music-toggle').click();
  for (const lang of ['zh-CN','zh-TW','en','ja']) {
    await page.selectOption('#language-select',lang);
    await expect(page.locator('#music-title')).toHaveText(ui[lang]['music.title']);
    await expect(frame).toHaveAttribute('title',ui[lang]['music.iframeTitle']);
    await expect(page.locator('#music-toggle')).toHaveAttribute('aria-label',ui[lang]['music.collapse']);
    await unchanged();
  }
  await page.locator('.theme-toggle').click();
  await page.locator('#archive-search').fill('rain');
  await page.locator('[data-filter="随笔"]').click();
  await page.selectOption('#archive-month','2026-10');
  await page.selectOption('#archive-order','oldest');
  await page.locator('.card-button').click();
  await expect(page.locator('#interest-dialog')).toBeVisible();
  await expect(page.locator('.dialog-close')).toBeFocused();
  expect(await page.locator('#music-widget').evaluate(el=>el.matches(':modal'))).toBe(false);
  expect(await page.locator('#interest-dialog').evaluate(el=>el.matches(':modal'))).toBe(true);
  await page.selectOption('#dialog-language-select','en');
  await unchanged();
  await page.locator('.dialog-close').click();
  await expect(page.locator('.card-button')).toBeFocused();
  await expect(page.locator('#music-panel')).toBeVisible();
  await page.locator('#music-toggle').click();
  await page.locator('[data-view="timeline"]').click();
  await page.locator('.timeline-button').click();
  await page.keyboard.press('Escape');
  await unchanged();
  await expect(page.locator('#music-panel')).toBeHidden();
});

test('music disclosure supports keyboard close and restores focus without trapping the page', async ({ page }) => {
  await stubPlayer(page);
  await page.goto('./');
  const toggle=page.locator('#music-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#music-close')).toBeFocused();
  expect(await page.locator('#music-close').evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Space');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#music-panel')).toBeHidden();
});

for (const [width,height] of [[320,568],[375,812],[768,900],[1440,900],[568,320],[1440,360],[1280,480],[768,400]]) {
  test(`music fits ${width}×${height} in all languages and themes, with accessible footer links`, async ({ page }) => {
    await stubPlayer(page);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width,height});
    await page.goto('./');
    for (const lang of Object.keys(ui)) {
      await page.selectOption('#language-select',lang);
      for (const theme of ['light','dark']) {
        if (await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('.theme-toggle').click();
        if (width <= 720) {
          await expect(page.locator('#music-toggle')).toBeHidden();
          await expect(page.locator('#music-static-link')).toBeHidden();
          expect(await page.locator('#music-frame').getAttribute('src')).toBeNull();
          await noOverflow(page,width);
          continue;
        }
        await page.locator('#music-toggle').click();
        await expect(page.locator('#music-close')).toHaveAttribute('aria-label',ui[lang]['music.close']);
        // 宿主 load 文案可能改变行数；固定在同一文档状态测量，避免跨帧旧/新矩形混用。
        await expect(page.locator('#music-status')).toHaveText(ui[lang]['music.document']);
        const panel=await page.locator('#music-panel').boundingBox();
        const toggle=await page.locator('#music-toggle').boundingBox();
        const fallback=await page.locator('.music-fallback a').boundingBox();
        const close=await page.locator('#music-close').boundingBox();
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.x+panel.width).toBeLessThanOrEqual(width);
        if (toggle) expect(panel.y+panel.height).toBeLessThanOrEqual(toggle.y-8);
        else expect(panel.y+panel.height).toBeLessThanOrEqual(height-16);
        expect(panel.width).toBeLessThanOrEqual(420);
        const header=await page.locator('.site-header').boundingBox();
        expect(panel.y).toBeGreaterThanOrEqual(header.y+header.height);
        expect(fallback.y+fallback.height).toBeLessThanOrEqual(panel.y+panel.height);
        expect(close.y).toBeGreaterThanOrEqual(panel.y);
        expect(close.x+close.width).toBeLessThanOrEqual(panel.x+panel.width);
        // 固定 330×450 的原生文档不缩放；视口顶部、底部都可滚动到达。
        const viewport=page.locator('.music-frame-viewport');
        await viewport.evaluate(el=>el.scrollTop=0);
        const top=await viewport.evaluate(el=>({box:el.getBoundingClientRect().toJSON(),frame:el.querySelector('iframe').getBoundingClientRect().toJSON(),height:el.clientHeight,width:el.clientWidth}));
        expect(top.height).toBeGreaterThan(20);
        expect(top.frame.y).toBeGreaterThanOrEqual(top.box.y);
        expect(top.frame.width).toBe(330);
        expect(top.width).toBeGreaterThanOrEqual(top.frame.width);
        expect(top.frame.height).toBe(450);
        await viewport.evaluate(el=>el.scrollTop=el.scrollHeight);
        const bottom=await viewport.evaluate(el=>({box:el.getBoundingClientRect().toJSON(),frame:el.querySelector('iframe').getBoundingClientRect().toJSON()}));
        expect(bottom.frame.bottom).toBeLessThanOrEqual(bottom.box.bottom+1);
        for (const selector of ['#music-close','#music-collapse','.music-fallback a']) {
          expect(await page.locator(selector).evaluate(el=>{
            const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));
          })).toBe(true);
        }
        await noOverflow(page,width);
        await page.locator('#music-close').click();
      }
    }
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    const back=await page.locator('footer>a:last-child').boundingBox();
    if (width > 720) {
      const toggle=await page.locator('#music-toggle').boundingBox();
      expect(back.y+back.height).toBeLessThan(toggle.y);
    }
    const hit=await page.locator('footer>a:last-child').evaluate(el=>{
      const box=el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(box.left+box.width/2,box.top+box.height/2));
    });
    expect(hit).toBe(true);
  });
}

test('playlist fallback remains available when the iframe fails or JavaScript is unavailable', async ({ browser }) => {
  for (const failure of ['player','javascript','script.js','profile.js']) {
    const context=await browser.newContext({javaScriptEnabled:failure!=='javascript'});
    const page=await context.newPage();
    if (failure==='player') await page.route('https://music.163.com/outchain/player?**',route=>route.abort());
    if (failure==='script.js' || failure==='profile.js') await page.route(`**/${failure}*`,route=>route.abort());
    await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
    if (failure==='player') await page.locator('#music-toggle').click();
    const link=page.locator(failure==='player'?'.music-fallback a':'#music-static-link a');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href',`https://music.163.com/playlist?id=${music.playlistId}`);
    await expect(link).toHaveAttribute('target','_blank');
    await expect(link).toHaveAttribute('rel','noopener noreferrer');
    await context.close();
  }
});

test('phones and tablets have no music controls, links, footer gap or third-party requests', async ({ browser }) => {
  for (const device of ['iPhone 13','Pixel 5','iPad (gen 7)']) {
    const context=await browser.newContext({...devices[device]});
    const page=await context.newPage();
    const errors=[];let requests=0;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*music.163.com/**',route=>{requests++;return route.abort();});
    await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
    for (const lang of ['zh-CN','zh-TW','en','ja']) {
      await page.selectOption('#language-select',lang);
      await expect(page.locator('#music-widget')).toHaveCount(0);
      await expect(page.locator('#music-static-link')).toHaveCount(0);
      await expect(page.locator('a[href*="music.163.com"]')).toHaveCount(0);
      expect(await page.locator('body').evaluate(el=>el.classList.contains('has-music'))).toBe(false);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    }
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await context.close();
    const noScript=await browser.newContext({...devices[device],javaScriptEnabled:false});
    const plain=await noScript.newPage();
    await plain.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
    await expect(plain.locator('#music-widget')).toBeHidden();
    await expect(plain.locator('#music-static-link')).toBeHidden();
    await noScript.close();
  }
});

test('switching a desktop window to mobile layout disables the player instead of hiding active audio', async ({ page }) => {
  let requests=0;await stubPlayer(page,()=>requests++);
  await page.goto('./');await page.locator('#music-toggle').click();
  await expect(page.locator('#music-frame')).toHaveAttribute('src',playerUrl);
  await expect(page.frameLocator('#music-frame').getByText('External player test fixture')).toBeVisible();
  await page.setViewportSize({width:375,height:812});
  await expect(page.locator('#music-toggle')).toBeHidden();
  await expect.poll(()=>page.locator('#music-frame').getAttribute('src')).toBeNull();
  expect(await page.locator('body').evaluate(el=>el.classList.contains('has-music'))).toBe(false);
  await page.setViewportSize({width:1440,height:900});
  await expect(page.locator('#music-toggle')).toBeVisible();
  await expect(page.locator('#music-panel')).toBeHidden();
});


test('slow official document has translated host feedback without claiming playback; load and collapse preserve the frame', async ({ page }) => {
  let release;
  const gate=new Promise(resolve=>release=resolve);
  let requests=0;
  await page.route('https://music.163.com/outchain/player?**',async route=>{
    requests++;await gate;await route.fulfill({contentType:'text/html',body:stub});
  });
  await page.clock.install();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:360});
  await page.goto('./');
  await page.locator('#music-toggle').click();
  await expect(page.locator('#music-status')).toHaveText(ui['zh-CN']['music.loading']);
  await page.clock.fastForward(10001);
  for (const lang of Object.keys(ui)) {
    await page.selectOption('#language-select',lang);
    await expect(page.locator('#music-status')).toHaveText(ui[lang]['music.slow']);
    for (const theme of ['light','dark']) {
      if (await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('.theme-toggle').click();
      await expect(page.locator('.music-fallback a')).toBeInViewport();
      await expect(page.locator('#music-collapse')).toBeInViewport();
      expect(await page.locator('.music-frame-viewport').evaluate(el=>el.clientHeight)).toBeGreaterThan(20);
    }
  }
  await page.locator('#music-close').click();
  await page.locator('#music-toggle').click();
  expect(requests).toBe(1);
  release();
  await expect(page.locator('#music-status')).toHaveText(ui.ja['music.document']);
  await page.locator('#music-collapse').click();
  await expect(page.locator('#music-toggle')).toBeFocused();
});

test('iframe Escape stays inside its document; native keyboard navigation reaches the host collapse control', async ({ page, browserName }) => {
  await stubPlayer(page);
  await page.goto('./');await page.locator('#music-toggle').click();
  await page.frameLocator('#music-frame').getByRole('button').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#music-panel')).toBeVisible();
  // macOS WebKit 默认仅 Tab 到输入框；Option-Tab 访问所有链接/按钮。
  const next = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.keyboard.press(next);
  await expect(page.locator('.music-fallback a')).toBeFocused();
  await page.keyboard.press(next);
  await expect(page.locator('#music-collapse')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#music-toggle')).toBeFocused();
});

test('200% zoom equivalent layout keeps controls reachable and disables music at the narrow breakpoint', async ({ browser }) => {
  // 物理 2560×960 / 200% => 1280×480 CSS px。非原生浏览器工具栏缩放。
  const context=await browser.newContext({viewport:{width:1280,height:480},deviceScaleFactor:2});
  const page=await context.newPage();
  await stubPlayer(page);
  await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
  await page.locator('#music-toggle').click();
  await page.locator('.music-frame-viewport').evaluate(el=>el.scrollTop=el.scrollHeight);
  await expect(page.locator('#music-collapse')).toBeInViewport();
  await page.locator('#music-collapse').click();
  await noOverflow(page,1280);
  // 物理 1440×900 / 200% => 720×450，遵循现有禁用音乐的小屏策略。
  await page.setViewportSize({width:720,height:450});
  await expect(page.locator('#music-widget')).toBeHidden();
  await expect.poll(()=>page.locator('#music-frame').getAttribute('src')).toBeNull();
  await noOverflow(page,720);
  await context.close();
});


test('desktop touch layout also has no controls, fallback link, requests or music footer gap', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});
  const page=await context.newPage();let requests=0;
  await page.route('**/*music.163.com/**',route=>{requests++;return route.abort();});
  await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
  await expect(page.locator('#music-widget')).toBeHidden();
  await expect(page.locator('#music-static-link')).toBeHidden();
  expect(await page.locator('#music-frame').getAttribute('src')).toBeNull();
  expect(await page.locator('body').evaluate(el=>el.classList.contains('has-music'))).toBe(false);
  expect(requests).toBe(0);
  await context.close();
});
