// Dependency-free SVG charts: line (with severity bands + crosshair tooltip), bars, calendar heatmap.
// Follows the data-viz rules: thin marks, 2px lines, recessive grid, legend for ≥2 series,
// tooltips on hover AND keyboard focus, and a data-table view so nothing is colour- or hover-only.
import { fmtDate, fmtNum, dayKey, addDays, startOfDay } from '../core/format.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
};
const h = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

function niceTicks(min, max, count = 4) {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 0.5) || mag * 10;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

function observe(container, draw) {
  let last = 0;
  const run = () => { const w = Math.round(container.clientWidth); if (w && Math.abs(w - last) > 4) { last = w; draw(w); } };
  run();
  if (!last) requestAnimationFrame(run);
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => run()); ro.observe(container); return () => ro.disconnect(); }
  return () => {};
}

function addTableToggle(container, columns, rows, caption) {
  const actions = h('div', 'chart-actions no-print');
  const btn = h('button', '', 'Show data table');
  btn.type = 'button';
  actions.append(btn);
  const wrap = h('div', 'table-wrap');
  wrap.hidden = true;
  const table = h('table', 'data');
  const cap = h('caption', 'sr-only', caption || 'Chart data');
  const thead = h('thead'); const trh = h('tr');
  columns.forEach((c, i) => { const th = h('th', i ? 'num' : '', c); th.scope = 'col'; trh.append(th); });
  thead.append(trh);
  const tbody = h('tbody');
  rows.forEach((r) => { const tr = h('tr'); r.forEach((c, i) => tr.append(h('td', i ? 'num' : '', c))); tbody.append(tr); });
  table.append(cap, thead, tbody); wrap.append(table);
  btn.addEventListener('click', () => { wrap.hidden = !wrap.hidden; btn.textContent = wrap.hidden ? 'Show data table' : 'Hide data table'; });
  container.append(actions, wrap);
}

function legend(container, series, rect = false) {
  if (series.length < 2) return;
  const lg = h('div', 'chart-legend');
  series.forEach((s) => { const sp = h('span'); const i = h('i', rect ? 'rect' : ''); i.style.background = s.color; sp.append(i, document.createTextNode(s.name)); lg.append(sp); });
  container.append(lg);
}

/**
 * Line chart over time.
 * opts: { series:[{name,color,points:[{x,y}]}], yMin, yMax, bands:[{from,to,label,fill}], height, format(y), caption, emptyText }
 */
