import {test,expect,noOverflow} from './helpers.mjs';
const languages=['zh-CN','zh-TW','en','ja'];
async function longProse(page,selector){await page.locator(selector).evaluate(body=>{for(let i=0;i<40;i++){const p=document.createElement('p');p.textContent='Controlled long-form reading passage. '.repeat(8);body.append(p);}});}
async function directoryInView(page,toolbar){
 const toc=toolbar.locator('.reader-tools>.reader-toc'),summary=toc.locator('summary');await expect(summary).toBeVisible();
 const box=await summary.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));expect(box.height).toBeGreaterThanOrEqual(44);
 return {toc,summary};
}
for(const width of [320,390,768])test(width+'px mobile directory stays reachable mid-article in modal and static readers, all languages and themes',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of languages)for(const theme of ['light','dark']){
  await page.goto('./?post=rain&lang='+lang);await page.evaluate(theme=>siteTheme.setMode(theme),theme);await longProse(page,'#dialog-body');await page.locator('#interest-dialog').evaluate(d=>d.scrollTop=1400);
  const toolbar=page.locator('.dialog-toolbar'),{toc,summary}=await directoryInView(page,toolbar);const position=await page.locator('#interest-dialog').evaluate(d=>d.scrollTop);expect(position).toBeGreaterThan(1000);
  await summary.click();await expect(toc).toHaveAttribute('open','');expect(Math.abs((await page.locator('#interest-dialog').evaluate(d=>d.scrollTop))-position)).toBeLessThanOrEqual(1);
  const navBox=await toc.locator('nav').boundingBox();expect(navBox.y).toBeGreaterThanOrEqual((await toolbar.boundingBox()).y);expect(navBox.y+navBox.height).toBeLessThanOrEqual(844);await noOverflow(page,width);
  await page.keyboard.press('Escape');await expect(toc).not.toHaveAttribute('open');await expect(summary).toBeFocused();await expect(page.locator('#interest-dialog')).toBeVisible();
  await summary.click();const link=toc.locator('a').last(),id=await link.getAttribute('data-reader-anchor');await link.click();await expect(page.locator('#dialog-body #'+id)).toBeFocused();await expect(toc).not.toHaveAttribute('open');
  expect((await page.locator('#dialog-body #'+id).boundingBox()).y).toBeGreaterThanOrEqual((await toolbar.boundingBox()).y+(await toolbar.boundingBox()).height);
  await expect(page.locator('.dialog-close')).toBeVisible();
  await page.goto('./posts/rain/'+lang+'.html');await longProse(page,'.article-body');await page.evaluate(()=>scrollTo({top:1400,behavior:'instant'}));
  const staticToolbar=page.locator('.static-reader-toolbar'),mobile=await directoryInView(page,staticToolbar),scroll=await page.evaluate(()=>scrollY);expect(scroll).toBeGreaterThan(1000);
  await mobile.summary.click();expect(Math.abs((await page.evaluate(()=>scrollY))-scroll)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');await expect(mobile.summary).toBeFocused();await mobile.summary.click();await mobile.toc.locator('a').nth(1).click();await expect(page.locator('#section-2')).toBeFocused();await expect(mobile.toc).not.toHaveAttribute('open');expect(new URL(page.url()).hash).toBe('#section-2');await noOverflow(page,width);
 }
});

test('directory moves without duplication on resize and short articles keep their simple toolbar',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./?post=rain&lang=en');
 await page.evaluate(()=>{window.originalDirectory=document.querySelector('.reader-toc');});
 for(const width of [390,1440,320,1440]){await page.setViewportSize({width,height:900});await expect(page.locator('.reader-toc')).toHaveCount(1);await expect(page.locator('.reader-toc nav a')).toHaveCount(3);expect(await page.evaluate(()=>originalDirectory===document.querySelector('.reader-toc'))).toBe(true);await expect(page.locator(width<1100?'.reader-tools>.reader-toc':'.reader-layout>.reader-toc')).toBeVisible();}
 await page.setViewportSize({width:320,height:844});await page.locator('#dialog-language-select').selectOption('ja');await expect(page.locator('.reader-toc')).toHaveCount(1);await page.locator('.dialog-close').click();await page.locator('[data-essay-id="cloud"] .card-button').click();await expect(page.locator('.reader-toc')).toBeHidden();await expect(page.locator('.reader-tools .reader-toc')).toHaveCount(0);await expect(page.locator('.dialog-close')).toBeVisible();
 await page.goto('./posts/rain/en.html');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await noOverflow(page,320);await directoryInView(page,page.locator('.static-reader-toolbar'));
});

