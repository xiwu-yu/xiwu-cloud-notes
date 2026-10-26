// 目录、搜索上下文与定位共用增强。正文和构建时目录不依赖本脚本。
(() => {
  const cache = new WeakMap(), contexts = new WeakMap();
  const desktop = matchMedia('(min-width:1100px)');
  const terms = query => [...new Set(String(query || '').trim().split(/\s+/).filter(Boolean))];
  function blocks(item) {
    if (!cache.has(item)) {
      const template = document.createElement('template');template.innerHTML = item.bodyHtml || '';
      cache.set(item, [...template.content.querySelectorAll('[data-reader-block]')].map(el => ({id:el.id,text:el.textContent.replace(/\s+/g,' ').trim()})));
    }
    return cache.get(item);
  }
  function preview(item, query) { return window.essayArchive.searchPreview(item,query,terms(query).length ? blocks(item) : []); }
  function markText(root, query) {
    const escaped = terms(query).sort((a,b)=>b.length-a.length).map(term=>term.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&'));
    if (!escaped.length) return;
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT), nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    const text = nodes.map(node=>node.textContent).join(''), matches=[...text.matchAll(new RegExp(escaped.join('|'),'giu'))].map(m=>[m.index,m.index+m[0].length]);
    let offset=0;
    for(const node of nodes) {
      const value=node.textContent,start=offset;offset+=value.length;
      const ranges=matches.filter(([a,b])=>a<offset&&b>start);if(!ranges.length)continue;
      const fragment=document.createDocumentFragment();let cursor=0;
      for(const [a,b] of ranges){const left=Math.max(0,a-start),right=Math.min(value.length,b-start);fragment.append(document.createTextNode(value.slice(cursor,left)));const mark=document.createElement('mark');mark.textContent=value.slice(left,right);fragment.append(mark);cursor=right;}
      fragment.append(document.createTextNode(value.slice(cursor)));node.replaceWith(fragment);
    }
  }
  function highlight(body, query) { body.querySelectorAll('[data-reader-block]').forEach(block=>markText(block,query)); }
  function jump(body, id, focus = false) {
    const target = document.getElementById(id);if(!target || !body.contains(target))return false;
    const dialog = body.closest('dialog'), toolbar = document.querySelector(dialog ? '.dialog-toolbar' : '.static-reader-toolbar');
    const offset = (toolbar?.getBoundingClientRect().height || 0)+16;
    if (dialog) dialog.scrollTo({top:target.getBoundingClientRect().top-dialog.getBoundingClientRect().top+dialog.scrollTop-offset,behavior:'instant'});
    else scrollTo({top:target.getBoundingClientRect().top+scrollY-offset,behavior:'instant'});
    if(focus)target.focus({preventScroll:true});
    return true;
  }
  function bindToc(toc,body) {
    contexts.set(toc,body);toc.open=desktop.matches;
    if(toc.dataset.bound)return;
    toc.dataset.bound='true';
    toc.addEventListener('click',event=>{
      const link=event.target.closest('a[data-reader-anchor]');if(!link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
      event.preventDefault();const content=contexts.get(toc);
      if(!desktop.matches)toc.open=false;
      jump(content,link.dataset.readerAnchor,true);
      if(!content.closest('dialog')){const url=new URL(location.href);url.hash=link.dataset.readerAnchor;history.replaceState(history.state,'',url);}
    });
  }
  function mountToc(toc,body,label,baseUrl='') {
    const headings=[...body.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')];
    toc.hidden=headings.length<2;toc.replaceChildren();if(toc.hidden)return;
    const summary=document.createElement('summary');summary.textContent=label;
    const nav=document.createElement('nav');nav.setAttribute('aria-label',label);
    const min=Math.min(...headings.map(h=>Number(h.tagName.slice(1))));
    headings.forEach(heading=>{const link=document.createElement('a');link.textContent=heading.textContent;link.href=baseUrl+'#'+heading.id;link.dataset.readerAnchor=heading.id;link.style.setProperty('--toc-indent',`${Math.min(3,Number(heading.tagName.slice(1))-min)*12}px`);nav.append(link);});
    toc.append(summary,nav);bindToc(toc,body);
  }
  desktop.addEventListener('change',()=>document.querySelectorAll('.reader-toc').forEach(toc=>{toc.open=desktop.matches;}));
  document.addEventListener('DOMContentLoaded',()=>{
    if(!document.body.classList.contains('static-reading'))return;
    const body=document.querySelector('.article-body'),toc=document.querySelector('.reader-toc');
    const toolbar=document.querySelector('.static-reader-toolbar');
    if(toolbar){const measure=()=>document.documentElement.style.setProperty('--reader-toolbar-height',`${toolbar.getBoundingClientRect().height}px`);measure();if('ResizeObserver' in window)new ResizeObserver(measure).observe(toolbar);}
    if(!body)return;
    if(toc)bindToc(toc,body);
    const query=new URL(location.href).searchParams.get('find') || '';
    highlight(body,query);
    const locate=()=>{let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{}if(id)jump(body,id);};
    requestAnimationFrame(locate);addEventListener('pageshow',locate);
  });
  window.essayReader={preview,markText,highlight,jump,mountToc};
})();
