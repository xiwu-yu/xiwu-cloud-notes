// 比较同一份当前 DOM 在基线 CSS 与当前 CSS 下的主要组件布局。
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
const revision = process.argv[2] || '2017559';
const original = execFileSync('git', ['show', `${revision}:dist/style.css`], {encoding:'utf8'});
const server = spawn(process.execPath, ['scripts/serve.mjs'], {env:{...process.env,PORT:'4176'},stdio:['ignore','pipe','inherit']});
await once(server.stdout, 'data');
let browser;
try {
  browser = await chromium.launch({channel:process.env.PW_CHANNEL || 'chrome'});
  const diffs = [];
  const selector = '.site-header,.site-header nav,.hero,.hero h1,.hero-actions,.hero-button,.hero-art,.ticker-poem,.about,.about-copy,.interest-grid,.card-button,.card-description,.archive-toolbar,.archive-selects,.contact,.contact h2,.contact-email,footer';
  for (const width of [320,375,768,1440]) {
    for (const lang of ['zh-CN','zh-TW','en','ja']) {
      for (const theme of ['light','dark']) {
        const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
        await page.addInitScript(theme => localStorage.setItem('little-corner-theme',theme),theme);
        const collect = () => page.evaluate(selector => [...document.querySelectorAll(selector)].map((el,index) => {
          const css = getComputedStyle(el);
          const properties = ['display','grid-template-columns','gap','justify-content','align-items','font-size','font-family','padding-top','padding-left','padding-right','padding-bottom','width','height','line-height','white-space','color','background-color'];
          return {key: `${index}:${el.id || el.tagName+'.'+el.className}`, css:Object.fromEntries(properties.map(p=>[p,css.getPropertyValue(p)]))};
        }),selector);
        await page.route('**/style.css*',route=>route.fulfill({contentType:'text/css',body:original}));
        await page.goto(`http://127.0.0.1:4176/?lang=${lang}`);
        const before = await collect();
        await page.unroute('**/style.css*');
        await page.reload();
        const after = await collect();
        const beforeMap = new Map(before.map(el=>[el.key,el.css]));
        for (const el of after) {
          const previous = beforeMap.get(el.key);
          const changed = Object.fromEntries(Object.keys(el.css).filter(p=>el.css[p]!==previous[p]).map(p=>[p,[previous[p],el.css[p]]]));
          if (Object.keys(changed).length) diffs.push({width,lang,theme,element:el.key,changed});
        }
        await page.close();
      }
    }
  }
  await writeFile('artifacts/style-comparison.json',JSON.stringify({revision,cases:32,differences:diffs},null,2));
  const unexpected = diffs.filter(d=> !/site-header|NAV/.test(d.element));
  console.log(JSON.stringify({cases:32,changedComponents:[...new Set(diffs.map(d=>d.element))],unexpected},null,2));
} finally { await browser?.close(); server.kill(); }
