/* ============ 我的 / 设置 ============ */
const Settings = {
  render() {
    const app = $('app');
    app.innerHTML = '';
    app.appendChild(UI.header({ title: '我的' }));

    /* ---- 月度预算 ---- */
    const bCard = document.createElement('div');
    bCard.className = 'card';
    bCard.innerHTML = `<div class="card-h"><div class="card-t">💰 月度预算</div></div>
      <div class="help-box" style="margin:-4px 0 8px">
        给每个分类设一个月的花钱上限，留空表示不限制。超支会在首页红字提醒。
      </div>`;
    Object.keys(MODS).forEach(k => {
      const mod = MODS[k];
      const row = document.createElement('div');
      row.className = 'set-item';
      row.innerHTML =
        `<span class="set-ic">${mod.icon}</span>
         <div class="set-main"><div class="set-t">${mod.name}</div></div>`;
      const inp = document.createElement('input');
      inp.className = 'budget-input';
      inp.type = 'number';
      inp.min = '0';
      inp.step = '0.01';
      inp.placeholder = '不限制';
      const cur = DB.getBudget(k);
      if (cur) inp.value = cur;
      inp.addEventListener('change', () => {
        DB.setBudget(k, inp.value === '' ? null : Number(inp.value));
        UI.toast(mod.name + ' 预算已保存', 'ok');
      });
      row.appendChild(inp);
      bCard.appendChild(row);
    });
    app.appendChild(bCard);

    /* ---- 数据备份 ---- */
    const dCard = document.createElement('div');
    dCard.className = 'card';
    dCard.innerHTML = `<div class="card-h"><div class="card-t">🗄️ 数据备份</div></div>`;

    const exp = document.createElement('button');
    exp.className = 'btn btn-primary';
    exp.textContent = '导出备份文件到电脑';
    exp.style.marginBottom = '9px';
    exp.addEventListener('click', () => this.exportFile());

    const imp = document.createElement('button');
    imp.className = 'btn btn-ghost';
    imp.style.marginBottom = '9px';
    imp.textContent = '从备份文件恢复';
    imp.addEventListener('click', () => $('#importFile').click());

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'importFile';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', e => this.importFile(e.target.files[0]));

    const tip = document.createElement('div');
    tip.className = 'help-box';
    tip.innerHTML = '数据平时保存在本浏览器里，<b>清理浏览器数据前一定先导出备份</b>，否则会被一起清掉。';

    dCard.append(exp, imp, fileInput, tip);
    app.appendChild(dCard);

    /* ---- 危险区 ---- */
    const xCard = document.createElement('div');
    xCard.className = 'card';
    const clear = document.createElement('button');
    clear.className = 'btn btn-danger';
    clear.style.width = '100%';
    clear.textContent = '清空全部数据';
    clear.addEventListener('click', async () => {
      if (await UI.confirm('将删除所有记账记录和订阅，且无法恢复。确定吗？', true)) {
        if (await UI.confirm('最后确认：真的要全部清空吗？', true)) {
          DB.clearAll();
          UI.toast('已清空', 'ok');
          location.hash = '#/home';
        }
      }
    });
    xCard.appendChild(clear);
    app.appendChild(xCard);

    /* ---- 说明 ---- */
    const iCard = document.createElement('div');
    iCard.className = 'card';
    iCard.innerHTML =
      `<div class="card-t" style="margin-bottom:8px">ℹ️ 关于</div>
       <div class="help-box">
         纯本地运行的个人记账本，不联网、不登录。<br>
         点底部 <b>＋</b> 记一笔；首页圆盘和分类都能点进各模块；
         每个模块内左右切换看明细、统计和专属功能。<br>
         刷新、关闭浏览器、重启电脑数据都在。
       </div>`;
    app.appendChild(iCard);
  },

  exportFile() {
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '记账备份-' + U.today() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('备份文件已下载', 'ok');
  },

  importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        DB.importJSON(reader.result);
        UI.toast('恢复成功', 'ok');
        location.hash = '#/home';
      } catch (e) {
        UI.toast('恢复失败：' + e.message, 'err');
      }
    };
    reader.readAsText(file);
  }
};
