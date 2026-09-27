/* ============ 数据层：localStorage 持久化 ============ */
const KEY = 'my-life-ledger-v1';

const DB = {
  data: null,
  _listeners: [],

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('读取本地数据失败', e);
    }
    if (!this.data || !Array.isArray(this.data.records)) {
      this.data = {
        version: 1,
        budgets: {},          // {food: 800} 月度预算，未设置为缺省
        tripBudgets: {},      // {旅行名: 3000}
        records: [],
        subscriptions: []
      };
      this.save();
    }
    if (!this.data.budgets) this.data.budgets = {};
    if (!this.data.tripBudgets) this.data.tripBudgets = {};
    if (!this.data.subscriptions) this.data.subscriptions = [];
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      UI && UI.toast('保存失败：存储空间可能已满', 'err');
    }
    this._listeners.forEach(fn => fn());
  },

  onChange(fn) { this._listeners.push(fn); },

  /* ---- 记录 ---- */
  getRecords(type, range) {
    let list = this.data.records;
    if (type) list = list.filter(r => r.type === type);
    if (range) list = list.filter(r => U.inRange(r.date, range));
    return list;
  },

  addRecord(rec) {
    rec.id = rec.id || U.uid('r');
    this.data.records.push(rec);
    this.save();
    return rec;
  },

  updateRecord(id, patch) {
    const r = this.data.records.find(x => x.id === id);
    if (r) {
      Object.assign(r, patch);
      this.save();
    }
  },

  removeRecord(id) {
    this.data.records = this.data.records.filter(x => x.id !== id);
    this.save();
  },

  /* ---- 预算 ---- */
  getBudget(type) {
    const v = this.data.budgets[type];
    return v ? Number(v) : null;
  },
  setBudget(type, val) {
    if (val === null || val === '' || isNaN(val)) delete this.data.budgets[type];
    else this.data.budgets[type] = Number(val);
    this.save();
  },
  getTripBudget(name) {
    const v = this.data.tripBudgets[name];
    return v ? Number(v) : null;
  },
  setTripBudget(name, val) {
    if (val === null || val === '' || isNaN(val)) delete this.data.tripBudgets[name];
    else this.data.tripBudgets[name] = Number(val);
    this.save();
  },

  /* ---- 订阅 ---- */
  getSubs(active) {
    let list = this.data.subscriptions;
    if (active === true) list = list.filter(s => s.active !== false);
    if (active === false) list = list.filter(s => s.active === false);
    return list;
  },
  addSub(sub) {
    sub.id = sub.id || U.uid('s');
    if (sub.active === undefined) sub.active = true;
    this.data.subscriptions.push(sub);
    this.save();
    return sub;
  },
  updateSub(id, patch) {
    const s = this.data.subscriptions.find(x => x.id === id);
    if (s) { Object.assign(s, patch); this.save(); }
  },
  removeSub(id) {
    this.data.subscriptions = this.data.subscriptions.filter(x => x.id !== id);
    this.save();
  },

  // 确认一笔订阅已扣费：生成支出记录，并把下次扣费日推进一个周期
  confirmSub(id) {
    const s = this.data.subscriptions.find(x => x.id === id);
    if (!s) return;
    const n = s.cycle === 'year' ? 12 : s.cycle === 'quarter' ? 3 : 1;
    this.addRecord({
      type: 'subscription',
      date: U.today(),
      amount: Number(s.amount),
      subId: s.id,
      subName: s.name,
      cycle: s.cycle,
      note: s.note || ''
    });
    // 从原扣费日推进；若已逾期则从今天起排
    const base = U.diffDays(U.today(), s.nextDate) > 0 ? U.today() : s.nextDate;
    this.updateSub(id, { nextDate: U.addMonths(base, n) });
  },

  /* ---- 备份 ---- */
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },
  importJSON(text) {
    const obj = JSON.parse(text);
    if (!Array.isArray(obj.records)) throw new Error('文件格式不正确');
    obj.version = 1;
    this.data = {
      version: 1,
      budgets: obj.budgets || {},
      tripBudgets: obj.tripBudgets || {},
      records: obj.records,
      subscriptions: obj.subscriptions || []
    };
    this.save();
  },
  clearAll() {
    this.data = { version: 1, budgets: {}, tripBudgets: {}, records: [], subscriptions: [] };
    this.save();
  }
};
