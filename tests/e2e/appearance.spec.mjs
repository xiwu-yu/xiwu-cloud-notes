import {readFile} from 'node:fs/promises';
import {test,expect,noOverflow,tabKey} from './helpers.mjs';
const ui=JSON.parse(await readFile(new URL('../../content/ui.json',import.meta.url),'utf8'));
const key='xiwu-glass-appearance';
const open=async page=>{await page.locator('.site-header .transparency-toggle').click();await expect(page.locator('#glass-settings')).toBeVisible();};
const close=async page=>{await page.locator('#glass-settings-close').click();await expect(page.locator('html')).toHaveAttribute('data-appearance-open','false');};
const clarity=async(page,value)=>{await page.locator('#glass-clarity').fill(String(value));await page.locator('#glass-clarity').dispatchEvent('change');await expect(page.locator('html')).toHaveAttribute('data-glass-clarity',String(value));};

for(const width of [320,390,768,1280,1440])test(`${width}px shared glass settings, three material ranges, four languages and both themes`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});await page.goto('./');
  for(const [lang,labels] of Object.entries(ui)) {
    await page.selectOption('#language-select',lang);
    for(const theme of ['light','dark']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
      await open(page);
      await expect(page.locator('#glass-settings-title')).toHaveText(labels['appearance.open']);
      await expect(page.getByRole('switch')).toHaveAccessibleName(labels['appearance.enabled']);
      const box=await page.locator('#glass-settings').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(900);
      await page.evaluate(()=>window.keptCard=document.querySelector('.card-button'));
      let previous;
      for(const value of [0,55,100]) {
        await clarity(page,value);
        const state=await page.evaluate(()=>{
          const root=getComputedStyle(document.documentElement),card=document.querySelector('.card-button');
          return {alpha:['control','content','media'].map(kind=>Number(root.getPropertyValue(`--glass-${kind}-alpha`))),same:card===window.keptCard,opacity:getComputedStyle(card).opacity,reader:getComputedStyle(document.querySelector('#interest-dialog')).backgroundColor};
        });
        expect(state.same).toBe(true);expect(state.opacity).toBe('1');
        expect(state.alpha[1]).toBeGreaterThan(state.alpha[0]);expect(state.alpha[0]).toBeGreaterThan(state.alpha[2]);
        if(previous)for(let i=0;i<3;i++)expect(state.alpha[i]).toBeLessThan(previous[i]);previous=state.alpha;
      }
      await page.locator('#glass-enabled').uncheck();
      await expect(page.locator('#glass-adjustments')).toBeHidden();
      await expect(page.locator('html')).toHaveAttribute('data-glass','off');
      await page.locator('#glass-enabled').check();await expect(page.locator('#glass-clarity')).toHaveValue('100');
      for(const preset of [20,55,90]) {
        await page.locator(`[data-glass-preset="${preset}"]`).click();
        await expect(page.locator('#glass-clarity')).toHaveValue(String(preset));
        await expect(page.locator(`[data-glass-preset="${preset}"]`)).toHaveAttribute('aria-pressed','true');
      }
      await page.locator('#glass-reset').click();await expect(page.locator('#glass-clarity')).toHaveValue('55');
      for(const selector of ['#glass-enabled','#glass-clarity','#glass-settings-close','#glass-reset'])expect((await page.locator(selector).boundingBox()).height).toBeGreaterThanOrEqual(44);
      await close(page);await expect(page.locator('.site-header .transparency-toggle')).toBeFocused();await noOverflow(page,width);
    }
  }
});

test('settings are a native top-layer dialog inside the reader; Esc closes only settings and restores focus',async({page})=>{
  await page.goto('./');await page.locator('.card-button').first().click();
  const reader=page.locator('#interest-dialog');await page.locator('#interest-dialog .transparency-toggle').click();
  expect(await page.locator('#glass-settings').evaluate(el=>el.matches(':modal')&&el.parentElement.id==='interest-dialog')).toBe(true);
  await clarity(page,73);await page.keyboard.press('Tab');await page.keyboard.press('Escape');
  await expect(reader).toBeVisible();await expect(page.locator('#glass-settings')).not.toBeVisible();
  await expect(page.locator('#interest-dialog .transparency-toggle')).toBeFocused();
  await page.locator('.dialog-theme-toggle').click();await page.keyboard.press('Escape');
  await expect(page.locator('.card-button').first()).toBeFocused();
  await page.locator('.card-button').first().click();
  await page.locator('#interest-dialog .transparency-toggle').click();
  await page.goBack();
  await expect(reader).not.toBeVisible();await expect(page.locator('#glass-settings')).not.toBeVisible();
  await expect(page.locator('.card-button').first()).toBeFocused();
  await page.goForward();await expect(reader).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-glass-clarity','73');
});

