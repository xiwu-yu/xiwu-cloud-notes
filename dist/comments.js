// Giscus 官方客户端负责 GitHub 登录与评论；宿主只管理入口、语言和主题。
(() => {
  'use strict';
  const origin = 'https://giscus.app', views = new Map();
  const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const language = () => ({'zh-CN':'zh-CN','zh-TW':'zh-TW',en:'en',ja:'ja'}[document.documentElement.lang] || 'zh-CN');
  function sync(view, force = false) {
    if (force) view.signature = null;
    if (view.syncQueued) return;
    view.syncQueued = true;
    // A language change also refreshes the theme and reader. Send the final config
    // once per task; duplicate locale routes can cancel Giscus' own Next.js load.
    queueMicrotask(() => {
      view.syncQueued = false;
      if (!view.embed.isConnected) return;
      const frame = view.embed.querySelector('iframe.giscus-frame');
      if (!frame) return;
      const config = {theme:theme(),lang:language(),term:'xiwu-article:'+view.id,backLink:view.url};
      const signature = JSON.stringify(config);
      frame.title = view.strings['comments.title'];
      if (view.frame === frame && view.signature === signature) return;
      view.frame = frame;view.signature = signature;
      frame.contentWindow?.postMessage({giscus:{setConfig:config}},origin);
    });
  }
  function feedback(view, key) {
    view.message = key;
    view.status.hidden = !key;
    view.status.textContent = view.strings[key] || '';
    view.button.hidden = view.started && key !== 'comments.error';
    view.button.textContent = view.strings[key === 'comments.error' ? 'comments.retry' : 'comments.load'];
  }
  function load(view) {
    clearTimeout(view.timer);
    view.started = true;
    feedback(view,'comments.loading');
    // Retry is an explicit user action. Language/theme changes never rebuild the frame.
    view.embed.replaceChildren();
    view.embed.classList.add('giscus');
    let meta = document.querySelector('meta[name="giscus:backlink"]');
    if (!meta) {meta=document.createElement('meta');meta.name='giscus:backlink';document.head.append(meta);}
    meta.content = view.url;
    const script = document.createElement('script');
    script.src = origin+'/client.js';script.async = true;script.crossOrigin='anonymous';
    const attributes = {repo:view.config.repo,repoId:view.config.repoId,category:view.config.category,categoryId:view.config.categoryId,mapping:'specific',term:'xiwu-article:'+view.id,strict:'1',reactionsEnabled:'0',emitMetadata:'0',inputPosition:'top',theme:theme(),lang:language(),loading:'lazy'};
    Object.assign(script.dataset,attributes);
    script.addEventListener('error',()=>{clearTimeout(view.timer);feedback(view,'comments.error');});
    script.addEventListener('load',()=>{
      const frame = view.embed.querySelector('iframe.giscus-frame');
      if (!frame) {clearTimeout(view.timer);feedback(view,'comments.error');return;}
      sync(view);
      frame.addEventListener('load',()=>{clearTimeout(view.timer);feedback(view,'');sync(view,true);},{once:true});
    });
    view.timer=setTimeout(()=>feedback(view,'comments.waiting'),12000);
    view.embed.append(script);
  }
  function mount(root,{id,config,strings,url}) {
    if (!root) return;
    root.hidden = !config;
    const previous = views.get(root);
    if (!config) {if(previous)clearTimeout(previous.timer);root.replaceChildren();views.delete(root);return;}
    if (previous && previous.id === id && JSON.stringify(previous.config) === JSON.stringify(config)) {
      previous.id=id;previous.strings=strings;previous.url=url;
      previous.link.href=`https://github.com/${config.repo}/discussions?discussions_q=${encodeURIComponent('"xiwu-article:'+id+'"')}`;
      const script=previous.embed.querySelector('script');if(script)script.dataset.term='xiwu-article:'+id;
      previous.title.textContent=strings['comments.title'];previous.hint.textContent=strings['comments.hint'];previous.link.textContent=strings['comments.github'];
      root.setAttribute('aria-label',strings['comments.title']);feedback(previous,previous.message);sync(previous);return;
    }
    if (previous) clearTimeout(previous.timer);
    const title=document.createElement('h2'),hint=document.createElement('p'),button=document.createElement('button'),status=document.createElement('p'),embed=document.createElement('div'),fallback=document.createElement('p'),link=document.createElement('a');
    title.textContent=strings['comments.title'];hint.textContent=strings['comments.hint'];hint.className='comments-hint';
    button.type='button';button.className='comments-load glass-surface glass-action';
    status.className='comments-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    embed.className='comments-embed';fallback.className='comments-fallback';
    link.className='text-link';link.href=`https://github.com/${config.repo}/discussions?discussions_q=${encodeURIComponent('"xiwu-article:'+id+'"')}`;link.target='_blank';link.rel='noopener noreferrer';link.textContent=strings['comments.github'];fallback.append(link);
    root.classList.add('article-comments');root.setAttribute('aria-label',strings['comments.title']);root.replaceChildren(title,hint,button,status,embed,fallback);
    const view={root,id,config,strings,url,title,hint,button,status,embed,link,started:false,message:''};views.set(root,view);
    button.addEventListener('click',()=>load(view));feedback(view,'');
    // Returning from GitHub OAuth: let the official client consume its own session.
    if (new URLSearchParams(location.search).has('giscus')) load(view);
  }
  window.articleComments={mount};
  document.addEventListener('site:theme-changed',()=>{for(const view of views.values())sync(view);});
  addEventListener('message',event=>{
    if(event.origin!==origin || !event.data || typeof event.data!=='object' || !event.data.giscus)return;
    for(const view of views.values()) {
      const frame=view.embed.querySelector('iframe.giscus-frame');
      if(event.source!==frame?.contentWindow)continue;
      // A missing discussion is expected before the first comment; the widget explains it.
      if(typeof event.data.giscus.error==='string' && !/discussion not found/i.test(event.data.giscus.error)) {clearTimeout(view.timer);feedback(view,'comments.error');}
    }
  });
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-article-comments]').forEach(root=>{
      const strings={};for(const attr of root.attributes)if(attr.name.startsWith('data-comments-'))strings[attr.name.slice(5).replace('comments-','comments.')]=attr.value;
      const {articleId:id,repo,repoId,category,categoryId}=root.dataset;
      mount(root,{id,config:{repo,repoId,category,categoryId},strings,url:document.querySelector('link[rel="canonical"]')?.href || location.href});
    });
  });
})();
