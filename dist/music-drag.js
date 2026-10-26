// 只移动宿主面板，永不改写 iframe；触屏仍使用固定底部布局。
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const panel=document.querySelector('#music-panel'), handle=document.querySelector('.music-drag-handle');
    if(!panel || !handle)return;
    const desktop=matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)');
    let drag=null,position=null;
    const clamp=(x,y)=>{
      const r=panel.getBoundingClientRect();
      const top=Math.max(12,document.querySelector('.site-header')?.offsetHeight+12 || 12);
      return {x:Math.max(12,Math.min(innerWidth-r.width-12,x)),y:Math.max(top,Math.min(innerHeight-r.height-12,y))};
    };
    const move=(x,y)=>{
      position=clamp(x,y);panel.dataset.positioned='true';
      panel.style.setProperty('--music-x',`${position.x}px`);panel.style.setProperty('--music-y',`${position.y}px`);
    };
    const reset=()=>{position=null;delete panel.dataset.positioned;panel.style.removeProperty('--music-x');panel.style.removeProperty('--music-y');};
    const sync=()=>{handle.disabled=!desktop.matches;if(!desktop.matches)reset();else if(position && !panel.hidden)move(position.x,position.y);};
    handle.addEventListener('pointerdown',e=>{
      if(!desktop.matches || e.button!==0 || e.pointerType==='touch')return;
      const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.x,top:r.y};
      handle.setPointerCapture(e.pointerId);panel.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)move(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
    const stop=()=>{drag=null;panel.classList.remove('is-dragging');};
    handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
    handle.addEventListener('keydown',e=>{
      if(!desktop.matches)return;
      if(e.key==='Home'){e.preventDefault();reset();return;}
      const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(!directions[e.key])return;e.preventDefault();
      const r=panel.getBoundingClientRect(),d=directions[e.key],step=e.shiftKey?32:16;move(r.x+d[0]*step,r.y+d[1]*step);
    });
    desktop.addEventListener('change',sync);addEventListener('resize',sync);
    if('ResizeObserver' in window)new ResizeObserver(()=>{if(position&&!panel.hidden)move(position.x,position.y);}).observe(panel);
    sync();
  },{once:true});
})();
