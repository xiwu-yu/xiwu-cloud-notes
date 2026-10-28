import { chromium } from '@playwright/test';
import { isolateLikes } from './evidence-isolation.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const output=`${process.env.EVIDENCE_DIR || 'artifacts'}/smart-navigation`;
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4175'},stdio:['ignore','pipe','inherit']});
await once(server.stdout,'data');
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await isolateLikes(page);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  page.on('requestfailed',r=>errors.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const base='http://127.0.0.1:4175/xiwu-cloud-notes/';
  const files={};
  for(const file of ['index.html','style.css','motion.css','motion.js','navigation.js','script.js','profile.js']) {
    const current=await readFile(`dist/${file}`);
    let before;
    if(file==='profile.js') {
      try {before=JSON.parse(await readFile(process.env.BASELINE_MEASUREMENTS,'utf8')).files[file].after;} catch {before=null;}
    }
    else {
      try {const old=execFileSync('git',['show',`e8cfef8:dist/${file}`],{stdio:['ignore','pipe','ignore']});before={bytes:old.length,gzip:gzipSync(old).length};}catch{before=null;}
    }
    files[file]={before,after:{bytes:current.length,gzip:gzipSync(current).length}};
  }
  for(const [width,lang,theme] of [[320,'en','light'],[375,'ja','dark'],[768,'zh-TW','light'],[1024,'en','dark'],[1440,'zh-CN','light'],[1440,'en','dark']]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`${base}?lang=${lang}`);
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    await page.screenshot({path:`${output}/home-${width}-${lang}-${theme}.png`});
    await page.locator('.site-header a[href="#resources"]').click();
    await page.screenshot({path:`${output}/anchor-${width}-${lang}-${theme}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}?lang=zh-CN`);
  await page.locator('.card-button').first().click();
  await page.screenshot({path:`${output}/reading-refresh-control.png`});
  await page.locator('.dialog-close').click();
  await page.goto(base);
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.mouse.move(1,850);
  await page.evaluate(()=>new Promise(resolve=>{addEventListener('scroll',resolve,{once:true});scrollTo({top:800,behavior:'instant'});}));
  await page.clock.runFor(50);
  await page.clock.runFor(1850);
  await page.screenshot({path:`${output}/nav-idle-1.9s.png`});
  const at1900ms=await page.locator('.site-header').evaluate(el=>({hidden:el.inert,box:el.getBoundingClientRect().toJSON()}));
  await page.clock.runFor(100);
  await page.screenshot({path:`${output}/nav-idle-2s.png`});
  const at2000ms=await page.locator('.site-header').evaluate(el=>({hidden:el.inert,box:el.getBoundingClientRect().toJSON()}));
  await page.keyboard.press('Tab');
  await page.screenshot({path:`${output}/nav-keyboard-revealed.png`});
  const recovery=await browser.newPage({viewport:{width:375,height:900},reducedMotion:'reduce'});
  const missing=await recovery.goto(`${base}missing/deep/letter.html`);
  if(missing.status()!==404)throw Error('Unknown deep path must return 404');
  await recovery.screenshot({path:`${output}/recovery-404.png`});
  await recovery.close();
  await page.goto(`${base}?lang=en`);
  await page.setViewportSize({width:320,height:900});
  await page.addStyleTag({content:'.site-header .brand>[data-site-name]{font-size:48px}.site-header nav a,.site-header #language-select{font-size:24px}'});
  await page.screenshot({path:`${output}/navigation-text-200-percent.png`});
  await writeFile(`${output}/measurements.json`,JSON.stringify({browser:browser.version(),files,at1900ms,at2000ms,errors},null,2)+'\n');
  if(errors.length)throw Error(JSON.stringify(errors));
} finally {await browser.close();server.kill();}
