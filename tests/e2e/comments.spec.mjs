import {test,expect} from '@playwright/test';
import {commentsMarkup} from '../../scripts/comments.mjs';
import ui from '../../content/ui.json' with {type:'json'};
import {mkdir} from 'node:fs/promises';
import {noOverflow} from './helpers.mjs';
const evidenceDir=(process.env.EVIDENCE_DIR || 'work')+'/comments';
const config={repo:'xiwu-yu/xiwu-cloud-notes',repoId:'R_kgDOVU6AUw',category:'文章评论',categoryId:'DIC_test'};
const client=`(()=>{const s=document.currentScript;const root=s.parentElement;const f=document.createElement('iframe');f.className='giscus-frame';f.loading=s.dataset.loading;f.src='https://giscus.app/en/widget?term='+encodeURIComponent(s.dataset.term)+'&theme='+s.dataset.theme;root.append(f);})();`;
const widget=`<!doctype html><html><meta charset="utf-8"><body><p>Giscus lifecycle fixture — no public comments are posted.</p><script>window.updates=[];addEventListener('message',e=>{if(e.data?.giscus?.setConfig){updates.push(e.data.giscus.setConfig);document.documentElement.lang=e.data.giscus.setConfig.lang;}});</script></body></html>`;
async function connect(context,{fail=false,slow=false}={}){
  const counts={scripts:0,frames:0};
  await context.route(/\/profile\.js(?:\?|$)/,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`\nwindow.siteProfile.comments=${JSON.stringify(config)};`});});
  await context.route(/\/posts\/[^/]+\/([^/]+)\.html(?:\?|$)/,async route=>{
    const response=await route.fetch(),lang=new URL(route.request().url()).pathname.match(/\/([^/]+)\.html$/)[1];
    await route.fulfill({response,body:(await response.text()).replace('<nav class="static-pagination"',commentsMarkup('cloud',config,ui[lang])+'<nav class="static-pagination"')});
  });
  await context.route('https://giscus.app/client.js',async route=>{counts.scripts++;if(fail)return route.abort();if(slow)await new Promise(r=>setTimeout(r,14000));return route.fulfill({contentType:'application/javascript',body:client});});
  await context.route('https://giscus.app/**/widget?*',async route=>{counts.frames++;await route.fulfill({contentType:'text/html',body:widget});});
  return counts;
}
test('comments are opt-in, share the article ID across language, theme and history without reloading the iframe',async({page,context})=>{
  const counts=await connect(context);await page.goto('./?post=cloud&lang=zh-CN');
  expect(counts.scripts).toBe(0);await expect(page.locator('.comments-load')).toBeVisible();
  await page.locator('.comments-load').click();await expect(page.locator('.giscus-frame')).toBeVisible();
  expect(counts.scripts).toBe(1);await expect.poll(()=>counts.frames).toBe(1);
  await expect(page.locator('.giscus-frame')).toHaveAttribute('loading','lazy');
  const attrs=await page.locator('.comments-embed script').evaluate(s=>({...s.dataset}));
  expect(attrs).toMatchObject({mapping:'specific',term:'xiwu-article:cloud',strict:'1',loading:'lazy',reactionsEnabled:'0'});
  await page.evaluate(()=>{window.commentFrame=document.querySelector('.giscus-frame');window.musicFrame=document.querySelector('#music-frame');});
  for(const lang of ['en','zh-TW','ja','zh-CN']){
    await page.locator('#dialog-language-select').selectOption(lang);
    await expect(page.locator('.article-comments h2')).toHaveText(ui[lang]['comments.title']);
    await expect.poll(()=>page.frameLocator('.giscus-frame').locator('html').getAttribute('lang')).toBe(lang);
  }
  await page.locator('.dialog-theme-toggle').click();
  await expect.poll(()=>page.frameLocator('.giscus-frame').locator('html').evaluate(()=>updates.at(-1).theme)).toBe('dark');
  expect(await page.evaluate(()=>window.commentFrame===document.querySelector('.giscus-frame')&&window.musicFrame===document.querySelector('#music-frame'))).toBe(true);
  await page.locator('#essay-next').click();
  await expect.poll(()=>page.frameLocator('.giscus-frame').locator('html').evaluate(()=>updates.at(-1).term)).not.toBe('xiwu-article:cloud');
  await page.goBack();await expect.poll(()=>page.frameLocator('.giscus-frame').locator('html').evaluate(()=>updates.at(-1).term)).toBe('xiwu-article:cloud');
  expect(counts.scripts).toBe(1);await expect.poll(()=>counts.frames).toBe(1);
});
for(const width of [320,390,768,1440])test(`${width}px comments work in static readers with four languages and both themes`,async({page,context})=>{
  const counts=await connect(context);await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  for(const lang of ['zh-CN','zh-TW','en','ja']){
    await page.goto(`./posts/cloud/${lang}.html`);
    if(lang==='zh-CN' && [390,1440].includes(width)) {
      await mkdir(evidenceDir,{recursive:true});
      for(const theme of ['light','dark']) {
        if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
        await page.locator('.article-comments').scrollIntoViewIfNeeded();
        await page.screenshot({path:`${evidenceDir}/entry-${width}-${theme}.png`});
      }
    }
    await page.locator('.comments-load').focus();await page.keyboard.press('Enter');
    await expect(page.locator('.giscus-frame')).toBeVisible();
    for(const theme of ['light','dark']){
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
      await expect.poll(()=>page.frameLocator('.giscus-frame').locator('html').evaluate(()=>updates.at(-1).theme)).toBe(theme);
      await noOverflow(page,width);
      if(lang==='zh-CN' && [390,1440].includes(width)) {
        await mkdir(evidenceDir,{recursive:true});
        await page.locator('.article-comments').scrollIntoViewIfNeeded();
        await page.screenshot({path:`${evidenceDir}/${width}-${theme}.png`});
      }
    }
  }
  expect(counts.scripts).toBe(4);
});
test('service failure leaves a real GitHub fallback and an explicit retry',async({page,context})=>{
  await connect(context,{fail:true});await page.goto('./?post=rain&lang=zh-CN');await page.locator('.comments-load').click();
  await expect(page.locator('.comments-status')).toHaveText(ui['zh-CN']['comments.error']);
  await expect(page.locator('.comments-load')).toHaveText(ui['zh-CN']['comments.retry']);
  await expect(page.locator('.comments-fallback a')).toHaveAttribute('href',/github.com\/xiwu-yu\/xiwu-cloud-notes\/discussions.*rain/);
});
test('slow loading gives a bounded host hint without pretending that a discussion is empty',async({page,context})=>{
  await page.clock.install();await connect(context,{slow:true});await page.goto('./?post=rain&lang=zh-CN');
  await page.locator('.comments-load').click();await page.clock.runFor(12000);
  await expect(page.locator('.comments-status')).toHaveText(ui['zh-CN']['comments.waiting']);
});
test('disabled comments make no third-party requests; no-JS static readers keep the GitHub link',async({page,browser})=>{
  let requests=0;page.on('request',r=>{if(r.url().includes('giscus.app'))requests++;});await page.goto('./?post=cloud');
  await expect(page.locator('#dialog-comments')).toBeHidden();expect(requests).toBe(0);
  const context=await browser.newContext({javaScriptEnabled:false});try{
    await connect(context);const other=await context.newPage();await other.goto(new URL('posts/cloud/en.html',test.info().project.use.baseURL).href);
    await expect(other.locator('.comments-fallback a')).toBeVisible();await expect(other.locator('.comments-load')).toBeHidden();
    await expect(other.locator('.article-body')).toBeVisible();
  }finally{await context.close();}
});

