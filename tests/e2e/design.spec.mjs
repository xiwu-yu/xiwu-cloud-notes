import { readFile } from 'node:fs/promises';
import { test, expect, noOverflow } from './helpers.mjs';
const ui=JSON.parse(await readFile(new URL('../../content/ui.json',import.meta.url),'utf8'));
const langs=Object.keys(ui);
const blur=locator=>locator.evaluate(el=>getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter || 'none');

test('archive separates the original subtitle, keeps search visible and preserves collapsed date filters',async({page})=>{
  await page.goto('./');
  for(const lang of langs) {
    await page.selectOption('#language-select',lang);
    await expect(page.locator('#interests-title')).toHaveText(ui[lang]['notes.title']);
    await expect(page.locator('.section-subtitle')).toHaveText(ui[lang]['notes.subtitle']);
    await expect(page.locator('.section-subtitle')).not.toContainText(ui[lang]['notes.title']);
  }
  await expect(page.locator('#archive-search')).toBeVisible();
  await expect(page.locator('#archive-month')).toBeHidden();
  await page.locator('#archive-advanced summary').click();
  await page.selectOption('#archive-month','2026-09');
  await page.selectOption('#archive-order','oldest');
  await expect(page.locator('#archive-adjusted')).toHaveText(ui.ja['notes.adjusted'].replace('{count}','2'));
  await page.locator('#archive-advanced summary').click();
  await page.selectOption('#language-select','en');
  await expect(page.locator('#archive-month')).toHaveValue('2026-09');
  await expect(page.locator('#archive-order')).toHaveValue('oldest');
  await page.locator('#archive-search').fill('no-such-article');
  await expect(page.locator('#archive-empty')).toBeVisible();
  await page.locator('#archive-reset').click();
  await expect(page.locator('#archive-month')).toHaveValue('all');
  await expect(page.locator('.interest-card')).toHaveCount(3);
});

for(const width of [320,390,768,1280,1440]) {
  test(`${width}px reading typography, solid paper, four languages and themes`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('./');
    for(const lang of langs) {
      await page.selectOption('#language-select',lang);
      for(const theme of ['light','dark']) {
        if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
        const navTheme=await page.locator('.site-header .theme-toggle').boundingBox();
        const navTransparency=await page.locator('.site-header .transparency-toggle').boundingBox();
        expect(navTransparency.y).toBeCloseTo(navTheme.y,0);
        await page.locator('.card-button').first().click();
        const layout=await page.locator('#dialog-body').evaluate(el=>({font:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight),box:el.getBoundingClientRect().toJSON()}));
        expect(layout.font).toBe(width<=720?17:18);
        expect(layout.line).toBeCloseTo(layout.font*1.85,1);
        expect(layout.box.width).toBeLessThanOrEqual(720);
        if(width>=1280)expect(layout.box.width).toBeGreaterThanOrEqual(680);
        if(width<=720) {
          const box=await page.locator('#interest-dialog').boundingBox();
          expect(box.x).toBe(0);expect(box.y).toBe(0);expect(box.width).toBe(width);expect(box.height).toBe(900);
          expect(layout.box.x).toBeCloseTo(20,0);
          expect(layout.box.right).toBeCloseTo(width-20,0);
        }
        expect(await blur(page.locator('#interest-dialog'))).toBe('none');
        expect(await blur(page.locator('.card-button').first())).toContain('blur');
        // 内部按钮可复用细边材质，但不得在工具条的滤镜上再次叠加背景模糊。
        for(const nested of await page.locator('.glass-surface .glass-surface').all())expect(await blur(nested)).toBe('none');
        for(const selector of ['.dialog-close','#dialog-language-select','#interest-dialog .transparency-toggle','.dialog-home-refresh']) {
          const box=await page.locator(selector).boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);
          expect(await page.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
        }
        await page.keyboard.press('Escape');await expect(page.locator('.card-button').first()).toBeFocused();
        await noOverflow(page,width);
      }
    }
  });
}

test('long mobile reading keeps toolbar reachable without changing history or focus restoration',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');
  const first=page.locator('.card-button').first();await first.click();
  // 测试固定文章的长文本压力，不更改作者文章或依赖现有文章数量。
  await page.locator('#dialog-body').evaluate(el=>{
    for(let i=0;i<25;i++){const p=document.createElement('p');p.textContent='长文排版与键盘焦点测试。'.repeat(10);el.append(p);}
  });
  await page.locator('#interest-dialog').evaluate(el=>el.scrollTop=600);
  await expect.poll(async()=>Math.abs((await page.locator('.dialog-toolbar').boundingBox()).y)).toBeLessThan(1);
  await page.locator('.dialog-close').click();await expect(first).toBeFocused();
  await first.click();
  await page.goBack();await expect(page.locator('#interest-dialog')).toBeHidden();
  await page.goForward();await expect(page.locator('#interest-dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#interest-dialog')).toBeHidden();
});

