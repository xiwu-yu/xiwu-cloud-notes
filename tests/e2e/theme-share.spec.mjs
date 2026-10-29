import {test,expect,noOverflow,prepareClipboard,tabKey} from './helpers.mjs';
import {readFile} from 'node:fs/promises';
const themeKey = 'little-corner-theme';
const settings = async(page,inReader=false) => {
  await page.locator(inReader ? '#interest-dialog .transparency-toggle' : '.site-header .transparency-toggle').click();
  await expect(page.locator('#theme-choice')).toBeVisible();
};
const done = async page => {
  await page.locator('#glass-settings-close').click();
  await expect(page.locator('#glass-settings')).not.toBeVisible();
};
const share = async page => {
  await page.locator('#essay-share-card').click();
  await expect(page.locator('[data-share-download]')).toBeVisible();
};

test('system theme follows live changes, manual choice overrides it, and automatic mode is restorable and persistent',async({page})=>{
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode','system');
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode','light');
  await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await settings(page);await page.locator('#theme-choice').selectOption('system');await done(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme-mode','system');
});

test('theme preferences synchronize across tabs, static articles, modal and all four translations',async({page,context})=>{
  await page.goto('./?post=cloud&lang=zh-CN');
  const other=await context.newPage();await other.goto('http://127.0.0.1:4174/xiwu-cloud-notes/posts/cloud/en.html');
  await settings(page,true);await page.locator('#theme-choice').selectOption('dark');await done(page);
  await expect(other.locator('html')).toHaveAttribute('data-theme','dark');
  for(const lang of ['zh-CN','zh-TW','en','ja']) {
    await page.locator('#dialog-language-select').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await settings(page,true);await expect(page.locator('#theme-choice')).toHaveValue('dark');await done(page);
  }
  await other.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await other.locator('.transparency-toggle').click();await other.locator('#theme-choice').selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode','system');
  await other.close();
});

test('legacy manual preferences remain manual, invalid values follow system, blocked storage keeps the current page usable',async({browser})=>{
  for(const preference of ['dark','invalid','blocked']) {
    const context=await browser.newContext({colorScheme:'light'});
    await context.addInitScript(({key,preference})=>{
      if(preference==='blocked')Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw Error('blocked');};
      else localStorage.setItem(key,preference);
    },{key:themeKey,preference});
    const page=await context.newPage();await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
    await expect(page.locator('html')).toHaveAttribute('data-theme',preference==='dark'?'dark':'light');
    if(preference==='blocked'){
      await page.locator('.theme-toggle').click();await page.emulateMedia({colorScheme:'dark'});await page.emulateMedia({colorScheme:'light'});
      await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
      await settings(page);await page.locator('#theme-choice').selectOption('system');await done(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme','light');
    }
    await context.close();
  }
});

test('cloud refresh preserves automatic mode and subsequent OS changes',async({page})=>{
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.goto('./?post=cloud&lang=en');
  const reloaded=page.waitForEvent('domcontentloaded');await page.locator('.dialog-home-refresh').click();await reloaded;
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode','system');
  expect(new URL(page.url()).searchParams.has('post')).toBe(false);
  await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

for(const width of [320,390,768,1440])test(`${width}px sharing and glass article navigation fit four languages and both themes`,async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  const failures=[];page.on('pageerror',error=>failures.push(error.message));
  for(const lang of ['zh-CN','zh-TW','en','ja']){
    await page.goto('./?post=cloud&lang='+lang);
    for(const theme of ['light','dark']){
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.dialog-theme-toggle').click();
      const copy=page.locator('#essay-share'),card=page.locator('#essay-share-card');
      await card.scrollIntoViewIfNeeded();
      const left=await copy.boundingBox(),right=await card.boundingBox();
      expect(right.x).toBeGreaterThanOrEqual(left.x+left.width-1);expect(Math.abs(right.y-left.y)).toBeLessThan(1);
      for(const selector of ['#essay-prev','#essay-next','#essay-share','#essay-share-card']){
        expect(await page.locator(selector).evaluate(el=>el.classList.contains('glass-surface'))).toBe(true);
        expect((await page.locator(selector).boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      await share(page);
      await expect(page.locator('#article-share-panel')).toHaveAttribute('lang',lang);
      expect(await page.locator('#article-share-panel').evaluate(el=>el.matches(':modal') && el.parentElement.id==='interest-dialog')).toBe(true);
      const size=await page.locator('[data-share-preview]').evaluate(img=>[img.naturalWidth,img.naturalHeight]);
      expect(size).toEqual([900,1200]);
      expect(await page.locator('#article-share-url').inputValue()).toBe(`https://cloud.xiwu.space/posts/cloud/${lang}.html`);
      await noOverflow(page,width);
      expect(await page.locator('#article-share-panel').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');await expect(page.locator('#essay-share-card')).toBeFocused();
      await expect(page.locator('#interest-dialog')).toBeVisible();
    }
  }
  expect(failures).toEqual([]);
});

test('share card downloads a real PNG and copying links keeps explicit actual language',async({page,context,browserName},testInfo)=>{
  await prepareClipboard(context,browserName);await page.goto('./?post=cloud&lang=en');await share(page);
  const saved=page.waitForEvent('download');await page.locator('[data-share-download]').click();const download=await saved;
  expect(download.suggestedFilename()).toBe('cloud-en-share.png');
  const path=testInfo.outputPath(download.suggestedFilename());await download.saveAs(path);const bytes=await readFile(path);
  expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(bytes.readUInt32BE(16)).toBe(900);expect(bytes.readUInt32BE(20)).toBe(await page.locator('[data-share-preview]').evaluate(img=>img.naturalHeight));
  expect(bytes.readUInt32BE(20)).toBe(1200);
  await page.locator('[data-share-copy]').click();
  await expect(page.locator('[data-share-status]')).toContainText(browserName==='chromium'?'Link copied':'');
  if(browserName==='chromium')expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('https://cloud.xiwu.space/posts/cloud/en.html');
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await page.goto('./?post=original&lang=en');await share(page);
  await expect(page.locator('#article-share-panel')).toHaveAttribute('lang','en');
  await expect(page.locator('#article-share-panel')).toHaveAttribute('data-article-lang','zh-CN');
  await expect(page.locator('#article-share-url')).toHaveValue('https://cloud.xiwu.space/posts/original/zh-CN.html');
});

test('static readers share without homepage data and preserve root/subpath canonical links',async({page})=>{
  for(const root of ['/','/xiwu-cloud-notes/'])for(const lang of ['zh-CN','zh-TW','en','ja']){
    await page.goto('http://127.0.0.1:4174'+root+`posts/cloud/${lang}.html`);
    expect(await page.evaluate(()=>typeof window.siteProfile)).toBe('undefined');
    const canonical=await page.locator('link[rel=canonical]').getAttribute('href');
    await page.locator('[data-static-share]').click();await expect(page.locator('[data-share-download]')).toBeVisible();
    await expect(page.locator('#article-share-url')).toHaveValue(canonical);
    await page.keyboard.press('Escape');await expect(page.locator('[data-static-share]')).toBeFocused();
    for(const link of await page.locator('.static-pagination>a').all())expect(await link.getAttribute('class')).toContain('glass-surface');
  }
});

test('portrait share cards keep 900×1200 dimensions and long text remains within the content area',async({page})=>{
  await page.addInitScript(()=>{
    window.shareTextLayout=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){
      window.shareTextLayout.push({text,x,y,width:this.measureText(text).width,height:this.canvas.height});
      return original.call(this,text,x,y,...args);
    };
  });
  await page.goto('./?post=cloud&lang=zh-CN');
  await page.evaluate(()=>{window.siteProfile.localized['zh-CN'].interests.find(item=>item.id==='cloud').description='把经历过的难处，和想对家人、朋友说的话写下来。也希望这些努力能被看见。';});
  await share(page);
  expect(await page.evaluate(()=>shareTextLayout.filter(line=>/^[，。！？、；：…,.!?;:）〉》」』】”’]+$/u.test(line.text)))).toEqual([]);
  const shortHeight=await page.locator('[data-share-preview]').evaluate(img=>img.naturalHeight);
  expect(shortHeight).toBe(1200);
  const shortRows=await page.evaluate(()=>shareTextLayout.length);
  await page.keyboard.press('Escape');await expect(page.locator('#essay-share-card')).toBeFocused();
  await page.evaluate(()=>{
    window.shareTextLayout=[];
    const item=window.siteProfile.localized['zh-CN'].interests.find(item=>item.id==='cloud');
    item.title='更长的标题与云朵 🍥 '.repeat(24);
    item.description='A longer summary with words and 中文，保留作者表达。'.repeat(30);
  });
  await share(page);
  const height=await page.locator('[data-share-preview]').evaluate(img=>img.naturalHeight);
  expect(height).toBe(1200);
  expect(await page.evaluate(()=>shareTextLayout.length)).toBeGreaterThan(shortRows);
  const outside=await page.evaluate(()=>shareTextLayout.filter(line=>line.x<40||line.x+line.width>837||line.y<40||line.y>line.height-30));
  expect(outside).toEqual([]);
});

test('share failure keeps the original link and close action; browser history also closes nested sharing',async({page})=>{
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
  await page.goto('./');await page.locator('[data-essay-id="cloud"] .card-button').click();
  await page.locator('#essay-share-card').click();
  await expect(page.locator('[data-share-status]')).toContainText('图片生成失败');
  await expect(page.locator('[data-share-copy]')).toBeEnabled();
  await expect(page.locator('#article-share-url')).toHaveValue('https://cloud.xiwu.space/posts/cloud/zh-CN.html');
  await page.goBack();await expect(page.locator('#interest-dialog')).not.toBeVisible();await expect(page.locator('#article-share-panel')).not.toBeVisible();
  await page.goForward();await expect(page.locator('#interest-dialog')).toBeVisible();
});

test('music iframe survives sharing, theme changes and panel closure without a reload',async({page})=>{
  let loads=0;await page.route('https://music.163.com/**outchain/player?*',r=>{loads++;return r.fulfill({contentType:'text/html',body:'<!doctype html><p>Official lifecycle fixture</p>'});});
  await page.goto('./');await page.locator('#music-toggle').click();
  await page.evaluate(()=>{window.savedMusic=document.querySelector('#music-frame');window.savedWindow=savedMusic.contentWindow;window.savedSrc=savedMusic.src;});
  await page.locator('#music-close').click();await page.locator('.card-button').first().click();await share(page);await page.keyboard.press('Escape');
  await page.locator('.dialog-theme-toggle').click();await page.keyboard.press('Escape');await page.locator('#music-toggle').click();
  expect(loads).toBe(1);expect(await page.evaluate(()=>savedMusic===document.querySelector('#music-frame')&&savedWindow===savedMusic.contentWindow&&savedSrc===savedMusic.src)).toBe(true);
});

test('without JavaScript static reading, titled article navigation and system dark mode still work',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,colorScheme:'dark',viewport:{width:320,height:900}});
  const page=await context.newPage();await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/posts/cloud/en.html');
  await expect(page.locator('.article-body')).toContainText('English body');await expect(page.locator('.static-pagination a').first()).toBeVisible();
  await expect(page.locator('[data-static-share]')).not.toBeVisible();
  expect(await page.locator('html').evaluate(el=>getComputedStyle(el).colorScheme)).toBe('dark');
  await noOverflow(page,320);await context.close();
});

test('keyboard, reduced motion, 200% text and failed clipboard keep sharing and system theme reachable',async({page,browserName})=>{
  await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('blocked');}}});});
  await page.goto('./?post=cloud&lang=en');
  await page.locator('#essay-share-card').focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-share-close]')).toBeFocused();await expect(page.locator('[data-share-download]')).toBeVisible();
  await page.addStyleTag({content:'#article-share-panel :is(p,button,a,label,input,h2){font-size:28px}'});
  await page.locator('[data-share-copy]').scrollIntoViewIfNeeded();await page.locator('[data-share-copy]').click();
  await expect(page.locator('[data-share-status]')).toContainText('https://cloud.xiwu.space/posts/cloud/en.html');
  await noOverflow(page,320);expect(await page.locator('#article-share-panel').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');await expect(page.locator('#essay-share-card')).toBeFocused();
  await settings(page,true);await page.locator('#theme-choice').focus();
  await expect(page.locator('#theme-choice')).toBeFocused();
  // 系统原生菜单会消费 Enter/Tab/Esc，不能假定各 OS 的弹出状态相同。
  // 用原生表单接口核对选值，再单独验证闭合选择器的键盘导航和宿主 Esc。
  await page.locator('#theme-choice').selectOption('dark');
  await expect(page.locator('#theme-choice')).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode','dark');
  await page.keyboard.press(tabKey(browserName));
  await expect(page.locator('#theme-choice')).not.toBeFocused();
  expect(await page.locator('#glass-settings').evaluate(panel=>panel.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#glass-settings')).not.toBeVisible();
  await expect(page.locator('#interest-dialog .transparency-toggle')).toBeFocused();
});
