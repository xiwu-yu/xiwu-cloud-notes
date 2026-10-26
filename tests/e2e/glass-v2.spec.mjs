import { test, expect, noOverflow } from './helpers.mjs';

for(const width of [320,390,768,1440])test(`${width}px tinted controls and modal theme work in all languages`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});await page.goto('./');
  for(const lang of ['zh-CN','zh-TW','en','ja']) {
    await page.selectOption('#language-select',lang);
    for(const selector of ['.hero-button-blue','.hero-button-pink','.card-button','.filter','.contact-label','.contact-action']) {
      expect(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).backgroundImage),selector).toBe('none');
    }
    expect(await page.locator('.art-caption').evaluate(e=>getComputedStyle(e).fontStyle)).toBe('normal');
    expect(await page.locator('.art-caption').evaluate(e=>getComputedStyle(e).transform)).toBe('none');
    for(const filter of await page.locator('.filter').all()) {
      await filter.click();await expect(filter).toHaveAttribute('aria-pressed','true');
      await expect(filter).toHaveClass(/active/);
    }
    await page.locator('.filter').first().click();await page.locator('.card-button').first().click();
    const theme=page.locator('.dialog-theme-toggle');
    for(const target of ['dark','light']) {
      if(await page.locator('html').getAttribute('data-theme')!==target)await theme.click();
      await expect(theme).toHaveAttribute('aria-pressed',String(target==='dark'));
      await expect(page.locator('.site-header .theme-toggle')).toHaveAttribute('aria-pressed',String(target==='dark'));
      await noOverflow(page,width);
      for(const control of ['.dialog-theme-toggle','.dialog-close','#dialog-language-select','.dialog-toolbar .transparency-toggle']) {
        expect(await page.locator(control).evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
      }
    }
    await page.keyboard.press('Escape');await expect(page.locator('.card-button').first()).toBeFocused();
    await noOverflow(page,width);
  }
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('desktop music can be dragged, moved with keys, clamped, reset and folded without reloading',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  let loads=0;await page.route('https://music.163.com/**outchain/player?*',r=>{loads++;return r.fulfill({contentType:'text/html',body:'<!doctype html><p>Official player lifecycle fixture</p>'});});
  await page.goto('./');await page.locator('#music-toggle').click();
  await page.evaluate(()=>{window.keptFrame=document.querySelector('#music-frame');window.keptWindow=keptFrame.contentWindow;});
  const handle=page.locator('.music-drag-handle'),panel=page.locator('#music-panel');
  const first=await panel.boundingBox(),h=await handle.boundingBox();
  await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2-220,h.y+h.height/2-160,{steps:8});await page.mouse.up();
  const moved=await panel.boundingBox();expect(moved.x).toBeLessThan(first.x-100);expect(moved.y).toBeLessThan(first.y-50);
  await handle.focus();await page.keyboard.press('ArrowRight');expect((await panel.boundingBox()).x).toBeCloseTo(moved.x+16,0);
  await page.setViewportSize({width:1024,height:480});
  await expect.poll(async()=>{const b=await panel.boundingBox();return b.y+b.height;}).toBeLessThanOrEqual(468);
  const clamped=await panel.boundingBox();expect(clamped.x).toBeGreaterThanOrEqual(12);expect(clamped.x+clamped.width).toBeLessThanOrEqual(1012);expect(clamped.y+clamped.height).toBeLessThanOrEqual(468);
  await page.locator('#music-close').click();await page.locator('#music-toggle').click();
  expect(await page.evaluate(()=>keptFrame===document.querySelector('#music-frame')&&keptWindow===keptFrame.contentWindow)).toBe(true);expect(loads).toBe(1);
  await handle.focus();await page.keyboard.press('Home');await expect(panel).not.toHaveAttribute('data-positioned','true');
  await page.setViewportSize({width:390,height:844});await expect(handle).toBeDisabled();await noOverflow(page,390);expect(loads).toBe(1);
});

test('contact copy stays unbacked and footer reading link sits below the back link without glass',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
  await expect(page.locator('#contact .text-link')).toHaveCount(0);
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    for(const theme of ['light','dark']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.site-header .theme-toggle').click();
      await page.locator('footer').scrollIntoViewIfNeeded();
      const back=await page.locator('.footer-back').boundingBox(),more=await page.locator('.footer-more').boundingBox();
      expect(more.y).toBeGreaterThanOrEqual(back.y+back.height-1);
      expect(more.x+more.width).toBeCloseTo(back.x+back.width,0);
      expect(await page.locator('.footer-more').evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
      expect(await page.locator('.footer-more').evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
      const color=await page.locator('.contact-action').evaluate(e=>getComputedStyle(e).backgroundColor);
      expect(color).toBe('rgba(0, 0, 0, 0)');
      await noOverflow(page,width);
    }
  }
  await page.locator('.footer-more').click();await expect(page).toHaveURL(/#interests$/);
});
