import {test,expect} from '@playwright/test';
import worker from '../../workers/likes/index.mjs';
import {database} from '../likes-db.mjs';
import {noOverflow} from './helpers.mjs';

const endpoint='https://likes.example.test';
async function connect(context,env,hook) {
  await context.route(/\/profile\.js(?:\?|$)/,async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+`\nwindow.siteProfile.likes=${JSON.stringify(endpoint)};`});
  });
  await context.route(/\/posts\/[^/]+\/[^/]+\.html(?:\?|$)/,async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text()).replace('data-api-url=""',`data-api-url="${endpoint}"`)});
  });
  await context.route(endpoint+'/**',async route=>{
    if(hook&&await hook(route))return;
    const r=route.request();
    const response=await worker.fetch(new Request(r.url(),{method:r.method(),headers:{...r.headers(),'CF-Connecting-IP':'192.0.2.1'},...(['GET','OPTIONS'].includes(r.method())?{}:{body:r.postData()})}),env);
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  });
}
const setup=()=>({DB:database(),VISITOR_SECRET:'test-only-not-a-deployment-secret-value',ALLOWED_ORIGINS:'http://127.0.0.1:4174',ARTICLE_IDS:'rain,cloud,original'});
const button=page=>page.locator('.like-button');

test('anonymous shared likes survive refresh, translations and independent readers; unlike is real and articles remain separate',async({page,context,browser})=>{
  const env=setup(),other=await browser.newContext();
  try{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await connect(context,env);await connect(other,env);
    await page.goto('./?post=rain&lang=zh-CN');
    await expect(button(page)).toBeEnabled();await expect(page.locator('.like-count')).toHaveText('0');
    await button(page).focus();await page.keyboard.press('Space');
    await expect(button(page)).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.like-count')).toHaveText('1');
    await page.locator('#dialog-language-select').selectOption('en');
    await expect(button(page)).toContainText('Liked');
    await page.reload();await expect(button(page)).toHaveAttribute('aria-pressed','true');
    const second=await other.newPage();await second.goto('http://127.0.0.1:4174/posts/rain/ja.html');
    await expect(second.locator('.like-count')).toHaveText('1');
    await expect(button(second)).toHaveAttribute('aria-pressed','false');
    await button(second).click();await expect(second.locator('.like-count')).toHaveText('2');
    await page.goto('./posts/rain/en.html');await expect(page.locator('.like-count')).toHaveText('2');
    await button(page).click();await expect(page.locator('.like-count')).toHaveText('1');
    await page.reload();await expect(button(page)).toHaveAttribute('aria-pressed','false');
    await page.goto('./posts/cloud/en.html');await expect(page.locator('.like-count')).toHaveText('0');
    expect(errors).toEqual([]);
  }finally{await other.close();env.DB.close();}
});

test('same-browser tabs synchronize server-confirmed state without creating another identity',async({page,context})=>{
  const env=setup();
  try{
    await connect(context,env);await page.goto('./posts/rain/zh-CN.html');await expect(button(page)).toBeEnabled();
    const second=await context.newPage();await second.goto('http://127.0.0.1:4174/posts/rain/en.html');await expect(button(second)).toBeEnabled();
    await button(page).click();await expect(button(second)).toHaveAttribute('aria-pressed','true');
    await expect(second.locator('.like-count')).toHaveText('1');
    await button(second).click();await expect(button(page)).toHaveAttribute('aria-pressed','false');
    await expect(page.locator('.like-count')).toHaveText('0');
  }finally{env.DB.close();}
});

