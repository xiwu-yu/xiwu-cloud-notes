import{test,expect,noOverflow}from'./helpers.mjs';
import{readFileSync}from'node:fs';
const productionContactCss=readFileSync(new URL('../fixtures/contact-production.css',import.meta.url),'utf8');

test('one glass indicator moves continuously while button text stays stable',async({page})=>{
 await page.goto('./');await page.locator('.filters').scrollIntoViewIfNeeded();
 const indicator=page.locator('.filter-indicator');await expect(indicator).toBeVisible();
 await page.evaluate(()=>window.keptIndicator=document.querySelector('.filter-indicator'));
 const buttons=page.locator('.filter');await buttons.last().click();
 await expect.poll(()=>indicator.evaluate(e=>e.getAnimations().length)).toBeGreaterThan(0);
 const frames=await indicator.evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();const points=[];
  for(const time of[0,140,280]){a.currentTime=time;points.push(e.getBoundingClientRect().x);}a.finish();return points;
 });
 expect(frames[1]).toBeGreaterThan(frames[0]+1);expect(frames[1]).toBeLessThan(frames[2]-1);
 for(const button of await buttons.all())expect(await button.evaluate(e=>getComputedStyle(e).transform)).toBe('none');
 await page.selectOption('#language-select','en');
 expect(await page.evaluate(()=>keptIndicator===document.querySelector('.filter-indicator'))).toBe(true);
 await expect(indicator).toHaveCount(1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.filter').first().click();
 await expect.poll(()=>indicator.evaluate(e=>e.getAnimations().length)).toBe(0);
});

for(const width of [320,390,1440])test(`${width}px indicator remeasures for languages, themes and text size without scrolling the document`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});await page.goto('./');
 // 初始化不能把首页跳到分类区。
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 for(const lang of['zh-CN','zh-TW','en','ja']){
  await page.selectOption('#language-select',lang);
  for(const theme of['light','dark']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.site-header .theme-toggle').click();
   await page.locator('.filter').last().focus();await page.keyboard.press('Space');
   await expect(page.locator('.filter').last()).toHaveAttribute('aria-pressed','true');
   await expect.poll(()=>page.evaluate(()=>{const active=document.querySelector('.filter[aria-pressed="true"]'),indicator=document.querySelector('.filter-indicator');if(!active||!indicator)return Infinity;const a=active.getBoundingClientRect(),i=indicator.getBoundingClientRect();return Math.max(Math.abs(a.x-i.x),Math.abs(a.width-i.width),Math.abs(a.y-i.y));})).toBeLessThan(1);
   const fits=await page.locator('.filter[aria-pressed="true"]').evaluate(e=>{const a=e.getBoundingClientRect(),g=e.parentElement.getBoundingClientRect();return a.x>=g.x-1&&a.right<=g.right+1;});expect(fits).toBe(true);
   await noOverflow(page,width);
  }
 }
 await page.addStyleTag({content:'.filter{font-size:24px}'});
 await expect.poll(()=>page.evaluate(()=>{const active=document.querySelector('.filter[aria-pressed="true"]'),indicator=document.querySelector('.filter-indicator');if(!active||!indicator)return Infinity;const a=active.getBoundingClientRect(),i=indicator.getBoundingClientRect();return Math.abs(a.width-i.width);})).toBeLessThan(1);
 await noOverflow(page,width);
});

test('foreground stays unblurred and paper-backed while material has only edge reflections',async({page})=>{
 await page.goto('./');
 for(const selector of['.hero-button','.glass-card','.archive-toolbar','.contact-label','.contact-action'])expect(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
 for(const selector of['.card-image img','.card-content','.hero-button>span'])expect(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).filter)).toBe('none');
 expect(await page.locator('.card-content').first().evaluate(e=>getComputedStyle(e).backgroundColor)).not.toContain('rgba');
 expect(await page.locator('.contact-split').evaluate(e=>getComputedStyle(e).opacity)).toBe('0.62');
 await page.locator('.site-header .transparency-toggle').click();await page.locator('#glass-enabled').uncheck();await page.locator('#glass-settings-close').click();
 for(const selector of['.hero-button','.glass-card','.contact-label','.contact-action'])expect(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
});

