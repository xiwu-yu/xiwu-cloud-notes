import {test,expect,noOverflow} from './helpers.mjs';
const player=/^https:\/\/music\.163\.com\/(?:m\/)?outchain\/player\?/;

test('static article navigation leads to the list and titled neighbors, retaining language with explicit original fallback',async({page})=>{
 for(const root of ['/','/xiwu-cloud-notes/']){
  await page.goto('http://127.0.0.1:4174'+root+'posts/cloud/en.html');
  await expect(page.locator('.static-back a')).toHaveAttribute('href','../../?lang=en#interests');
  const links=page.locator('.static-pagination>a');
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveAttribute('href','../../posts/rain/en.html');
  await expect(links.first().locator('strong')).toHaveText('Test rain');
  await expect(links.last()).toHaveAttribute('href','../../posts/original/zh-CN.html');
  await expect(links.last().locator('small')).toHaveText('Simplified Chinese original');
  await page.locator('.static-back a').click();
  await expect(page.locator('#interest-dialog')).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has('post')).toBe(false);
  expect(new URL(page.url()).hash).toBe('#interests');
 }
});

test('body search explains and highlights a literal match; cards, timeline, static links and history preserve its paragraph',async({page})=>{
 await page.goto('./?lang=zh-CN');
 await page.locator('#archive-search').fill('needle');
 const result=page.locator('[data-essay-id="rain"] .card-button');
 await expect(result.locator('.match-source')).toHaveText('正文匹配');
 await expect(result.locator('.match-excerpt mark')).toHaveText('needle');
 expect(await result.getAttribute('href')).toMatch(/\?find=needle#passage-/);
 await result.click();
 const target=page.locator('#dialog-body [data-reader-block]').filter({hasText:'完整关键字'}).first();
 await expect(target.locator('strong mark')).toHaveText('nee');
 await expect(target).toContainText('needle');
 const part=new URL(page.url()).searchParams.get('part');
 expect(part).toBe(await target.getAttribute('id'));
 await expect(page.locator('.dialog-close')).toBeFocused();
 await expect.poll(async()=>{const t=await target.boundingBox(),bar=await page.locator('.dialog-toolbar').boundingBox();return t.y-(bar.y+bar.height);}).toBeGreaterThanOrEqual(10);
 await page.reload();await expect(page.locator('#dialog-body mark').first()).toBeVisible();
 await page.goBack();await page.goForward();await expect(page.locator('#dialog-body')).toContainText('needle');
 await page.locator('#dialog-static').click();
 await expect(page.locator('.article-body mark').first()).toBeVisible();
 expect(new URL(page.url()).hash).toBe('#'+part);
 await page.goBack();await page.locator('.dialog-close').click();
 await page.locator('#archive-search').fill('[a+b]');
 await expect(page.locator('#interest-grid .match-excerpt mark')).toHaveText('[a+b]');
 await page.locator('[data-view="timeline"]').click();
 await expect(page.locator('.timeline-description mark')).toHaveText('[a+b]');
 await page.locator('.timeline-button').click();
 await expect(page.locator('#dialog-body mark').last()).toHaveText('[a+b]');
 await page.keyboard.press('Escape');
 await expect.poll(()=>new URL(page.url()).searchParams.has('find')).toBe(false);
 await expect.poll(()=>new URL(page.url()).searchParams.has('part')).toBe(false);
});

for(const width of [320,390,768,1440])test(width+'px TOC uses real headings and accessible in-reader anchors in all languages and themes',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});
 for(const lang of ['zh-CN','zh-TW','en','ja']){
  await page.goto('./?post=rain&lang='+lang);
  for(const theme of ['light','dark']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.dialog-theme-toggle').click();
   const toc=page.locator('#interest-dialog .reader-toc');
   await expect(toc).toBeVisible();
   await expect(toc.locator('nav a')).toHaveCount(3);
   if(await toc.getAttribute('open')===null)await toc.locator('summary').click();
   const last=toc.locator('a').last();const id=await last.getAttribute('data-reader-anchor');await last.click();
   await expect(page.locator('#dialog-body #'+id)).toBeFocused();
   await expect(page.locator('#music-toggle')).toBeVisible();
   await noOverflow(page,width);
  }
  await page.keyboard.press('Escape');
  await page.goto('./posts/rain/'+lang+'.html');
  const toc=page.locator('.reader-toc');await expect(toc).toBeVisible();
  if(await toc.getAttribute('open')===null)await toc.locator('summary').click();
  await toc.locator('a').nth(1).click();
  expect(new URL(page.url()).hash).toBe('#section-2');
  const heading=page.locator('#section-2');await expect(heading).toBeFocused();
  await expect.poll(async()=>{const h=await heading.boundingBox(),t=await page.locator('.static-reader-toolbar').boundingBox();return h.y-t.y-t.height;}).toBeGreaterThanOrEqual(10);
  await noOverflow(page,width);
 }
 await page.goto('./?post=cloud&lang=zh-CN');await expect(page.locator('#interest-dialog .reader-toc')).toBeHidden();
});

