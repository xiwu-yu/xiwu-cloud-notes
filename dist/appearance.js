// 可失败的外观增强。正文、静态文章和链接不依赖本脚本。
(() => {
  const root = document.documentElement;
  const key = 'xiwu-glass-appearance', legacyKey = 'xiwu-reduce-transparency';
  const defaults = {version:1, enabled:true, clarity:55};
  const system = matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const forced = matchMedia('(forced-colors: active)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const supported = CSS.supports('background','color-mix(in srgb,white 50%,transparent)') && (CSS.supports('backdrop-filter','blur(1px)') || CSS.supports('-webkit-backdrop-filter','blur(1px)'));
  const frames = new Map();
  let panel, opener, parentDialog, previewFrame = 0, openingAnimation;

  function readPreference() {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const value = JSON.parse(raw);
        if (value?.version === 1 && typeof value.enabled === 'boolean' && typeof value.clarity === 'number' && Number.isFinite(value.clarity)) {
          return {version:1, enabled:value.enabled, clarity:Math.round(Math.max(0,Math.min(100,value.clarity)))};
        }
      }
    } catch {}
    let enabled = true;
    try { enabled = localStorage.getItem(legacyKey) !== 'true'; } catch {}
    return {...defaults, enabled};
  }
  let preference = readPreference();
  const reason = () => forced.matches ? 'forced' : contrast.matches ? 'contrast' : system.matches ? 'system' : !supported ? 'unsupported' : !preference.enabled ? 'off' : 'auto';
  function resetLights() {
    for (const surface of document.querySelectorAll('[data-glass-light]')) {
      cancelAnimationFrame(frames.get(surface));
      surface.style.removeProperty('--light-x'); surface.style.removeProperty('--light-y');
    }
    frames.clear();
  }
  function apply() {
    const effective = reason(), t = (preference.clarity / 100) ** .85;
    // 一份用户设置，三组底色映射。仅材质底层透色，前景 opacity 始终为 1。
    for (const [kind,[thick,clear]] of Object.entries({control:[.76,.34],content:[.90,.62],media:[.62,.24]})) {
      root.style.setProperty(`--glass-${kind}-alpha`, (thick + (clear-thick)*t).toFixed(3));
    }
    root.style.setProperty('--glass-blur', `${(18-6*t).toFixed(1)}px`);
    root.dataset.glass = effective === 'auto' ? 'on' : 'off';
    root.dataset.transparency = effective === 'auto' ? 'auto' : 'reduced';
    root.dataset.glassReason = effective;
    root.dataset.glassClarity = String(preference.clarity);
    if (panel) {
      panel.querySelector('#glass-enabled').checked = preference.enabled;
      panel.querySelector('#glass-adjustments').hidden = !preference.enabled;
      panel.querySelector('#glass-clarity').value = preference.clarity;
      panel.querySelector('#glass-clarity-value').value = preference.clarity;
      panel.querySelectorAll('[data-glass-preset]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.glassPreset) === preference.clarity)));
      panel.querySelectorAll('[data-glass-reason]').forEach(message => { message.hidden = message.dataset.glassReason !== effective; });
    }
    if (effective !== 'auto') resetLights();
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(preference));
      localStorage.setItem(legacyKey, String(!preference.enabled));
    } catch {} // 存储不可用时仍保留当前文档的设置。
  }
  function commit() { cancelAnimationFrame(previewFrame); previewFrame = 0; apply(); save(); }
  function markOpen(value) {
    root.dataset.appearanceOpen = String(value);
    document.querySelectorAll('.transparency-toggle').forEach(button => button.setAttribute('aria-expanded', String(value && button === opener)));
    document.dispatchEvent(new CustomEvent('site:appearance-panel', {detail:{open:value}}));
  }
  function positionPanel() {
    if (!panel?.open) return;
    if (innerWidth <= 720) {
      panel.style.removeProperty('left'); panel.style.removeProperty('top');
      return;
    }
    const anchor = opener.getBoundingClientRect(), box = panel.getBoundingClientRect();
    const left = Math.max(12,Math.min(innerWidth-box.width-12,anchor.right-box.width));
    const below = anchor.bottom+12;
    const top = below+box.height <= innerHeight-12 ? below : Math.max(12,Math.min(innerHeight-box.height-12,anchor.top-box.height-12));
    panel.style.left = `${left}px`; panel.style.top = `${top}px`;
  }
  const closePanel = () => { if(panel?.open) panel.close(); };
  const parentClosing = event => { if(event.target === parentDialog)closePanel(); };
  function openPanel(button) {
    if (!panel || panel.open) return;
    opener = button;
    parentDialog = button.closest('dialog');
    // 原生嵌套 modal 进入浏览器顶层；不能靠 z-index 穿过文章 dialog。
    (parentDialog || document.body).append(panel);
    // 捕获阶段先移除子 modal 的 inert，父阅读器才能恢复到文章链接的焦点。
    parentDialog?.addEventListener('close', parentClosing, true);
    apply(); panel.showModal(); markOpen(true); positionPanel();
    if (!motion.matches) openingAnimation = panel.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
    panel.querySelector('#glass-enabled').focus({preventScroll:true});
  }
  function installFAQ() {
    document.querySelectorAll('.faq details').forEach(details => {
      const summary = details.querySelector('summary'), answer = details.querySelector('.faq-answer');
      if (!answer) return;
      let animation, target = details.open;
      const finish = () => { details.open = target; answer.style.removeProperty('overflow'); animation = null; };
      summary.addEventListener('click', event => {
        if (motion.matches) return; // 原生 details 是无 JS 与减少动态时的回退。
        event.preventDefault();
        const current = details.open ? answer.getBoundingClientRect().height : 0;
        target = !target; animation?.cancel(); details.open = true;
        answer.style.overflow = 'hidden';
        animation = answer.animate([{height:`${current}px`,opacity:target ? .5 : 1},{height:target?`${answer.scrollHeight}px`:'0px',opacity:target?1:.5}],{duration:240,easing:'ease-out'});
        animation.onfinish = finish;
      });
      details.addEventListener('toggle',()=>{ if(!animation) target = details.open; });
      motion.addEventListener('change',()=>{ if(animation){animation.cancel();finish();} });
    });
  }
  apply(); // 样式加载前恢复，避免先透明再变实色。

  function installChoiceIndicator(selector,buttonSelector,kind) {
    const group=document.querySelector(selector);
    if(!group)return;
    const indicator=document.createElement('span');
    indicator.className=`${kind}-indicator glass-surface`;indicator.setAttribute('aria-hidden','true');indicator.hidden=true;
    let frame=0,animation=null,last=null,animateNext=false;
    const queue=animate=>{animateNext=animateNext||animate;if(!frame)frame=requestAnimationFrame(()=>{frame=0;measure(animateNext);animateNext=false;});};
    const measure=animate=>{
      if(!group.contains(indicator))group.prepend(indicator);
      const active=group.querySelector('[aria-pressed="true"]');if(!active)return;
      // 只滚动分类容器，不把文档跳到尚未进入视口的分类区。
      const x=active.offsetLeft,y=active.offsetTop,w=active.offsetWidth,h=active.offsetHeight;
      const scrollMin=x-5,scrollMax=x+w-group.clientWidth+5;
      if(x<group.scrollLeft)group.scrollLeft=Math.max(0,scrollMin);
      else if(x+w>group.scrollLeft+group.clientWidth)group.scrollLeft=Math.max(0,scrollMax);
      if(last&&last.x===x&&last.y===y&&last.w===w&&last.h===h)return;
      const old=indicator.hidden?null:indicator.getBoundingClientRect(),bounds=group.getBoundingClientRect();
      animation?.cancel();indicator.hidden=false;indicator.style.width=`${w}px`;indicator.style.height=`${h}px`;
      const target=`translate3d(${x}px,${y}px,0)`;indicator.style.transform=target;
      if(old&&animate&&!motion.matches&&!document.hidden) {
        // FLIP 只动画材质层：宽度一次设定，帧间只改变 transform，标签没有缩放。
        animation=indicator.animate([
          {transform:`translate3d(${old.x-bounds.x+group.scrollLeft}px,${old.y-bounds.y}px,0) scale(${old.width/w},${old.height/h})`},
          {transform:target}
        ],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
      }
      last={x,y,w,h};group.classList.add(`has-${kind}-indicator`);
    };
    const resize='ResizeObserver' in window?new ResizeObserver(()=>queue(false)):null;
    const watch=()=>{resize?.disconnect();resize?.observe(group);group.querySelectorAll(buttonSelector).forEach(button=>resize?.observe(button));};
    new MutationObserver(records=>{
      if(records.some(record=>record.type==='childList'))watch();
      queue(records.some(record=>record.type==='attributes'));
    }).observe(group,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed']});
    group.addEventListener('click',()=>queue(true));
    addEventListener('resize',()=>queue(false),{passive:true});
    document.addEventListener('site:language-changed',()=>queue(false));
    document.fonts?.ready.then(()=>queue(false));document.fonts?.addEventListener('loadingdone',()=>queue(false));
    motion.addEventListener('change',()=>{animation?.cancel();animation=null;last=null;queue(false);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){animation?.cancel();animation=null;}else queue(false);});
    watch();queue(false);
  }


  document.addEventListener('DOMContentLoaded', () => {
    panel = document.querySelector('#glass-settings');
    if (panel && typeof panel.showModal === 'function') {
      document.querySelectorAll('.transparency-toggle').forEach(button => {
        button.hidden = false;
        button.removeAttribute('aria-pressed');
        button.setAttribute('aria-haspopup','dialog');
        button.setAttribute('aria-controls','glass-settings');
        button.setAttribute('aria-expanded','false');
        button.addEventListener('click',()=>openPanel(button));
      });
      panel.querySelector('#glass-settings-close').addEventListener('click',closePanel);
      panel.addEventListener('keydown',event=>{ if(event.key === 'Escape') event.stopPropagation(); });
      panel.addEventListener('cancel',event=>{ event.preventDefault(); event.stopPropagation(); closePanel(); });
      panel.addEventListener('click',event=>{
        if(event.target !== panel) return;
        const box=panel.getBoundingClientRect();
        if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)closePanel();
      });
      panel.addEventListener('close',()=>{
        openingAnimation?.cancel();
        parentDialog?.removeEventListener('close',parentClosing,true);
        markOpen(false);
        if(opener?.isConnected && (!parentDialog || parentDialog.open))opener.focus({preventScroll:true});
        parentDialog=null;
      });
      panel.querySelector('#glass-enabled').addEventListener('change',event=>{ preference.enabled=event.target.checked;commit();positionPanel(); });
      panel.querySelector('#glass-clarity').addEventListener('input',event=>{
        preference.clarity=Number(event.target.value);
        if(!previewFrame)previewFrame=requestAnimationFrame(()=>{previewFrame=0;apply();});
      });
      panel.querySelector('#glass-clarity').addEventListener('change',commit);
      panel.querySelectorAll('[data-glass-preset]').forEach(button=>button.addEventListener('click',()=>{
        preference.clarity=Number(button.dataset.glassPreset);commit();
      }));
      panel.querySelector('#glass-reset').addEventListener('click',()=>{ preference={...defaults};commit();positionPanel(); });
      if('ResizeObserver' in window)new ResizeObserver(positionPanel).observe(panel);
      addEventListener('resize',positionPanel,{passive:true});
      visualViewport?.addEventListener('resize',positionPanel,{passive:true});
    }
    installChoiceIndicator('.filters','.filter','filter');
    installChoiceIndicator('.view-switch','[data-view]','view');
    installFAQ();
    document.querySelectorAll('[data-glass-light]').forEach(surface=>{
      surface.addEventListener('pointermove',event=>{
        if(!pointer.matches || motion.matches || root.dataset.transparency==='reduced' || document.hidden)return;
        cancelAnimationFrame(frames.get(surface));
        const {clientX,clientY}=event;
        frames.set(surface,requestAnimationFrame(()=>{
          const rect=surface.getBoundingClientRect();
          surface.style.setProperty('--light-x',`${clientX-rect.left}px`);surface.style.setProperty('--light-y',`${clientY-rect.top}px`);
          frames.delete(surface);
        }));
      });
      surface.addEventListener('pointerleave',()=>{
        cancelAnimationFrame(frames.get(surface));frames.delete(surface);
        surface.style.removeProperty('--light-x');surface.style.removeProperty('--light-y');
      });
    });
    const toolbar=document.querySelector('.static-reader-toolbar');
    if(toolbar) {
      const measure=()=>root.style.setProperty('--reader-toolbar-height',`${toolbar.getBoundingClientRect().height}px`);
      measure();if('ResizeObserver' in window)new ResizeObserver(measure).observe(toolbar);
    }
    apply();
  });
  [system,contrast,forced].forEach(query=>query.addEventListener('change',()=>{apply();positionPanel();}));
  [pointer,motion].forEach(query=>query.addEventListener('change',()=>{resetLights();openingAnimation?.cancel();}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetLights();});
  document.addEventListener('site:language-changed',()=>{apply();positionPanel();});
  addEventListener('pageshow',()=>{preference=readPreference();apply();});
  addEventListener('storage',event=>{
    if(event.key!==key && event.key!==legacyKey && event.key!==null)return;
    cancelAnimationFrame(previewFrame);previewFrame=0;
    preference=readPreference();apply();positionPanel();
  });
})();