test('open settings protect idle navigation; closing restarts its complete two-second deadline',async({page})=>{
  await page.clock.install();await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.evaluate(()=>scrollTo({top:700,behavior:'instant'}));await page.clock.runFor(50);
  await open(page);await page.mouse.move(1,850);await page.clock.runFor(10000);
  await expect(page.locator('.site-header')).not.toHaveClass(/nav-hidden/);
  await close(page);await page.locator('#archive-search').evaluate(el=>el.focus({preventScroll:true}));
  await page.clock.runFor(50);await page.clock.runFor(1850);await expect(page.locator('.site-header')).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(100);await expect(page.locator('.site-header')).toHaveClass(/nav-hidden/);
});

test('one preference persists across refresh, static articles, tabs and legacy migration',async({context,page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem('appearance-test-init')){localStorage.setItem('xiwu-reduce-transparency','true');localStorage.setItem('appearance-test-init','1');}});
  await page.goto('./');await expect(page.locator('html')).toHaveAttribute('data-glass','off');
  await open(page);await page.locator('#glass-enabled').check();await clarity(page,82);await close(page);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-glass-clarity','82');
  const other=await context.newPage();await other.goto('http://127.0.0.1:4174/xiwu-cloud-notes/posts/cloud/en.html');
  await expect(other.locator('html')).toHaveAttribute('data-glass-clarity','82');await other.locator('.transparency-toggle').click();
  await expect(other.locator('#glass-settings-title')).toHaveText(ui.en['appearance.open']);
  await other.locator('#glass-enabled').uncheck();await expect(page.locator('html')).toHaveAttribute('data-glass','off');
  await other.locator('#glass-enabled').check();await clarity(other,20);
  await expect(page.locator('html')).toHaveAttribute('data-glass-clarity','20');await other.close();
  await page.goto('posts/cloud/ja.html');await page.locator('.transparency-toggle').click();
  await expect(page.locator('#glass-settings-title')).toHaveText(ui.ja['appearance.open']);
  await expect(page.locator('#glass-clarity')).toHaveValue('20');
});

test('corrupt, illegal, out-of-range and unavailable storage do not break appearance or reading',async({browser})=>{
  for(const [raw,value] of [['{',55],['null',55],[JSON.stringify({version:1,enabled:true,clarity:'70'}),55],[JSON.stringify({version:2,enabled:true,clarity:70}),55],[JSON.stringify({version:1,enabled:true,clarity:-10}),0],[JSON.stringify({version:1,enabled:true,clarity:150}),100],['blocked',55]]) {
    const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({raw,key})=>{
      if(raw==='blocked'){for(const method of ['getItem','setItem'])Storage.prototype[method]=()=>{throw new DOMException('blocked','SecurityError');};}
      else localStorage.setItem(key,raw);
    },{raw,key});
    await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');await expect(page.locator('html')).toHaveAttribute('data-glass-clarity',String(value));
    await open(page);await clarity(page,63);await close(page);await page.locator('.card-button').first().click();await expect(page.locator('#dialog-body')).toBeVisible();
    expect(errors).toEqual([]);await context.close();
  }
});

test('system overrides report effective state without replacing saved preferences, then restore it',async({page,browserName})=>{
  await page.goto('./');await open(page);await clarity(page,77);
  const saved=await page.evaluate(key=>localStorage.getItem(key),key);
  for(const [media,reason] of [[{contrast:'more'},'contrast'],[{contrast:'no-preference',forcedColors:'active'},'forced']]) {
    await page.emulateMedia(media);await expect(page.locator('html')).toHaveAttribute('data-glass','off');
    await expect(page.locator(`#glass-settings [data-glass-reason="${reason}"]`)).toBeVisible();
    await expect(page.locator('#glass-enabled')).toBeChecked();
    expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(saved);
  }
  await page.emulateMedia({contrast:'no-preference',forcedColors:'none'});
  if(browserName==='chromium') {
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
    await expect(page.locator('#glass-settings [data-glass-reason="system"]')).toBeVisible();await cdp.send('Emulation.setEmulatedMedia',{features:[]});await cdp.detach();
  }
  await expect(page.locator('html')).toHaveAttribute('data-glass','on');await expect(page.locator('#glass-clarity')).toHaveValue('77');
});

