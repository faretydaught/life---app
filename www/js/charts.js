/* ============ 图表：SVG 环形图 + 分布条 ============ */
const Charts = {
  // segments: [{value, color}], 回调 onSegment(index)
  donut(segments, opts) {
    opts = opts || {};
    const size = opts.size || 218;
    const cx = size / 2, cy = size / 2;
    const r = (size - 26) / 2;        // 轨道半径
    const thick = opts.thick || 24;
    const C = 2 * Math.PI * r;
    const total = U.sum(segments, s => s.value);

    const wrap = document.createElement('div');
    wrap.className = 'donut';
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    // 底环
    const bg = document.createElementNS(NS, 'circle');
    bg.setAttribute('cx', cx); bg.setAttribute('cy', cy);
    bg.setAttribute('r', r);
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', '#eceef4');
    bg.setAttribute('stroke-width', thick);
    svg.appendChild(bg);

    let acc = 0;
    const arcs = [];
    segments.forEach((seg, i) => {
      if (seg.value <= 0) return;
      const frac = seg.value / total;
      const len = frac * C;

      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.setAttribute('r', r);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', seg.color);
      c.setAttribute('stroke-width', thick);
      c.setAttribute('stroke-dasharray', `${Math.max(0, len - 1.5)} ${C - len + 1.5}`);
      c.setAttribute('stroke-dashoffset', -acc);
      c.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
      c.style.transition = 'stroke-dasharray .5s ease';
      svg.appendChild(c);

      arcs.push({ i, start: acc / C * 2 * Math.PI, end: (acc + len) / C * 2 * Math.PI });
      acc += len;
    });

    // 透明热区，用于点击
    arcs.forEach(a => {
      let d;
      if (a.end - a.start >= Math.PI * 2 - 0.001) {
        d = null; // 整圆用 circle
      } else {
        d = this._arc(cx, cy, r, a.start - Math.PI / 2, a.end - Math.PI / 2);
      }
      const hit = d === null
        ? (() => { const cc = document.createElementNS(NS, 'circle');
            cc.setAttribute('cx', cx); cc.setAttribute('cy', cy); cc.setAttribute('r', r);
            cc.setAttribute('fill', 'none'); cc.setAttribute('stroke', '#fff');
            cc.setAttribute('stroke-width', thick); cc.setAttribute('opacity', '0');
            return cc; })()
        : (() => { const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d); p.setAttribute('fill', 'none');
            p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', thick);
            p.setAttribute('opacity', '0'); return p; })();
      hit.style.pointerEvents = 'stroke';
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', () => opts.onSegment && opts.onSegment(a.i));
      svg.appendChild(hit);
    });

    wrap.appendChild(svg);

    const center = document.createElement('div');
    center.className = 'donut-center';
    center.innerHTML =
      `<div class="dc-label">${U.esc(opts.centerLabel || '总支出')}</div>
       <div class="dc-total">${U.yuan(total)}</div>
       <div class="dc-sub">${U.esc(opts.centerSub || '')}</div>`;
    wrap.appendChild(center);
    return wrap;
  },

  _arc(cx, cy, r, a0, a1) {
    const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  },

  // rows: [{label, value, color, hint}]
  bars(rows) {
    const frag = document.createDocumentFragment();
    const max = Math.max(...rows.map(r => r.value), 1);
    rows.forEach(r => {
      const d = document.createElement('div');
      d.className = 'dist-row';
      d.innerHTML =
        `<div class="dist-top">
           <span class="dist-name">${U.esc(r.label)}</span>
           <span class="dist-val">${U.esc(r.hint || U.yuan(r.value))}</span>
         </div>
         <div class="dist-track">
           <div class="dist-fill" style="width:${(r.value / max * 100).toFixed(1)}%;background:${r.color}"></div>
         </div>`;
      frag.appendChild(d);
    });
    return frag;
  }
};
