// 归档规则与页面分开，便于检查日期边界和排序。
(function (root) {
  function dateKey(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return null;
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  }
  function wordCount(text) {
    return (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[A-Za-z]+(?:['’-][A-Za-z]+)*|\d+(?:\.\d+)?/gu) || []).length;
  }
  const queryTerms = query => [...new Set(String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean))];
  function matchesQuery(item, query) {
    const terms = queryTerms(query);
    if (!terms.length) return true;
    const haystack = [item.id, item.title, item.description, item.category, item.subtitle, ...(item.tags || []), item.text ?? item.body ?? ''].join('\n').toLowerCase();
    return terms.every(term => haystack.includes(term));
  }
  function searchPreview(item, query, blocks = []) {
    const terms = queryTerms(query);
    if (!terms.length) return {text:item.description || '', id:null, source:null};
    const score = text => terms.filter(term => String(text).toLowerCase().includes(term)).length;
    const best = values => values.reduce((found, value) => score(value.text) > score(found.text) ? value : found, {text:'', id:null});
    let match = best(blocks);
    const source = score(match.text) ? 'body' : 'metadata';
    if (source === 'metadata') match = best([item.title,item.description,item.category,item.subtitle,...(item.tags || []),item.id].filter(Boolean).map(text => ({text,id:null})));
    const text = String(match.text).replace(/\s+/g,' ').trim();
    const first = Math.min(...terms.map(term => text.toLowerCase().indexOf(term)).filter(index => index >= 0));
    const points = Array.from(text), offset = Array.from(text.slice(0,Number.isFinite(first) ? first : 0)).length;
    const start = Math.max(0,offset-36), end = Math.min(points.length,start+160);
    return {text:(start ? '…' : '')+points.slice(start,end).join('')+(end < points.length ? '…' : ''),id:match.id,source};
  }
  function itemDate(item, dateBy = 'writtenAt') {
    const value = dateBy === 'writtenAt' ? item.writtenAt : item.publishedAt;
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00+08:00' : value;
  }
  function months(items, dateBy = 'writtenAt') {
    return [...new Set(items.map(item => dateKey(itemDate(item, dateBy))?.slice(0, 7)).filter(Boolean))].sort().reverse();
  }
  function select(items, {category = 'all', month = 'all', order = 'newest', dateBy = 'writtenAt', query = ''} = {}) {
    return items.filter(item => {
      const key = dateKey(itemDate(item, dateBy));
      return (category === 'all' || (item.categoryKey ?? item.category) === category) &&
        (month === 'all' || (month === 'undated' ? !key : key?.slice(0, 7) === month)) &&
        matchesQuery(item, query);
    }).sort((a, b) => {
      const at = dateKey(itemDate(a, dateBy)) ? Date.parse(itemDate(a, dateBy)) : null;
      const bt = dateKey(itemDate(b, dateBy)) ? Date.parse(itemDate(b, dateBy)) : null;
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return order === 'oldest' ? at - bt : bt - at;
    });
  }
  function groups(items, dateBy = 'writtenAt') {
    const result = [];
    items.forEach(item => {
      const key = dateKey(itemDate(item, dateBy)) || 'undated';
      let group = result[result.length - 1];
      if (!group || group.key !== key) { group = {key, items: []}; result.push(group); }
      group.items.push(item);
    });
    return result;
  }
  root.essayArchive = { dateKey, wordCount, itemDate, months, queryTerms, searchPreview, matchesQuery, select, groups };
})(typeof window === 'undefined' ? globalThis : window);
