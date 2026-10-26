// 本地视觉对照；没有上传/发布，也没有伪造原生播放器截图。
import {chromium} from '@playwright/test';
import {serve} from './serve.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
const phase=process.argv[2]||'after',root=resolve(process.argv[3]||'dist');
const output=`work/glass-v2/${phase}`;await mkdir(output,{recursive:true});
const server=serve({root,port:4180}),browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  for(const [width,theme] of [[1440,'light'],[1440,'dark'],[390,'light'],[320,'dark']]){
    await page.setViewportSize({width,height:width<500?844:900});await page.goto('http://127.0.0.1:4180/?lang=zh-CN');
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.site-header .theme-toggle').click();
    await page.screenshot({path:`${output}/home-${width}-${theme}.png`});
    for(const section of ['interests','contact']){
      await page.locator(`#${section}`).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight-16,behavior:'instant'}));
      await page.waitForLoadState('networkidle');
      if(section==='contact'&&width<=720)await page.locator('.contact-mobile-art img').evaluate(img=>img.decode());
      await page.screenshot({path:`${output}/${section}-${width}-${theme}.png`});
    }
    await page.locator('.card-button').first().click();await page.screenshot({path:`${output}/reader-${width}-${theme}.png`});await page.keyboard.press('Escape');
  }
  const sizes={};for(const file of ['index.html','style.css','script.js','profile.js','music-drag.js']){try{const b=await readFile(`${root}/${file}`);sizes[file]={bytes:b.length,gzip:gzipSync(b).length};}catch{sizes[file]={bytes:0,gzip:0};}}
  await writeFile(`${output}/measurements.json`,JSON.stringify({engine:browser.version(),sizes,errors},null,2));
}finally{await browser.close();server.closeAllConnections();server.close();}