test('player help is collapsed, stays usable in short layouts and preserves the iframe while folding',async({page})=>{
 let requests=0;await page.route('https://music.163.com/**outchain/player?*',r=>{requests++;return r.fulfill({contentType:'text/html',body:'<!doctype html><button>Native control fixture</button>'});});
 await page.goto('./');await page.locator('#music-toggle').click();
 await page.evaluate(()=>{window.keptFrame=document.querySelector('#music-frame');window.keptWindow=keptFrame.contentWindow;});
 await expect(page.locator('.music-help')).not.toHaveAttribute('open','');
 await expect(page.locator('#music-status')).toBeHidden();
 for(const[width,height]of[[1440,360],[390,844],[568,320]]){
  await page.setViewportSize({width,height});await page.locator('.music-help summary').click();
  await expect(page.locator('.music-hint')).toBeVisible();
  for(const selector of['#music-close','#music-collapse','.music-help summary','.music-fallback a'])expect(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await page.locator('.music-help summary').click();
 }
 await page.locator('#music-close').click();await page.locator('#music-toggle').click();
 expect(requests).toBe(1);expect(await page.evaluate(()=>keptFrame===document.querySelector('#music-frame')&&keptWindow===keptFrame.contentWindow)).toBe(true);
});

for(const width of [320,390,1440])test(`${width}px photo titles stay unbacked, email uses media glass and view controls keep keyboard switching`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});await page.goto('./');
 for(const lang of['zh-CN','zh-TW','en','ja']){
  await page.selectOption('#language-select',lang);
  for(const theme of['light','dark']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.site-header .theme-toggle').click();
   for(const selector of['.contact-label','.contact-copy h2','.contact-action']){
    const style=await page.locator(selector).evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,image:s.backgroundImage,blur:s.backdropFilter};});
    expect(style.background).toBe('rgba(0, 0, 0, 0)');expect(style.image).toBe('none');expect(style.blur).toBe('none');
   }
   await expect(page.locator('.contact-email')).toHaveAttribute('data-material','media');
   expect(await page.locator('.contact-email').evaluate(e=>getComputedStyle(e).backdropFilter)).toContain('blur');
   await expect(page.locator('.contact-label')).not.toHaveClass(/glass-surface/);
   await expect(page.locator('.contact-action')).not.toHaveClass(/glass-surface/);
   if(width<720)expect((await page.locator('.contact-email').boundingBox()).x).toBeCloseTo(20,0);
   for(const view of['timeline','cards']){
    const button=page.locator(`[data-view="${view}"]`);await expect(page.locator('.view-indicator')).toHaveCount(1);
    await button.focus();await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-pressed','true');
    expect(await button.evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
    await expect(page.locator(view==='cards'?'#interest-grid':'#essay-timeline')).toBeVisible();
   }
   await expect.poll(()=>page.evaluate(()=>{const a=document.querySelector('[data-view][aria-pressed="true"]').getBoundingClientRect(),i=document.querySelector('.view-indicator').getBoundingClientRect();return Math.max(Math.abs(a.x-i.x),Math.abs(a.width-i.width),Math.abs(a.y-i.y));})).toBeLessThan(1);
   await noOverflow(page,width);
  }
 }
});

test('view switch uses the same continuous indicator motion as categories with stable labels',async({page})=>{
 await page.goto('./');const buttons=page.locator('[data-view]'),indicator=page.locator('.view-indicator');
 await expect(indicator).toBeVisible();await page.evaluate(()=>window.keptViewIndicator=document.querySelector('.view-indicator'));
 await buttons.last().click();await expect.poll(()=>indicator.evaluate(e=>e.getAnimations().length)).toBeGreaterThan(0);
 const positions=await indicator.evaluate(e=>{const a=e.getAnimations()[0];a.pause();const xs=[];for(const t of [0,140,280]){a.currentTime=t;xs.push(e.getBoundingClientRect().x);}a.finish();return xs;});
 expect(positions[1]).toBeGreaterThan(positions[0]+1);expect(positions[1]).toBeLessThan(positions[2]-1);
 for(const button of await buttons.all())expect(await button.evaluate(e=>getComputedStyle(e).transform)).toBe('none');
 await page.selectOption('#language-select','en');expect(await page.evaluate(()=>keptViewIndicator===document.querySelector('.view-indicator'))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await buttons.first().click();await expect.poll(()=>indicator.evaluate(e=>e.getAnimations().length)).toBe(0);
});

for(const width of [320,390,1440])test(`${width}px contact image matches the captured production treatment in both themes`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});
 for(const theme of ['light','dark']){
  await page.goto('./');
  if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.site-header .theme-toggle').click();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  if(width<=720)await page.locator('.contact-mobile-art img').evaluate(img=>img.decode());
  await page.addStyleTag({content:'.site-header{visibility:hidden!important}'});
  const image=page.locator(width<=720?'.contact-mobile-art':'.contact-split');
  const actual=await image.screenshot();
  await page.addStyleTag({content:productionContactCss});
  expect(actual.equals(await image.screenshot())).toBe(true);
 }
});