test('unsupported backdrop filters use opaque surfaces but settings and content remain usable',async({page})=>{
  await page.addInitScript(()=>{const original=CSS.supports.bind(CSS);CSS.supports=(...args)=>args.some(v=>String(v).includes('backdrop-filter'))?false:original(...args);});
  await page.goto('./');await open(page);await expect(page.locator('#glass-settings [data-glass-reason="unsupported"]')).toBeVisible();
  await clarity(page,100);expect(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');await close(page);
  await page.locator('.card-button').first().click();await expect(page.locator('#dialog-body')).toBeVisible();
});

test('continuous preview leaves cards, reader paper and the official music iframe stable',async({page})=>{
  let loads=0;await page.route('https://music.163.com/**outchain/player?*',r=>{loads++;return r.fulfill({contentType:'text/html',body:'<!doctype html><p>Official lifecycle fixture, no audio</p>'});});
  await page.goto('./');await page.locator('#music-toggle').click();
  await page.evaluate(()=>{window.keptFrame=document.querySelector('#music-frame');window.keptWindow=keptFrame.contentWindow;window.keptCard=document.querySelector('.card-button');});
  await open(page);const stored=await page.evaluate(key=>localStorage.getItem(key),key);
  for(const value of [12,31,49,67,88]) {
    await page.locator('#glass-clarity').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
    await expect(page.locator('html')).toHaveAttribute('data-glass-clarity',String(value));
  }
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(stored);
  await page.locator('#glass-clarity').dispatchEvent('change');await close(page);
  expect(await page.evaluate(()=>keptFrame===document.querySelector('#music-frame')&&keptWindow===keptFrame.contentWindow&&keptCard===document.querySelector('.card-button'))).toBe(true);expect(loads).toBe(1);
  await page.locator('#music-close').click();await page.locator('#music-toggle').click();expect(loads).toBe(1);
});

test('keyboard, 200% layout/text zoom and reduced motion keep settings reachable',async({page,browserName})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:640,height:450});await page.goto('./?lang=en');
  await page.addStyleTag({content:'.glass-settings{font-size:28px}.glass-settings :is(label,button,h2,p){font-size:inherit}'});
  await page.locator('.site-header .transparency-toggle').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#glass-enabled')).toBeFocused();await page.keyboard.press(tabKey(browserName));await expect(page.locator('#glass-clarity')).toBeFocused();
  await page.keyboard.press('ArrowRight');await expect(page.locator('#glass-clarity')).toHaveValue('56');
  expect(await page.locator('#glass-settings').evaluate(e=>e.getAnimations().length)).toBe(0);
  await page.locator('#glass-reset').scrollIntoViewIfNeeded();await page.locator('#glass-reset').click();
  await page.locator('#glass-settings-close').click();await expect(page.locator('.site-header .transparency-toggle')).toBeFocused();await noOverflow(page,640);
});

test('FAQ animation can reverse and native reduced-motion disclosure remains usable',async({page})=>{
  await page.goto('./');const item=page.locator('.faq details').first(),summary=item.locator('summary');
  await summary.click();await summary.click();await expect(item).not.toHaveAttribute('open','');
  await summary.focus();await page.keyboard.press('Enter');await expect(item).toHaveAttribute('open','');
  await page.emulateMedia({reducedMotion:'reduce'});await summary.click();await expect(item).not.toHaveAttribute('open','');
  expect(await item.locator('.faq-answer').evaluate(e=>e.getAnimations().length)).toBe(0);
});

