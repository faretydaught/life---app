/* ============ 通用工具 ============ */
const U = {
  uid(p) {
    return (p || 'id') + '_' + DateNow().toString(36) +
      Math.random().toString(36).slice(2, 8);
  },
  esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },
  yuan(n, sign) {
    n = Number(n) || 0;
    const v = n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return (sign === false ? '' : '¥') + v;
  },
  pad(n) { return String(n).padStart(2, '0'); },
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  },
  // yyyy-mm-dd 加 n 个月，保持日
  addMonths(str, n) {
    const [y, m, d] = str.split('-').map(Number);
    const nd = new Date(y, m - 1 + n, d);
    return nd.getFullYear() + '-' + U.pad(nd.getMonth() + 1) + '-' + U.pad(nd.getDate());
  },
  diffDays(a, b) {
    return Math.round((new Date(a) - new Date(b)) / 86400000);
  },
  rangeLabel(r) {
    if (r.mode === 'month') return r.y + '年' + r.m + '月';
    if (r.mode === 'year') return r.y + '年';
    return '全部时间';
  },
  shortLabel(r) {
    if (r.mode === 'month') return r.y + '/' + U.pad(r.m);
    if (r.mode === 'year') return r.y + '年';
    return '全部';
  },
  inRange(dateStr, r) {
    if (!dateStr) return false;
    if (r.mode === 'month') return dateStr.slice(0, 7) === r.y + '-' + U.pad(r.m);
    if (r.mode === 'year') return dateStr.slice(0, 4) === String(r.y);
    return true;
  },
  defaultRange() {
    const d = new Date();
    return { mode: 'month', y: d.getFullYear(), m: d.getMonth() + 1 };
  },
  sum(arr, fn) {
    let s = 0;
    for (const x of arr) s += Number(fn ? fn(x) : x) || 0;
    return s;
  },
  group(arr, fn) {
    const m = new Map();
    for (const x of arr) {
      const k = fn(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    return m;
  },
  clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
};
// 便于测试时可替换
function DateNow() { return Date.now(); }
