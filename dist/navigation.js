// 提前消费一次性刷新标记：只调整恢复策略，不在启动时触发导航。
(() => {
  const root = document.documentElement;
  const marker = history.state?.cloudHomeRefresh;
  const returning = marker?.url === location.pathname + location.search;
  if (returning) {
    const { cloudHomeRefresh, ...rest } = history.state;
    history.replaceState(Object.keys(rest).length ? rest : null, '');
    history.scrollRestoration = 'manual';
    if (['light', 'dark'].includes(marker.theme)) {
      root.dataset.theme = marker.theme;
      root.dataset.refreshTheme = marker.theme;
    }
    addEventListener('pageshow', () => {
      scrollTo({top:0, behavior:'instant'});
      requestAnimationFrame(() => requestAnimationFrame(() => {
        scrollTo({top:0, behavior:'instant'});
        history.scrollRestoration = marker.restoration === 'manual' ? 'manual' : 'auto';
        delete root.dataset.refreshTheme;
      }));
    }, {once:true});
  }

  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    if (!header || header.dataset.navigationReady) return;
    header.dataset.navigationReady = 'true';
    root.classList.add('has-smart-header');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const hover = matchMedia('(hover:hover)');
    const IDLE_HIDE_MS = 2000;
    const sticky = getComputedStyle(header).position === 'sticky';
    let timer, frame = 0, lastActivity = Date.now(), hidden = false, refreshing = false;
    const clearTimer = () => clearTimeout(timer);
    const engaged = () => root.dataset.appearanceOpen === 'true' || header.contains(document.activeElement) || (hover.matches && header.matches(':hover'));
    const display = visible => {
      if (hidden === !visible) return;
      hidden = !visible;
      header.inert = hidden;
      header.classList.toggle('nav-hidden', hidden);
      if (hidden) header.setAttribute('aria-hidden', 'true');
      else header.removeAttribute('aria-hidden');
    };
    const schedule = () => {
      clearTimer();
      if (!sticky || document.hidden || scrollY <= 8 || engaged() || refreshing) return;
      timer = setTimeout(() => {
        if (!document.hidden && scrollY > 8 && !engaged() && !refreshing) display(false);
      }, Math.max(0, lastActivity + IDLE_HIDE_MS - Date.now()));
    };
    const activity = () => {
      lastActivity = Date.now();
      display(true);
      header.classList.toggle('is-scrolled', scrollY > 8);
      schedule();
    };
    addEventListener('scroll', () => {
      lastActivity = Date.now();
      display(true);
      schedule();
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        header.classList.toggle('is-scrolled', scrollY > 8);
      });
    }, {passive:true});
    for (const event of ['pointerenter','pointerleave','pointerdown','focusin','input','change']) header.addEventListener(event, activity);
    header.addEventListener('focusout', () => queueMicrotask(activity));
    document.addEventListener('keydown', event => {
      if (event.key === 'Tab') activity(); // 移除 inert 后才交给浏览器正常移动焦点。
    });
    document.addEventListener('visibilitychange', () => {
      clearTimer();
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else activity();
    });
    addEventListener('pagehide', () => { clearTimer(); cancelAnimationFrame(frame); frame = 0; });
    addEventListener('pageshow', activity);
    document.addEventListener('site:appearance-panel', activity);
    const measure = () => {
      const value = `${Math.ceil(header.getBoundingClientRect().height)}px`;
      if (root.style.getPropertyValue('--header-height') !== value) root.style.setProperty('--header-height', value);
    };
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
    else addEventListener('resize', measure, {passive:true});
    measure();
    activity();

    const top = () => new Promise(resolve => {
      if (reduced.matches || scrollY <= 1) { scrollTo({top:0, behavior:'instant'}); resolve(); return; }
      let checkTimer, deadline;
      const finish = () => {
        clearTimeout(checkTimer); clearTimeout(deadline);
        document.removeEventListener('scrollend', check);
        scrollTo({top:0, behavior:'instant'});
        resolve();
      };
      const check = () => {
        if (scrollY <= 1) finish();
        else { clearTimeout(checkTimer); checkTimer = setTimeout(check, 80); }
      };
      document.addEventListener('scrollend', check);
      checkTimer = setTimeout(check, 80);
      deadline = setTimeout(finish, 2000); // scrollend 缺失或平滑滚动被打断时也能完成。
      scrollTo({top:0, behavior:'smooth'});
    });
    const refreshHome = async () => {
      if (refreshing) return;
      refreshing = true;
      display(true); clearTimer();
      document.dispatchEvent(new Event('site:home-request'));
      // 主脚本不可用时仍可退出意外打开的原生 dialog。
      document.querySelector('#interest-dialog[open]')?.close();
      await top();
      const url = new URL('./', location.href);
      const lang = document.querySelector('#language-select')?.value || root.lang;
      url.searchParams.set('lang', ['zh-CN','zh-TW','en','ja'].includes(lang) ? lang : 'zh-CN');
      const state = {cloudHomeRefresh:{url:url.pathname + url.search, theme:root.dataset.theme, restoration:history.scrollRestoration}};
      history.scrollRestoration = 'manual';
      history.replaceState(state, '', url);
      location.reload(); // 真正重载当前首页，不用 hash 跳转替代。
    };
    const form = document.querySelector('.home-refresh-form');
    const cloudButton = form.querySelector('button');
    // 增强后只接受明确的按钮激活，防止原生 select 的 Enter 隐式提交刷新。
    cloudButton.type = 'button';
    cloudButton.addEventListener('click', refreshHome);
    form.addEventListener('submit', event => event.preventDefault());
    document.querySelector('.dialog-home-refresh').addEventListener('click', refreshHome);
  }, {once:true});
})();
