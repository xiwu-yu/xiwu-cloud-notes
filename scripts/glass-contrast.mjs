// 对截图中的真实合成背景逐点采样；隐藏墨色而不改变背景、尺寸或布局。
import {chromium} from '@playwright/test';import{serve}from'./serve.mjs';import{mkdir,writeFile}from'node:fs/promises';
const out='work/glass-v3/contrast';await mkdir(out,{recursive:true});const server=serve({port:4183}),browser=await chromium.launch(),samples=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await p.route('https://music.163.com/**outchain/player?*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><p>Official lifecycle fixture</p>'}));
 for(const width of [1440,390,320])for(const theme of ['light','dark'])for(const lang of ['zh-CN','zh-TW','en','ja']){
  await p.setViewportSize({width,height:1024});await p.goto(`http://127.0.0.1:4183/?lang=${lang}`);
  if(await p.locator('html').getAttribute('data-theme')!==theme)await p.locator('.site-header .theme-toggle').click();
  for(const [name,selector]of[['hero-blue','.hero-button-blue>span'],['hero-pink','.hero-button-pink>span'],['filter','.filter.active'],['date','.card-content .entry-date'],['summary','.card-description'],['photo-label','.contact-label'],['photo-title','.contact h2'],['email','.contact-email']]){
   const el=p.locator(selector).first();await el.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForLoadState('networkidle');
   if(name.startsWith('photo')||name==='email')await p.locator('.contact-mobile-art img').evaluate(i=>{if(getComputedStyle(i.parentElement).display!=='none')return i.decode();});
   await probe(el,{width,theme,lang,name});
  }
  await p.locator('#music-toggle').click();
  for(const[name,selector]of[['music-title','.music-drag-handle>span'],['music-author','.music-byline'],['music-help','.music-help summary'],['music-link','.music-fallback a']])await probe(p.locator(selector),{width,theme,lang,name});
  await p.locator('#music-close').click();
 }
 await writeFile(`${out}/results.json`,JSON.stringify(samples,null,2));const failures=samples.filter(s=>s.minimumContrast<4.5);console.log(JSON.stringify({samples:samples.length,minimum:Math.min(...samples.map(s=>s.minimumContrast)),failures},null,2));if(failures.length)process.exitCode=1;
 async function probe(el,info){
  const data=await el.evaluate(el=>{
   const color=getComputedStyle(el).color,rect=el.getBoundingClientRect(),boxes=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){if(!walker.currentNode.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const r of range.getClientRects())boxes.push({x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height});}
   el.dataset.probeColor=el.style.color;el.style.setProperty('color','transparent','important');
   const rule=document.createElement('style');rule.id='glass-probe';rule.textContent='.glass-probe,.glass-probe *{color:transparent!important;text-shadow:none!important}';document.head.append(rule);el.classList.add('glass-probe');
   return{color,boxes};
  });
  // computed style is live: capture the original color separately before making ink transparent.
  const png=await el.screenshot();
  const result=await p.evaluate(async({image,color,boxes})=>{
   const img=new Image();img.src=image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const bytes=ctx.getImageData(0,0,c.width,c.height).data;
   const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const fg=lum(color.match(/[\d.]+/g).slice(0,3).map(Number));let min=Infinity,bg;
   for(const b of boxes)for(let y=Math.max(0,Math.ceil(b.y));y<Math.min(c.height,Math.floor(b.y+b.height));y+=2)for(let x=Math.max(0,Math.ceil(b.x));x<Math.min(c.width,Math.floor(b.x+b.width));x+=2){const i=(y*c.width+x)*4,rgb=[bytes[i],bytes[i+1],bytes[i+2]],v=lum(rgb),ratio=(Math.max(fg,v)+.05)/(Math.min(fg,v)+.05);if(ratio<min){min=ratio;bg=rgb;}}
   return{minimumContrast:+min.toFixed(3),worstBackground:bg};
  },{image:`data:image/png;base64,${png.toString('base64')}`,...data});
  await el.evaluate(el=>{el.style.removeProperty('color');if(el.dataset.probeColor)el.style.color=el.dataset.probeColor;delete el.dataset.probeColor;el.classList.remove('glass-probe');document.querySelector('#glass-probe').remove();});
  samples.push({...info,color:data.color,...result});
 }
}finally{await browser.close();server.closeAllConnections();server.close();}
