/* ============ 主程序：路由与启动 ============ */
const App = {
  state: { range: U.defaultRange() },

  init() {
    DB.load();
    window.addEventListener('hashchange', () => this.route());
    $('navAdd').addEventListener('click', () => this.pickCategory());
    if (!location.hash) location.hash = '#/home';
    this.route();
  },

  route() {
    UI.closeModal();
    const h = (location.hash || '#/home').replace(/^#/, '');
    const path = h.split('?')[0];
    const parts = path.split('/').filter(Boolean);

    // 底部导航高亮
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    if (parts[0] === 'settings') document.querySelector('[data-nav=settings]').classList.add('on');
    else document.querySelector('[data-nav=home]').classList.add('on');

    if (parts[0] === 'settings') {
      Settings.render();
    } else if (parts[0] === 'm' && parts[1]) {
      const mod = MODS[parts[1]];
      if (!mod) { location.hash = '#/home'; return; }
      if (mod.renderPage) mod.renderPage();
      else UI.genericPage(parts[1]);
    } else {
      if (parts[0] !== 'home') location.hash = '#/home';
      Home.render();
    }
    window.scrollTo(0, 0);
  },

  /* ---- 时间范围操作 ---- */
  shiftRange(d) {
    const r = this.state.range;
    if (r.mode === 'month') {
      const nd = new Date(r.y, r.m - 1 + d, 1);
      r.y = nd.getFullYear();
      r.m = nd.getMonth() + 1;
    } else if (r.mode === 'year') {
      r.y += d;
    }
    this.route();
  },

  setRangeMode(m) {
    const cur = this.state.range;
    const d = new Date();
    if (m === 'all') {
      this.state.range = { mode: 'all' };
    } else if (m === 'year') {
      this.state.range = { mode: 'year', y: cur.y || d.getFullYear() };
    } else {
      this.state.range = {
        mode: 'month',
        y: cur.y || d.getFullYear(),
        m: cur.m || d.getMonth() + 1
      };
    }
    this.route();
  },

  /* ---- 记一笔：先选分类 ---- */
  pickCategory() {
    const grid = document.createElement('div');
    grid.className = 'catgrid';
    Object.keys(MODS).forEach(k => {
      const mod = MODS[k];
      const b = document.createElement('button');
      b.innerHTML = `<span class="cg-ic" style="background:${mod.bg}">${mod.icon}</span>${mod.name}`;
      b.addEventListener('click', () => {
        UI.closeModal();
        UI.recordForm(k, { onDone: () => this.route() });
      });
      grid.appendChild(b);
    });
    this._picking = UI.modal({ title: '记一笔 · 选个分类', bodyNode: grid });
  }
};

App.init();
