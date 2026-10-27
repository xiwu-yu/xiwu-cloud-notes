(() => {
  'use strict';
  const KEY = 'xiwu-like-visitor-v1', SYNC = 'xiwu-like-changed-v1';
  const records = new Map(), views = new WeakMap();
  let identity;
  function visitor() {
    if (identity) return identity;
    try {
      let token = localStorage.getItem(KEY);
      if (!/^[a-f0-9]{64}$/.test(token || '')) {
        token = [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
        localStorage.setItem(KEY,token);
      }
      if (localStorage.getItem(KEY) !== token) return null;
      return identity = token;
    } catch { return null; }
  }
  function render(record) {
    for (const [root,view] of record.views) {
      if (!root.isConnected) { record.views.delete(root); continue; }
      const {button,label,count,status,strings} = view;
      button.disabled = record.busy || !visitor() || !record.state;
      button.setAttribute('aria-pressed',String(record.state?.liked || false));
      button.setAttribute('aria-busy',String(record.busy));
      label.textContent = strings[record.state?.liked ? 'likes.unlike' : 'likes.like'];
      count.textContent = record.state ? String(record.state.count) : '—';
      count.setAttribute('aria-label',strings['likes.count'].replace('{count}',record.state?.count ?? '—'));
      const message = !visitor() ? 'likes.storage' : record.error || (record.busy ? 'likes.loading' : '');
      status.textContent = message ? strings[message] : '';
      status.hidden = !message;
      view.retry.hidden = record.busy || !record.error || !visitor();
      view.retry.textContent = strings['likes.retry'];
    }
  }
  async function request(record, liked) {
    if (record.busy) {record.resync=true;return;}
    if (!visitor()) {render(record);return;}
    record.busy=true;record.error='';render(record);
    const controller = new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const response = await fetch(`${record.endpoint}/v1/articles/${encodeURIComponent(record.id)}`,{
        method:liked === undefined ? 'GET' : 'PUT',
        headers:{Authorization:`Bearer ${visitor()}`,...(liked === undefined ? {} : {'Content-Type':'application/json'})},
        ...(liked === undefined ? {} : {body:JSON.stringify({liked})}),
        cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal
      });
      if (!response.ok) {const error=new Error('request');error.limited=response.status===429;throw error;}
      const data=await response.json();
      if (data.id!==record.id || !Number.isSafeInteger(data.count) || data.count<0 || typeof data.liked!=='boolean') throw new Error('response');
      record.state=data;record.fetched=Date.now();
      if (liked !== undefined) {
        try {localStorage.setItem(SYNC,JSON.stringify({id:record.id,at:Date.now(),nonce:crypto.randomUUID()}));} catch {}
      }
    } catch (error) {
      record.error = error.limited ? 'likes.limited' : 'likes.error';
    } finally {
      clearTimeout(timeout);record.busy=false;render(record);
      if(record.resync){record.resync=false;request(record);}
    }
  }
  function mount(root, {id,endpoint,strings}) {
    if (!root) return;
    root.hidden=!endpoint;
    if (!endpoint) return;
    const key=endpoint+'|'+id;
    let record=records.get(key);
    if (!record) {record={id,endpoint,views:new Map(),state:null,busy:false,error:'',fetched:0};records.set(key,record);}
    const old=views.get(root);
    if (old) old.record.views.delete(root);
    const button=document.createElement('button');button.type='button';button.className='like-button glass-action';
    const heart=document.createElement('span');heart.className='like-heart';heart.setAttribute('aria-hidden','true');heart.textContent='♥';
    const label=document.createElement('span'),count=document.createElement('span');count.className='like-count';
    button.append(heart,label,count);
    const status=document.createElement('span');status.className='like-status';status.setAttribute('role','status');
    const retry=document.createElement('button');retry.type='button';retry.className='like-retry text-link';
    retry.addEventListener('click',()=>request(record));
    button.addEventListener('click',()=>{if(record.state&&!record.busy)request(record,!record.state.liked);});
    root.replaceChildren(button,status,retry);
    const view={button,label,count,status,retry,strings,record};views.set(root,view);record.views.set(root,view);render(record);
    if (!record.busy && (!record.state || Date.now()-record.fetched>30000)) request(record);
  }
  window.articleLikes={mount};
  window.addEventListener('storage',event=>{
    if (event.key===KEY || event.key===null) identity=null;
    if ([KEY,SYNC,null].includes(event.key)) for (const record of records.values()) {
      record.fetched=0;
      if ([...record.views.keys()].some(root=>root.isConnected)) request(record);
    }
  });
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-article-like]').forEach(root=>{
      const strings={};
      for (const attr of root.attributes) if(attr.name.startsWith('data-likes-')) strings[attr.name.slice(5).replace('likes-','likes.')]=attr.value;
      mount(root,{id:root.dataset.articleId,endpoint:root.dataset.apiUrl,strings});
    });
  });
})();
