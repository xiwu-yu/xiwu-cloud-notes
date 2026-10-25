// 开发时显式运行以重生成自有封面；正常 pnpm build 只读取已提交 PNG，不依赖浏览器。
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
const art=await readFile(new URL('../dist/assets/cloudscape.svg',import.meta.url),'utf8');
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:linear-gradient(135deg,#eaf3f9,#fbfaf8 46%,#f6e4ed);color:#354052;font-family:system-ui,sans-serif;display:flex;align-items:center;padding:80px;position:relative;overflow:hidden}main{z-index:1;width:600px}small{font-size:18px;letter-spacing:5px;color:#566174}h1{font-size:66px;font-weight:500;letter-spacing:8px;margin:30px 0 22px}p{font-size:22px;letter-spacing:3px;color:#884562}figure{position:absolute;margin:0;width:620px;right:-20px;bottom:45px;opacity:.9}figure svg{width:100%;height:auto}footer{position:absolute;bottom:42px;left:80px;color:#566174;font-size:18px;letter-spacing:2px}</style><main><small>LETTERS IN THE CLOUDS</small><h1>云间来信</h1><p>夕雾 · 随笔与日常</p></main><figure>${art}</figure><footer>cloud.xiwu.space</footer>`);
  await page.screenshot({path:fileURLToPath(new URL('../dist/assets/share-cover.png',import.meta.url))});
}finally{await browser.close();}
