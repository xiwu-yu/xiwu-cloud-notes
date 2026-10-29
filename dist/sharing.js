// 在本机生成真实 PNG，不上传文章、不请求外部图片或分享服务。
(() => {
  let panel, opener, parentDialog, current, imageUrl, file, generation = 0;
  const $ = selector => panel.querySelector(selector);
  const say = value => { $('[data-share-status]').textContent = value; };
  function wrap(ctx, text, width, maxLines, lang) {
    const segments = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(lang, {granularity:'word'}).segment(text)].map(part => part.segment)
      : Array.from(text);
    // 标点跟随前一词，避免中文句号或闭引号独占下一行。
    const units = [];
    for (const segment of segments) {
      if (units.length && /^[，。！？、；：…,.!?;:）〉》」』】”’]+$/u.test(segment)) units[units.length-1] += segment;
      else units.push(segment);
    }
    const lines = []; let line = '';
    for (const unit of units) {
      // 长 URL/单词按 Unicode 码点折行，不切断 UTF-16 代理对。
      const parts = ctx.measureText(unit).width > width ? Array.from(unit) : [unit];
      for (const part of parts) {
        if (line && ctx.measureText(line + part).width > width) { lines.push(line.trim()); line = ''; }
        line += part;
      }
    }
    if (line.trim()) lines.push(line.trim());
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = Array.from(lines[maxLines-1]);
      while (last.length && ctx.measureText(last.join('') + '…').width > width) last.pop();
      lines[maxLines-1] = last.join('').trimEnd() + '…';
    }
    return lines;
  }
  function lines(ctx, text, {x,y,width,size,lineHeight,maxLines,color,font='sans-serif',lang}) {
    ctx.font = `${size}px ${font}`; ctx.fillStyle = color;
    const rows = wrap(ctx, text, width, maxLines, lang);
    rows.forEach((line,i) => ctx.fillText(line,x,y+i*lineHeight));
    return y + rows.length*lineHeight;
  }
  async function render(data) {
    await document.fonts?.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    if (!ctx) throw Error('canvas');
    const serif = '"Songti SC","STSong","Noto Serif CJK SC","Noto Serif CJK JP",Georgia,serif';
    const measure = (text,font,width,maxLines) => {
      ctx.font = font;
      return Math.max(1,wrap(ctx,text,width,maxLines,data.lang).length);
    };
    // 3:4 竖版：按真实字形排版，给手机标题留出更宽的行长。
    const titleRows = measure(data.title,`66px ${serif}`,772,4);
    const descriptionY = 252 + (titleRows-1)*88 + 62;
    const descriptionRows = measure(data.description,'36px sans-serif',772,3);
    const contentBottom = descriptionY + (descriptionRows-1)*52 + 34;
    const dividerY = 1030;
    // 插画只占文字与页脚间的空间，长标题也不会和云朵重叠。
    const artScale = Math.min(1.12,(dividerY-contentBottom-88)/368);
    const artX = (900-610*artScale)/2-50*artScale;
    const artY = (contentBottom+dividerY-368*artScale)/2-110*artScale;
    const gradient = ctx.createLinearGradient(0,0,900,1200);
    gradient.addColorStop(0,'#e1f0f7'); gradient.addColorStop(.48,'#fbfaf8'); gradient.addColorStop(1,'#f5dee9');
    ctx.fillStyle = gradient; ctx.fillRect(0,0,900,1200);
    // 沿用站点云朵轮廓，用矢量轻绘；不把 SVG 的大模糊滤镜栅格化进导出图。
    ctx.save(); ctx.translate(artX,artY); ctx.scale(artScale,artScale); ctx.globalAlpha = .55;
    ctx.strokeStyle='#a8b7ce';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(345,280,170,Math.PI*1.05,Math.PI*1.94);ctx.stroke();
    ctx.fillStyle = '#f2e4ba';ctx.beginPath();ctx.arc(370,213,46,0,2*Math.PI);ctx.fill();
    for (const [shape,color] of [
      ['M70 345c-17-34 18-62 50-51-2-65 82-94 118-40 22-24 64-11 66 22 41-21 87 8 84 48 40-5 67 25 47 54H92c-24 0-38-17-22-33Z','#b9dae9'],
      ['M300 330c-7-35 18-59 48-55 9-53 82-67 112-24 25-24 70-9 75 27 43-9 74 18 70 52 33 1 54 25 37 53H328c-29 0-43-31-28-53Z','#edcbdc'],
      ['M122 425c-23-29-7-68 31-71 6-43 62-59 90-24 20-54 101-49 115 7 33-15 70 10 70 41 43-12 80 17 75 47 29 5 48 30 34 53H144c-35 0-47-34-22-53Z','#ffffff']
    ]) {ctx.fillStyle=color;ctx.fill(new Path2D(shape));}
    ctx.restore();
    ctx.strokeStyle = '#95aabd66'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(24,24,852,1152,36); ctx.stroke();
    const draw = (text, options) => lines(ctx,text,{...options,lang:data.lang});
    draw('☁  '+data.author+' · '+data.ui['share.brand'],{x:64,y:96,width:772,size:30,lineHeight:40,maxLines:1,color:'#53627f'});
    draw(data.category,{x:64,y:162,width:772,size:28,lineHeight:38,maxLines:1,color:'#884562'});
    draw(data.title,{x:64,y:252,width:772,size:66,lineHeight:88,maxLines:4,color:'#354052',font:serif});
    draw(data.description,{x:64,y:descriptionY,width:772,size:36,lineHeight:52,maxLines:3,color:'#46546a'});
    ctx.strokeStyle = '#b7c6d6'; ctx.lineWidth = 1; ctx.beginPath();ctx.moveTo(64,dividerY);ctx.lineTo(836,dividerY);ctx.stroke();
    draw(data.date,{x:64,y:1080,width:772,size:28,lineHeight:38,maxLines:1,color:'#566174'});
    draw(data.url,{x:64,y:1128,width:772,size:24,lineHeight:32,maxLines:2,color:'#46546a'});
    // 900×1200 的一次性导出，不依赖浏览器的空闲 PNG 编码任务。
    const encoded = canvas.toDataURL('image/png').split(',')[1];
    if (!encoded) throw Error('PNG export');
    return {blob:new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'image/png'}),height:canvas.height};
  }
  function translate(ui) {
    panel.querySelectorAll('[data-share-text]').forEach(node => { node.textContent = ui[`share.${node.dataset.shareText}`]; });
    $('[data-share-close]').setAttribute('aria-label',ui['share.close']);
    $('[data-share-preview]').alt = ui['share.preview'];
  }
  function close() { if (panel?.open) panel.close(); }
  async function open(data, button) {
    if (!panel || panel.open) return;
    current = data; opener = button; parentDialog = button.closest('dialog');
    (parentDialog || document.body).append(panel); // 进入原生顶层，阅读弹窗内也可操作。
    const ticket = ++generation;
    translate(data.ui); panel.lang = document.documentElement.lang; panel.dataset.articleLang = data.lang;
    file = null; $('[data-share-preview]').hidden = true; $('[data-share-download]').hidden = true; $('[data-share-native]').hidden = true;
    $('#article-share-url').value = data.url;
    say(data.ui['share.loading']); panel.showModal(); $('[data-share-close]').focus({preventScroll:true});
    try {
      const {blob,height} = await render(data);
      if (ticket !== generation || !panel.open) return;
      imageUrl = URL.createObjectURL(blob);
      const filename = `${data.id}-${data.lang}-share.png`.replace(/[^a-zA-Z0-9._-]/g,'-');
      file = new File([blob],filename,{type:'image/png'});
      const image = $('[data-share-preview]'); image.height = height; image.src = imageUrl;
      await image.decode();
      if (ticket !== generation || !panel.open) return;
      image.hidden = false;
      const download = $('[data-share-download]'); download.href = imageUrl; download.download = filename; download.hidden = false;
      let native = false;
      try { native = !!navigator.canShare?.({files:[file]}); } catch {}
      $('[data-share-native]').hidden = !native;
      say(data.ui['share.ready']);
    } catch { if (ticket === generation && panel.open) say(data.ui['share.error']); }
  }
  async function copy(url, ui, status) {
    try { await navigator.clipboard.writeText(url); status.textContent = ui['dialog.shareCopied']; }
    catch { status.textContent = ui['dialog.shareManual']+' '+url; }
    status.hidden = false;
  }
  document.addEventListener('DOMContentLoaded', () => {
    panel = document.querySelector('#article-share-panel'); if (!panel) return;
    $('[data-share-close]').addEventListener('click',close);
    panel.addEventListener('click',event => {
      if (event.target !== panel) return;
      const box = panel.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    // close 不冒泡；捕获父阅读器关闭，撤销尚未结束的异步导出。
    document.addEventListener('close',event => { if (event.target === parentDialog) close(); },true);
    panel.addEventListener('close', () => {
      ++generation;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = null; file = null; $('[data-share-preview]').removeAttribute('src');
      document.body.append(panel);
      if (opener?.isConnected && (!parentDialog || parentDialog.open)) opener.focus({preventScroll:true});
      parentDialog = null;
    });
    $('[data-share-copy]').addEventListener('click',() => copy(current.url,current.ui,$('[data-share-status]')));
    $('[data-share-native]').addEventListener('click',async () => {
      if (!file) return;
      try { await navigator.share({files:[file],title:current.title}); }
      catch(error) { if(error.name !== 'AbortError') say(current.ui['share.nativeError']); }
    });
    document.querySelectorAll('[data-share-article]').forEach(container => {
      const data = container.dataset;
      // 静态页面的文案来自构建模板，不依赖 profile.js。
      const ui = Object.fromEntries([...panel.querySelectorAll('[data-share-text]')].map(node => [`share.${node.dataset.shareText}`,node.textContent]));
      Object.assign(ui,JSON.parse(container.getAttribute('data-share-strings')));
      const item = {id:data.shareId,lang:data.shareLang,title:data.shareTitle,description:data.shareDescription,category:data.shareCategory,date:data.shareDate,author:data.shareAuthor,url:data.shareUrl,ui};
      const trigger = container.querySelector('[data-static-share]');trigger.hidden = false; trigger.addEventListener('click',() => open(item,trigger));
      const link = container.querySelector('[data-static-copy]');link.hidden = false; link.addEventListener('click',() => copy(item.url,ui,container.querySelector('[data-static-share-status]')));
    });
    const trigger = document.querySelector('#essay-share-card'); if (trigger) trigger.hidden = false;
  }, {once:true});
  window.articleShare = {open};
})();
