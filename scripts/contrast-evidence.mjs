// 实际合成背景采样，不替代完整 WCAG 人工审查。只隐藏文字墨色，保留布局与底图。
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
const output=`${process.env.EVIDENCE_DIR || 'artifacts'}/morning-mist/contrast`;
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4175'},stdio:['ignore','pipe','inherit']});
await once(server.stdout,'data');
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const samples=[];
  for(const width of [1440,375,320])for(const theme of ['light','dark']) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:4175/xiwu-cloud-notes/?lang=zh-CN');
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    for(const [name,selector,minimum] of [
      ['intro','.hero-description',4.5],['about','.about-copy>p:first-child',4.5],['note','.gentle-note>small',4.5],['identity','.identity-avatar',4.5],['link','.pronoun',4.5],['date','.entry-date',4.5],
      ['summary','.card-description',4.5],['tag','.entry-tag',4.5],['card-number','.card-number',4.5],
      ['contact-label','.contact .eyebrow',4.5],['contact-title','.contact h2',3],
      ['contact-email','.contact-email',4.5],['contact-more','.contact-action>.text-link',4.5]
    ]) {
      const el=page.locator(selector).first();
      await el.scrollIntoViewIfNeeded();
      const data=await el.evaluate(el=>{
        const style=getComputedStyle(el), color=style.color, size=parseFloat(style.fontSize);
        const range=document.createRange();range.selectNodeContents(el);
        const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();
        el.style.setProperty('color','transparent','important');
        el.style.setProperty('text-shadow','none','important');
        const rule=document.createElement('style');rule.id='contrast-probe-rule';
        rule.textContent='.contrast-probe * {color:transparent!important;text-shadow:none!important}';
        document.head.append(rule);el.classList.add('contrast-probe');
        return {color,size,textBox:{x:text.x-box.x,y:text.y-box.y,width:text.width,height:text.height}};
      });
      const path=`${output}/${width}-${theme}-${name}.png`;
      const png=await el.screenshot({path});
      const result=await page.evaluate(async ({url,color,textBox:b})=>{
        const image=new Image();image.src=url;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,image.width,image.height).data;
        const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
        const fg=lum(color.match(/\d+/g).slice(0,3).map(Number));
        let ratio=Infinity,background;
        // Range 只覆盖文字区域，排除圆角边缘与没有文字的内边距。
        for(let y=Math.max(0,Math.ceil(b.y));y<Math.min(image.height,Math.floor(b.y+b.height));y+=2) {
          for(let x=Math.max(0,Math.ceil(b.x));x<Math.min(image.width,Math.floor(b.x+b.width));x+=2) {
            const i=(y*image.width+x)*4,bg=[pixels[i],pixels[i+1],pixels[i+2]],l=lum(bg);
            const contrast=(Math.max(fg,l)+.05)/(Math.min(fg,l)+.05);
            if(contrast<ratio){ratio=contrast;background=bg;}
          }
        }
        return {minimumContrast:Number(ratio.toFixed(3)),worstBackground:background};
      },{url:`data:image/png;base64,${png.toString('base64')}`,...data});
      const threshold=name==='contact-title' && data.size<24 ? 4.5 : minimum;
      samples.push({name,width,theme,path,minimum:threshold,...data,...result});
      await el.evaluate(el=>{el.style.removeProperty('color');el.style.removeProperty('text-shadow');el.classList.remove('contrast-probe');document.querySelector('#contrast-probe-rule').remove();});
    }
  }
  await writeFile(`${output}/results.json`,JSON.stringify(samples,null,2)+'\n');
  const failures=samples.filter(s=>s.minimumContrast<s.minimum);
  console.log(`${samples.length} actual background samples; ${failures.length} below threshold`);
  if(failures.length){console.log(failures);process.exitCode=1;}
} finally {await browser.close();server.kill();}
