// 同尺寸的本地前后截图与真实字节测量；不请求网易云音频。
import {chromium} from '@playwright/test';
import {serve} from './serve.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const phase=process.argv[2] || 'after',root=process.argv[3] || 'dist',out='work/reading-v1/'+phase;
await mkdir(out,{recursive:true});
const server=serve({root,port:4189}),browser=await chromium.launch(),issues=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 page.on('pageerror',e=>issues.push(e.message));page.on('requestfailed',r=>issues.push(r.url()));page.on('response',r=>{if(r.status()>=400)issues.push(r.status()+' '+r.url());});
 for(const width of [1440,390,320])for(const lang of ['zh-CN','zh-TW','en','ja'])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:900});
  const base='http://127.0.0.1:4189/',suffix=width+'-'+lang+'-'+theme;
  await page.goto(base+'posts/hrt-preface/'+lang+'.html');
  if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
  await page.screenshot({path:out+'/static-'+suffix+'.png'});
  const toc=page.locator('.reader-toc');
  if(await toc.count() && width<1100){await toc.locator('summary').click();await page.screenshot({path:out+'/toc-'+suffix+'.png'});await toc.locator('summary').click();}
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.screenshot({path:out+'/bottom-'+suffix+'.png'});
  await page.goto(base+'?lang='+lang);
  if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.site-header .theme-toggle').click();
  await page.locator('#archive-search').fill(lang==='en'?'games':lang==='ja'?'ゲーム':lang==='zh-TW'?'遊戲':'游戏');
  await page.locator('#interests').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight-16,behavior:'instant'}));
  const result=page.locator('.card-button').first();
  if(await result.count())await result.evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight-16,behavior:'instant'}));
  await page.screenshot({path:out+'/search-'+suffix+'.png'});
  const card=page.locator('.card-button').first();
  if(await card.count()){await card.click();await page.screenshot({path:out+'/dialog-'+suffix+'.png'});await page.locator('.dialog-close').click();}
  await page.locator('.resource-list').evaluate(el=>{const box=el.getBoundingClientRect();scrollTo({top:scrollY+box.top-innerHeight+220,behavior:'instant'});});
  await page.screenshot({path:out+'/resources-'+suffix+'.png'});
 }
 const files={};for(const file of ['index.html','style.css','archive.js','reader.js','script.js','profile.js']){
  try{const data=await readFile(root+'/'+file);files[file]={bytes:data.length,gzip:gzipSync(data).length};}catch{}
 }
 await writeFile(out+'/measurements.json',JSON.stringify({browser:browser.version(),mobile:'viewport simulation, not a physical phone',files,issues},null,2));
 console.log(JSON.stringify({phase,files,issues},null,2));if(issues.length)process.exitCode=1;
}finally{await browser.close();server.closeAllConnections();server.close();}
