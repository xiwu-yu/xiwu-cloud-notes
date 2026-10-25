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
