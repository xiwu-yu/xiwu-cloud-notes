import { test, expect, noOverflow } from './helpers.mjs';

async function stationary(page) {
  await page.clock.install();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('./');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.mouse.move(1,850);
}
async function scroll(page,top=700) {
  await page.evaluate(top=>new Promise(resolve=>{
    if(scrollY===top) {resolve();return;}
    addEventListener('scroll',()=>resolve(),{once:true});
    window.scrollTo({top,behavior:'instant'});
  }),top);
  await page.clock.runFor(50);
}
const hidden = page => page.locator('.site-header');

test('sticky navigation stays at top, hides after five idle seconds, reveals on either scroll direction and never hides at page top', async ({ page }) => {
  await stationary(page);
  const header=hidden(page);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(10000);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await scroll(page);
  expect((await header.boundingBox()).y).toBe(0);
  await page.clock.runFor(4000);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(1000);
  await expect(header).toHaveClass(/nav-hidden/);
  await expect(header).toHaveAttribute('inert','');
  expect(await header.evaluate(el=>{el.querySelector('a').focus();return el.contains(document.activeElement);})).toBe(false);
  expect(await page.evaluate(()=>Boolean(document.elementFromPoint(150,10)?.closest('.site-header')))).toBe(false);
  await scroll(page,800);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(5100);
  await scroll(page,600);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await scroll(page,0);
  await page.clock.runFor(10000);
  await expect(header).not.toHaveClass(/nav-hidden/);
});

test('hover, keyboard focus and native selector use prevent hiding; leaving starts a fresh five-second deadline', async ({ page }) => {
  await stationary(page);await scroll(page);
  const header=hidden(page);
  await header.hover();
  await page.clock.runFor(8000);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.mouse.move(1,850);
  await page.clock.runFor(4000);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(1000);
  await expect(header).toHaveClass(/nav-hidden/);
  await page.keyboard.press('Tab');
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.locator('#language-select').focus();
  await scroll(page,700); // 原生 Tab 可能回到顶部，焦点阶段明确在离顶状态验证。
  await page.selectOption('#language-select','ja');
  await page.clock.runFor(8000);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await expect(page.locator('.site-header .brand-mark')).toHaveAttribute('aria-label','ホームの先頭に戻って再読み込み');
  await page.locator('#archive-search').evaluate(el=>el.focus({preventScroll:true}));
  await page.clock.runFor(50);
  await page.clock.runFor(4000);
  await expect(header).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(1000);
  await expect(header).toHaveClass(/nav-hidden/);
});

