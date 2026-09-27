/* ============ 首页 ============ */
const Home = {
  render() {
    const range = App.state.range;
    const app = $('app');
    app.innerHTML = '';

    app.appendChild(UI.header({
      title: '我的记账本',
      range,
      onNav: d => App.shiftRange(d),
      onMode: m => App.setRangeMode(m)
    }));

    // 提醒
    this._alerts().forEach(a => app.appendChild(a));

    // 各分类汇总
    const keys = Object.keys(MODS);
    const totals = keys.map(k =>
      U.sum(DB.getRecords(k, range), r => r.amount));
    const grand = U.sum(totals);

    // 圆盘
    const donutCard = document.createElement('div');
    donutCard.className = 'card';
    const dw = document.createElement('div');
    dw.className = 'donut-wrap';
    dw.appendChild(Charts.donut(
      keys.map((k, i) => ({ value: totals[i], color: MODS[k].color })),
      {
        centerLabel: U.rangeLabel(range) + ' · 总支出',
        centerSub: keys.reduce((n, k) =>
          n + DB.getRecords(k, range).length, 0) + ' 笔记录',
        onSegment: i => { if (totals[i] > 0) location.hash = '#/m/' + keys[i]; }
      }
    ));
    donutCard.appendChild(dw);
    app.appendChild(donutCard);

    // 分类列表
    const listCard = document.createElement('div');
    listCard.className = 'card';
    const h = document.createElement('div');
    h.className = 'card-t';
    h.textContent = '分类明细';
    h.style.marginBottom = '4px';
    listCard.appendChild(h);

    keys.forEach((k, i) => {
      const v = totals[i];
      const mod = MODS[k];
      const row = document.createElement('div');
      row.className = 'cat-row';

      let barHtml = '';
      let amtCls = '';
      if (range.mode === 'month') {
        const b = DB.getBudget(k);
        if (b) {
          const pct = v / b;
          barHtml = `<div class="cat-bar"><i class="${pct > 1 ? 'over' : ''}"
            style="width:${U.clamp(pct * 100, 2, 100)}%;background:${mod.color}"></i></div>`;
          if (pct > 1) amtCls = 'over';
        }
      }

      row.innerHTML =
        `<div class="cat-dot" style="background:${mod.color}"></div>
         <div class="cat-main">
           <div class="cat-name">${mod.icon} ${mod.name}</div>
           ${barHtml}
         </div>
         <div class="cat-right">
           <div class="cat-amt ${amtCls}">${U.yuan(v)}</div>
           <div class="cat-pct">${grand ? (v / grand * 100).toFixed(1) : '0'}%</div>
         </div>`;
      row.addEventListener('click', () => { location.hash = '#/m/' + k; });
      listCard.appendChild(row);
    });
    app.appendChild(listCard);
  },

  _alerts() {
    const out = [];

    // 订阅提醒（7 天内 / 逾期）
    const subs = DB.getSubs(true).filter(s =>
      U.diffDays(s.nextDate, U.today()) <= 7);
    subs.slice(0, 3).forEach(s => {
      const d = U.diffDays(s.nextDate, U.today());
      const a = document.createElement('div');
      a.className = 'alert ' + (d <= 0 ? 'alert-danger' : 'alert-info');
      a.innerHTML = `🔁 <span><b>「${U.esc(s.name)}」</b>
        ${d < 0 ? '已逾期 ' + (-d) + ' 天' : d === 0 ? '今天扣费' : d + ' 天后扣费'}
        · ${U.yuan(s.amount)}</span><span class="alert-arrow">›</span>`;
      a.addEventListener('click', () => { location.hash = '#/m/subscription'; });
      out.push(a);
    });

    // 预算提醒：以"当前月"（非月视图时用本月）
    const now = new Date();
    const monthRange = { mode: 'month', y: now.getFullYear(), m: now.getMonth() + 1 };
    Object.keys(MODS).forEach(k => {
      const b = DB.getBudget(k);
      if (!b) return;
      const used = U.sum(DB.getRecords(k, monthRange), r => r.amount);
      if (used > b) {
        const a = document.createElement('div');
        a.className = 'alert alert-danger';
        a.innerHTML = `⚠️ <span><b>${MODS[k].icon} ${MODS[k].name}</b>
          本月预算 ${U.yuan(b)}，已花 ${U.yuan(used)}</span>
          <span class="alert-arrow">›</span>`;
        a.addEventListener('click', () => { location.hash = '#/m/' + k; });
        out.push(a);
      }
    });

    return out;
  }
};
