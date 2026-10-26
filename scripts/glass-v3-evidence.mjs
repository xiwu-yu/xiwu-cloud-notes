// 同位置/同视口/同主题的本地对照；外部播放器 fixture 仅用于宿主截图。
import {chromium} from '@playwright/test';
import {serve} from './serve.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
const phase=process.argv[2]||'after',root=resolve(process.argv[3]||'dist'),out=`${process.env.EVIDENCE_DIR||'work/glass-v3'}/${phase}`;
await mkdir(out,{recursive:true});const server=serve({root,port:4182}),browser=await chromium.launch();
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));
 await p.route('https://music.163.com/**outchain/player?*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><body style="margin:0;background:white;font:14px system-ui;color:#354052"><p style="padding:20px;background:#edf1f6">Official iframe · layout fixture</p><ol><li>使一颗心免于哀伤</li><li>僕が死のうと思ったのは</li><li>この世界を愛したい</li><li>烟雨行舟</li></ol><p style="margin:230px 20px 0">Iframe bottom · 450px lifecycle fixture</p></body></html>'}));
 for(const width of [1440,390,320])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:width<500?1024:900});await p.goto('http://127.0.0.1:4182/?lang=zh-CN');
  if(await p.locator('html').getAttribute('data-theme')!==theme)await p.locator('.site-header .theme-toggle').click();
  await p.waitForLoadState('networkidle');await p.screenshot({path:`${out}/home-${width}-${theme}.png`});
  for(const [name,selector] of [['archive','#interests'],['cards','#interest-grid'],['contact','#contact']]){
   await p.locator(selector).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight-16,behavior:'instant'}));await p.waitForLoadState('networkidle');
   if(name==='contact'&&width<500)await p.locator('.contact-mobile-art img').evaluate(img=>img.decode());
   await p.screenshot({path:`${out}/${name}-${width}-${theme}.png`});
  }
  await p.locator('#music-toggle').click();await p.frameLocator('#music-frame').locator('li').first().waitFor();await p.screenshot({path:`${out}/music-photo-${width}-${theme}.png`});await p.locator('#music-close').click();
 }
 const sizes={};for(const file of ['index.html','style.css','script.js','appearance.js','profile.js','music-drag.js']){const b=await readFile(`${root}/${file}`);sizes[file]={bytes:b.length,gzip:gzipSync(b).length};}
 await writeFile(`${out}/measurements.json`,JSON.stringify({engine:browser.version(),sizes,errors,music:'Host screenshot uses explicitly labelled lifecycle fixture, not proof of real playback'},null,2));
}finally{await browser.close();server.closeAllConnections();server.close();}