test('backgrounding clears the timer and returning or keyboard activity reveals navigation with a fresh deadline', async ({ page }) => {
  await stationary(page);await scroll(page);
  await page.clock.runFor(4000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(10000);
  await expect(hidden(page)).not.toHaveClass(/nav-hidden/);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(4000);
  await expect(hidden(page)).not.toHaveClass(/nav-hidden/);
  await page.clock.runFor(1000);
  await expect(hidden(page)).toHaveClass(/nav-hidden/);
  await page.keyboard.press('Tab');
  await expect(hidden(page)).not.toHaveClass(/nav-hidden/);
});

for (const reducedMotion of ['reduce','no-preference']) {
  test(`cloud performs one real reload at the top, clears article route, preserves language/theme (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({reducedMotion});
    await page.goto('./?lang=en');
    await page.locator('.theme-toggle').click();
    await page.locator('.card-button').first().click();
    await page.selectOption('#dialog-language-select','ja');
    await page.evaluate(()=>{
      window.beforeRefresh=crypto.randomUUID();
      sessionStorage.setItem('beforeRefresh',window.beforeRefresh);
      addEventListener('beforeunload',()=>sessionStorage.setItem('unloadScroll',String(scrollY)),{once:true});
    });
    let requests=0;
    page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())requests++;});
    const navigation=page.waitForEvent('domcontentloaded');
    // 原生 modal 会使外部页头 inert；弹窗内同一云朵动作提供可操作入口。
    await page.locator('.dialog-home-refresh').click();
    await navigation;
    await expect(page.locator('html')).toHaveAttribute('lang','ja');
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    expect(new URL(page.url()).searchParams.get('post')).toBeNull();
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(()=>performance.getEntriesByType('navigation')[0].type)).toBe('reload');
    expect(await page.evaluate(()=>window.beforeRefresh)).toBeUndefined();
    expect(await page.evaluate(()=>Number(sessionStorage.getItem('unloadScroll')))).toBeLessThanOrEqual(1);
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
    await expect(page.locator('#interest-dialog')).not.toBeVisible();
    await expect(page.locator('.site-header')).not.toHaveAttribute('inert','');
    await expect.poll(()=>page.evaluate(()=>history.scrollRestoration)).toBe('auto');
    expect(await page.evaluate(()=>history.state?.cloudHomeRefresh)).toBeUndefined();
    expect(requests).toBe(1);
    // 正常品牌链接只跳锚点；独立页头云朵再次刷新也不会留下循环标记。
    await page.locator('#brand-home').click();
    expect(requests).toBe(1);
    const again=page.waitForEvent('domcontentloaded');
    await page.locator('.site-header .brand-mark').click();
    await again;
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
    expect(requests).toBe(2);
  });
}

for (const width of [320,375,768,1024,1440]) {
  test(`${width}px: fixed header, four languages/two themes and unoccluded native anchors`, async ({ page }) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width,height:900});
    await page.goto('./');
    for (const lang of ['zh-CN','zh-TW','en','ja']) {
      await page.selectOption('#language-select',lang);
      const label=await page.evaluate(lang=>window.siteProfile.ui[lang]['nav.homeRefresh'],lang);
      await expect(page.locator('.site-header .brand-mark')).toHaveAttribute('aria-label',label);
      for (const theme of ['light','dark']) {
        if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
        await page.locator('.site-header a[href="#resources"]').click();
        await expect.poll(()=>new URL(page.url()).hash).toBe('#resources');
        const header=await page.locator('.site-header').boundingBox();
        const title=await page.locator('#resources-title').boundingBox();
        expect(header.y).toBe(0);
        expect(title.y).toBeGreaterThanOrEqual(header.y+header.height);
        await noOverflow(page,width);
        for(const selector of ['.site-header .brand-mark','#language-select','.theme-toggle']) {
          expect(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
        }
        await page.locator('.site-header a[href="#about"]').click();
      }
    }
  });
}

test('reduced motion stops decorative movement while sticky hiding still functions; no script keeps usable native navigation', async ({ browser, page }) => {
  await stationary(page);await scroll(page);
  for(const selector of ['.cloud-one','.cloud-two','.cloud-three','.hero-art img','#hero-title'])expect(await page.locator(selector).evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.clock.runFor(5100);await expect(hidden(page)).toHaveClass(/nav-hidden/);
  expect(await hidden(page).evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  for (const failure of ['javascript','navigation.js']) {
    const context=await browser.newContext({javaScriptEnabled:failure!=='javascript',viewport:{width:375,height:900},reducedMotion:'reduce'});
    const plain=await context.newPage();
    if(failure==='navigation.js')await plain.route('**/navigation.js*',route=>route.abort());
    await plain.goto('http://127.0.0.1:4174/xiwu-cloud-notes/');
    await plain.locator('.site-header a[href="#resources"]').click();
    await expect.poll(()=>new URL(plain.url()).hash).toBe('#resources');
    expect((await plain.locator('.site-header').boundingBox()).y).toBe(0);
    await plain.selectOption('#language-select','ja');
    const request=plain.waitForEvent('domcontentloaded');
    await plain.locator('.site-header .brand-mark').click();await request;
    expect(new URL(plain.url()).searchParams.has('post')).toBe(false);
    expect(new URL(plain.url()).searchParams.get('lang')).toBe('ja');
    await expect(plain.locator('#static-archive')).toBeVisible();
    await noOverflow(plain,375);
    await context.close();
  }
});

test('cloud layers have distinct phases, hero floats without resizing, small screens simplify and reduced motion stops them live', async ({ page }) => {
  await page.goto('./');
  const layers=await page.locator('.sky-background .cloud').evaluateAll(nodes=>nodes.map(el=>{const s=getComputedStyle(el);return {duration:s.animationDuration,delay:s.animationDelay,direction:s.animationDirection};}));
  expect(layers.map(l=>l.duration)).toEqual(['30s','36s','28s']);
  expect(new Set(layers.map(l=>l.delay)).size).toBe(3);
  expect(layers[1].direction).toBe('reverse');
  await expect(page.locator('.cloud-one')).toHaveClass(/cloud-running/);
  await expect(page.locator('.cloud-three')).not.toHaveClass(/cloud-running/);
  const art=page.locator('.hero-art img');
  const before=await art.boundingBox();
  const transform=await art.evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(350);
  expect(await art.evaluate(el=>getComputedStyle(el).transform)).not.toBe(transform);
  const after=await art.boundingBox();
  expect(after.width).toBeCloseTo(before.width,2);expect(after.height).toBeCloseTo(before.height,2);
  expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(10);
  await page.evaluate(()=>window.scrollTo({top:1100,behavior:'instant'}));
  await expect(page.locator('.cloud-three')).toHaveClass(/cloud-running/);
  await expect(page.locator('.cloud-one')).not.toHaveClass(/cloud-running/);
  await page.setViewportSize({width:375,height:900});
  await expect(page.locator('.cloud-three')).toBeHidden();
  await expect(page.locator('.sky-star:visible')).toHaveCount(3);
  expect(await art.evaluate(el=>getComputedStyle(el).animationDuration)).toBe('14s');
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await art.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await noOverflow(page,375);
});

test('cloud refresh also preserves current theme when preference storage is blocked', async ({ browser }) => {
  const context=await browser.newContext({colorScheme:'light',reducedMotion:'reduce'});
  await context.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw Error('Storage unavailable');};});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4174/xiwu-cloud-notes/?lang=en');
  await page.locator('.theme-toggle').click();
  const navigation=page.waitForEvent('domcontentloaded');
  await page.locator('.site-header .brand-mark').click();await navigation;
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await context.close();
});


test('native selector Enter never implicitly activates the cloud refresh button', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(()=>window.sameDocumentToken=crypto.randomUUID());
  const token=await page.evaluate(()=>window.sameDocumentToken);
  let navigations=0;
  page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())navigations++;});
  await page.locator('#language-select').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  expect(navigations).toBe(0);
  expect(await page.evaluate(()=>window.sameDocumentToken)).toBe(token);
  await expect(page.locator('.site-header')).not.toHaveClass(/nav-hidden/);
});
