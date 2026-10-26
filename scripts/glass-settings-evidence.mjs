// 本地材质与布局对照。图片/测量输出到被忽略的 work/，不请求网易云。
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {serve} from './serve.mjs';
const phase=process.argv[2] || 'after',root=resolve(process.argv[3] || 'dist');
const out=`work/glass-unified/${phase}`;await mkdir(out,{recursive:true});
const server=serve({root,port:4187}),browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),issues=[];
  page.on('pageerror',error=>issues.push(error.message));page.on('requestfailed',r=>issues.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)issues.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:4187/');await page.waitForLoadState('networkidle');
  const load=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),paint:performance.getEntriesByType('paint').map(p=>({name:p.name,time:p.startTime})),resources:performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize,transfer:r.transferSize}))}));
  for(const width of [1440,1280,768,390,320])for(const theme of ['light','dark'])for(const lang of ['zh-CN','zh-TW','en','ja']) {
    const suffix=lang==='zh-CN'?'':`-${lang}`;
    await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:4187/?lang=${lang}`);
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    await page.locator('#home').evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`${out}/home-${width}-${theme}${suffix}.png`});
    for(const [name,selector] of [['about','#about'],['archive','#interests'],['cards','#interest-grid'],['resources','#resources'],['faq','.boundaries'],['contact','#contact']]) {
      await page.locator(selector).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight-20,behavior:'instant'}));
      await page.locator(selector).evaluate(async el=>{await Promise.all([...el.querySelectorAll('img')].filter(img=>{const r=img.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).map(img=>img.decode()));});
      if(name==='contact'&&width<=720)await page.locator('.contact-mobile-art img').evaluate(img=>img.decode());
      await page.screenshot({path:`${out}/${name}-${width}-${theme}${suffix}.png`});
    }
    if(phase!=='before') {
      await page.keyboard.press('Tab');await page.locator('.site-header .transparency-toggle').click();
      for(const clarity of [0,55,100]) {
        await page.locator('#glass-clarity').fill(String(clarity));
        await page.locator('#glass-clarity').dispatchEvent('change');
        await page.screenshot({path:`${out}/settings-${width}-${theme}-${clarity}${suffix}.png`});
      }
      await page.locator('#glass-reset').click();await page.locator('#glass-settings-close').click();
    }
  }
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4187/?post=hrt-preface&lang=zh-CN');
  await page.locator('#interest-dialog').waitFor();
  for(const theme of ['light','dark']) {
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.dialog-theme-toggle').click();
    await page.screenshot({path:`${out}/reader-mobile-${theme}.png`});
    if(theme==='light')await page.screenshot({path:`${out}/reader-mobile.png`});
    if(phase!=='before') {
      await page.locator('#interest-dialog .transparency-toggle').click();
      await page.screenshot({path:`${out}/reader-settings-mobile-${theme}.png`});
      if(theme==='light')await page.screenshot({path:`${out}/reader-settings-mobile.png`});
      await page.locator('#glass-settings-close').click();
    }
  }
  const sizes={};for(const file of ['index.html','style.css','appearance.js','script.js','navigation.js','profile.js']) {
    const data=await readFile(`${root}/${file}`);sizes[file]={bytes:data.length,gzip:gzipSync(data).length};
  }
  await writeFile(`${out}/measurements.json`,JSON.stringify({environment:{engine:'Chromium',version:browser.version(),network:'localhost uncompressed; one cold sample, not a production benchmark',mobile:'viewport simulation, not a physical phone'},sizes,load,issues},null,2));
  console.log(JSON.stringify({phase,sizes,issues},null,2));
} finally {await browser.close();server.closeAllConnections();server.close();}