// The language pill may be wider, but every toolbar ring uses the same
// thickness/offset. Every ring is contained within the button bounds.
for(const width of [320,390,1440])test(`${width}px language, theme and settings rings match across homepage, modal and static readers`,async({page})=>{
  test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:900});
  const ring=locator=>locator.evaluate(el=>{const s=getComputedStyle(el);return {width:s.outlineWidth,offset:s.outlineOffset,style:s.outlineStyle,color:s.outlineColor};});
  let icon;
  for(const [lang,labels] of Object.entries(ui))for(const theme of ['light','dark']){
    await page.goto('./?lang='+lang);await page.evaluate(theme=>siteTheme.setMode(theme),theme);
    for(const surface of ['home','modal','static']){
      if(surface==='modal')await page.locator('[data-essay-id="rain"] .card-button').click();
      if(surface==='static')await page.goto('./posts/rain/'+lang+'.html');
      const scope=page.locator(surface==='home'?'.site-header':surface==='modal'?'.dialog-toolbar':'.static-reader-toolbar');
      const language=scope.locator(surface==='static'?'.language-menu>summary':'select'),shell=scope.locator('.language-picker'),themeButton=scope.locator(surface==='modal'?'.dialog-theme-toggle':'.theme-toggle'),settings=scope.locator('.transparency-toggle');
      await language.focus();await page.keyboard.press('Shift');const expected=await ring(shell);expect(expected).toMatchObject({width:'2px',offset:'-4px',style:'solid'});
      await themeButton.focus();await page.keyboard.press('Shift');expect(await ring(themeButton)).toEqual(expected);
      await expect(settings).toHaveAttribute('aria-label',labels['appearance.open']);await expect(settings).toHaveAttribute('title',labels['appearance.open']);await expect(settings.locator('.settings-icon')).toBeVisible();
      const current=await settings.locator('.settings-icon').innerHTML();if(icon)expect(current).toBe(icon);else icon=current;
      await settings.click();await expect(settings).toHaveAttribute('aria-expanded','true');expect(await ring(settings)).toEqual(expected);
      const panel=page.locator('#glass-settings');await expect(panel.locator('#glass-settings-title')).toHaveText(labels['appearance.open']);await expect(panel.locator('.settings-section')).toHaveCount(2);
      const subtitles=await panel.locator('.theme-setting>.settings-section-title,.glass-enable-row').evaluateAll(nodes=>nodes.map(el=>{const s=getComputedStyle(el);return {font:s.fontSize,weight:s.fontWeight,line:s.lineHeight};}));expect(subtitles).toHaveLength(2);expect(subtitles[0]).toEqual(subtitles[1]);expect(subtitles[0].font).toBe('16px');
      expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await panel.locator('#glass-settings-close').focus();await page.keyboard.press('Shift');expect(await ring(panel.locator('#glass-settings-close'))).toEqual(expected);
      await page.keyboard.press('Escape');await expect(settings).toBeFocused();await expect(panel).not.toBeVisible();
      if(surface==='modal')await page.locator('.dialog-close').click();
      await noOverflow(page,width);
    }
  }
});

async function choiceAlignment(group,kind){return group.evaluate((el,kind)=>{const active=el.querySelector('[aria-pressed="true"]'),indicator=el.querySelector(`.${kind}-indicator`);if(!active||!indicator||indicator.hidden)return Infinity;const a=active.getBoundingClientRect(),b=indicator.getBoundingClientRect();return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));},kind);}

test('settings theme and preset choices move one glass cradle continuously without transforming labels',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('./');await open(page);
 for(const [selector,kind] of [['#theme-choice','theme'],['.glass-presets','preset']]){
  const group=page.locator(selector),buttons=group.locator('button'),indicator=group.locator(`.${kind}-indicator`);
  await buttons.first().click();await expect.poll(()=>choiceAlignment(group,kind)).toBeLessThan(1);await expect(indicator).toHaveCount(1);
  await indicator.evaluate(el=>window.keptChoiceIndicator=el);await buttons.last().click();await expect.poll(()=>indicator.evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);
  const samples=await indicator.evaluate(el=>{const a=el.getAnimations()[0];a.pause();const xs=[0,140,280].map(time=>{a.currentTime=time;return el.getBoundingClientRect().x;});a.finish();return xs;});
  expect(samples[1]).toBeGreaterThan(samples[0]+1);expect(samples[1]).toBeLessThan(samples[2]-1);expect(await indicator.evaluate(el=>el===window.keptChoiceIndicator)).toBe(true);
  for(const button of await buttons.all())expect(await button.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  await expect.poll(()=>choiceAlignment(group,kind)).toBeLessThan(1);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-theme-option="system"]').click();await page.locator('[data-glass-preset="20"]').click();
 for(const selector of ['.theme-indicator','.preset-indicator'])expect(await page.locator(selector).evaluate(el=>el.getAnimations().length)).toBe(0);
});

