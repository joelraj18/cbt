import { html, raw, on, toast, confirmDialog, download, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { fmtDate, fmtTime, dayKey, relTime, fmtMs } from '../core/format.js';
import { AREAS, AREA_BY_ID, areaColor } from '../data/areas.js';
import { pageHead, emptyState, segs } from '../ui/components.js';
import { describeRecord } from '../ui/records.js';
import { buildPersonalIndex } from '../lib/search-index.js';
import { streaks } from '../lib/stats.js';

export async function journalView({ query }) {
  const body = html`<div class="container">${pageHead({ title: 'Journal', lede: 'Everything you have saved — exercises, check-ins and mood logs. Stored only on this device.' })}
    <div class="card flat" style="margin-bottom:18px"><div class="grid" style="--min:170px;--gap:12px">
      <div class="search-box" style="grid-column:1/-1">${icon('search')}<input type="search" data-q placeholder="Search your own entries… (never leaves your device)" value="${query.q || ''}" aria-label="Search your entries"></div>
      <div><label class="label small" for="jf-kind">Type</label><select id="jf-kind"><option value="">All types</option><option value="exercise">Exercises</option><option value="assessment">Check-ins</option><option value="mood">Mood logs & check-ins</option><option value="daily">Evening reflections</option></select></div>
      <div><label class="label small" for="jf-area">Area</label><select id="jf-area"><option value="">All areas</option>${AREAS.map((a) => html`<option value="${a.id}">${a.name}</option>`)}</select></div>
      <div><label class="label small" for="jf-range">Period</label><select id="jf-range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="" selected>All time</option></select></div>
      <div style="align-self:end"><button class="btn block" data-csv>${icon('download')} Export CSV</button></div>
    </div><div class="search-stats" data-stats></div></div>
    <div data-list></div></div>`;

  const mount = (root) => {
    let idx = null;
    const list = root.querySelector('[data-list]');
    const draw = () => {
      const kind = root.querySelector('#jf-kind').value, area = root.querySelector('#jf-area').value, range = root.querySelector('#jf-range').value;
      const q = root.querySelector('[data-q]').value.trim();
      let recs = store.query({ kind: kind || undefined, area: area || undefined, since: range ? Date.now() - Number(range) * 864e5 : undefined });
      let hl = null, info = '';
      if (q) {
        if (!idx) idx = buildPersonalIndex(store.all(), describeRecord);
        const res = idx.search(q, { limit: 500 });
        const map = new Map(res.results.map((r) => [r.doc.id.slice(4), r]));
        recs = recs.filter((r) => map.has(r.id));
        hl = map;
        info = `${recs.length} matching entries · searched ${idx.stats.docs} entries in ${fmtMs(res.ms)} (in-memory, on this device)`;
      }
      const st = streaks(recs.map((r) => r.createdAt));
      root.querySelector('[data-stats]').textContent = info || `${recs.length} entries · ${st.activeDays} active days · current streak ${st.current}`;
      if (!recs.length) { list.innerHTML = String(store.count() ? emptyState('No entries match', 'Try a different filter or search.', '') : emptyState('Your journal is empty', 'Entries from exercises, check-ins and mood logs will appear here.', html`<a class="btn primary" href="#/areas">Start an exercise</a>`)); return; }
      const groups = new Map();
      recs.forEach((r) => { const k = dayKey(r.createdAt); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
      list.innerHTML = String(html`${[...groups.entries()].slice(0, 120).map(([k, rs]) => html`<section class="card flat" style="margin-bottom:12px"><h2 style="font-size:.95rem;margin:0 0 4px">${fmtDate(k + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
        ${rs.map((r) => { const d = describeRecord(r); const m = hl?.get(r.id); return html`<div class="entry"><div class="entry-head"><span>${d.area ? html`<span class="area-dot" style="--area:${areaColor(d.area)};margin-right:6px"></span>` : ''}<a class="entry-title" href="${d.url}">${d.title}</a> <span class="badge">${d.type}</span></span>
          <span class="cluster" style="--gap:6px"><span class="small faint">${fmtTime(r.createdAt)}</span><button class="btn small ghost" data-del="${r.id}" aria-label="Delete entry">${icon('trash')}</button></span></div>
          <div class="entry-body">${m && m.snippet.length ? segs(m.snippet) : d.summary}</div></div>`; })}</section>`)}`);
    };
    const offs = [
      on(root, 'input', '[data-q]', debounce(draw, 120)),
      on(root, 'change', 'select', draw),
      on(root, 'click', '[data-del]', async (e, b) => {
        if (!(await confirmDialog({ title: 'Delete this entry?', body: 'It will be removed from this device.', confirm: 'Delete', danger: true }))) return;
        const rec = await store.remove(b.dataset.del); idx = null; draw();
        toast('Entry deleted.', { action: 'Undo', onAction: async () => { await store.restore(rec); idx = null; draw(); } });
      }),
      on(root, 'click', '[data-csv]', () => {
        const rows = [['date', 'kind', 'type', 'area', 'title', 'summary', 'data_json']].concat(store.all().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)).map((r) => { const d = describeRecord(r); return [r.createdAt, r.kind, r.type, r.area || '', d.title, d.summary, JSON.stringify(r.data)]; }));
        download(`cbt-journal-${dayKey(new Date())}.csv`, rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
      }),
    ];
    draw();
    return () => offs.forEach((f) => f());
  };
  return { title: 'Journal', body, mount };
}
