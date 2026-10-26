// 对实际合成背景采样，不以 token 对比度替代材质验收。
import {chromium} from '@playwright/test';
import {serve} from './serve.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out='work/glass-unified/contrast';await mkdir(out,{recursive:true});
const server=serve({port:4183}),browser=await chromium.launch(),samples=[];
try {
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 for(const width of [1440,390,320])for(const theme of ['light','dark'])for(const lang of ['zh-CN','zh-TW','en','ja']) {
  await p.setViewportSize({width,height:900});await p.goto(`http://127.0.0.1:4183/?lang=${lang}`);
  if(await p.locator('html').getAttribute('data-theme')!==theme)await p.locator('.site-header .theme-toggle').click();
  for(const clarity of [0,55,100]) {
   await p.keyboard.press('Tab');await p.locator('.site-header .transparency-toggle').click();
   await p.locator('#glass-clarity').fill(String(clarity));await p.locator('#glass-clarity').dispatchEvent('change');
   for(const [name,selector] of [['settings-label','.glass-range-label label'],['settings-hint','.settings-hint'],['settings-status','[data-glass-reason="auto"]']])await probe(p.locator('#glass-settings').locator(selector),{width,theme,lang,clarity,name});
   await p.locator('#glass-settings-close').click();
   for(const [name,selector] of [['hero-blue','.hero-button-blue>span'],['hero-pink','.hero-button-pink>span'],['identity','#identity-pronouns'],['intro','#profile-about'],['filter','.filter.active'],['card-summary','.card-description'],['resource','.resource-list p'],['resource-link','.resource-type'],['faq','.faq summary'],['email','.contact-email']]) {
    const el=p.locator(selector).first();await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    if(name==='email'&&width<=720)await p.locator('.contact-mobile-art img').evaluate(i=>i.decode());
    await probe(el,{width,theme,lang,clarity,name});
   }
  }
 }
 await writeFile(`${out}/results.json`,JSON.stringify(samples,null,2));
 const failures=samples.filter(s=>s.minimumContrast<4.5);
 const result={samples:samples.length,minimum:Math.min(...samples.map(s=>s.minimumContrast)),failures,method:'Chromium screenshots of actual composed background under text ranges, text hidden without layout changes, only visible/unoccluded text ranges; finite sample, not all possible scrolling backdrops'};
 await writeFile(`${out}/summary.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
 async function probe(el,info) {
  const data=await el.evaluate(el=>{
   const color=getComputedStyle(el).color,boxes=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()) {
    if(!walker.currentNode.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(walker.currentNode);
    for(const r of range.getClientRects())boxes.push({x:r.x,y:r.y,width:r.width,height:r.height});
   }
   const original=el.style.color;
   el.style.setProperty('color','transparent','important');
   const rule=document.createElement('style');rule.id='glass-probe';rule.textContent='.glass-probe,.glass-probe *{color:transparent!important;text-shadow:none!important}';document.head.append(rule);el.classList.add('glass-probe');
   return {color,boxes,original};
  });
  // 只测实际可见区域：长段落在小屏可能被 sticky 导航遮住，不能把导航字当作其背景。
  const png=await p.screenshot();
  const result=await p.evaluate(async({image,color,boxes})=>{
   const img=new Image();img.src=image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const bytes=ctx.getImageData(0,0,c.width,c.height).data;
   const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   const fg=lum(color.match(/[\d.]+/g).slice(0,3).map(Number)),target=document.querySelector('.glass-probe');let min=Infinity,bg,points=0;
   for(const b of boxes)for(let y=Math.max(0,Math.ceil(b.y));y<Math.min(c.height,Math.floor(b.y+b.height));y+=2)for(let x=Math.max(0,Math.ceil(b.x));x<Math.min(c.width,Math.floor(b.x+b.width));x+=2) {
    if(!target.contains(document.elementFromPoint(x,y)))continue;
    const i=(y*c.width+x)*4,rgb=[bytes[i],bytes[i+1],bytes[i+2]],v=lum(rgb),ratio=(Math.max(fg,v)+.05)/(Math.min(fg,v)+.05);
    points++;if(ratio<min){min=ratio;bg=rgb;}
   }
   if(!points)throw new Error('No visible text background samples');
   return {minimumContrast:+min.toFixed(3),worstBackground:bg,points};
  },{image:`data:image/png;base64,${png.toString('base64')}`,...data});
  await el.evaluate((el,original)=>{el.style.removeProperty('color');if(original)el.style.color=original;el.classList.remove('glass-probe');document.querySelector('#glass-probe').remove();},data.original);
  samples.push({...info,color:data.color,...result});
 }
}finally{await browser.close();server.closeAllConnections();server.close();}
