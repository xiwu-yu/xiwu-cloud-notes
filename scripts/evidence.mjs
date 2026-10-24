import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { once } from 'node:events';
const phase = process.argv[2] || 'after';
const output = `artifacts/${phase}`;
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4175' }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
let browser;
try {
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4175/');
  await page.waitForLoadState('networkidle');
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(({name, transferSize, decodedBodySize}) => ({url: new URL(name).pathname, transferSize, decodedBodySize})));
  const files = {};
  for (const file of ['profile.js', 'style.css', 'script.js', 'archive.js', 'index.html']) {
    const data = await readFile(`dist/${file}`);
    files[file] = { bytes: data.length, gzip: gzipSync(data).length };
  }
  await writeFile(`${output}/resources.json`, JSON.stringify({ files, firstViewport: resources, totalTransferred: resources.reduce((sum, r) => sum + r.transferSize, 0) }, null, 2));
  const staticPaths = await page.evaluate(() => Object.fromEntries(window.siteProfile.locales.map(lang => [lang, window.siteProfile.localized[lang].interests.reduce((a, b) => Date.parse(a.publishedAt) > Date.parse(b.publishedAt) ? a : b).url])));
  const loadImages = () => page.locator('img').evaluateAll(async images => {
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode().catch(() => {})));
  });
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4175/?lang=zh-CN');
    await page.waitForLoadState('networkidle');
    await loadImages();
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    await page.locator('.card-button').first().click();
    await page.screenshot({ path: `${output}/reading-${width}.png` });
  }
  await page.goto('http://127.0.0.1:4175/?lang=en');
  await page.locator('.theme-toggle').click();
  await loadImages();
  await page.screenshot({ path: `${output}/home-en-dark.png`, fullPage: true });
  if (phase !== 'before') {
    for (const [width, lang, theme] of [[375, 'ja', 'dark'], [768, 'zh-TW', 'light']]) {
      await page.setViewportSize({width, height:900});
      await page.goto(`http://127.0.0.1:4175/?lang=${lang}`);
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
      await loadImages();
      await page.screenshot({path:`${output}/home-${lang}-${theme}-${width}.png`,fullPage:true});
    }
    for (const [width, lang, colorScheme] of [[1440,'en','light'],[1440,'en','dark'],[320,'ja','dark']]) {
      await page.setViewportSize({width,height:900});
      await page.emulateMedia({colorScheme});
      await page.goto(`http://127.0.0.1:4175/${staticPaths[lang]}`);
      await loadImages();
      await page.screenshot({path:`${output}/static-${lang}-${colorScheme}-${width}.png`,fullPage:true});
    }
  }
} finally { await browser?.close(); server.kill(); }
