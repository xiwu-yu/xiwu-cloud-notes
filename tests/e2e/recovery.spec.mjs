import {test,expect,noOverflow} from './helpers.mjs';
const base='http://127.0.0.1:4174';
const locales=['zh-CN','zh-TW','en','ja'];
const ogLocale={'zh-CN':'zh_CN','zh-TW':'zh_TW',en:'en_US',ja:'ja_JP'};

test('raw homepage stays Chinese without claiming query languages as static translations; genuine article translations remain static', async ({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  for(const prefix of ['/','/xiwu-cloud-notes/']) {
    for(const lang of locales) {
      const response=await page.goto(`${base}${prefix}?lang=${lang}`);
      expect(response.status()).toBe(200);
      const raw=await response.text();
      expect(raw).toMatch(/<html lang="zh-CN"/);
      expect(raw).not.toMatch(/<link[^>]+hreflang=/);
      await expect(page.locator('h1')).toContainText('欢迎来到夕雾的');
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content','zh_CN');
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://cloud.xiwu.space/');
    }
    for(const lang of locales) {
      await page.goto(`${base}${prefix}posts/cloud/${lang}.html`);
      await expect(page.locator('html')).toHaveAttribute('lang',lang);
      await expect(page.locator('article')).toHaveAttribute('lang',lang);
      await expect(page.locator('.article-body')).not.toBeEmpty();
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content',ogLocale[lang]);
      const title=await page.title();
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',title);
      if(lang==='en')await expect(page.locator('.article-body')).toContainText('English body');
      await expect(page.locator('link[rel=alternate]')).toHaveCount(4);
    }
  }
  await context.close();
});

test('unknown deep paths return a real branded 404 with usable CSS and static multilingual recovery links', async ({browser})=>{
  for(const javaScriptEnabled of [false,true]) {
    const context=await browser.newContext({javaScriptEnabled,colorScheme:'dark',viewport:{width:320,height:900}});
    const page=await context.newPage();
    const unexpected=[];
    page.on('pageerror',e=>unexpected.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.request().isNavigationRequest())unexpected.push(`${r.status()} ${r.url()}`);});
    for(const prefix of ['/','/xiwu-cloud-notes/']) {
      const response=await page.goto(`${base}${prefix}missing/deep/letter.html?lang=en`);
      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toContain('text/html');
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex');
      for(const lang of locales)await expect(page.locator(`#recovery-${lang}`)).toBeVisible();
      expect(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(30, 40, 55)');
      await noOverflow(page,320);
      await page.locator('#static-archive summary').click();
      const link=page.locator('#static-archive a[lang=en]').first();
      await link.click();await page.waitForLoadState('load');
      await expect(page.locator('.article-body')).toContainText('English body');
    }
    expect(unexpected).toEqual([]);
    await context.close();
  }
});

test('share image is a real same-origin 1200×630 PNG with matching metadata and MIME',async({page})=>{
  await page.goto('posts/cloud/en.html');
  const url=await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(url).toMatch(/^https:\/\/cloud\.xiwu\.space\/assets\/share-cover\.png\?v=/);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content','image/png');
  const image=await page.request.get(new URL(url).pathname+new URL(url).search);
  expect(image.status()).toBe(200);expect(image.headers()['content-type']).toBe('image/png');
  const data=await image.body();expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(data.readUInt32BE(16)).toBe(1200);expect(data.readUInt32BE(20)).toBe(630);
});
