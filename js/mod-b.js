/* ================= 4. 网上购物 ================= */
const SHOP_PLATFORMS = [
  { v: 'taobao', l: '淘宝' },
  { v: 'jd', l: '京东' },
  { v: 'pdd', l: '拼多多' },
  { v: 'tmall', l: '天猫' },
  { v: 'douyin', l: '抖音' },
  { v: 'other', l: '其他' }
];
const SHOP_COLORS = {
  taobao: '#ff6a00', jd: '#e1251b', pdd: '#e02e24',
  tmall: '#ff0036', douyin: '#161823', other: '#adb0bd'
};
const SHOP_STATUS = [
  { v: 'ordered', l: '已下单' },
  { v: 'shipped', l: '已发货' },
  { v: 'received', l: '已到货' },
  { v: 'returned', l: '已退货' }
];

reg('shopping', {
  name: '网上购物', icon: '🛒', color: '#FF922B', bg: '#fff0e0',
  defaults: { qty: 1, status: 'ordered', platform: 'taobao' },
  fields: [
    { key: 'amount', label: '下单金额', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    { key: 'item', label: '买了什么', type: 'text', placeholder: '如：键盘、洗衣液…' },
    { key: 'platform', label: '平台', type: 'select', options: SHOP_PLATFORMS },
    { key: 'qty', label: '数量', type: 'number', half: true, step: '1' },
    { key: 'status', label: '状态', type: 'select', options: SHOP_STATUS, half: true },
    { key: 'link', label: '订单链接/备注', type: 'text' },
    { key: 'note', label: '补充说明', type: 'textarea' }
  ],
  fmt(r) {
    const cls = r.status === 'received' ? 'ok'
      : r.status === 'returned' ? 'muted'
      : r.status === 'shipped' ? 'info' : 'info';
    return {
      title: r.item || '未命名商品',
      sub: optLabel(SHOP_PLATFORMS, r.platform) + ' · ×' + (r.qty || 1) +
        (r.link ? ' · 有订单链接' : ''),
      tag: optLabel(SHOP_STATUS, r.status), tagCls: cls
    };
  },
  onTagClick(r, rerender) {
    const order = ['ordered', 'shipped', 'received', 'returned'];
    const next = order[(order.indexOf(r.status) + 1) % order.length];
    DB.updateRecord(r.id, { status: next });
    UI.toast('已标记为「' + optLabel(SHOP_STATUS, next) + '」');
    rerender();
  },
  kpi(records) {
    const returned = U.sum(records.filter(r => r.status === 'returned'), r => r.amount);
    const net = U.sum(records.filter(r => r.status !== 'returned'), r => r.amount);
    return [
      { v: U.yuan(net), l: '实际净花费', tone: 'green' },
      { v: U.yuan(returned), l: '退货退回', tone: returned ? 'red' : '' },
      { v: records.length + ' 件', l: '下单数' }
    ];
  },
  dist(records) {
    const m = new Map();
    records.forEach(r => m.set(r.platform, (m.get(r.platform) || 0) + Number(r.amount)));
    const rows = [...m].map(([k, v]) => ({
      label: optLabel(SHOP_PLATFORMS, k), value: v, color: SHOP_COLORS[k] || '#adb0bd'
    })).sort((a, b) => b.value - a.value);
    return { rows };
  }
});

/* ================= 5. 付费订阅（自定义页面） ================= */
const CYCLES = [
  { v: 'month', l: '月付', n: 1 },
  { v: 'quarter', l: '季付', n: 3 },
  { v: 'year', l: '年付', n: 12 }
];
function cycleMonthly(s) {
  const c = CYCLES.find(x => x.v === s.cycle);
  return Number(s.amount) / (c ? c.n : 1);
}

reg('subscription', {
  name: '付费订阅', icon: '🔁', color: '#20C997', bg: '#ddf6ec',
  // 供「扣费记录」编辑使用
  fields: [
    { key: 'amount', label: '扣费金额', type: 'amount' },
    { key: 'date', label: '扣费日期', type: 'date', half: true },
    { key: 'subName', label: '订阅名称', type: 'text', placeholder: '如：某视频会员' },
    { key: 'cycle', label: '扣费周期', type: 'select', options: CYCLES.map(c => ({ v: c.v, l: c.l })) },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  fmt(r) {
    return {
      title: r.subName || '订阅扣费',
      sub: optLabel(CYCLES, r.cycle) + ' · ' + r.date,
      tag: ''
    };
  },

  /* ---- 自定义页面 ---- */
  renderPage() {
    const mod = this;
    const app = $('app');
    app.innerHTML = '';
    app.appendChild(UI.header({ icon: '🔁', title: '付费订阅' }));

    const active = DB.getSubs(true);
    const monthly = U.sum(active, s => cycleMonthly(s));
    const krow = document.createElement('div');
    krow.className = 'kpi-row';
    [
      { v: U.yuan(monthly), l: '每月固定支出', tone: 'red' },
      { v: U.yuan(monthly * 12), l: '折合每年' },
      { v: active.length + ' 个', l: '使用中' }
    ].forEach(k => {
      const d = document.createElement('div');
      d.className = 'kpi';
      d.innerHTML = `<div class="kpi-v ${k.tone || ''}">${U.esc(k.v)}</div>
                     <div class="kpi-l">${U.esc(k.l)}</div>`;
      krow.appendChild(d);
    });
    app.appendChild(krow);

    const tabs = document.createElement('div');
    tabs.className = 'pagetabs';
    const content = document.createElement('div');
    const rerender = () => mod.renderPage();

    [['subs', '订阅中'], ['off', '已取消'], ['log', '扣费明细']].forEach(([k, l], i) => {
      const b = document.createElement('button');
      b.textContent = l;
      if (i === 0) b.classList.add('on');
      b.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        content.innerHTML = '';
        if (k === 'subs') content.appendChild(mod._subList(true, rerender));
        else if (k === 'off') content.appendChild(mod._subList(false, rerender));
        else content.appendChild(UI.recordList(DB.getRecords('subscription'), mod, { rerender }));
      });
      tabs.appendChild(b);
    });
    app.appendChild(tabs);
    content.appendChild(mod._subList(true, rerender));
    app.appendChild(content);

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '＋';
    fab.addEventListener('click', () => mod._subForm(null, rerender));
    app.appendChild(fab);
  },

  _subList(active, rerender) {
    const mod = this;
    const list = DB.getSubs(active);
    if (!list.length) return UI.empty(active ? '还没有使用中的订阅' : '没有已取消的订阅');
    const frag = document.createDocumentFragment();
    list.sort((a, b) => a.nextDate.localeCompare(b.nextDate)).forEach(s => {
      const card = document.createElement('div');
      card.className = 'sub-card';
      const d = U.diffDays(s.nextDate, U.today());
      let pill;
      if (d < 0) pill = `<span class="pill red">已逾期 ${-d} 天</span>`;
      else if (d === 0) pill = `<span class="pill red">今天扣费</span>`;
      else if (d <= 7) pill = `<span class="pill orange">${d} 天后扣费</span>`;
      else pill = `<span class="pill gray">${d} 天后扣费</span>`;

      card.innerHTML =
        `<div class="sub-main">
           <div class="sub-name">${U.esc(s.name)} ${pill}</div>
           <div class="sub-meta">${U.esc(s.nextDate)} 扣费 · ${optLabel(CYCLES, s.cycle)}</div>
           <div class="sub-actions"></div>
         </div>
         <div class="sub-amt">${U.yuan(s.amount)}</div>`;
      const actions = card.querySelector('.sub-actions');

      if (active) {
        const pay = document.createElement('button');
        pay.className = 'btn btn-sm btn-primary';
        pay.textContent = '已扣费';
        pay.addEventListener('click', async () => {
          if (await UI.confirm(`记录「${s.name}」${U.yuan(s.amount)} 已扣费？`)) {
            DB.confirmSub(s.id);
            UI.toast('已记录扣费，下次：' +
              DB.data.subscriptions.find(x => x.id === s.id).nextDate, 'ok');
            rerender();
          }
        });
        const edit = document.createElement('button');
        edit.className = 'btn btn-sm btn-ghost';
        edit.textContent = '编辑';
        edit.addEventListener('click', () => mod._subForm(s, rerender));
        const off = document.createElement('button');
        off.className = 'btn btn-sm btn-ghost';
        off.textContent = '取消订阅';
        off.addEventListener('click', async () => {
          if (await UI.confirm(`取消「${s.name}」？不会删除历史记录`, true)) {
            DB.updateSub(s.id, { active: false });
            rerender();
          }
        });
        actions.append(pay, edit, off);
      } else {
        const resume = document.createElement('button');
        resume.className = 'btn btn-sm btn-primary';
        resume.textContent = '恢复使用';
        resume.addEventListener('click', () => { DB.updateSub(s.id, { active: true }); rerender(); });
        const del = document.createElement('button');
        del.className = 'btn btn-sm btn-ghost';
        del.textContent = '彻底删除';
        del.addEventListener('click', async () => {
          if (await UI.confirm('彻底删除这个订阅？历史扣费记录仍保留', true)) {
            DB.removeSub(s.id);
            rerender();
          }
        });
        actions.append(resume, del);
      }
      frag.appendChild(card);
    });
    return frag;
  },

  _subForm(sub, rerender) {
    const mod = this;
    const fields = [
      { key: 'name', label: '订阅名称', type: 'text', placeholder: '如：视频会员 / 云盘 / AI 工具' },
      { key: 'amount', label: '每次扣费金额', type: 'amount' },
      { key: 'cycle', label: '扣费周期', type: 'select', options: CYCLES.map(c => ({ v: c.v, l: c.l })) },
      { key: 'nextDate', label: '下次扣费日期', type: 'date' },
      { key: 'note', label: '备注', type: 'textarea' }
    ];
    const form = UI.buildForm(fields, Object.assign(
      { cycle: 'month', nextDate: U.today() }, sub || {}
    ));
    const footer = [{
      text: sub ? '保存修改' : '添加订阅', cls: 'btn-primary',
      onClick: () => {
        const v = form.values;
        if (!v.name || !(Number(v.amount) > 0)) { UI.toast('请填名称和金额', 'err'); return; }
        if (sub) { DB.updateSub(sub.id, v); UI.toast('已修改', 'ok'); }
        else { DB.addSub(v); UI.toast('已添加订阅', 'ok'); }
        UI.closeModal();
        rerender();
      }
    }];
    if (sub) {
      footer.unshift({
        text: '删除', cls: 'btn-danger',
        onClick: async () => {
          UI.closeModal();
          if (await UI.confirm('彻底删除这个订阅？历史扣费记录仍保留', true)) {
            DB.removeSub(sub.id);
            rerender();
          } else mod._subForm(sub, rerender);
        }
      });
    }
    UI.modal({
      title: sub ? '编辑订阅' : '添加订阅',
      bodyNode: form.el,
      footer
    });
  }
});