test('settings choices support keyboard selection and custom clarity never pretends to be a preset',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:844});await page.goto('./');await open(page);
 const automatic=page.locator('[data-theme-option="system"]');await automatic.focus();await page.keyboard.press('End');await expect(page.locator('[data-theme-option="dark"]')).toBeFocused();await expect(page.locator('html')).toHaveAttribute('data-theme-mode','dark');
 await page.keyboard.press('ArrowLeft');await expect(page.locator('html')).toHaveAttribute('data-theme-mode','light');await page.keyboard.press('Home');await expect(page.locator('html')).toHaveAttribute('data-theme-mode','system');await expect(automatic).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-glass-preset="20"]').focus();await page.keyboard.press('End');await expect(page.locator('#glass-clarity')).toHaveValue('90');await page.keyboard.press('ArrowLeft');await expect(page.locator('#glass-clarity')).toHaveValue('55');
 await clarity(page,64);await expect(page.locator('.glass-presets [aria-pressed="true"]')).toHaveCount(0);await expect(page.locator('.preset-indicator')).toBeHidden();
 await page.locator('#glass-enabled').uncheck();await expect(page.locator('#glass-adjustments')).toBeHidden();await expect(page.locator('.theme-indicator')).toBeVisible();await page.locator('#glass-enabled').check();await expect(page.locator('#glass-clarity')).toHaveValue('64');await expect(page.locator('.preset-indicator')).toBeHidden();
 await close(page);await open(page);await expect(page.locator('.preset-indicator')).toBeHidden();await page.locator('[data-glass-preset="55"]').click();await expect.poll(()=>choiceAlignment(page.locator('.glass-presets'),'preset')).toBeLessThan(1);await close(page);
 await page.goto('./posts/rain/en.html');await page.locator('.transparency-toggle').click();await expect(page.locator('[data-theme-option="system"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-glass-preset="55"]')).toHaveAttribute('aria-pressed','true');
});

test('settings cradles remeasure through languages, reopening, resizing and large text on modal and static pages',async({page})=>{
 test.setTimeout(60000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:844});await page.goto('./');
 for(const lang of Object.keys(ui)){
  await page.locator('#language-select').selectOption(lang);await open(page);for(const [selector,kind] of [['#theme-choice','theme'],['.glass-presets','preset']])await expect.poll(()=>choiceAlignment(page.locator(selector),kind)).toBeLessThan(1);await close(page);
 }
 await page.locator('[data-essay-id="rain"] .card-button').click();await page.locator('#interest-dialog .transparency-toggle').click();
 await page.addStyleTag({content:'.settings-choice button{font-size:24px}'});
 for(const width of [320,390,1440,320]){
  await page.setViewportSize({width,height:844});for(const [selector,kind] of [['#theme-choice','theme'],['.glass-presets','preset']])await expect.poll(()=>choiceAlignment(page.locator(selector),kind)).toBeLessThan(1);
  expect(await page.locator('#glass-settings').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);await noOverflow(page,width);
 }
 await page.keyboard.press('Escape');await page.locator('.dialog-close').click();
 await page.goto('./posts/rain/ja.html');await page.locator('.transparency-toggle').click();for(const [selector,kind] of [['#theme-choice','theme'],['.glass-presets','preset']])await expect.poll(()=>choiceAlignment(page.locator(selector),kind)).toBeLessThan(1);
});


