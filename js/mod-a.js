/* ============ 模块注册中心 ============ */
const MODS = {};
function reg(key, def) { MODS[key] = def; }

// 从选项中找中文名
function optLabel(options, v) {
  const o = options.find(x => x.v === v);
  return o ? o.l : (v || '');
}

const MEALS = [
  { v: 'breakfast', l: '早餐' },
  { v: 'lunch', l: '午餐' },
  { v: 'dinner', l: '晚餐' },
  { v: 'snack', l: '加餐/零食' }
];
const MEAL_COLORS = {
  breakfast: '#FFB061', lunch: '#FF6B6B', dinner: '#9775FA', snack: '#41C990'
};

/* ================= 1. 餐食具体花费 ================= */
reg('food', {
  name: '餐食', icon: '🍚', color: '#FF6B6B', bg: '#ffe9e9',
  fields: [
    { key: 'amount', label: '花了多少', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    { key: 'mealType', label: '餐次', type: 'select', options: MEALS, half: true },
    { key: 'shop', label: '店名', type: 'text', placeholder: '如：楼下兰州拉面' },
    { key: 'companion', label: '同行人', type: 'text', placeholder: '没有可不填' },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  fmt(r) {
    const ml = optLabel(MEALS, r.mealType) || '餐饮';
    return {
      title: r.shop || ml,
      sub: ml + (r.companion ? ' · 和 ' + r.companion : '') + (r.note ? ' · ' + r.note : ''),
      tag: ml, tagCls: 'info'
    };
  },
  kpi(records) {
    const total = U.sum(records, r => r.amount);
    return [
      { v: U.yuan(total), l: '合计支出' },
      { v: records.length + ' 笔', l: '就餐次数' },
      { v: records.length ? U.yuan(total / records.length) : '¥0', l: '平均每餐' }
    ];
  },
  dist(records) {
    const m = new Map();
    records.forEach(r => m.set(r.mealType || 'snack', (m.get(r.mealType || 'snack') || 0) + Number(r.amount)));
    const rows = [...m].map(([k, v]) => ({
      label: optLabel(MEALS, k), value: v, color: MEAL_COLORS[k] || '#adb0bd',
      hint: U.yuan(v)
    })).sort((a, b) => b.value - a.value);
    return { rows };
  },
  extraTabs: [{
    label: '常去',
    render(records, rerender) {
      const all = DB.getRecords('food').filter(r => r.shop && r.shop.trim());
      if (!all.length) return UI.empty('还没有记录过店名');
      const g = U.group(all, r => r.shop.trim());
      const card = document.createElement('div');
      card.className = 'card';
      [...g].map(([shop, list]) => {
        const total = U.sum(list, r => r.amount);
        return { shop, n: list.length, avg: total / list.length };
      }).sort((a, b) => b.n - a.n).forEach(x => {
        const row = document.createElement('div');
        row.className = 'set-item';
        row.innerHTML =
          `<span class="set-ic">🏪</span>
           <div class="set-main">
             <div class="set-t">${U.esc(x.shop)}</div>
             <div class="set-s">去过 ${x.n} 次 · 均价 ${U.yuan(x.avg)}</div>
           </div>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-primary';
        btn.textContent = '再记';
        btn.addEventListener('click', () => UI.recordForm('food', {
          preset: { shop: x.shop, amount: Math.round(x.avg) }, onDone: rerender
        }));
        row.appendChild(btn);
        card.appendChild(row);
      });
      return card;
    }
  }]
});

/* ================= 2. 游戏娱乐支出 ================= */
const GTYPES = [
  { v: 'buy', l: '买断游戏' },
  { v: 'dlc', l: 'DLC/资料片' },
  { v: 'card', l: '点卡/会员' },
  { v: 'gacha', l: '内购/抽卡' },
  { v: 'fun', l: '线下娱乐' }
];
const GTYPE_COLORS = {
  buy: '#9775FA', dlc: '#748ffc', card: '#ffa94d', gacha: '#f76707', fun: '#e599f7'
};
const PLATFORMS = [
  { v: 'steam', l: 'Steam' },
  { v: 'epic', l: 'Epic' },
  { v: 'mobile', l: '手机游戏' },
  { v: 'switch', l: 'Switch' },
  { v: 'ps', l: 'PlayStation' },
  { v: 'xbox', l: 'Xbox' },
  { v: 'offline', l: '线下(KTV/电影等)' },
  { v: 'other', l: '其他' }
];

reg('game', {
  name: '游戏娱乐', icon: '🎮', color: '#9775FA', bg: '#efe9fe',
  fields: [
    { key: 'amount', label: '花了多少', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    { key: 'title', label: '游戏/项目名', type: 'text', placeholder: '如：黑神话悟空' },
    { key: 'gtype', label: '支出类型', type: 'select', options: GTYPES },
    { key: 'platform', label: '平台', type: 'select', options: PLATFORMS },
    { key: 'note', label: '备注', type: 'textarea' }
  ],
  fmt(r) {
    return {
      title: r.title || optLabel(GTYPES, r.gtype),
      sub: optLabel(PLATFORMS, r.platform) + ' · ' + optLabel(GTYPES, r.gtype),
      tag: optLabel(GTYPES, r.gtype), tagCls: 'info'
    };
  },
  kpi(records) {
    return [
      { v: U.yuan(U.sum(records, r => r.amount)), l: '合计支出' },
      { v: new Set(records.map(r => r.title).filter(Boolean)).size + ' 个', l: '玩过的游戏' },
      { v: U.yuan(U.sum(records.filter(r => r.gtype === 'gacha'), r => r.amount)), l: '内购抽卡', tone: 'red' }
    ];
  },
  dist(records) {
    const m = new Map();
    records.forEach(r => m.set(r.gtype || 'other', (m.get(r.gtype || 'other') || 0) + Number(r.amount)));
    const rows = [...m].map(([k, v]) => ({
      label: optLabel(GTYPES, k), value: v, color: GTYPE_COLORS[k] || '#adb0bd'
    })).sort((a, b) => b.value - a.value);
    return { rows };
  },
  extraTabs: [{
    label: '游戏库',
    render(records, rerender) {
      const all = DB.getRecords('game').filter(r => r.title && r.title.trim());
      if (!all.length) return UI.empty('还没有记录过游戏');
      const g = U.group(all, r => r.title.trim());
      const card = document.createElement('div');
      card.className = 'card';
      [...g].map(([title, list]) => ({
        title, total: U.sum(list, r => r.amount), n: list.length,
        last: list.map(r => r.date).sort().pop()
      })).sort((a, b) => b.total - a.total).forEach(x => {
        const row = document.createElement('div');
        row.className = 'set-item';
        row.innerHTML =
          `<span class="set-ic">🕹️</span>
           <div class="set-main">
             <div class="set-t">${U.esc(x.title)}</div>
             <div class="set-s">投入 ${x.n} 笔 · 累计 ${U.yuan(x.total)} · 最近 ${U.esc(x.last)}</div>
           </div>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-primary';
        btn.textContent = '＋投';
        btn.addEventListener('click', () => UI.recordForm('game', {
          preset: { title: x.title, platform: undefined }, onDone: rerender
        }));
        row.appendChild(btn);
        card.appendChild(row);
      });
      return card;
    }
  }]
});

/* ================= 3. 模型创作 ================= */
const ATYPES = [
  { v: 'model', l: '模型' },
  { v: 'texture', l: '贴图/材质' },
  { v: 'plugin', l: '插件' },
  { v: 'motion', l: '动作/镜头数据' },
  { v: 'hdri', l: 'HDRI/场景' },
  { v: 'tutorial', l: '教程/素材' }
];
const ATYPE_COLORS = {
  model: '#4dabf7', texture: '#f783ac', plugin: '#94d82d',
  motion: '#da77f2', hdri: '#fcc419', tutorial: '#63e6be'
};

reg('model', {
  name: '模型创作', icon: '🧩', color: '#4DABF7', bg: '#e6f3fe',
  fields: [
    { key: 'amount', label: '花了多少', type: 'amount' },
    { key: 'date', label: '日期', type: 'date', half: true },
    { key: 'assetName', label: '资产名称', type: 'text', placeholder: '如：二次元少女改模 / Ray 材质包' },
    { key: 'atype', label: '资产类型', type: 'select', options: ATYPES },
    { key: 'source', label: '来源', type: 'text', placeholder: '如：Booth / Sketchfab / 淘宝店' },
    { key: 'project', label: '所属创作项目', type: 'text', placeholder: '如：MMD 舞台 PV' },
    { key: 'note', label: '备注/存放位置', type: 'textarea' }
  ],
  fmt(r) {
    return {
      title: r.assetName || optLabel(ATYPES, r.atype),
      sub: [r.source, r.project, r.note].filter(Boolean).join(' · '),
      tag: optLabel(ATYPES, r.atype), tagCls: 'info'
    };
  },
  kpi(records) {
    const all = DB.getRecords('model').filter(r => r.assetName && r.assetName.trim());
    const dup = new Set();
    U.group(all, r => r.assetName.trim()).forEach((list, name) => {
      if (list.length > 1) dup.add(name);
    });
    return [
      { v: U.yuan(U.sum(records, r => r.amount)), l: '合计支出' },
      { v: new Set(records.map(r => r.project).filter(Boolean)).size + ' 个', l: '创作项目' },
      { v: dup.size + ' 项', l: '疑似重复购买', tone: dup.size ? 'red' : '' }
    ];
  },
  dist(records) {
    const m = new Map();
    records.forEach(r => m.set(r.atype, (m.get(r.atype) || 0) + Number(r.amount)));
    const rows = [...m].map(([k, v]) => ({
      label: optLabel(ATYPES, k), value: v, color: ATYPE_COLORS[k] || '#adb0bd'
    })).sort((a, b) => b.value - a.value);
    return { rows };
  },
  extraTabs: [
    {
      label: '项目',
      render(records, rerender) {
        const all = DB.getRecords('model').filter(r => r.project && r.project.trim());
        if (!all.length) return UI.empty('还没有给资产标注项目');
        const g = U.group(all, r => r.project.trim());
        const card = document.createElement('div');
        card.className = 'card';
        [...g].map(([p, list]) => ({
          p, total: U.sum(list, r => r.amount), n: list.length
        })).sort((a, b) => b.total - a.total).forEach(x => {
          const row = document.createElement('div');
          row.className = 'set-item';
          row.innerHTML =
            `<span class="set-ic">🎬</span>
             <div class="set-main">
               <div class="set-t">${U.esc(x.p)}</div>
               <div class="set-s">${x.n} 项资产 · 已投入 ${U.yuan(x.total)}</div>
             </div>`;
          card.appendChild(row);
        });
        return card;
      }
    },
    {
      label: '资产',
      render(records, rerender) {
        const all = DB.getRecords('model').filter(r => r.assetName && r.assetName.trim());
        if (!all.length) return UI.empty('还没有资产记录');
        const count = new Map();
        all.forEach(r => count.set(r.assetName.trim(), (count.get(r.assetName.trim()) || 0) + 1));
        const card = document.createElement('div');
        card.className = 'card';
        all.sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
          const n = count.get(r.assetName.trim());
          const row = document.createElement('div');
          row.className = 'set-item';
          row.innerHTML =
            `<span class="set-ic">🧱</span>
             <div class="set-main">
               <div class="set-t">${U.esc(r.assetName)}</div>
               <div class="set-s">${optLabel(ATYPES, r.atype)} · ${U.esc(r.source || '来源未填')}</div>
             </div>`;
          const tag = document.createElement('span');
          tag.className = 'pill ' + (n > 1 ? 'red' : 'green');
          tag.textContent = n > 1 ? '疑似重复×' + n : '唯一';
          row.appendChild(tag);
          card.appendChild(row);
        });
        return card;
      }
    }
  ]
});