export function lineChart(container, opts) {
  container.classList.add('chart');
  container.innerHTML = '';
  const series = opts.series.filter((s) => s.points.length);
  if (!series.length) { container.append(h('div', 'chart-empty', opts.emptyText || 'No data yet — your chart will appear after your first entries.')); return () => {}; }
  const fmt = opts.format || ((v) => fmtNum(v, 1));
  const plot = h('div');
  plot.style.position = 'relative';
  container.append(plot);
  const tip = h('div', 'chart-tip'); tip.hidden = true;
  plot.append(tip);
  const allPts = series.flatMap((s) => s.points.map((p) => ({ ...p, t: new Date(p.x).getTime() })));
  let tMin = Math.min(...allPts.map((p) => p.t)), tMax = Math.max(...allPts.map((p) => p.t));
  if (tMin === tMax) { tMin -= 86400000; tMax += 86400000; }
  const ys = allPts.map((p) => p.y);
  const yMin = opts.yMin ?? Math.min(0, ...ys), yMax = opts.yMax ?? (Math.max(...ys) * 1.1 || 1);
  const xsUnique = [...new Set(allPts.map((p) => p.t))].sort((a, b) => a - b);

  const draw = (W) => {
    plot.querySelector('svg')?.remove();
    const H = opts.height || 230;
    const m = { t: 12, r: opts.bands?.length ? 92 : 16, b: 28, l: 40 };
    const iw = Math.max(60, W - m.l - m.r), ih = H - m.t - m.b;
    const x = (t) => m.l + ((t - tMin) / (tMax - tMin)) * iw;
    const y = (v) => m.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': opts.caption || 'Line chart' });
    // bands (severity ranges)
    (opts.bands || []).forEach((b) => {
      const y1 = y(Math.min(b.to, yMax)), y2 = y(Math.max(b.from, yMin));
      el('rect', { x: m.l, y: y1, width: iw, height: Math.max(0, y2 - y1), fill: b.fill || 'var(--band-mid)' }, svg);
      if (b.label && y2 - y1 > 11) { const t = el('text', { x: m.l + iw + 6, y: (y1 + y2) / 2 + 3.5, class: 'band-label' }, svg); t.textContent = b.label; }
    });
    // grid + y ticks
    niceTicks(yMin, yMax, 4).forEach((v) => {
      el('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v), class: v === yMin ? 'axis-line' : 'grid-line' }, svg);
      const t = el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }, svg); t.textContent = fmtNum(v);
    });
    // x ticks
    const nT = Math.max(2, Math.min(6, Math.floor(iw / 90)));
    for (let i = 0; i < nT; i++) {
      const t = tMin + ((tMax - tMin) * i) / (nT - 1);
      const tx = el('text', { x: x(t), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === nT - 1 ? 'end' : 'middle', class: 'tick' }, svg);
      tx.textContent = fmtDate(t, { day: 'numeric', month: 'short' });
    }
    // series
    series.forEach((s) => {
      const pts = s.points.map((p) => [x(new Date(p.x).getTime()), y(p.y)]).sort((a, b) => a[0] - b[0]);
      if (pts.length > 1) el('path', { d: 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L'), class: 'series-line', stroke: s.color, 'stroke-dasharray': s.dashed ? '5 4' : null }, svg);
      if (pts.length <= 60) pts.forEach(([px, py]) => el('circle', { cx: px, cy: py, r: 4, fill: s.color, class: 'dot' }, svg));
      else { const [px, py] = pts[pts.length - 1]; el('circle', { cx: px, cy: py, r: 4, fill: s.color, class: 'dot' }, svg); }
    });
    // crosshair + tooltip layer
    const cross = el('line', { y1: m.t, y2: m.t + ih, class: 'crosshair', visibility: 'hidden' }, svg);
    const overlay = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent', tabindex: 0, role: 'button', 'aria-label': 'Explore chart values with the left and right arrow keys' }, svg);
    let idx = xsUnique.length - 1;
    const show = (i) => {
      idx = Math.max(0, Math.min(xsUnique.length - 1, i));
      const t = xsUnique[idx];
      cross.setAttribute('x1', x(t)); cross.setAttribute('x2', x(t)); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = '';
      tip.append(h('div', 'faint', fmtDate(t, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })));
      series.forEach((s) => {
        const p = s.points.find((q) => new Date(q.x).getTime() === t);
        if (!p) return;
        const row = h('div', 'row'); const k = h('span', 'key'); k.style.background = s.color;
        row.append(k, h('span', 'tv', fmt(p.y)), h('span', 'faint', s.name));
        tip.append(row);
      });
      tip.hidden = false;
      tip.style.left = Math.min(Math.max(x(t), 70), W - 70) + 'px';
      tip.style.top = m.t + 8 + 'px';
      tip.style.transform = 'translate(-50%, 0)';
    };
    overlay.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      let best = 0, bd = Infinity;
      xsUnique.forEach((t, i) => { const d = Math.abs(x(t) - px); if (d < bd) { bd = d; best = i; } });
      show(best);
    });
    overlay.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
    overlay.addEventListener('focus', () => show(idx));
    overlay.addEventListener('blur', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); } });
    plot.prepend(svg);
  };
  const stop = observe(plot, draw);
  legend(container, series);
  const rows = xsUnique.map((t) => [fmtDate(t), ...series.map((s) => { const p = s.points.find((q) => new Date(q.x).getTime() === t); return p ? fmt(p.y) : '–'; })]);
  addTableToggle(container, ['Date', ...series.map((s) => s.name)], rows, opts.caption);
  return stop;
}

/**
 * Horizontal bars (categories) or vertical columns (time buckets).
 * opts: { items:[{label, value, color, detail}], columns:false, format(v), max, caption }
 */