test('pending writes stay single, language changes do not invent counts or reload the music iframe',async({page,context})=>{
  const env=setup();let release;
  const waiting=new Promise(resolve=>release=resolve);
  let writes=0;
  try{
    await connect(context,env);
    await page.route(endpoint+'/**',async route=>{if(route.request().method()==='PUT'){writes++;await waiting;}await route.fallback();});
    await page.route(/^https:\/\/music\.163\.com\//,route=>route.fulfill({contentType:'text/html',body:'<p>Official player lifecycle fixture</p>'}));
    await page.goto('./?post=rain&lang=zh-CN');await expect(button(page)).toBeEnabled();
    const seen=page.waitForRequest(request=>request.url().startsWith(endpoint)&&request.method()==='PUT');
    await button(page).focus();await page.keyboard.press('Space');await seen;
    await expect(button(page)).toBeDisabled();await expect(page.locator('.like-count')).toHaveText('0');
    await page.locator('#dialog-language-select').selectOption('ja');await expect(button(page)).toBeDisabled();
    release();await expect(page.locator('.like-count')).toHaveText('1');expect(writes).toBe(1);
    // 下面在同一文档加载音乐并切换文章，检查稳定性，不以模拟文档证明真实可播。
    await page.locator('.dialog-close').click();await page.locator('#music-toggle').click();
    await page.evaluate(()=>{window.likeFrame=document.querySelector('#music-frame');window.likeWindow=window.likeFrame.contentWindow;});
    await page.locator('[data-essay-id="rain"] .card-button').click();await page.locator('#dialog-language-select').selectOption('en');
    expect(await page.evaluate(()=>window.likeFrame===document.querySelector('#music-frame')&&window.likeWindow===window.likeFrame.contentWindow)).toBe(true);
  }finally{release?.();env.DB.close();}
});

test('four languages and both themes keep the like control reachable at 320, 390, 768 and 1440px',async({page,context})=>{
  const env=setup();
  try{
    await connect(context,env);
    for(const width of [320,390,768,1440])for(const lang of ['zh-CN','zh-TW','en','ja'])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:900});await page.addInitScript(theme=>localStorage.setItem('xiwu-theme',theme),theme);
      await page.goto(`./posts/rain/${lang}.html`);await expect(button(page)).toBeEnabled();await button(page).scrollIntoViewIfNeeded();
      const box=await button(page).boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);await noOverflow(page,width);
      expect(await button(page).innerText()).not.toContain('undefined');
    }
  }finally{env.DB.close();}
});

test('unconfigured service makes no likes requests; blocked storage explains why liking is unavailable',async({page,context})=>{
  let requests=0;page.on('request',r=>{if(r.url().startsWith(endpoint))requests++;});
  await page.goto('./?post=rain&lang=zh-CN');await expect(page.locator('#dialog-like')).toBeHidden();expect(requests).toBe(0);
  const env=setup();
  try{
    await connect(context,env);
    await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('blocked');};Storage.prototype.setItem=function(){throw new Error('blocked');};});
    await page.goto('./posts/rain/zh-CN.html');await expect(button(page)).toBeDisabled();
    await expect(page.locator('.like-status')).toContainText('无法保存');expect(requests).toBe(0);
  }finally{env.DB.close();}
});

test('backend failure, rate limiting and malformed responses never invent totals; retry recovers real state',async({page,context})=>{
  const env=setup();let failure=503;
  try{
    await connect(context,env,async route=>{
      if(!failure||route.request().method()==='OPTIONS')return false;
      await route.fulfill({status:failure,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4174'},json:{error:'unavailable'}});return true;
    });
    await page.goto('./posts/rain/en.html');await expect(page.locator('.like-status')).toContainText('unavailable');
    await expect(page.locator('.like-count')).toHaveText('—');await expect(button(page)).toBeDisabled();
    failure=0;await page.locator('.like-retry').click();await expect(page.locator('.like-count')).toHaveText('0');
    failure=429;await button(page).click();await expect(page.locator('.like-status')).toContainText('Too many');
    await expect(page.locator('.like-count')).toHaveText('0');await expect(button(page)).toHaveAttribute('aria-pressed','false');
    failure=0;await page.locator('.like-retry').click();await expect(button(page)).toBeEnabled();await button(page).click();
    await expect(page.locator('.like-count')).toHaveText('1');
  }finally{env.DB.close();}
});

test('an eight-second timeout remains unknown; invalid server counts are rejected and no-JS reading stays intact',async({page,context,browser})=>{
  const env=setup();let mode='slow';
  try{
    await connect(context,env,async route=>{
      if(route.request().method()==='OPTIONS')return false;
      if(mode==='slow'){await new Promise(resolve=>setTimeout(resolve,900));await route.abort();return true;}
      await route.fulfill({headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4174'},json:{id:'rain',count:-3,liked:true}});return true;
    });
    await page.clock.install();await page.goto('./posts/rain/en.html');
    await page.clock.fastForward(8100);await expect(page.locator('.like-status')).toContainText('unavailable');
    await expect(page.locator('.like-count')).toHaveText('—');
    mode='invalid';await page.locator('.like-retry').click();await expect(page.locator('.like-status')).toContainText('unavailable');
    await expect(page.locator('.like-count')).toHaveText('—');
    const plain=await browser.newContext({javaScriptEnabled:false});
    try{const p=await plain.newPage();await p.goto('http://127.0.0.1:4174/posts/rain/en.html');await expect(p.locator('#dialog-body')).not.toBeEmpty();await expect(p.locator('[data-article-like]')).toBeHidden();}finally{await plain.close();}
  }finally{env.DB.close();}
});
