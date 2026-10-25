// 渐进增强：正文默认可见，观察器失败或没有脚本也不阻断阅读。
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const grid = document.querySelector('.interest-grid');
  if (!('IntersectionObserver' in window)) return;
  let heroVisible = false;
  const seen = new Set();
  const syncClouds = () => document.documentElement.classList.toggle('clouds-running', heroVisible && !document.hidden && !reduced.matches);
  if (hero) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      syncClouds();
    }).observe(hero);
    document.addEventListener('visibilitychange', syncClouds);
  }
  const cards = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (!isIntersecting) continue;
      const id = target.dataset.essayId;
      if (!reduced.matches && !seen.has(id)) target.classList.add('card-enter');
      seen.add(id);
      cards.unobserve(target);
    }
  }, {threshold:0.08});
  const observeCards = () => grid?.querySelectorAll('.interest-card').forEach(card => cards.observe(card));
  observeCards();
  if (grid) new MutationObserver(records => {
    for (const record of records) for (const node of record.removedNodes) {
      if (node.nodeType === 1) cards.unobserve(node);
    }
    observeCards();
  }).observe(grid, {childList:true});
  reduced.addEventListener('change', () => {
    syncClouds();
    if (reduced.matches) document.querySelectorAll('.card-enter').forEach(card => card.classList.remove('card-enter'));
  });
})();
