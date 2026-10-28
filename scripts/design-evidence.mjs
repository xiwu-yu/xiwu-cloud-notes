// 本地视觉与资源实测；不请求音乐，不修改正式网站。
import { chromium } from '@playwright/test';
import { isolateLikes } from './evidence-isolation.mjs';
import { serve } from './serve.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
const phase=process.argv[2] || 'after';
const root=resolve(process.argv[3] || 'dist');
const output=process.env.EVIDENCE_DIR ? `${process.env.EVIDENCE_DIR}/design/${phase}` : `work/glass-reading/${phase}`;
await mkdir(output,{recursive:true});
const server=serve({root,port:4177});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await isolateLikes(page);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>errors.push(r.url()));
  const base='http://127.0.0.1:4177/xiwu-cloud-notes/';
  await page.goto(base);await page.waitForLoadState('networkidle');
  const load=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),paint:performance.getEntriesByType('paint').map(p=>({name:p.name,time:p.startTime})),resources:performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize,transfer:r.transferSize}))}));
  const sizes={};
  for(const file of ['index.html','style.css','script.js','profile.js','appearance.js','reading.js','motion.css','motion.js']) {
    try{const bytes=await readFile(`${root}/${file}`);sizes[file]={bytes:bytes.length,gzip:gzipSync(bytes).length};}catch{}
  }
  for(const [width,lang,theme] of [[1440,'zh-CN','light'],[1440,'en','dark'],[390,'zh-CN','light'],[320,'ja','dark'],[768,'zh-TW','light'],[1280,'en','light']]) {
    await page.setViewportSize({width,height:900});await page.goto(`${base}?lang=${lang}`);
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    await page.screenshot({path:`${output}/home-${width}-${lang}-${theme}.png`});
    await page.locator('#interests').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-(document.querySelector('.site-header')?.getBoundingClientRect().height||0)-16,behavior:'instant'}));
    await page.screenshot({path:`${output}/archive-${width}-${lang}-${theme}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.goto(`${base}?post=hrt-preface&lang=zh-CN`);
  await page.locator('#interest-dialog').waitFor();
  await page.screenshot({path:`${output}/reader-mobile-light.png`});
  await page.locator('#interest-dialog').evaluate(el=>el.scrollTop=300);
  await page.screenshot({path:`${output}/reader-mobile-scrolled.png`});
  await page.goto(`${base}posts/hrt-preface/zh-CN.html`);
  await page.screenshot({path:`${output}/static-mobile.png`});
  await writeFile(`${output}/measurements.json`,JSON.stringify({environment:{engine:'Chromium',version:browser.version(),network:'local HTTP, uncompressed',reducedMotion:true,comparison:'single cold sample; timing is not a production benchmark'},sizes,load,errors},null,2));
}finally{await browser.close();server.closeAllConnections();server.close();}
