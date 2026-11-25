import { html, raw, on, download, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { fmtDate, fmtDateTime, fmtMs, fmtNum, dayKey } from '../core/format.js';
import { AREAS, areaColor } from '../data/areas.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { reportSteps } from '../lib/report.js';
import { lineChart, barChart, heatmap } from '../lib/charts.js';
import { pageHead, cite, statTile, REF_BY_ID, fullCitation, crisisCallout } from '../ui/components.js';
import { SITE } from '../config.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function reportsView({ query }) {
  const days = query.days === 'all' ? null : Number(query.days || 30);
  const body = html`<div class="container">${pageHead({ title: 'Progress report', lede: 'Your entries turned into charts, reliable-change results and research-backed insights. Generated entirely on this device.' })}
    <div class="card flat no-print" style="margin-bottom:18px"><div class="cluster">
      <label for="rp-days" class="small">Period</label><select id="rp-days" style="width:auto">${[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['all', 'All time']].map(([v, l]) => html`<option value="${v}" ${String(days ?? 'all') === v ? raw('selected') : ''}>${l}</option>`)}</select>
      <button class="btn primary" data-gen>${icon('refresh')} Generate</button>
      <span style="flex:1"></span>
      <button class="btn" data-print>${icon('print')} Print / PDF</button><button class="btn" data-html>${icon('download')} HTML report</button><button class="btn ghost" data-json>${icon('download')} JSON</button>
    </div></div>
    <section class="card no-print" data-pipe-card style="margin-bottom:18px"><div class="split"><h2 style="font-size:1.1rem;margin:0">${icon('pulse')} Generating your report</h2><span class="small faint" data-total></span></div>
      <ol class="pipeline" data-pipe style="margin-top:12px"></ol><p class="small faint" style="margin:10px 0 0">Times are real computation times measured in your browser; the steps are revealed one by one so you can follow along.</p></section>
    <div data-report></div></div>`;

  const mount = (root) => {
    const stops = [];
    let lastData = null;
    const run = async () => {
      stops.splice(0).forEach((f) => f());
      const d = root.querySelector('#rp-days').value;
      const dd = d === 'all' ? null : Number(d);
      const steps = reportSteps(store.all(), { days: dd });
      const pipe = root.querySelector('[data-pipe]');
      pipe.innerHTML = String(html`${steps.map((s, i) => html`<li data-step="${i}"><span class="st"></span><span>${s.label} <span class="faint small" data-det></span></span><span class="ms"></span></li>`)}<li data-step="render"><span class="st"></span><span>Drawing charts and writing the report</span><span class="ms"></span></li>`);
      root.querySelector('[data-report]').style.opacity = '0.45';
      const slow = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const wall0 = perf.now();
      let compute = 0;
      for (let i = 0; i < steps.length; i++) {
        const li = pipe.querySelector(`[data-step="${i}"]`);
        li.className = 'running';
        if (slow) await wait(110);
        const t0 = perf.now();
        const detail = steps[i].run();
        const ms = perf.now() - t0;
        compute += ms;
        li.className = 'done';
        li.querySelector('.ms').textContent = fmtMs(ms);
        li.querySelector('[data-det]').textContent = `· ${detail}`;
      }
      const ctx = steps[0].ctx;
      const li = pipe.querySelector('[data-step="render"]');
      li.className = 'running';
      if (slow) await wait(110);
      const t0 = perf.now();
      renderReport(root.querySelector('[data-report]'), ctx, dd, stops);
      const rms = perf.now() - t0;
      compute += rms;
      li.className = 'done'; li.querySelector('.ms').textContent = fmtMs(rms);
      root.querySelector('[data-report]').style.opacity = '1';
      root.querySelector('[data-total]').textContent = `Computed in ${fmtMs(compute)} · ${fmtMs(perf.now() - wall0)} including animation`;
      perf.event('Generated progress report', compute, `${ctx.recs.length} entries · ${ctx.insights.length} insights`);
      lastData = { generatedAt: new Date().toISOString(), periodDays: dd, overview: ctx.ov, questionnaires: ctx.trends, mood: ctx.mood, findings: ctx.findings, insights: ctx.insights };
    };
    const offs = [
      on(root, 'click', '[data-gen]', run),
      on(root, 'change', '#rp-days', run),
      on(root, 'click', '[data-print]', () => window.print()),
      on(root, 'click', '[data-json]', () => lastData && download(`cbt-report-${dayKey(new Date())}.json`, JSON.stringify(lastData, null, 2), 'application/json')),
      on(root, 'click', '[data-html]', async () => {
        const css = await fetch('css/app.css').then((r) => r.text()).catch(() => '');
        const content = root.querySelector('[data-report]').cloneNode(true);
        content.querySelectorAll('.chart-actions, .no-print').forEach((n) => n.remove());
        content.querySelectorAll('.table-wrap[hidden]').forEach((n) => n.removeAttribute('hidden'));
        const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CBT progress report ${dayKey(new Date())}</title><style>${css}</style></head><body><main><div class="container">${content.innerHTML}</div></main></body></html>`;
        download(`cbt-progress-report-${dayKey(new Date())}.html`, doc, 'text/html');
        toast('Report downloaded as a self-contained HTML file.');
      }),
    ];
    run();
    return () => { offs.forEach((f) => f()); stops.forEach((f) => f()); };
  };
  return { title: 'Progress report', body, mount };
}

function renderReport(el, ctx, days, stops) {
  const { ov, trends, mood, findings, insights, recs } = ctx;
  const refsUsed = new Set([...findings.flatMap((f) => f.refs), ...insights.flatMap((i) => i.refs)]);
  const period = days ? `${fmtDate(Date.now() - days * 864e5)} – ${fmtDate(new Date())}` : 'All time';
  const flagged = trends.some((t) => t.flags?.includes('self-harm'));
  el.innerHTML = String(html`<article class="stack" style="--gap:20px">
    <header class="card"><div class="split"><div><p class="eyebrow" style="margin:0">${SITE.name} · Progress report</p><h2 style="margin:4px 0">${period}</h2><p class="small muted" style="margin:0">Generated ${fmtDateTime(new Date())} from ${fmtNum(recs.length)} entries stored on this device.</p></div>
      <span class="badge">${icon('lock', 'icon')} Private — created locally</span></div></header>
    ${flagged ? crisisCallout() : ''}
    <section class="stats">${statTile('Entries', fmtNum(ov.entries))}${statTile('Exercises done', fmtNum(ov.exercises))}${statTile('Active days', fmtNum(ov.activeDays))}${statTile('Current streak', `${ov.streak} day${ov.streak === 1 ? '' : 's'}`, `Longest ${ov.longestStreak}`)}${statTile('Check-ins', fmtNum(ov.checkins))}${statTile('Mood logs', fmtNum(ov.moods))}</section>

    <section class="card"><h3>${icon('sparkle')} Key insights</h3>${insights.map((i) => html`<div class="callout ${i.tone}" style="margin-top:10px"><p style="margin:0">${i.text} ${i.refs.map((r) => cite(r))}</p>${i.links ? html`<p class="small" style="margin:6px 0 0">${i.links.map((id, k) => html`${k ? ' · ' : ''}<a href="#/exercise/${id}">${EXERCISE_BY_ID[id].title}</a>`)}</p>` : ''}</div>`)}</section>

    ${trends.length ? html`<section class="card"><h3>${icon('clipboard')} Questionnaires</h3><div class="grid" style="--min:320px">${trends.map((t) => html`<div><div class="split"><strong>${t.title}</strong><span class="small">${t.change ? html`<span class="${t.change.better ? 'kpi-up' : t.change.diff ? 'kpi-down' : ''}">${t.change.label}</span>` : 'Baseline'}</span></div>
      <p class="small muted" style="margin:2px 0 6px">Latest ${t.last}${t.percent ? '%' : ` / ${t.max}`} (${t.band.label}) · ${t.count} score${t.count > 1 ? 's' : ''} · reliable change threshold ${t.reliableChange}</p><div data-trend="${t.id}"></div></div>`)}</div>
      <p class="small faint" style="margin:10px 0 0">Reliable change: a difference larger than measurement error ${cite('jacobson1991')}; thresholds follow NHS Talking Therapies ${cite('nhs-tt-manual')}. Screening questionnaires are not a diagnosis.</p></section>` : html`<section class="card flat"><h3>Questionnaires</h3><p class="muted">No check-ins in this period. <a href="#/check-in">Take one</a> to measure change over time.</p></section>`}

    ${mood ? html`<section class="card"><h3>${icon('smile')} Mood</h3><p class="small muted">Average ${mood.avg}/10${mood.prevAvg != null ? ` (previous period ${mood.prevAvg})` : ''}${mood.trendPerWeek != null ? ` · trend ${mood.trendPerWeek >= 0 ? '+' : ''}${mood.trendPerWeek} points per week` : ''} · ${mood.count} logs</p><div data-mood></div></section>` : ''}

    <section class="grid-2"><div class="card"><h3>${icon('activity')} Practice by area</h3><div data-areas></div></div>
      <div class="card"><h3>${icon('calendar')} Activity calendar</h3><div data-heat></div>${ov.topExercises.length ? html`<h4 style="margin-top:16px">Most practised</h4><ol class="small">${ov.topExercises.map((t) => html`<li><a href="#/exercise/${t.id}">${t.title}</a> — ${t.count}×</li>`)}</ol>` : ''}</div></section>

    ${findings.length ? html`<section class="card"><h3>${icon('flask')} What your exercises show</h3><ul class="list">${findings.map((f) => html`<li><strong><a href="#/exercise/${f.type}">${f.title}</a>:</strong> ${f.text} ${f.refs.map((r) => cite(r))}</li>`)}</ul></section>` : ''}

    ${refsUsed.size ? html`<section class="card flat"><h3>References in this report</h3><ol class="small">${[...refsUsed].map((id) => REF_BY_ID[id]).filter(Boolean).map((r) => html`<li>${fullCitation(r)}</li>`)}</ol></section>` : ''}
    <p class="small faint">This report summarises self-recorded data for personal reflection or to share with a professional. It is not a clinical assessment.</p>
  </article>`);
  trends.forEach((t) => stops.push(lineChart(el.querySelector(`[data-trend="${t.id}"]`), { yMin: 0, yMax: t.max, bands: t.chartBands, height: 190, caption: t.title, series: [{ name: t.name, color: 'var(--s1)', points: t.points }], format: (v) => `${fmtNum(v)}${t.percent ? '%' : ''}` })));
  if (mood) stops.push(lineChart(el.querySelector('[data-mood]'), { yMin: 0, yMax: 10, caption: 'Daily mood', series: [{ name: 'Mood', color: 'var(--s1)', points: mood.daily }, { name: 'Anxiety', color: 'var(--s2)', points: mood.anxietyDaily }] }));
  stops.push(barChart(el.querySelector('[data-areas]'), { items: AREAS.map((a) => ({ label: a.name, value: ov.byArea[a.id], color: areaColor(a.id) })), format: (v) => fmtNum(v), caption: 'Exercises per area', emptyText: 'No exercises in this period yet.' }));
  heatmap(el.querySelector('[data-heat]'), { counts: new Map(Object.entries(ov.perDay)), weeks: days && days <= 30 ? 8 : 18 });
}