/* ================= 6. 旅游交通（自定义页面） ================= */
const TCATS = [
  { v: 'flight', l: '机票', ic: '✈️' },
  { v: 'train', l: '火车/长途车', ic: '🚆' },
  { v: 'hotel', l: '住宿', ic: '🏨' },
  { v: 'ticket', l: '门票/游玩', ic: '🎫' },
  { v: 'local', l: '当地交通', ic: '🚌' },
  { v: 'other', l: '其他', ic: '📌' }
];
const TCAT_COLORS = {
  flight: '#4dabf7', train: '#748ffc', hotel: '#f783ac',
  ticket: '#fcc419', local: '#94d82d', other: '#adb0bd'
};

reg('travel', {
  name: '旅游交通', icon: '✈️', color: '#339AF0', bg: '#e4f1fe',
  defaults: { tcat: 'other' },
  fields() {
    const trips = [...new Set(DB.getRecords('travel').map(r => r.trip).filter(Boolean))];
    return [
      { key: 'amount', label: '花了多少', type: 'amount' },
      { key: 'date', label: '日期', type: 'date', half: true },
      {
        key: 'trip', label: '哪趟旅行', type: 'select', half: true,
        options: [{ v: '__new__', l: '＋ 新建旅行' }].concat(trips.map(t => ({ v: t, l: t })))
      },
      { key: 'newTrip', label: '新旅行名称（选新建时填）', type: 'text', half: true },
      { key: 'tcat', label: '花费类型', type: 'select', options: TCATS.map(t => ({ v: t.v, l: t.l + ' ' + t.ic })) },
      { key: 'note', label: '备注', type: 'textarea' }
    ];
  },
  prepare(v) {
    if (v.trip === '__new__' && v.newTrip && v.newTrip.trim()) v.trip = v.newTrip.trim();
    delete v.newTrip;
    if (!v.trip) v.trip = '未命名旅行';
  },
  fmt(r) {
    const t = TCATS.find(x => x.v === r.tcat) || TCATS[5];
    return {
      title: t.l + (r.note ? ' · ' + r.note : ''),
      sub: r.trip + ' · ' + r.date,
      tag: r.trip, tagCls: 'info'
    };
  },

  renderPage() {
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    const trip = q.get('trip');
    if (trip) this._detail(trip);
    else this._trips();
  },

  _trips() {
    const mod = this;
    const app = $('app');
    app.innerHTML = '';
    app.appendChild(UI.header({ icon: '✈️', title: '旅游交通' }));

    const all = DB.getRecords('travel');
    const tabs = document.createElement('div');
    tabs.className = 'pagetabs';
    const content = document.createElement('div');
    const rerender = () => mod._trips();

    const b1 = document.createElement('button');
    b1.textContent = '旅行卡'; b1.className = 'on';
    const b2 = document.createElement('button');
    b2.textContent = '统计';
    b1.addEventListener('click', () => { b1.className = 'on'; b2.className = ''; showTrips(); });
    b2.addEventListener('click', () => { b2.className = 'on'; b1.className = ''; showStats(); });
    tabs.append(b1, b2);
    app.appendChild(tabs);

    function showTrips() {
      content.innerHTML = '';
      if (!all.length) { content.appendChild(UI.empty('还没有旅行记录，点右下角开始第一趟')); return; }
      const g = U.group(all, r => r.trip);
      [...g].map(([name, list]) => {
        const dates = list.map(r => r.date).sort();
        return {
          name, list, total: U.sum(list, r => r.amount),
          n: list.length, start: dates[0], end: dates[dates.length - 1]
        };
      }).sort((a, b) => b.start.localeCompare(a.start)).forEach((x, idx) => {
        const budget = DB.getTripBudget(x.name);
        const over = budget && x.total > budget;
        const card = document.createElement('div');
        card.className = 'trip-card t' + ((idx % 4) + 1);
        card.innerHTML =
          `<div class="trip-name">${U.esc(x.name)}</div>
           <div class="trip-meta">${U.esc(x.start)} ~ ${U.esc(x.end)} · ${x.n} 笔花费</div>
           <div class="trip-foot">
             <div class="trip-total">${U.yuan(x.total)}</div>
             <div class="trip-budget">${budget ? '预算 ' + U.yuan(budget) : '未设预算'}</div>
           </div>
           ${budget ? `<div class="trip-track"><i class="${over ? 'over' : ''}"
             style="width:${U.clamp(x.total / budget * 100, 4, 100)}%"></i></div>` : ''}`;
        card.addEventListener('click', () => {
          location.hash = '#/m/travel?trip=' + encodeURIComponent(x.name);
        });
        content.appendChild(card);
      });
    }

    function showStats() {
      content.innerHTML = '';
      if (!all.length) { content.appendChild(UI.empty('暂无数据')); return; }
      const g = U.group(all, r => r.trip);
      const tripRows = [...g].map(([name, list]) => ({
        label: name, value: U.sum(list, r => r.amount), color: '#4dabf7'
      })).sort((a, b) => b.value - a.value);

      const c1 = document.createElement('div');
      c1.className = 'card';
      c1.appendChild(document.createTextNode(''));
      const h = document.createElement('div');
      h.className = 'card-t';
      h.textContent = '各次旅行花费';
      c1.appendChild(h);
      c1.appendChild(Charts.bars(tripRows));
      content.appendChild(c1);

      const m = new Map();
      all.forEach(r => m.set(r.tcat, (m.get(r.tcat) || 0) + Number(r.amount)));
      const catRows = [...m].map(([k, v]) => {
        const t = TCATS.find(x => x.v === k) || TCATS[5];
        return { label: t.l, value: v, color: TCAT_COLORS[k] || '#adb0bd' };
      }).sort((a, b) => b.value - a.value);
      const c2 = document.createElement('div');
      c2.className = 'card';
      const h2 = document.createElement('div');
      h2.className = 'card-t';
      h2.textContent = '花费类型分布（全部旅行）';
      c2.appendChild(h2);
      c2.appendChild(Charts.bars(catRows));
      content.appendChild(c2);
    }

    showTrips();
    app.appendChild(content);

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '✎';
    fab.addEventListener('click', () => UI.recordForm('travel', { onDone: rerender }));
    app.appendChild(fab);
  },

  _detail(name) {
    const mod = this;
    const app = $('app');
    app.innerHTML = '';
    const records = DB.getRecords('travel').filter(r => r.trip === name)
      .sort((a, b) => a.date.localeCompare(b.date));
    const total = U.sum(records, r => r.amount);
    const budget = DB.getTripBudget(name);
    const over = budget && total > budget;

    app.appendChild(UI.header({
      icon: '🧳', title: name,
      back: () => { location.hash = '#/m/travel'; }
    }));

    const hero = document.createElement('div');
    hero.className = 'trip-card t1';
    hero.innerHTML =
      `<div class="trip-name">${U.esc(name)}</div>
       <div class="trip-meta">${records.length} 笔花费 · ${
         records.length ? records[0].date + ' ~ ' + records[records.length - 1].date : ''}</div>
       <div class="trip-foot">
         <div class="trip-total">${U.yuan(total)}</div>
         <div class="trip-budget">${budget ? '预算 ' + U.yuan(budget) + (over ? ' · 已超支' : '') : '未设预算'}</div>
       </div>
       ${budget ? `<div class="trip-track"><i class="${over ? 'over' : ''}"
         style="width:${U.clamp(total / budget * 100, 4, 100)}%"></i></div>` : ''}`;
    app.appendChild(hero);

    const setBudget = document.createElement('button');
    setBudget.className = 'btn btn-ghost';
    setBudget.style.marginBottom = '12px';
    setBudget.style.width = '100%';
    setBudget.textContent = budget ? '修改这趟旅行的预算' : '给这趟旅行设个预算';
    setBudget.addEventListener('click', () => {
      const form = UI.buildForm(
        [{ key: 'b', label: '预算金额（留空清除）', type: 'number' }],
        { b: budget || '' }
      );
      UI.modal({
        title: name + ' · 预算',
        bodyNode: form.el,
        footer: [{
          text: '保存', cls: 'btn-primary',
          onClick: () => {
            const v = form.values.b;
            DB.setTripBudget(name, v === '' || v === null ? null : Number(v));
            UI.closeModal();
            mod._detail(name);
          }
        }]
      });
    });
    app.appendChild(setBudget);

    const card = document.createElement('div');
    card.className = 'card';
    if (!records.length) {
      card.appendChild(UI.empty('还没有花费记录'));
    } else {
      records.forEach(r => {
        const t = TCATS.find(x => x.v === r.tcat) || TCATS[5];
        const item = document.createElement('div');
        item.className = 'tl-item';
        item.innerHTML =
          `<div class="tl-dot">${t.ic}</div>
           <div class="tl-body">
             <div class="tl-top">
               <span class="tl-title">${U.esc(t.l)}</span>
               <span class="tl-amt">${U.yuan(r.amount)}</span>
             </div>
             <div class="tl-sub">${U.esc(r.date)}${r.note ? ' · ' + U.esc(r.note) : ''}</div>
           </div>`;
        item.addEventListener('click', () => UI.recordForm('travel', {
          record: r, onDone: () => mod._detail(name)
        }));
        card.appendChild(item);
      });
    }
    app.appendChild(card);

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '✎';
    fab.addEventListener('click', () => UI.recordForm('travel', {
      preset: { trip: name },
      onDone: () => mod._detail(name)
    }));
    app.appendChild(fab);
  }
});
