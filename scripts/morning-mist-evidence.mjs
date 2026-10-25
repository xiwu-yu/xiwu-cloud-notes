// 本地证据；播放器使用标明的宿主 fixture，不代表网易云真实播放验证。
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const phase = process.argv[2] || 'after';
const output = `${process.env.EVIDENCE_DIR || 'artifacts'}/morning-mist/${phase}`;
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: {...process.env, PORT:'4175'}, stdio:['ignore','pipe','inherit'] });
await once(server.stdout, 'data');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}, reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>errors.push(request.url()));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  const base='http://127.0.0.1:4175/xiwu-cloud-notes/';
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(({name,transferSize,decodedBodySize})=>({url:new URL(name).pathname,transferSize,decodedBodySize})));
  const files={};
  for(const file of ['index.html','profile.js','style.css','script.js','archive.js','motion.js','motion.css']) {
    try {const data=await readFile(`dist/${file}`);files[file]={bytes:data.length,gzip:gzipSync(data).length};} catch {}
  }
  const images=()=>page.locator('img').evaluateAll(async images=>{
    images.forEach(image=>image.loading='eager');
    await Promise.all(images.map(image=>image.decode().catch(()=>{})));
  });
  for(const [width,lang,theme] of [[1440,'zh-CN','light'],[375,'ja','dark'],[320,'en','light'],[768,'zh-TW','light']]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`${base}?lang=${lang}`);
    await page.evaluate(theme=>{localStorage.setItem('little-corner-theme',theme);},theme);
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    await images();
    await page.screenshot({path:`${output}/home-${width}-${lang}-${theme}.png`,fullPage:true});
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`${output}/viewport-${width}-${lang}-${theme}.png`});
    if(width===1440) {
      await page.locator('#interests').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${output}/cards-desktop.png`});
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}posts/xiwu/en.html`);
  await images();
  await page.screenshot({path:`${output}/static-reading.png`,fullPage:true});
  if (phase==='after') {
    await page.locator('.theme-toggle').click();
    await page.screenshot({path:`${output}/static-reading-dark.png`,fullPage:true});
  }
  await page.route('https://music.163.com/outchain/player?**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><style>body{margin:0;font:16px system-ui;background:#fff;color:#333}header,footer{padding:14px;background:#e5eff7}main{height:330px;padding:12px;box-sizing:border-box}</style><header>HOST FIXTURE · Top / 顶部</header><main>Official player document mocked.<br>仅用于宿主布局验证，不代表真实音频。</main><footer>Bottom / 底部 · Native controls area</footer>'}));
  if (phase==='after') {
    await page.setViewportSize({width:1440,height:900});
    await page.goto(`${base}?lang=zh-CN`);
    await page.locator('#music-toggle').click();
    await page.frameLocator('#music-frame').getByText('HOST FIXTURE', {exact:false}).waitFor();
    await page.screenshot({path:`${output}/music-desktop.png`});
  }
  await page.setViewportSize({width:1440,height:360});
  await page.goto(`${base}?lang=zh-CN`);
  if(await page.locator('html').getAttribute('data-theme')!=='light')await page.locator('.theme-toggle').click();
  await page.locator('#music-toggle').click();
  await page.frameLocator('#music-frame').getByText('HOST FIXTURE', {exact:false}).waitFor();
  await page.screenshot({path:`${output}/music-short-top.png`});
  const geometry=await page.locator('#music-panel').evaluate(panel=>{
    const viewport=panel.querySelector('.music-frame-viewport');
    const frame=panel.querySelector('iframe');
    return {panel:panel.getBoundingClientRect().toJSON(),clientHeight:panel.clientHeight,scrollHeight:panel.scrollHeight,viewport:viewport.getBoundingClientRect().toJSON(),frame:frame.getBoundingClientRect().toJSON(),scrollExtent:viewport.scrollHeight-viewport.clientHeight};
  });
  await page.locator('.music-frame-viewport').evaluate(el=>el.scrollTop=el.scrollHeight);
  await page.screenshot({path:`${output}/music-short-bottom.png`});
  await writeFile(`${output}/measurements.json`,JSON.stringify({environment:{engine:'Chromium',version:browser.version(),viewport:'1440×900',network:'local uncompressed HTTP',reducedMotion:true},files,resources,totalTransferred:resources.reduce((sum,r)=>sum+r.transferSize,0),geometry,errors},null,2));
} finally {await browser.close();server.kill();}
