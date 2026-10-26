// 可失败的视觉增强：正文不依赖本文件，静态页也不依赖首页资料。
(() => {
  const root=document.documentElement, key='xiwu-reduce-transparency';
  const system=matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast=matchMedia('(prefers-contrast: more)');
  const forced=matchMedia('(forced-colors: active)');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const pointer=matchMedia('(hover: hover) and (pointer: fine)');
  let manual=false;
  try{manual=localStorage.getItem(key)==='true';}catch{}
  const frames=new Map();
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
        ],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});
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

  const required=()=>system.matches || contrast.matches || forced.matches;
  function resetLights() {
    for(const surface of document.querySelectorAll('[data-glass-light]')) {
      cancelAnimationFrame(frames.get(surface));surface.style.removeProperty('--light-x');surface.style.removeProperty('--light-y');
    }
    frames.clear();
  }
  function apply() {
    root.dataset.transparency=manual || required() ? 'reduced' : 'auto';
    for(const button of document.querySelectorAll('.transparency-toggle')) {
      // 先保留翻译后的原始标签，系统强制状态的说明不覆盖它。
      if(!required()) { button.removeAttribute('aria-description'); }
      else button.setAttribute('aria-description',button.dataset.systemLabel);
      button.setAttribute('aria-pressed',String(manual || required()));
      button.disabled=required();
    }
    resetLights();
  }
  apply(); // 样式渲染前恢复偏好，避免透明度闪变。
  document.addEventListener('DOMContentLoaded',()=>{
    installChoiceIndicator('.filters','.filter','filter');
    installChoiceIndicator('.view-switch','[data-view]','view');
    for(const button of document.querySelectorAll('.transparency-toggle')) {
      button.hidden=false;
      button.addEventListener('click',()=>{
        manual=!manual;
        try{localStorage.setItem(key,String(manual));}catch{}
        apply();
      });
    }
    for(const surface of document.querySelectorAll('[data-glass-light]')) {
      surface.addEventListener('pointermove',event=>{
        if(!pointer.matches || motion.matches || root.dataset.transparency==='reduced' || document.hidden)return;
        cancelAnimationFrame(frames.get(surface));
        const {clientX,clientY}=event;
        frames.set(surface,requestAnimationFrame(()=>{
          const rect=surface.getBoundingClientRect();
          surface.style.setProperty('--light-x',`${clientX-rect.left}px`);
          surface.style.setProperty('--light-y',`${clientY-rect.top}px`);
          frames.delete(surface);
        }));
      });
      surface.addEventListener('pointerleave',()=>{
        cancelAnimationFrame(frames.get(surface));frames.delete(surface);
        surface.style.removeProperty('--light-x');surface.style.removeProperty('--light-y');
      });
    }
    const toolbar=document.querySelector('.static-reader-toolbar');
    if(toolbar) {
      const measure=()=>root.style.setProperty('--reader-toolbar-height',`${toolbar.getBoundingClientRect().height}px`);
      measure();if('ResizeObserver' in window)new ResizeObserver(measure).observe(toolbar);
    }
    apply();
  });
  for(const query of [system,contrast,forced])query.addEventListener('change',apply);
  for(const query of [pointer,motion])query.addEventListener('change',resetLights);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetLights();});
  document.addEventListener('site:language-changed',apply);
  addEventListener('pageshow',apply);
  addEventListener('storage',event=>{
    if(event.key!==key && event.key!==null)return;
    try{manual=localStorage.getItem(key)==='true';}catch{}
    apply();
  });
})();
