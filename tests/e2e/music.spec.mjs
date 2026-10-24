import { readFile } from 'node:fs/promises';
import { test, expect, noOverflow } from './helpers.mjs';
const ui=JSON.parse(await readFile(new URL('../../content/ui.json',import.meta.url),'utf8'));
const {music}=JSON.parse(await readFile(new URL('../../content/site.json',import.meta.url),'utf8'));
const playerUrl=`https://music.163.com/outchain/player?type=0&id=${music.playlistId}&auto=0&height=430`;
// CI 不依赖网易云网络、地区限制或真实音频；此响应只验证宿主面板生命周期。
const stub='<!doctype html><html><body><p>External player test fixture</p></body></html>';
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

for (const [width,height] of [[320,568],[375,812],[768,900],[1440,900],[568,320]]) {
  test(`music fits ${width}×${height} in all languages and themes, with accessible footer links`, async ({ page }) => {
    await stubPlayer(page);
    await page.setViewportSize({width,height});
    await page.goto('./');
    for (const lang of Object.keys(ui)) {
      await page.selectOption('#language-select',lang);
      for (const theme of ['light','dark']) {
        if (await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('.theme-toggle').click();
        await page.locator('#music-toggle').click();
        await expect(page.locator('#music-close')).toHaveAttribute('aria-label',ui[lang]['music.close']);
        const panel=await page.locator('#music-panel').boundingBox();
        const toggle=await page.locator('#music-toggle').boundingBox();
        const fallback=await page.locator('.music-fallback a').boundingBox();
        const close=await page.locator('#music-close').boundingBox();
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.x+panel.width).toBeLessThanOrEqual(width);
        expect(panel.y+panel.height).toBeLessThanOrEqual(toggle.y-8);
        expect(fallback.y+fallback.height).toBeLessThanOrEqual(panel.y+panel.height);
        expect(close.y).toBeGreaterThanOrEqual(panel.y);
        expect(close.x+close.width).toBeLessThanOrEqual(panel.x+panel.width);
        await noOverflow(page,width);
        await page.locator('#music-close').click();
      }
    }
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    const back=await page.locator('footer>a:last-child').boundingBox();
    const toggle=await page.locator('#music-toggle').boundingBox();
    expect(back.y+back.height).toBeLessThan(toggle.y);
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
