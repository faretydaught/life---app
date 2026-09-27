/* ============ UI 通用组件 ============ */
const $ = id => document.getElementById(id);

const UI = {
  /* ---- Toast ---- */
  toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    $('toastRoot').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 1800);
    setTimeout(() => t.remove(), 2200);
  },

  /* ---- 确认框 ---- */
  confirm(text, danger) {
    return new Promise(resolve => {
      const m = this.modal({
        title: '请确认',
        bodyHtml: `<div style="padding:4px 2px 8px;color:#555">${U.esc(text)}</div>`,
        footer: [
          { text: '取消', cls: 'btn-ghost', onClick: () => { this.closeModal(); resolve(false); } },
          { text: '确定', cls: danger ? 'btn-danger' : 'btn-primary',
            onClick: () => { this.closeModal(); resolve(true); } }
        ]
      });
    });
  },

  /* ---- 弹层 ---- */
  modal(opt) {
    const mask = document.createElement('div');
    mask.className = 'mask';
    const box = document.createElement('div');
    box.className = 'modal';

    if (opt.title) {
      const h = document.createElement('div');
      h.className = 'modal-h';
      h.innerHTML = `<div class="modal-t">${U.esc(opt.title)}</div>`;
      const x = document.createElement('button');
      x.className = 'modal-x';
      x.innerHTML = '✕';
      x.addEventListener('click', () => { this.closeModal(); opt.onClose && opt.onClose(); });
      h.appendChild(x);
      box.appendChild(h);
    }

    const body = document.createElement('div');
    body.className = 'modal-b';
    if (opt.bodyHtml) body.innerHTML = opt.bodyHtml;
    if (opt.bodyNode) body.appendChild(opt.bodyNode);
    box.appendChild(body);

    if (opt.footer) {
      const f = document.createElement('div');
      f.className = 'modal-f';
      opt.footer.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn ' + b.cls;
        btn.textContent = b.text;
        btn.addEventListener('click', b.onClick);
        f.appendChild(btn);
      });
      box.appendChild(f);
    }

    mask.appendChild(box);
    mask.addEventListener('mousedown', e => {
      if (e.target === mask) { this.closeModal(); opt.onClose && opt.onClose(); }
    });
    $('modalRoot').appendChild(mask);
    return mask;
  },

  closeModal() {
    const root = $('modalRoot');
    while (root.firstChild) root.removeChild(root.firstChild);
  },

  /* ---- 顶部栏 ---- */
  header(opt) {
    const el = document.createElement('div');
    el.className = 'topbar';
    const range = opt.range;
    const row1 = document.createElement('div');
    row1.className = 'topbar-row';

    if (opt.back) {
      const b = document.createElement('button');
      b.className = 'back-btn';
      b.innerHTML = '‹';
      b.addEventListener('click', opt.back);
      row1.appendChild(b);
    }

    const title = document.createElement('div');
    title.className = 'topbar-title';
    title.innerHTML = (opt.icon ? opt.icon + ' ' : '') + U.esc(opt.title);
    row1.appendChild(title);

    if (range) {
      const sw = document.createElement('div');
      sw.className = 'month-switch';
      const prev = document.createElement('button');
      prev.className = 'ms-btn'; prev.innerHTML = '‹';
      const name = document.createElement('div');
      name.className = 'month-name';
      name.textContent = U.shortLabel(range);
      const next = document.createElement('button');
      next.className = 'ms-btn'; next.innerHTML = '›';
      const future = range.mode === 'month'
        ? (range.y > new Date().getFullYear() ||
           (range.y === new Date().getFullYear() && range.m >= new Date().getMonth() + 1))
        : range.mode === 'year' && range.y >= new Date().getFullYear();
      next.disabled = future;
      prev.addEventListener('click', () => opt.onNav(-1));
      next.addEventListener('click', () => opt.onNav(1));
      sw.append(prev, name, next);
      row1.appendChild(sw);
    }
    el.appendChild(row1);

    if (range && opt.onMode) {
      const row2 = document.createElement('div');
      row2.className = 'topbar-row';
      row2.style.justifyContent = 'flex-end';
      row2.style.marginTop = '8px';
      const seg = document.createElement('div');
      seg.className = 'seg';
      [['month', '月'], ['year', '年'], ['all', '全部']].forEach(([m, l]) => {
        const b = document.createElement('button');
        b.textContent = l;
        if (range.mode === m) b.className = 'on';
        b.addEventListener('click', () => opt.onMode(m));
        seg.appendChild(b);
      });
      row2.appendChild(seg);
      el.appendChild(row2);
    }
    return el;
  },

  /* ---- 表单构建器 ---- */
  // fields: [{key,label,type,options,half,fn(computed),placeholder}]
  buildForm(fields, values) {
    values = Object.assign({}, values);
    const el = document.createElement('div');
    const halfBuf = [];

    const flushHalf = () => {
      if (!halfBuf.length) return;
      const row = document.createElement('div');
      row.className = 'fld-row';
      halfBuf.forEach(x => row.appendChild(x));
      el.appendChild(row);
      halfBuf.length = 0;
    };

    fields.forEach(f => {
      if (f.type === 'amount' && f.half) { /* amount 不支持半宽 */ }
      const wrap = document.createElement('div');
      wrap.className = 'fld';
      const label = document.createElement('div');
      label.className = 'fld-l';
      label.innerHTML = `<span>${U.esc(f.label)}</span>`;

      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.value = values[f.key] || '';
        input.placeholder = f.placeholder || '';
      } else if (f.type === 'select') {
        input = document.createElement('select');
        f.options.forEach(o => {
          const op = document.createElement('option');
          op.value = o.v; op.textContent = o.l;
          if (String(values[f.key]) === String(o.v)) op.selected = true;
          input.appendChild(op);
        });
      } else if (f.type === 'switch') {
        wrap.className += ' fld-switch';
        const sw = document.createElement('label');
        sw.className = 'switch';
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!values[f.key];
        const sl = document.createElement('span');
        sl.className = 'slider';
        sw.append(input, sl);
        wrap.append(label, sw);
        input.addEventListener('change', () => { values[f.key] = input.checked; });
        if (f.half) halfBuf.push(wrap); else { flushHalf(); el.appendChild(wrap); }
        return;
      } else if (f.type === 'computed') {
        input = document.createElement('div');
        input.className = 'computed-box';
        input.innerHTML = `<span>${U.esc(f.label)}</span><span data-v>${U.yuan(f.fn(values))}</span>`;
        wrap.appendChild(input);
        if (f.half) halfBuf.push(wrap); else { flushHalf(); el.appendChild(wrap); }
        return;
      } else {
        input = document.createElement('input');
        input.type = f.type === 'amount' ? 'number' : (f.type || 'text');
        input.step = f.type === 'amount' ? '0.01' : (f.step || '0.01');
        input.min = '0';
        input.value = values[f.key] !== undefined && values[f.key] !== null ? values[f.key] : '';
        input.placeholder = f.placeholder || '';
        if (f.type === 'amount') {
          wrap.className += ' fld-amount';
          const rmb = document.createElement('span');
          rmb.className = 'rmb'; rmb.textContent = '¥';
          wrap.append(rmb, input);
          wrap.prepend(label);
          if (f.half) halfBuf.push(wrap); else { flushHalf(); el.appendChild(wrap); }
          bind();
          return;
        }
      }
      wrap.append(label, input);
      bind();

      function bind() {
        const evt = f.type === 'select' ? 'change' : 'input';
        input.addEventListener(evt, () => {
          values[f.key] = f.type === 'number'
            ? (input.value === '' ? '' : Number(input.value))
            : input.value;
          refreshComputed();
        });
      }

      if (f.half) halfBuf.push(wrap); else { flushHalf(); el.appendChild(wrap); }
    });
    flushHalf();

    function refreshComputed() {
      // 重新执行所有 computed
      fields.filter(f => f.type === 'computed').forEach((f, idx) => {
        const boxes = el.querySelectorAll('.computed-box');
        if (boxes[idx]) boxes[idx].querySelector('[data-v]').textContent = U.yuan(f.fn(values));
      });
    }

    return {
      el,
      get values() {
        fields.filter(f => f.type === 'computed').forEach(f => { values[f.key] = f.fn(values); });
        return values;
      }
    };
  },

  /* ---- 记账表单弹层 ---- */
  recordForm(modKey, opt) {
    opt = opt || {};
    const mod = MODS[modKey];
    const fields = typeof mod.fields === 'function'
      ? mod.fields(opt.preset || {}) : mod.fields;
    const editing = opt.record;
    const form = this.buildForm(fields, Object.assign(
      { date: U.today() }, mod.defaults || {}, editing || {}, opt.preset || {}
    ));

    const footer = [{
      text: editing ? '保存修改' : '记下这笔',
      cls: 'btn-primary',
      onClick: () => {
        const v = form.values;
        if (!(Number(v.amount) > 0)) { this.toast('请填写大于 0 的金额', 'err'); return; }
        v.type = modKey;
        if (mod.prepare) mod.prepare(v);
        if (editing) { DB.updateRecord(editing.id, v); this.toast('已修改', 'ok'); }
        else { DB.addRecord(v); this.toast('已记下 ' + U.yuan(v.amount), 'ok'); }
        this.closeModal();
        opt.onDone && opt.onDone();
      }
    }];
    if (editing) {
      footer.unshift({
        text: '删除', cls: 'btn-danger',
        onClick: async () => {
          this.closeModal();
          if (await this.confirm('确定删除这条记录吗？', true)) {
            DB.removeRecord(editing.id);
            this.toast('已删除');
            opt.onDone && opt.onDone();
          } else {
            this.recordForm(modKey, opt);
          }
        }
      });
    }

    this.modal({
      title: (editing ? '修改 · ' : '记一笔 · ') + mod.icon + ' ' + mod.name,
      bodyNode: form.el,
      footer
    });
  },

  /* ---- 按日期分组的明细列表 ---- */
  recordList(records, mod, opt) {
    opt = opt || {};
    if (!records.length) return this.empty(opt.emptyText || '这个时间段还没有记录');
    const frag = document.createDocumentFragment();
    const byDay = U.group(records, r => r.date);
    [...byDay.keys()].sort().reverse().forEach(day => {
      const items = byDay.get(day);
      const lab = document.createElement('div');
      lab.className = 'day-label';
      lab.innerHTML = `${U.esc(day)} <span class="day-sum">${U.yuan(U.sum(items, r => r.amount))}</span>`;
      frag.appendChild(lab);

      items.forEach(r => {
        const info = mod.fmt(r);
        const row = document.createElement('div');
        row.className = 'rec';
        const canTag = mod.tagClickable ? mod.tagClickable(r) : !!mod.onTagClick;
        const tagHtml = info.tag
          ? `<span class="rec-tag ${info.tagCls || ''} ${canTag ? 'clickable' : ''}" data-tag>${U.esc(info.tag)}</span>`
          : '';
        row.innerHTML =
          `<div class="rec-ic" style="background:${mod.bg}">${mod.icon}</div>
           <div class="rec-main">
             <div class="rec-title">${U.esc(info.title)}</div>
             <div class="rec-sub">${U.esc(info.sub || '')}</div>
           </div>
           <div class="rec-right">
             <div class="rec-amt">${U.yuan(r.amount)}</div>
             ${tagHtml}
           </div>`;
        row.addEventListener('click', () => {
          this.recordForm(r.type, { record: r, onDone: opt.rerender });
        });
        const tagEl = row.querySelector('[data-tag]');
        if (tagEl && mod.onTagClick) {
          tagEl.addEventListener('click', e => {
            e.stopPropagation();
            mod.onTagClick(r, opt.rerender || (() => {}));
          });
        }
        frag.appendChild(row);
      });
    });
    return frag;
  },

  /* ---- 通用模块页 ---- */
  genericPage(modKey) {
    const mod = MODS[modKey];
    const range = App.state.range;
    const records = DB.getRecords(modKey, range);
    const app = $('app');
    app.innerHTML = '';

    app.appendChild(this.header({
      icon: mod.icon, title: mod.name, range,
      onNav: d => App.shiftRange(d),
      onMode: m => App.setRangeMode(m)
    }));

    // KPI
    let kpis = mod.kpi ? mod.kpi(records) : null;
    if (!kpis) {
      kpis = [
        { v: U.yuan(U.sum(records, r => r.amount)), l: '合计支出' },
        { v: records.length + ' 笔', l: '记录数' }
      ];
    }
    const krow = document.createElement('div');
    krow.className = 'kpi-row';
    kpis.forEach(k => {
      const d = document.createElement('div');
      d.className = 'kpi';
      d.innerHTML = `<div class="kpi-v ${k.tone || ''}">${U.esc(k.v)}</div>
                     <div class="kpi-l">${U.esc(k.l)}</div>`;
      krow.appendChild(d);
    });
    app.appendChild(krow);

    // Tabs
    const defs = [{ label: '明细' }, { label: '统计' }];
    (mod.extraTabs || []).forEach(t => defs.push({ label: t.label }));
    const tabs = document.createElement('div');
    tabs.className = 'pagetabs';
    const content = document.createElement('div');
    const rerender = () => this.genericPage(modKey);

    defs.forEach((t, i) => {
      const b = document.createElement('button');
      b.textContent = t.label;
      b.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        content.innerHTML = '';
        if (i === 0) {
          content.appendChild(this.recordList(records, mod, { rerender }));
        } else if (i === 1) {
          if (mod.dist) {
            const d = mod.dist(records);
            if (d.rows.length) {
              content.appendChild(Charts.bars(d.rows));
              if (d.note) {
                const n = document.createElement('div');
                n.className = 'card';
                n.style.marginTop = '12px';
                n.innerHTML = d.note;
                content.appendChild(n);
              }
            } else content.appendChild(this.empty('暂无统计数据'));
          } else content.appendChild(this.empty('暂无统计数据'));
        } else {
          const et = mod.extraTabs[i - 2];
          const r = et.render(records, rerender);
          if (r) content.appendChild(r);
        }
      });
      tabs.appendChild(b);
      if (i === 0) b.classList.add('on');
    });
    app.appendChild(tabs);

    if (defs.length === 2 && !records.length) {
      content.appendChild(this.empty('这个时间段还没有记录'));
    } else {
      content.appendChild(this.recordList(records, mod, { rerender }));
    }
    app.appendChild(content);

    // 浮动记一笔
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '✎';
    fab.addEventListener('click', () => {
      this.recordForm(modKey, { onDone: rerender });
    });
    app.appendChild(fab);
  },

  empty(text) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.innerHTML = `<span class="empty-emoji">🗒️</span><div class="empty-t">${U.esc(text)}</div>`;
    return d;
  }
};