test('manual transparency preference persists through language, theme, modal, static reading and reload',async({page})=>{
  await page.goto('./');
  const toggle=page.locator('.site-header .transparency-toggle');
  await toggle.click();await page.locator('#glass-enabled').uncheck();await page.locator('#glass-settings-close').click();await expect(page.locator('html')).toHaveAttribute('data-transparency','reduced');
  for(const lang of langs) {
    await page.selectOption('#language-select',lang);
    await expect(toggle).toHaveAttribute('aria-label',ui[lang]['appearance.open']);
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    expect(await blur(page.locator('.site-header'))).toBe('none');
    await page.locator('.theme-toggle').click();
  }
  await page.locator('.card-button').first().click();
  await page.locator('#interest-dialog .transparency-toggle').click();await expect(page.locator('#glass-enabled')).not.toBeChecked();await page.locator('#glass-settings-close').click();
  await page.keyboard.press('Escape');await page.goto('posts/cloud/en.html');
  await expect(page.locator('html')).toHaveAttribute('data-transparency','reduced');
  await expect(page.locator('.transparency-toggle')).toHaveAttribute('aria-label',ui.en['appearance.open']);
  expect(await page.locator('#dialog-body').evaluate(el=>el.textContent)).toContain('English body');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-transparency','reduced');
  await page.locator('.transparency-toggle').click();await page.locator('#glass-enabled').check();await page.locator('#glass-settings-close').click();await expect(page.locator('html')).toHaveAttribute('data-transparency','auto');
});

test('static mobile articles use 17px and 20px margins; no JS and failed appearance enhancement keep text readable',async({browser})=>{
  for(const failure of ['none','javascript','appearance.js']) {
    const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:failure!=='javascript'});
    const page=await context.newPage();
    if(failure==='appearance.js')await page.route('**/appearance.js*',route=>route.abort());
    for(const lang of langs) {
      await page.goto(`http://127.0.0.1:4174/xiwu-cloud-notes/posts/cloud/${lang}.html`);
      const body=page.locator('#dialog-body');await expect(body).toBeVisible();
      const layout=await body.evaluate(el=>({font:getComputedStyle(el).fontSize,x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right}));
      expect(layout.font).toBe('17px');expect(layout.x).toBe(20);expect(layout.right).toBe(370);
      await expect(page.locator('article')).toHaveAttribute('lang',lang);
      await expect(page.locator('header a')).toHaveAttribute('href',`../../?lang=${lang}`);
      await noOverflow(page,390);
    }
    await context.close();
  }
});

test('system contrast, forced colors and reduced transparency disable blur without hiding content',async({page,browserName})=>{
  await page.goto('./');
  for(const media of [{contrast:'more'},{contrast:'no-preference',forcedColors:'active'}]) {
    await page.emulateMedia(media);
    await expect(page.locator('html')).toHaveAttribute('data-transparency','reduced');
    expect(await blur(page.locator('.site-header'))).toBe('none');
    await expect(page.locator('.site-header .transparency-toggle')).toBeEnabled();
    await expect(page.locator('.card-button').first()).toBeVisible();
  }
  if(browserName==='chromium') {
    await page.emulateMedia({contrast:'no-preference',forcedColors:'none'});
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
    await expect(page.locator('html')).toHaveAttribute('data-transparency','reduced');
    expect(await blur(page.locator('.archive-toolbar'))).toBe('none');await cdp.detach();
  }
});

test('reduced motion removes pointer highlight; 200% equivalent and text zoom keep controls in bounds',async({page})=>{
  await page.goto('./');
  await page.mouse.move(300,35);
  await expect.poll(()=>page.locator('.site-header').evaluate(el=>el.style.getPropertyValue('--light-x'))).not.toBe('');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>page.locator('.site-header').evaluate(el=>el.style.getPropertyValue('--light-x'))).toBe('');
  expect(await page.locator('.site-header').evaluate(el=>getComputedStyle(el,'::after').display)).toBe('none');
  expect(await page.locator('.site-header').evaluate(el=>el.style.getPropertyValue('--light-x'))).toBe('');
  for(const width of [720,390,320]) {
    await page.setViewportSize({width,height:900});
    for(const lang of langs) {
      await page.selectOption('#language-select',lang);await noOverflow(page,width);
      await page.locator('#archive-advanced summary').click();
      const inputs=await page.locator('input,select').evaluateAll(nodes=>nodes.filter(el=>el.getClientRects().length).map(el=>parseFloat(getComputedStyle(el).fontSize)));
      for(const font of inputs)expect(font).toBeGreaterThanOrEqual(16);
      await page.locator('#archive-advanced summary').click();
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.addStyleTag({content:'.site-header :is(a,select,button),.archive-toolbar :is(input,select,button,summary){font-size:200%!important}'});
  await noOverflow(page,1440);await page.locator('#archive-advanced summary').click();
  await expect(page.locator('#archive-month')).toBeVisible();
});

test('opaque CSS fallback works when the backdrop-filter enhancement gate is unavailable',async({page})=>{
  // 强制关闭增强 gate，验证基础样式；不是声称在旧版浏览器实测。
  await page.route('**/style.css*',async route=>{
    const response=await route.fetch();
    const css=(await response.text()).replace('@supports (background:color-mix(in srgb,white 50%,transparent)) and ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)))','@supports (unavailable-backdrop-filter: true)');
    await route.fulfill({response,body:css,contentType:'text/css'});
  });
  await page.goto('./');
  expect(await blur(page.locator('.site-header'))).toBe('none');
  const color=await page.locator('.site-header').evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(color).not.toContain('rgba');await expect(page.locator('.card-button').first()).toBeVisible();
});
