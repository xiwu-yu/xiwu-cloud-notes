// 本地预览与截图。服务需已启动；不会访问正式点赞 API 或写入票数。
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {isolateLikes} from './evidence-isolation.mjs';
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:8093/';
const output=process.env.EVIDENCE_DIR || 'work/theme-share';await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const checks=[];
try {
  for(const width of [1440,390,320])for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});
    const page=await context.newPage();await isolateLikes(page);const errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    page.on('requestfailed',r=>errors.push(`${r.url()} ${r.failure()?.errorText}`));
    await page.goto(base+'?lang=zh-CN');await page.locator('#interests').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/after-${width}-${theme}-cards.png`});
    await page.locator('.card-image').first().screenshot({path:`${output}/after-${width}-${theme}-moon.png`});
    await page.locator('.card-button').first().click();await page.locator('#essay-share').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/after-${width}-${theme}-reader.png`});
    await page.locator('#interest-dialog .transparency-toggle').click();
    await page.screenshot({path:`${output}/after-${width}-${theme}-settings.png`});
    await page.keyboard.press('Escape');
    const start=performance.now();await page.locator('#essay-share-card').click();await page.locator('[data-share-download]').waitFor({state:'visible'});
    const generationMs=performance.now()-start;
    await page.screenshot({path:`${output}/after-${width}-${theme}-share.png`});
    const downloading=page.waitForEvent('download');await page.locator('[data-share-download]').click();const download=await downloading;
    await download.saveAs(`${output}/card-${width}-${theme}.png`);
    checks.push({width,theme,generationMs:Number(generationMs.toFixed(1)),errors,documentOverflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)});
    await context.close();
  }
  const files=['dist/style.css','dist/script.js','dist/reading.js','dist/sharing.js','dist/index.html','content/ui.json'];
  const bytes=await Promise.all(files.map(async file=>{const content=await readFile(file);return{file,bytes:content.length,gzip:gzipSync(content).length};}));
  await writeFile(`${output}/after-measurements.json`,JSON.stringify({browser:'Playwright Chromium, browser viewport simulation, not physical mobile hardware',checks,bytes},null,2)+'\n');
  console.log(JSON.stringify({checks,bytes},null,2));
  if(checks.some(check=>check.errors.length || check.documentOverflow>1))process.exitCode=1;
} finally {await browser.close();}