test('obsolete continue label stays removed and mixed-script article titles use lining serif digits',async({page,context})=>{
 await context.route(/\/profile\.js(?:\?|$)/,async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text())+`\nfor(const site of Object.values(siteProfile.localized))site.interests.find(p=>p.id==='rain').title='HRT Month 3｜Title';`});});
 await page.goto('./?lang=zh-CN');const card=page.locator('[data-essay-id="rain"]');await expect(page.locator('.card-more')).toHaveCount(0);await expect(card.getByText(/^继续读\s*↗?$/)).toHaveCount(0);await expect(card.locator('.card-resume,.card-save')).toHaveCount(0);
 await expect(card.locator('h3')).toHaveText('HRT Month 3｜Title');await expect(card.locator('h3')).toHaveCSS('font-variant-numeric','lining-nums');await expect(card.locator('h3')).toHaveCSS('font-family',/Times New Roman/);
 await card.locator('.card-button').click();await expect(page.locator('#dialog-title')).toHaveCSS('font-variant-numeric','lining-nums');await page.goto('./posts/rain/en.html');await expect(page.locator('.static-article h1')).toHaveCSS('font-variant-numeric','lining-nums');
});

test('fresh theme defaults follow the OS on homepage and static readers while explicit manual choice survives reload',async({browser})=>{
 for(const colorScheme of ['light','dark']){
  const context=await browser.newContext({colorScheme});try{const page=await context.newPage();for(const path of ['./','./posts/rain/zh-CN.html']){await page.goto(new URL(path,'http://127.0.0.1:4174/xiwu-cloud-notes/').href);await expect(page.locator('html')).toHaveAttribute('data-theme-mode','system');await expect(page.locator('html')).toHaveAttribute('data-theme',colorScheme);expect(await page.evaluate(()=>localStorage.getItem('little-corner-theme'))).toBeNull();}
  const next=colorScheme==='light'?'dark':'light';await page.emulateMedia({colorScheme:next});await expect(page.locator('html')).toHaveAttribute('data-theme',next);await page.locator('.theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme-mode',colorScheme);await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme',colorScheme);await page.emulateMedia({colorScheme:next});await expect(page.locator('html')).toHaveAttribute('data-theme',colorScheme);
  }finally{await context.close();}
 }
});

test('this patch contains no read-later, saved position, font settings or progress features',async({page})=>{
 const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));await page.setViewportSize({width:390,height:844});await page.goto('./?lang=zh-CN');
 await expect(page.locator('.reading-home-actions,.card-resume,.card-save,.reading-library-trigger')).toHaveCount(0);await page.locator('[data-essay-id="rain"] .card-button').click();await longProse(page,'#dialog-body');await page.locator('#interest-dialog').evaluate(d=>d.scrollTop=1400);
 await expect(page.locator('.reading-settings-trigger,.reading-resume,.reader-progress,.reader-save')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('xiwu-reading-state-v1'))).toBeNull();expect(requests.some(path=>/\/(reading-state|reading-model|home-shell)\.js$/.test(path))).toBe(false);
 await page.route('**/reader.js*',r=>r.fulfill({contentType:'application/javascript',body:'/* optional directory enhancement unavailable */'}));await page.goto('./posts/rain/zh-CN.html');await expect(page.locator('.static-layout>.reader-toc a')).toHaveCount(3);await page.locator('.reader-toc a').nth(1).click();expect(new URL(page.url()).hash).toBe('#section-2');await expect(page.locator('.article-body')).toContainText('星河');
});