export function barChart(container, opts) {
  container.classList.add('chart');
  container.innerHTML = '';
  const items = opts.items;
  if (!items.length || items.every((i) => !i.value)) { container.append(h('div', 'chart-empty', opts.emptyText || 'Nothing to show yet.')); return () => {}; }
  const fmt = opts.format || ((v) => fmtNum(v, 1));
  const plot = h('div'); plot.style.position = 'relative'; container.append(plot);
  const tip = h('div', 'chart-tip'); tip.hidden = true; plot.append(tip);
  const max = opts.max ?? (Math.max(...items.map((i) => i.value)) || 1);
  const draw = (W) => {
    plot.querySelector('svg')?.remove();
    let svg;
    const showTip = (it, cx, cy) => {
      tip.innerHTML = '';
      tip.append(h('div', 'tv', fmt(it.value)), h('div', 'faint', it.label));
      if (it.detail) tip.append(h('div', 'faint', it.detail));
      tip.hidden = false; tip.style.left = cx + 'px'; tip.style.top = cy + 'px'; tip.style.transform = 'translate(-50%, calc(-100% - 8px))';
    };
    if (!opts.columns) {
      const labelW = Math.min(180, Math.max(90, W * 0.32));
      const rowH = 34, H = items.length * rowH + 8;
      const iw = W - labelW - 56;
      svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': opts.caption || 'Bar chart' });
      el('line', { x1: labelW, x2: labelW, y1: 0, y2: H, class: 'axis-line' }, svg);
      items.forEach((it, i) => {
        const yy = i * rowH + 6, bh = Math.min(22, rowH - 10), bw = Math.max(it.value ? 3 : 0, (it.value / max) * iw);
        const lab = el('text', { x: labelW - 8, y: yy + bh / 2 + 4, 'text-anchor': 'end', class: 'cat-label' }, svg);
        lab.textContent = it.label.length > 26 ? it.label.slice(0, 25) + '…' : it.label;
        const r = Math.min(4, bw / 2);
        const path = `M${labelW},${yy}h${Math.max(0, bw - r)}a${r},${r} 0 0 1 ${r},${r}v${bh - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${Math.max(0, bw - r)}z`;
        const bar = el('path', { d: path, fill: it.color || 'var(--s1)', class: 'bar', tabindex: 0, role: 'img', 'aria-label': `${it.label}: ${fmt(it.value)}` }, svg);
        const v = el('text', { x: labelW + bw + 6, y: yy + bh / 2 + 4, class: 'value-label' }, svg); v.textContent = fmt(it.value);
        const hit = () => showTip(it, labelW + bw / 2, yy);
        bar.addEventListener('pointerenter', hit); bar.addEventListener('focus', hit);
        bar.addEventListener('pointerleave', () => { tip.hidden = true; }); bar.addEventListener('blur', () => { tip.hidden = true; });
      });
    } else {
      const H = opts.height || 200, m = { t: 14, r: 8, b: 26, l: 34 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': opts.caption || 'Column chart' });
      niceTicks(0, max, 4).forEach((v) => {
        const yy = m.t + ih - (v / max) * ih;
        el('line', { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, class: v === 0 ? 'axis-line' : 'grid-line' }, svg);
        const t = el('text', { x: m.l - 6, y: yy + 4, 'text-anchor': 'end', class: 'tick' }, svg); t.textContent = fmtNum(v);
      });
      const band = iw / items.length, bw = Math.min(24, band * 0.7);
      const every = Math.ceil(items.length / Math.max(1, Math.floor(iw / 56)));
      items.forEach((it, i) => {
        const cx = m.l + band * i + band / 2, bhh = (it.value / max) * ih, r = Math.min(4, bw / 2, bhh / 2);
        const y0 = m.t + ih;
        if (bhh > 0) {
          const d = `M${cx - bw / 2},${y0}v-${Math.max(0, bhh - r)}a${r},${r} 0 0 1 ${r},-${r}h${bw - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${Math.max(0, bhh - r)}z`;
          const bar = el('path', { d, fill: it.color || 'var(--s1)', class: 'bar', tabindex: 0, role: 'img', 'aria-label': `${it.label}: ${fmt(it.value)}` }, svg);
          const hit = () => showTip(it, cx, y0 - bhh);
          bar.addEventListener('pointerenter', hit); bar.addEventListener('focus', hit);
          bar.addEventListener('pointerleave', () => { tip.hidden = true; }); bar.addEventListener('blur', () => { tip.hidden = true; });
        }
        if (i % every === 0) { const t = el('text', { x: cx, y: H - 8, 'text-anchor': 'middle', class: 'tick' }, svg); t.textContent = it.short || it.label; }
      });
    }
    plot.prepend(svg);
  };
  const stop = observe(plot, draw);
  if (opts.legend) legend(container, opts.legend, true);
  addTableToggle(container, [opts.labelHeader || 'Category', opts.valueHeader || 'Value'], items.map((i) => [i.label, fmt(i.value)]), opts.caption);
  return stop;
}

/** GitHub-style activity calendar (sequential blue ramp). counts: Map(dayKey → n) */
export function heatmap(container, { counts, weeks = 26, label = 'entries' }) {
  container.innerHTML = '';
  const grid = h('div', 'heat');
  grid.setAttribute('role', 'img');
  const end = startOfDay(new Date());
  const start = addDays(end, -(weeks * 7 - 1) - ((end.getDay() + 6) % 7 === 6 ? 0 : 0));
  const firstMonday = addDays(start, -((start.getDay() + 6) % 7));
  const max = Math.max(1, ...counts.values());
  let total = 0, active = 0;
  for (let d = firstMonday; d <= end; d = addDays(d, 1)) {
    const k = dayKey(d), n = counts.get(k) || 0;
    total += n; if (n) active++;
    const i = document.createElement('i');
    i.dataset.l = n ? String(Math.min(4, Math.ceil((n / max) * 4))) : '0';
    i.title = `${fmtDate(d)}: ${n} ${label}`;
    grid.append(i);
  }
  grid.setAttribute('aria-label', `${active} active days and ${total} ${label} in the last ${weeks} weeks`);
  const lg = h('div', 'heat-legend');
  lg.append(h('span', '', 'Less'));
  ['var(--surface-3)', 'var(--seq-200)', 'var(--seq-300)', 'var(--seq-400)', 'var(--seq-600)'].forEach((c) => { const i = h('i'); i.style.background = c; lg.append(i); });
  lg.append(h('span', '', 'More'));
  container.append(grid, lg);
}

/** Tiny inline sparkline (string) for stat tiles. */
export function sparkline(values, { w = 120, hgt = 28, color = 'var(--s1)' } = {}) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return '';
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((y, i) => `${((i / (v.length - 1)) * (w - 4) + 2).toFixed(1)},${(hgt - 2 - ((y - min) / span) * (hgt - 4)).toFixed(1)}`);
  return `<svg viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
