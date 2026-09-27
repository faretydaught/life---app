/* ================= 7. 日常往返 ================= */
const CMETHODS = [
  { v: 'metro', l: '地铁' },
  { v: 'bus', l: '公交' },
  { v: 'bike', l: '共享单车' },
  { v: 'taxi', l: '网约车/出租' },
  { v: 'other', l: '其他' }
];
const CMETHOD_COLORS = {
  metro: '#94d82d', bus: '#4dabf7', bike: '#fcc419', taxi: '#ff8787', other: '#adb0bd'
};

reg('commute', {
  name: '日常往返', icon: '🚇', color: '#94D82D', bg: '#eef9dd',
  defaults: { ctype: 'ride', method: 'metro' },
  fields: [
    { key: 'amount', label: '花了多少', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    {
      key: 'ctype', label: '类型', type: 'select', half: true,
      options: [{ v: 'ride', l: '单次乘车' }, { v: 'topup', l: '交通卡充值' }]
    },
    { key: 'method', label: '出行方式', type: 'select', options: CMETHODS },
    { key: 'route', label: '路线 / 卡名', type: 'text', placeholder: '如：1号线 · 家→公司' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  fmt(r) {
    if (r.ctype === 'topup') {
      return {
        title: '交通卡充值' + (r.route ? ' · ' + r.route : ''),
        sub: r.date + (r.note ? ' · ' + r.note : ''),
        tag: '充值', tagCls: 'info'
      };
    }
    return {
      title: optLabel(CMETHODS, r.method) + (r.route ? ' · ' + r.route : ''),
      sub: r.date + (r.note ? ' · ' + r.note : ''),
      tag: optLabel(CMETHODS, r.method)
    };
  },
  kpi(records) {
    const rides = records.filter(r => r.ctype !== 'topup');
    const days = new Set(rides.map(r => r.date)).size;
    const rideSum = U.sum(rides, r => r.amount);
    return [
      { v: U.yuan(U.sum(records, r => r.amount)), l: '交通总支出' },
      { v: days ? U.yuan(rideSum / days) : '¥0', l: '平均每个出行日' },
      { v: U.yuan(U.sum(records.filter(r => r.ctype === 'topup'), r => r.amount)), l: '卡片充值', tone: 'red' }
    ];
  },
  dist(records) {
    const rides = records.filter(r => r.ctype !== 'topup');
    const m = new Map();
    rides.forEach(r => m.set(r.method, (m.get(r.method) || 0) + Number(r.amount)));
    const rows = [...m].map(([k, v]) => ({
      label: optLabel(CMETHODS, k), value: v, color: CMETHOD_COLORS[k] || '#adb0bd'
    })).sort((a, b) => b.value - a.value);
    return { rows };
  },
  extraTabs: [{
    label: '常用路线',
    render(records, rerender) {
      const rides = DB.getRecords('commute').filter(r =>
        r.ctype !== 'topup' && r.route && r.route.trim());
      if (!rides.length) return UI.empty('还没有记录过路线');
      const g = U.group(rides, r => r.method + '|' + r.route.trim());
      const card = document.createElement('div');
      card.className = 'card';
      [...g].map(([k, list]) => {
        const [method, route] = k.split('|');
        const total = U.sum(list, r => r.amount);
        return { method, route, n: list.length, avg: total / list.length };
      }).sort((a, b) => b.n - a.n).forEach(x => {
        const row = document.createElement('div');
        row.className = 'set-item';
        row.innerHTML =
          `<span class="set-ic">📍</span>
           <div class="set-main">
             <div class="set-t">${optLabel(CMETHODS, x.method)} · ${U.esc(x.route)}</div>
             <div class="set-s">走过 ${x.n} 次 · 均价 ${U.yuan(x.avg)}</div>
           </div>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-primary';
        btn.textContent = '速记';
        btn.addEventListener('click', () => UI.recordForm('commute', {
          preset: { ctype: 'ride', method: x.method, route: x.route, amount: Math.round(x.avg) },
          onDone: rerender
        }));
        row.appendChild(btn);
        card.appendChild(row);
      });
      return card;
    }
  }]
});

/* ================= 8. 外卖点餐 ================= */
const TPLATFORMS = [
  { v: 'meituan', l: '美团外卖' },
  { v: 'eleme', l: '饿了么' },
  { v: 'other', l: '其他' }
];
const TPLAT_COLORS = { meituan: '#F783AC', eleme: '#4dabf7', other: '#adb0bd' };

reg('takeout', {
  name: '外卖点餐', icon: '🛵', color: '#F783AC', bg: '#fee9f2',
  defaults: {
    foodCost: '', deliveryFee: '', packFee: '', discount: '',
    platform: 'meituan', mealType: 'lunch'
  },
  fields: [
    { key: 'amount', label: '实付金额', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    { key: 'mealType', label: '餐次', type: 'select', options: MEALS, half: true },
    { key: 'platform', label: '外卖平台', type: 'select', options: TPLATFORMS },
    { key: 'foodCost', label: '菜品价（选填）', type: 'number', half: true, placeholder: '选填' },
    { key: 'deliveryFee', label: '配送费（选填）', type: 'number', half: true, placeholder: '选填' },
    { key: 'packFee', label: '包装费（选填）', type: 'number', half: true, placeholder: '选填' },
    { key: 'discount', label: '优惠减免（选填）', type: 'number', half: true, placeholder: '选填' },
    { key: 'shop', label: '商家', type: 'text', placeholder: '如：黄焖鸡米饭（xx店）' },
    { key: 'dishes', label: '点了什么菜', type: 'text', placeholder: '如：黄焖鸡大份+米饭' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  fmt(r) {
    return {
      title: r.shop || '外卖',
      sub: [r.dishes, optLabel(TPLATFORMS, r.platform),
      '配送费 ' + U.yuan(r.deliveryFee || 0, false)].filter(Boolean).join(' · '),
      tag: optLabel(MEALS, r.mealType), tagCls: 'info'
    };
  },
  kpi(records) {
    const total = U.sum(records, r => r.amount);
    return [
      { v: records.length + ' 次', l: '外卖次数' },
      { v: records.length ? U.yuan(total / records.length) : '¥0', l: '平均客单价' },
      { v: U.yuan(U.sum(records, r => r.deliveryFee)), l: '配送费累计', tone: 'red' }
    ];
  },
  dist(records) {
    const m = new Map();
    records.forEach(r => m.set(r.platform, (m.get(r.platform) || 0) + Number(r.amount)));
    const rows = [...m].map(([k, v]) => ({
      label: optLabel(TPLATFORMS, k), value: v, color: TPLAT_COLORS[k] || '#adb0bd'
    })).sort((a, b) => b.value - a.value);

    const foodTotal = U.sum(DB.getRecords('food', App.state.range), r => r.amount);
    const outTotal = U.sum(records, r => r.amount);
    const note = `<div class="help-box" style="margin:0">
      <b>🍚 堂食 ${U.yuan(foodTotal)}</b> &nbsp;·&nbsp;
      <b>🛵 外卖 ${U.yuan(outTotal)}</b><br>
      本时间段外卖占"吃饭"总花费的
      <b>${(foodTotal + outTotal) ? Math.round(outTotal / (foodTotal + outTotal) * 100) : 0}%</b>
    </div>`;
    return { rows, note };
  },
  extraTabs: [{
    label: '常点',
    render(records, rerender) {
      const all = DB.getRecords('takeout').filter(r => r.shop && r.shop.trim());
      if (!all.length) return UI.empty('还没有记录过外卖商家');
      const g = U.group(all, r => r.platform + '|' + r.shop.trim());
      const card = document.createElement('div');
      card.className = 'card';
      [...g].map(([k, list]) => {
        const [platform, shop] = k.split('|');
        const total = U.sum(list, r => r.amount);
        return { platform, shop, n: list.length, avg: total / list.length };
      }).sort((a, b) => b.n - a.n).forEach(x => {
        const row = document.createElement('div');
        row.className = 'set-item';
        row.innerHTML =
          `<span class="set-ic">🛵</span>
           <div class="set-main">
             <div class="set-t">${U.esc(x.shop)}</div>
             <div class="set-s">${optLabel(TPLATFORMS, x.platform)} · 点过 ${x.n} 次 · 均价 ${U.yuan(x.avg)}</div>
           </div>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-primary';
        btn.textContent = '再来一单';
        btn.addEventListener('click', () => UI.recordForm('takeout', {
          preset: { shop: x.shop, platform: x.platform, amount: Math.round(x.avg) },
          onDone: rerender
        }));
        row.appendChild(btn);
        card.appendChild(row);
      });
      return card;
    }
  }]
});

/* ================= 9. 人类聚会 ================= */
const SCATS = [
  { v: 'gathering', l: '朋友聚会' },
  { v: 'gift', l: '份子/人情' }
];

reg('social', {
  name: '人类聚会', icon: '👥', color: '#FCC419', bg: '#fef4d6',
  defaults: { scat: 'gathering', split: 'aa', persons: 2, collected: 0 },
  fields: [
    { key: 'amount', label: '我花了多少', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    { key: 'scat', label: '类型', type: 'select', options: SCATS, half: true },
    { key: 'occasion', label: '聚会由头', type: 'text', placeholder: '如：生日局、周末聚餐' },
    { key: 'who', label: '人情对象/事件', type: 'text', placeholder: '如：小王婚礼' },
    { key: 'persons', label: '参与人数', type: 'number', half: true, step: '1' },
    {
      key: 'split', label: '出钱方式', type: 'select', half: true,
      options: [{ v: 'aa', l: 'AA 平摊' }, { v: 'treat', l: '我请客' }]
    },
    { key: 'perPerson', label: '人均花费', type: 'number', half: true },
    { key: 'collected', label: '已收回金额', type: 'number', half: true, placeholder: '别人给回我多少' },
    {
      key: 'receivable', label: '应收总额（我花的 − 人均）', type: 'computed',
      fn: v => Math.max(0, (Number(v.amount) || 0) - (Number(v.perPerson) || 0))
    },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  fmt(r) {
    if (r.scat === 'gift') {
      return {
        title: '份子人情' + (r.who ? ' · ' + r.who : ''),
        sub: [r.occasion, r.date].filter(Boolean).join(' · '),
        tag: '人情', tagCls: 'muted'
      };
    }
    if (r.split === 'treat') {
      return {
        title: r.occasion || '我请客',
        sub: (r.persons || 0) + ' 人参加 · ' + r.date,
        tag: '我请客', tagCls: 'warn'
      };
    }
    const receivable = Math.max(0, (Number(r.amount) || 0) - (Number(r.perPerson) || 0));
    let collected = Number(r.collected) || 0;
    // 兼容旧数据：以前只有 settled 开关、没有 collected 金额
    if (r.collected === undefined && r.settled) collected = receivable;
    const settled = receivable > 0 && collected >= receivable;
    const rest = receivable - collected;
    return {
      title: r.occasion || 'AA 聚会',
      sub: (r.persons || 0) + ' 人 · 人均 ' + U.yuan(r.perPerson || 0) +
        (receivable > 0 ? ' · 应收 ' + U.yuan(receivable) + ' · 已收回 ' + U.yuan(collected) : '') +
        ' · ' + r.date,
      tag: settled ? 'AA · 已结清' : (rest > 0 ? 'AA · 待收 ' + U.yuan(rest) : 'AA · 已结清'),
      tagCls: settled ? 'ok' : 'warn'
    };
  },
  tagClickable(r) {
    return r.scat !== 'gift' && r.split === 'aa';
  },
  onTagClick(r, rerender) {
    const receivable = Math.max(0, (Number(r.amount) || 0) - (Number(r.perPerson) || 0));
    const collected = Number(r.collected) || 0;
    if (receivable > 0 && collected < receivable) {
      DB.updateRecord(r.id, { collected: receivable });
      UI.toast('已标记全部收回 ' + U.yuan(receivable), 'ok');
    } else {
      DB.updateRecord(r.id, { collected: 0 });
      UI.toast('已重置为待收回', 'ok');
    }
    rerender();
  },
  kpi(records) {
    return [
      { v: records.filter(r => r.scat !== 'gift').length + ' 次', l: '聚会次数' },
      { v: U.yuan(U.sum(records.filter(r => r.scat !== 'gift' && r.split === 'treat'), r => r.amount)), l: '请客花费', tone: 'red' },
      { v: U.yuan(U.sum(records.filter(r => r.scat === 'gift'), r => r.amount)), l: '份子人情', tone: 'red' }
    ];
  },
  dist(records) {
    const v = k => U.sum(records.filter(k), r => r.amount);
    return {
      rows: [
        { label: '我请客', value: v(r => r.scat !== 'gift' && r.split === 'treat'), color: '#ff6b6b' },
        { label: 'AA 平摊', value: v(r => r.scat !== 'gift' && r.split === 'aa'), color: '#748ffc' },
        { label: '份子人情', value: v(r => r.scat === 'gift'), color: '#fcc419' }
      ].filter(r => r.value > 0)
    };
  },
  extraTabs: [{
    label: '人情簿',
    render(records, rerender) {
      const gifts = DB.getRecords('social').filter(r => r.scat === 'gift')
        .sort((a, b) => b.date.localeCompare(a.date));
      if (!gifts.length) return UI.empty('还没有人情人情记录');
      const card = document.createElement('div');
      card.className = 'card';
      gifts.forEach(r => {
        const row = document.createElement('div');
        row.className = 'set-item';
        row.innerHTML =
          `<span class="set-ic">🎁</span>
           <div class="set-main">
             <div class="set-t">${U.esc(r.who || '人情往来')}</div>
             <div class="set-s">${U.esc(r.occasion || '')} · ${U.esc(r.date)}</div>
           </div>
           <div class="rec-amt">${U.yuan(r.amount)}</div>`;
        card.appendChild(row);
      });
      return card;
    }
  }]
});
