import { html, raw, on, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { fmtDate, relTime, fmtNum, fmtMs, signed } from '../core/format.js';
import { ASSESSMENTS, ASSESSMENT_BY_ID, scoreAssessment, compareScores } from '../data/assessments.js';
import { AREA_BY_ID } from '../data/areas.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { pageHead, crisisCallout, cite, areaStyle, refCard, REF_BY_ID, notFoundPage } from '../ui/components.js';
import { lineChart } from '../lib/charts.js';

const unit = (a) => (a.percent ? '%' : '');
const fmtScore = (a, s) => `${fmtNum(s)}${a.percent ? '%' : ` / ${a.max}`}`;

export async function checkinListView() {
  const last = (id) => store.query({ kind: 'assessment', type: id })[0];
  const card = (a) => { const l = last(a.id); const s = l ? scoreAssessment(a, l.data.answers) : null; return html`<a class="card card-link" href="#/check-in/${a.id}" ${a.area !== 'general' ? areaStyle(a.area) : ''}>
    <div class="cluster" style="--gap:6px;margin-bottom:6px"><span class="badge ${a.validated ? 'ev-A' : 'ev-D'}">${a.validated ? 'Validated questionnaire' : 'Self-reflection check-in'}</span><span class="badge">${a.items.length} questions · ${a.minutes} min</span></div>
    <h3>${a.title}</h3>${s ? html`<p class="small" style="margin:0">Last: <strong>${fmtScore(a, s.score)}</strong> — ${s.band.label} · ${relTime(l.createdAt)}</p>` : html`<p class="small muted" style="margin:0">Not taken yet</p>`}</a>`; };
  return {
    title: 'Check-ins',
    body: html`<div class="container">${pageHead({ title: 'Check-ins', lede: 'Short questionnaires give you a starting point and show whether things are really changing. Re-take them every 2 weeks.' })}
      <div class="callout info" style="margin-bottom:20px"><div class="callout-title">${icon('info')} Why measure?</div><p style="margin:0">Tracking scores regularly and acting on them improves outcomes — it shows when something is working and when to change course ${cite('lambert2018')}. We use the same "reliable change" thresholds as NHS psychological therapy services ${cite('nhs-tt-manual')}.</p></div>
      <h2>Validated questionnaires</h2><div class="grid" style="--min:280px">${ASSESSMENTS.filter((a) => a.validated).map(card)}</div>
      <h2 class="section">Area check-ins</h2><p class="muted small">Original self-reflection questions for the other five areas — useful for tracking your own change, but not validated and never a diagnosis.</p>
      <div class="grid" style="--min:280px">${ASSESSMENTS.filter((a) => !a.validated).map(card)}</div></div>`,
  };
}

export async function checkinView({ params }) {
  const a = ASSESSMENT_BY_ID[params.id];
  if (!a) return notFoundPage('Questionnaire', '#/check-in', 'All check-ins');
  const area = AREA_BY_ID[a.area];
  const opts = a.allowNA ? [...a.options, { value: 'na', label: 'Doesn’t apply' }] : a.options;
  const body = html`<div class="container narrow" ${a.area !== 'general' ? areaStyle(a.area) : ''}>
    ${pageHead({ crumbs: [{ label: 'Check-ins', href: '#/check-in' }, { label: a.name }], title: a.title, lede: `${a.items.length} questions · about ${a.minutes} minute${a.minutes > 1 ? 's' : ''}. Your answers stay on this device.` })}
    <div data-result></div>
    <form class="wizard" data-q novalidate><div class="wizard-head"><p style="margin:0"><strong>${a.intro}</strong></p><div class="progress" style="margin-top:10px"><span data-prog style="width:0%"></span></div></div>
      <div class="wizard-body">${a.items.map((q, i) => html`<fieldset class="field" style="border:0;padding:0;margin:0 0 22px"><legend class="label" style="margin-bottom:8px">${i + 1}. ${q}</legend>
        <div class="radio-cards" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${opts.map((o) => html`<label class="radio-card"><input type="radio" name="q${i}" value="${o.value}" required><span>${o.label}</span></label>`)}</div></fieldset>`)}
        ${a.extra ? html`<fieldset class="field" style="border:0;padding:0"><legend class="label" style="margin-bottom:8px">${a.extra.q}</legend><div class="radio-cards" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">${a.extra.options.map((o, j) => html`<label class="radio-card"><input type="radio" name="extra" value="${j}"><span>${o}</span></label>`)}</div></fieldset>` : ''}
        <div class="err" data-err hidden></div></div>
      <div class="wizard-foot"><span class="small faint">${a.attribution}</span><button class="btn primary" type="submit">${icon('check')} See my result</button></div></form>
    <section class="section" data-history></section>
  </div>`;

  const mount = (root) => {
    const form = root.querySelector('[data-q]');
    const prog = root.querySelector('[data-prog]');
    form.addEventListener('change', () => { const n = a.items.filter((_, i) => form.querySelector(`input[name=q${i}]:checked`)).length; prog.style.width = `${(n / a.items.length) * 100}%`; });
    renderHistory(root.querySelector('[data-history]'), a);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const answers = a.items.map((_, i) => { const v = form.querySelector(`input[name=q${i}]:checked`)?.value; return v == null ? undefined : v === 'na' ? null : Number(v); });
      const missing = answers.findIndex((v) => v === undefined);
      if (missing >= 0) { const err = root.querySelector('[data-err]'); err.hidden = false; err.textContent = `Please answer question ${missing + 1}.`; form.querySelector(`input[name=q${missing}]`).focus(); return; }
      const t0 = perf.now();
      const s = scoreAssessment(a, answers);
      const ms = perf.now() - t0;
      perf.event(`Scored ${a.name}`, ms, `score ${s.score}`);
      const prev = store.query({ kind: 'assessment', type: a.id })[0];
      const prevScore = prev ? scoreAssessment(a, prev.data.answers).score : null;
      const extra = form.querySelector('input[name=extra]:checked')?.value;
      await store.add({ kind: 'assessment', type: a.id, area: a.area === 'general' ? null : a.area, data: { answers, extra: extra != null ? Number(extra) : null }, metrics: { score: s.score } });
      const cmp = compareScores(a, prevScore, s.score);
      form.hidden = true;
      const recs = area ? area.startHere.map((id) => EXERCISE_BY_ID[id]) : [EXERCISE_BY_ID['activity-scheduling'], EXERCISE_BY_ID['paced-breathing']];
      root.querySelector('[data-result]').innerHTML = String(html`<div class="stack" style="--gap:16px">
        ${s.flags.includes('self-harm') ? crisisCallout() : ''}
        <div class="card"><div class="split"><div><div class="small muted">Your score</div><div style="font-size:2.6rem;font-weight:700;line-height:1.1">${fmtScore(a, s.score)}</div></div>
          <div class="callout ${s.band.tone}" style="flex:1 1 280px"><div class="callout-title">${s.band.label}</div><p style="margin:0">${s.band.advice}</p></div></div>
          ${cmp ? html`<p style="margin:14px 0 0"><strong>${cmp.label}</strong> since ${relTime(prev.createdAt)} (${signed(cmp.diff)}${unit(a)}). ${cmp.reliable ? html`A change of ${a.reliableChange}${unit(a) || ' points'} or more is unlikely to be measurement noise.` : html`Changes smaller than ${a.reliableChange}${unit(a) || ' points'} can be normal week-to-week variation.`} ${cmp.recovered ? html`<strong>You have moved below the clinical threshold — that counts as reliable recovery.</strong>` : ''}</p>` : html`<p class="small muted" style="margin:14px 0 0">This is your baseline. Re-take it in about 2 weeks to see what is changing.</p>`}
          <p class="small faint" style="margin:10px 0 0">Scored in ${fmtMs(ms)} on your device. ${a.validated ? 'This is a screening tool, not a diagnosis — only a qualified professional can diagnose.' : 'Self-reflection check-in — not a validated questionnaire or a diagnosis.'}</p></div>
        <div class="card flat"><h3>Suggested next steps</h3><div class="grid" style="--min:220px">${recs.map((x) => html`<a class="card card-link" href="#/exercise/${x.id}" ${areaStyle(x.area)}><strong>${x.title}</strong><p class="small muted" style="margin:4px 0 0">${x.tagline}</p></a>`)}</div>
          <p class="small" style="margin:12px 0 0">${area ? html`<a href="#/area/${area.id}">Explore ${area.name.toLowerCase()} →</a> · ` : ''}<a href="#/reports">Progress report →</a> · <a href="#/check-in">Other check-ins</a></p></div>
        ${a.refs.length ? html`<details class="more"><summary>About this questionnaire and the research</summary>${a.refs.map((id) => refCard(REF_BY_ID[id], { compact: true }))}</details>` : ''}
      </div>`);
      renderHistory(root.querySelector('[data-history]'), a);
      root.querySelector('[data-result]').scrollIntoView({ behavior: 'smooth' });
      toast('Saved on this device.');
    });
    return () => {};
  };
  return { title: a.title, body, mount };
}

function renderHistory(el, a) {
  const recs = store.query({ kind: 'assessment', type: a.id }).slice().reverse();
  if (!recs.length) { el.innerHTML = ''; return; }
  el.innerHTML = String(html`<div class="card"><h2 style="font-size:1.2rem">Your ${a.name} over time</h2><div data-c></div>
    <p class="small muted" style="margin:8px 0 0">${a.higherIsWorse ? 'Lower is better.' : 'Higher is better.'} Shaded bands show severity ranges. ${a.caseness != null ? `The clinical threshold is ${a.caseness}.` : ''}</p></div>`);
  lineChart(el.querySelector('[data-c]'), { caption: `${a.name} scores`, yMin: 0, yMax: a.max, bands: a.chartBands, format: (v) => `${fmtNum(v)}${unit(a)}`,
    series: [{ name: a.name, color: 'var(--s1)', points: recs.map((r) => ({ x: r.createdAt, y: scoreAssessment(a, r.data.answers).score })) }] });
}