test('settings keep their top edge through glass disclosure on home, modal and static readers',async({page})=>{
 test.setTimeout(90000);await page.emulateMedia({reducedMotion:'no-preference'});
 for(const [width,height] of [[320,720],[390,844],[1440,768],[1440,480]]){
  await page.setViewportSize({width,height});
  for(const route of ['home','modal','static']){
   await page.goto(route==='static'?'./posts/rain/en.html':'./');
   if(route==='modal')await page.locator('.card-button').first().click();
   await page.locator(route==='modal'?'.dialog-toolbar .transparency-toggle':route==='static'?'.static-reader-toolbar .transparency-toggle':'.site-header .transparency-toggle').click();
   const panel=page.locator('#glass-settings'),details=page.locator('#glass-adjustments'),toggle=page.locator('#glass-enabled');
   await expect.poll(()=>panel.evaluate(el=>el.getAnimations().length)).toBe(0);
   // A previous iteration can leave glass off; both opening states must work.
   const top=(await panel.boundingBox()).y;
   for(const enabled of [false,true]){
    if(await toggle.isChecked()===enabled)await toggle.setChecked(!enabled);
    await expect.poll(()=>details.evaluate(el=>el.getAnimations().length)).toBe(0);
    await toggle.setChecked(enabled);
    const samples=await details.evaluate(el=>{
     const animation=el.getAnimations()[0];if(!animation)throw new Error('disclosure did not animate');animation.pause();
     const samples=[0,140,280].map(time=>{animation.currentTime=time;return {height:el.getBoundingClientRect().height,top:el.closest('dialog').getBoundingClientRect().top};});animation.finish();return samples;
    });
    for(const sample of samples)expect(Math.abs(sample.top-top)).toBeLessThanOrEqual(1);
    if(enabled){expect(samples[1].height).toBeGreaterThan(samples[0].height+1);expect(samples[1].height).toBeLessThan(samples[2].height-1);}else{expect(samples[1].height).toBeLessThan(samples[0].height-1);expect(samples[1].height).toBeGreaterThan(samples[2].height+1);}
    await expect(details).toHaveJSProperty('hidden',!enabled);await expect(details).toHaveJSProperty('inert',!enabled);await expect(toggle).toHaveAttribute('aria-expanded',String(enabled));
    expect(Math.abs((await panel.boundingBox()).y-top)).toBeLessThanOrEqual(1);
    expect(await details.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
   }
   const box=await panel.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height);
   const closeBox=await page.locator('#glass-settings-close').boundingBox();expect(closeBox.y).toBeGreaterThanOrEqual(box.y);expect(closeBox.y+closeBox.height).toBeLessThanOrEqual(height);
   await page.locator('#glass-reset').scrollIntoViewIfNeeded();await page.locator('#glass-reset').click();
   expect(Math.abs((await panel.boundingBox()).y-top)).toBeLessThanOrEqual(1);await noOverflow(page,width);
  }
 }
});

test('glass disclosure reverses from its current height and reduced motion settles immediately',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('./');await open(page);
 const details=page.locator('#glass-adjustments'),toggle=page.locator('#glass-enabled');
 await expect.poll(()=>page.locator('#glass-settings').evaluate(el=>el.getAnimations().length)).toBe(0);
 await toggle.uncheck();const partial=await details.evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=100;return el.getBoundingClientRect().height;});
 expect(await details.evaluate(el=>el.inert)).toBe(true);
 await toggle.check();const resumed=await details.evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=0;return el.getBoundingClientRect().height;});expect(Math.abs(resumed-partial)).toBeLessThan(1);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>details.evaluate(el=>el.getAnimations().length)).toBe(0);await expect(details).toBeVisible();
 await toggle.uncheck();await expect(details).toBeHidden();expect(await details.evaluate(el=>el.getAnimations().length)).toBe(0);
 await toggle.check();await expect(details).toBeVisible();expect(await details.evaluate(el=>el.getAnimations().length)).toBe(0);
 await toggle.uncheck();await close(page);await open(page);await expect(details).toBeHidden();await expect(toggle).toBeFocused();
 const top=(await page.locator('#glass-settings').boundingBox()).y;await toggle.check();await expect(details).toBeVisible();expect(Math.abs((await page.locator('#glass-settings').boundingBox()).y-top)).toBeLessThanOrEqual(1);
});


test('short desktop settings scroll without a second rounded glass rim inside the content',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:640});
 for(const route of ['home','modal','static'])for(const theme of ['light','dark']){
  await page.goto(route==='static'?'./posts/rain/en.html':'./');
  await page.evaluate(theme=>window.siteTheme.setMode(theme),theme);await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  if(route==='modal')await page.locator('.card-button').first().click();
  await page.locator(route==='modal'?'.dialog-toolbar .transparency-toggle':route==='static'?'.static-reader-toolbar .transparency-toggle':'.site-header .transparency-toggle').click();
  const panel=page.locator('#glass-settings'),toggle=page.locator('#glass-enabled');await toggle.check();
  expect(await panel.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(0);
  const top=(await panel.boundingBox()).y;await page.locator('#glass-reset').focus();await expect(page.locator('#glass-reset')).toBeInViewport();
  expect(await panel.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  // An absolute ::before border follows scroll content and creates the reported inner corners.
  expect(await panel.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
  expect(Math.abs((await panel.boundingBox()).y-top)).toBeLessThanOrEqual(1);
  await expect(page.locator('#glass-settings-close')).toBeInViewport();
  await toggle.uncheck();await expect(page.locator('#glass-adjustments')).toBeHidden();await toggle.check();await expect(page.locator('#glass-adjustments')).toBeVisible();
  expect(await panel.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
  await page.locator('#glass-settings-close').click();await expect(panel).toBeHidden();await noOverflow(page,1280);
 }
});
