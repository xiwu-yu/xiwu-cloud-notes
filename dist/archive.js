// 归档规则与页面分开，便于检查日期边界和排序。
(function (root) {
  function dateKey(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return null;
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  }
  function wordCount(text) {
    return (text.match(/[\p{Script=Han}]|[A-Za-z]+(?:['’-][A-Za-z]+)*|\d+(?:\.\d+)?/gu) || []).length;
  }
  function select(items, {category = '全部', month = 'all', order = 'newest'} = {}) {
    return items.filter(item => {
      const key = dateKey(item.publishedAt);
      return (category === '全部' || item.category === category) &&
        (month === 'all' || (month === 'undated' ? !key : key?.slice(0, 7) === month));
    }).sort((a, b) => {
      const at = dateKey(a.publishedAt) ? Date.parse(a.publishedAt) : null;
      const bt = dateKey(b.publishedAt) ? Date.parse(b.publishedAt) : null;
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return order === 'oldest' ? at - bt : bt - at;
    });
  }
  function groups(items) {
    const result = [];
    items.forEach(item => {
      const key = dateKey(item.publishedAt) || 'undated';
      let group = result[result.length - 1];
      if (!group || group.key !== key) { group = {key, items: []}; result.push(group); }
      group.items.push(item);
    });
    return result;
  }
  root.essayArchive = { dateKey, wordCount, select, groups };
})(typeof window === 'undefined' ? globalThis : window);
