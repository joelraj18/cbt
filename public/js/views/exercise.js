import { html, raw, esc, on, toast, confirmDialog, download } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { fmtDateTime, relTime, fmtNum, fmtDuration } from '../core/format.js';
import { AREA_BY_ID, LEVELS } from '../data/areas.js';
import { EXERCISE_BY_ID, exercisesForArea } from '../data/exercises/index.js';
import { areaStyle, levelBadge, pageHead, refCard, REF_BY_ID, areaChip, crisisCallout } from '../ui/components.js';
import { createForm, worksheetHTML, trackerSVG } from '../ui/forms.js';
import { saveExercise, computeMetrics } from '../ui/save.js';
import { lineChart, barChart } from '../lib/charts.js';
import { buildICS } from '../lib/ics.js';
import { WIDGETS } from '../ui/widgets/index.js';
import { THINKING_TRAPS } from '../data/learn.js';

const TRAP_NAME = Object.fromEntries(THINKING_TRAPS.map((t) => [t.id, t.name]));

export async function exerciseView({ params, query }) {
  const ex = EXERCISE_BY_ID[params.id];
  if (!ex) return { title: 'Not found', body: html`<div class="container"><p>Exercise not found. <a href="#/areas">Browse areas</a></p></div>` };
  const area = AREA_BY_ID[ex.area];
  const entries = store.query({ type: ex.id });
  const tab = query.tab || (query.edit || entries.length || ex.tool || ex.widget ? 'do' : 'guide');
  const tabs = [['do', ex.tool ? 'Use the tool' : 'Do it'], ['guide', 'How it works'], ['science', 'The science'], ...(ex.tool ? [] : [['history', 'My history']])];

  const body = html`<div class="container" ${areaStyle(ex.area)}>
    ${pageHead({ crumbs: [{ label: 'Areas', href: '#/areas' }, { label: area.name, href: `#/area/${area.id}` }, { label: ex.title }], title: ex.title, lede: ex.tagline, area: ex.area,
      actions: html`<div class="cluster no-print"><button class="btn" data-print>${icon('print')} Print worksheet</button></div>` })}
    <div class="meta" style="margin:-8px 0 18px">${levelBadge(ex.level)}<span>${icon('timer')} ~${ex.minutes} min</span><span>${icon('activity')} ${ex.difficulty}</span><span>${icon('calendar')} ${ex.frequency}</span>${[ex.area, ...(ex.also || [])].map((a) => areaChip(a))}</div>
    <div class="callout simple" style="margin-bottom:20px"><div class="callout-title">${icon('info')} In simple words</div><p>${ex.simple}</p></div>
    ${ex.area === 'depression' && ['thought-record', 'self-compassion-break'].includes(ex.id) ? html`<p class="small muted">If you are having thoughts of harming yourself, please <a href="#/help">get support now</a>.</p>` : ''}
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => html`<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}${k === 'history' && entries.length ? html`<span class="count">${entries.length}</span>` : ''}</button>`)}</div>
    <div data-panel></div>
    <section class="section"><h2>Related exercises</h2><div class="grid" style="--min:240px">${exercisesForArea(ex.area).filter((e) => e.id !== ex.id).slice(0, 4).map((e) => html`<a class="card card-link" href="#/exercise/${e.id}" ${areaStyle(e.area)}>${levelBadge(e.level)}<h3 style="margin-top:8px;font-size:1rem">${e.title}</h3><p class="small muted" style="margin:0">${e.tagline}</p></a>`)}</div></section>
  </div>`;

  let cleanup = [];
  const mount = (root) => {
    const panel = root.querySelector('[data-panel]');
    const show = (k, extraQuery = {}) => {
      cleanup.forEach((f) => { try { f(); } catch { /* ignore */ } });
      cleanup = [];
      root.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === k)));
      if (k === 'do') cleanup.push(renderDo(panel, ex, { ...query, ...extraQuery }, show));
      else if (k === 'guide') renderGuide(panel, ex, show);
      else if (k === 'science') renderScience(panel, ex);
      else if (k === 'history') cleanup.push(renderHistory(panel, ex, query.open, show));
    };
    show(tab);
    const offs = [
      on(root, 'click', '[data-tab]', (e, t) => show(t.dataset.tab)),
      on(root, 'click', '[data-print]', () => printWorksheet(ex)),
    ];
    return () => { offs.forEach((f) => f()); cleanup.forEach((f) => { try { f(); } catch { /* ignore */ } }); };
  };
  return { title: ex.title, body, mount };
}

function exampleBox(ex) {
  if (!ex.example) return '';
  return html`<div class="example-box"><div class="ex-head">${icon('sparkle')} Example: ${ex.example.title}</div>
    ${ex.example.rows ? html`<dl>${ex.example.rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>` : html`<p style="padding:12px 14px;margin:0">${ex.example.text}</p>`}</div>`;
}

function renderGuide(panel, ex, show) {
  panel.innerHTML = String(html`<div class="grid-2 wide-left">
    <div class="stack" style="--gap:22px">
      <section><h2>Why it works</h2><p>${ex.why}</p></section>
      <section><h2>Step by step</h2><ol class="steps-list">${ex.steps.map((s) => html`<li>${s}</li>`)}</ol></section>
      <section>${exampleBox(ex)}</section>
      <div><button class="btn primary" data-go-do>${icon('play')} ${ex.tool ? 'Open the tool' : 'Start the exercise'}</button></div>
    </div>
    <aside class="stack">
      <div class="card flat"><h3>${icon('check')} Tips</h3><ul class="ticks small">${(ex.tips || []).map((t) => html`<li>${t}</li>`)}</ul></div>
      ${ex.pitfalls?.length ? html`<div class="card flat"><h3>${icon('alert')} Common pitfalls</h3><ul class="small">${ex.pitfalls.map((t) => html`<li>${t}</li>`)}</ul></div>` : ''}
      <div class="card flat"><h3>${icon('flask')} Evidence</h3>${levelBadge(ex.level)}<p class="small muted" style="margin-top:8px">${LEVELS[ex.level].desc}</p><button class="btn small ghost" data-go-sci>See the studies →</button></div>
    </aside></div>`);
  panel.querySelector('[data-go-do]').addEventListener('click', () => show('do'));
  panel.querySelector('[data-go-sci]').addEventListener('click', () => show('science'));
}

function renderScience(panel, ex) {
  const refs = ex.refs.map((id) => REF_BY_ID[id]).filter(Boolean);
  panel.innerHTML = String(html`<div class="stack" style="--gap:18px">
    <div class="card flat"><div class="cluster" style="margin-bottom:8px">${levelBadge(ex.level)}<span class="small muted">${LEVELS[ex.level].desc}</span></div><p style="margin:0">${ex.science}</p></div>
    <h2>The studies (${refs.length})</h2>
    <p class="small muted">Each reference was matched against Crossref (DOI registry); numbers were checked against the paper's abstract on PubMed or OpenAlex where available.</p>
    <div class="grid" style="--min:320px">${refs.map((r) => refCard(r))}</div></div>`);
}

function renderDo(panel, ex, query, show) {
  const offs = [];
  panel.innerHTML = String(html`<div class="grid-2 wide-left"><div><div data-widget></div><div data-form></div><div data-result></div></div>
    <aside class="stack">${ex.example ? html`<details class="more" ${ex.tool ? raw('open') : ''}><summary>See an example</summary>${exampleBox(ex)}</details>` : ''}
      <details class="more"><summary>Steps at a glance</summary><ol class="steps-list small">${ex.steps.map((s) => html`<li>${s}</li>`)}</ol></details>
      <div class="small faint">${icon('lock', 'icon')} Saved only in this browser. Drafts autosave as you type.</div></aside></div>`);
  const widgetEl = panel.querySelector('[data-widget]');
  const formEl = panel.querySelector('[data-form]');
  const resultEl = panel.querySelector('[data-result]');
  let widgetApi = null, form = null;
  const editing = query.edit ? store.get(query.edit) : null;
  const buildForm = (initial) => {
    form?.destroy();
    const t0 = perf.now();
    form = createForm(formEl, ex.form, {
      initial,
      draftKey: editing || initial ? null : ex.id,
      saveLabel: editing ? 'Save changes' : 'Save entry',
      onSave: async (data) => {
        const rec = await saveExercise(ex, data, { id: editing?.id });
        await widgetApi?.afterSave?.(data, rec);
        formEl.innerHTML = '';
        showResult(resultEl, ex, rec, show);
      },
    });
    perf.event(`Opened ${ex.title} form`, perf.now() - t0, `${(ex.form.steps || [ex.form]).length} step(s)`);
  };
  if (ex.widget && WIDGETS[ex.widget]) {
    const c = WIDGETS[ex.widget](widgetEl, { ex, query, onSaved: (rec) => showResult(resultEl, ex, rec, show), resetForm: (initial) => { if (ex.form) { buildForm(initial); formEl.scrollIntoView({ behavior: 'smooth' }); } } });
    if (typeof c === 'function') offs.push(c);
    else if (c) { widgetApi = c; if (c.cleanup) offs.push(c.cleanup); }
  }
  if (ex.form) buildForm(editing ? editing.data : (!editing && ex.prefill ? ex.prefill(query) : null) || undefined);
  offs.push(() => form?.destroy());
  return () => offs.forEach((f) => f());
}

function showResult(el, ex, rec, show) {
  const m = rec.metrics || computeMetrics(ex, rec.data);
  let lines = [];
  try { lines = (ex.feedback ? ex.feedback(rec.data, m) : []).filter(Boolean); } catch { /* ignore */ }
  const events = ex.calendar ? ex.calendar(rec.data) : [];
  const count = store.query({ type: ex.id }).length;
  el.innerHTML = String(html`<div class="card" style="border-color:var(--good)">
    <div class="callout good"><div class="callout-title">${icon('check')} Saved — nice work.</div><p style="margin:0">That's entry #${count} for this exercise. It is stored only on this device.</p></div>
    ${lines.length ? html`<ul class="ticks" style="margin-top:14px">${lines.map((l) => html`<li>${raw(l)}</li>`)}</ul>` : ''}
    <div class="cluster" style="margin-top:14px">
      ${events.length ? html`<button class="btn soft" data-ics>${icon('calendar')} Add to calendar (${events.length})</button>` : ''}
      <button class="btn" data-again>${icon('plus')} New entry</button>
      <button class="btn ghost" data-hist>${icon('chart')} See my history</button>
      <a class="btn ghost" href="#/reports">${icon('activity')} Progress report</a>
    </div></div>`);
  el.querySelector('[data-again]')?.addEventListener('click', () => show('do', { edit: undefined }));
  el.querySelector('[data-hist]')?.addEventListener('click', () => show('history'));
  el.querySelector('[data-ics]')?.addEventListener('click', () => { download(`${ex.id}.ics`, buildICS(events), 'text/calendar'); toast('Calendar file downloaded — open it to add the reminder.'); });
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- history ---------- */
function fieldIndex(ex) {
  const steps = ex.form?.steps || (ex.form?.fields ? [{ fields: ex.form.fields }] : []);
  return steps.flatMap((s) => s.fields).filter((f) => f.id && !['info', 'computed'].includes(f.type));
}

function formatValue(f, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  if (f?.type === 'emotions') return v.map((e) => `${e.name} ${e.v}`).join(', ');
  if (f?.type === 'tracker') return raw(`${v.points?.length || 0} ratings over ${fmtDuration(v.elapsed || 0)}${trackerSVG(v.points, f.max ?? 10)}`);
  if (f?.type === 'list') return raw(`<ul class="small">${v.map((row) => `<li>${Object.entries(row).filter(([, x]) => x !== '' && x != null && x !== false).map(([k, x]) => `${esc(f.fields.find((s) => s.id === k)?.label || k)}: <strong>${esc(x === true ? 'yes' : x)}</strong>`).join(' · ')}</li>`).join('')}</ul>`);
  if (f?.id === 'traps' || f?.type === 'chips' && f.options?.[0]?.help) return v.map((x) => TRAP_NAME[x] || x).join(', ');
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export function entryDetail(ex, rec) {
  const fields = fieldIndex(ex);
  const shown = fields.map((f) => [f, formatValue(f, rec.data[f.id])]).filter(([, v]) => v != null);
  const extra = Object.entries(rec.data).filter(([k, v]) => !fields.find((f) => f.id === k) && v != null && v !== '' && typeof v !== 'object');
  return html`<dl class="kv small">${shown.map(([f, v]) => html`<dt>${f.label}</dt><dd>${v}</dd>`)}${extra.map(([k, v]) => html`<dt>${k}</dt><dd>${String(v)}</dd>`)}</dl>`;
}

function renderHistory(panel, ex, openId, show) {
  const recs = store.query({ type: ex.id });
  const stops = [];
  if (!recs.length) {
    panel.innerHTML = String(html`<div class="empty"><h3>No entries yet</h3><p>Your saved entries and charts for this exercise will appear here.</p><button class="btn primary" data-go>${icon('play')} Do it now</button></div>`);
    panel.querySelector('[data-go]').addEventListener('click', () => show('do'));
    return () => {};
  }
  const insight = ex.insight ? ex.insight(recs) : null;
  panel.innerHTML = String(html`<div class="stack" style="--gap:22px">
    ${ex.chart?.length ? html`<section class="card"><h3>Over time</h3><div data-chart></div></section>` : ''}
    ${insight ? html`<section class="card"><h3>${insight.title}</h3><div data-insight></div>${insight.note ? html`<p class="small muted" style="margin:8px 0 0">${insight.note}</p>` : ''}</section>` : ''}
    <section class="card"><div class="split"><h3 style="margin:0">Entries (${recs.length})</h3><button class="btn small ghost" data-csv>${icon('download')} Export CSV</button></div>
      <div data-list>${recs.map((r) => html`<details class="entry" data-id="${r.id}" ${r.id === openId ? raw('open') : ''}><summary class="entry-head" style="cursor:pointer"><span class="entry-title">${safeSummary(ex, r)}</span><span class="small faint">${fmtDateTime(r.createdAt)}</span></summary>
        <div style="margin-top:10px">${entryDetail(ex, r)}<div class="cluster" style="margin-top:10px">${ex.form ? html`<button class="btn small" data-edit="${r.id}">${icon('edit')} Edit</button>` : ''}<button class="btn small danger" data-del="${r.id}">${icon('trash')} Delete</button></div></div></details>`)}</div></section></div>`);
  const chartEl = panel.querySelector('[data-chart]');
  if (chartEl) {
    const ordered = recs.slice().reverse();
    stops.push(lineChart(chartEl, { caption: `${ex.title} over time`, yMin: 0, yMax: ex.yMax,
      series: ex.chart.map((c, i) => ({ name: c.label, color: `var(--s${[1, 2, 3, 7][i] || i + 1})`, points: ordered.filter((r) => r.metrics?.[c.key] != null).map((r) => ({ x: r.createdAt, y: r.metrics[c.key] })) })) }));
  }
  const insEl = panel.querySelector('[data-insight]');
  if (insEl) stops.push(barChart(insEl, { items: insight.items.map((i) => ({ ...i, color: 'var(--area, var(--s1))' })), max: insight.max, format: insight.format, caption: insight.title }));
  const offs = [
    on(panel, 'click', '[data-edit]', (e, b) => show('do', { edit: b.dataset.edit })),
    on(panel, 'click', '[data-del]', async (e, b) => {
      if (!(await confirmDialog({ title: 'Delete this entry?', body: 'It will be removed from this device. You can undo straight after.', confirm: 'Delete', danger: true }))) return;
      const rec = await store.remove(b.dataset.del);
      toast('Entry deleted.', { action: 'Undo', onAction: async () => { await store.restore(rec); show('history'); } });
      show('history');
    }),
    on(panel, 'click', '[data-csv]', () => {
      const fields = fieldIndex(ex);
      const head = ['date', ...fields.map((f) => f.id), ...Object.keys(recs[0].metrics || {}).map((k) => 'metric_' + k)];
      const rows = recs.map((r) => [r.createdAt, ...fields.map((f) => csvCell(r.data[f.id])), ...Object.keys(recs[0].metrics || {}).map((k) => csvCell(r.metrics?.[k]))]);
      download(`${ex.id}-entries.csv`, [head, ...rows].map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
    }),
  ];
  return () => { offs.forEach((f) => f()); stops.forEach((f) => f()); };
}

const safeSummary = (ex, r) => { try { return ex.summarize ? ex.summarize(r.data) : ex.title; } catch { return ex.title; } };
function csvCell(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? (x.name ? `${x.name}:${x.v}` : JSON.stringify(x)) : x)).join('; ');
  if (typeof v === 'object') return v.points ? v.points.map((p) => `${p.t}s:${p.v}`).join(' ') : JSON.stringify(v);
  return v;
}

function printWorksheet(ex) {
  const root = document.getElementById('print-root');
  root.innerHTML = ex.form ? worksheetHTML(ex) : String(html`<div class="ws"><h1>${ex.title}</h1><p>${ex.simple}</p><h3>Steps</h3><ol>${ex.steps.map((s) => html`<li>${s}</li>`)}</ol><div class="ws-field"><div class="ws-label">Notes</div><div class="box"></div></div></div>`);
  document.body.classList.add('printing-worksheet');
  const done = () => { document.body.classList.remove('printing-worksheet'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}