test('no-JS static directory and article links work; failed reader enhancement leaves article prose and directory available',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await context.newPage();const response=await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/posts/rain/en.html');
 expect(response.status()).toBe(200);await expect(page.locator('.reader-toc')).toBeVisible();
 await page.locator('.reader-toc a').nth(1).click();expect(new URL(page.url()).hash).toBe('#section-2');
 await expect(page.locator('.article-body')).toContainText('needle');
 await page.locator('.static-back a').click();expect(new URL(page.url()).searchParams.has('post')).toBe(false);
 await context.close();
 const failed=await browser.newContext();const other=await failed.newPage();
 await other.route('**/reader.js*',r=>r.fulfill({contentType:'application/javascript',body:'/* unavailable optional reader enhancement */'}));
 await other.goto('http://127.0.0.1:4174/xiwu-cloud-notes/posts/rain/en.html');
 await expect(other.locator('.reader-toc a')).toHaveCount(3);await expect(other.locator('.article-body')).toContainText('needle');await failed.close();
});

test('mobile icon stays rendered across resources, reading, directory and settings without reloading music',async({page})=>{
 let requests=0;await page.route(player,r=>{requests++;return r.fulfill({contentType:'text/html',body:'<!doctype html><p>Official document host fixture</p>'});});
 await page.setViewportSize({width:390,height:844});await page.goto('./');
 const toggle=page.locator('#music-toggle');await expect(toggle).toBeVisible();expect((await toggle.boundingBox()).width).toBe(48);
 const fixed=await toggle.boundingBox();
 await toggle.click();await expect.poll(()=>requests).toBe(1);
 await page.evaluate(()=>{window.keptMusic=document.querySelector('#music-frame');window.keptMusicWindow=keptMusic.contentWindow;});
 await page.locator('#music-close').click();
 await page.locator('.site-header .transparency-toggle').click();await expect(toggle).toBeVisible();await page.locator('#glass-settings-close').click();
 await page.locator('#static-archive summary').click();await expect(toggle).toBeVisible();await page.locator('#static-archive summary').click();
 await page.locator('.resource-list').evaluate(el=>{const box=el.getBoundingClientRect();scrollTo({top:scrollY+box.top-innerHeight+60,behavior:'instant'});});
 await expect(toggle).toBeVisible();
 expect((await toggle.boundingBox()).x).toBe(fixed.x);expect((await toggle.boundingBox()).y).toBe(fixed.y);
 expect(await toggle.evaluate(el=>el.inert)).toBe(false);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await expect(toggle).toBeVisible();
 await page.locator('[data-essay-id="rain"] .card-button').click();await expect(toggle).toBeVisible();await page.keyboard.press('Escape');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await expect(toggle).toBeVisible();await toggle.click();
 expect(await page.evaluate(()=>keptMusic===document.querySelector('#music-frame')&&keptMusicWindow===keptMusic.contentWindow)).toBe(true);expect(requests).toBe(1);
});