test('a failed official initialization keeps retry available after the waiting deadline',async({page,context})=>{
  await page.clock.install();await connect(context);
  await context.route('https://giscus.app/client.js',r=>r.fulfill({contentType:'application/javascript',body:'/* initialization unavailable */'}));
  await page.goto('./?post=rain');await page.locator('.comments-load').click();
  await expect(page.locator('.comments-status')).toHaveText(ui['zh-CN']['comments.error']);
  await page.clock.runFor(13000);await expect(page.locator('.comments-load')).toBeVisible();
  await expect(page.locator('.comments-load')).toHaveText(ui['zh-CN']['comments.retry']);
});
test('foreign-origin or wrong-window messages cannot report a fake comment failure',async({page,context})=>{
  await connect(context);await page.goto('./?post=rain');await page.locator('.comments-load').click();
  await expect(page.locator('.giscus-frame')).toBeVisible();await expect(page.locator('.comments-status')).toBeHidden();
  await page.evaluate(()=>{
    dispatchEvent(new MessageEvent('message',{origin:'https://evil.test',data:{giscus:{error:'fake'}},source:document.querySelector('.giscus-frame').contentWindow}));
    dispatchEvent(new MessageEvent('message',{origin:'https://giscus.app',data:{giscus:{error:'fake'}},source:window}));
  });
  await expect(page.locator('.comments-status')).toBeHidden();
});

test('system theme follows the OS and a language change sends only one final official config',async({page,context})=>{
  await connect(context);await page.emulateMedia({colorScheme:'light'});await page.goto('./?post=cloud&lang=zh-CN');
  await page.locator('.comments-load').click();
  const frame=page.frameLocator('.giscus-frame');
  await expect.poll(()=>frame.locator('html').evaluate(()=>updates.length)).toBeGreaterThan(0);
  await page.emulateMedia({colorScheme:'dark'});
  await expect.poll(()=>frame.locator('html').evaluate(()=>updates.at(-1).theme)).toBe('dark');
  let count=await frame.locator('html').evaluate(()=>updates.length);
  for(const lang of ['en','zh-TW','ja','zh-CN']){
    await page.locator('#dialog-language-select').selectOption(lang);
    await expect.poll(()=>frame.locator('html').evaluate(()=>updates.length)).toBe(count+1);
    const config=await frame.locator('html').evaluate(()=>updates.at(-1));
    expect(config).toMatchObject({theme:'dark',lang,term:'xiwu-article:cloud'});
    expect(config.backLink).toContain(`/posts/cloud/${lang}.html`);
    count++;
  }
});
