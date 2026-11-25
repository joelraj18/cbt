import { html, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { relTime, fmtNum } from '../core/format.js';
import { AREAS, AREA_BY_ID } from '../data/areas.js';
import { EXERCISE_BY_ID, exercisesForArea } from '../data/exercises/index.js';
import { research } from '../data/research.js';
import { ASSESSMENT_BY_ID } from '../data/assessments.js';
import { areaStyle, adSlot, cite, exerciseCard, pageHead, refCard, REF_BY_ID, crisisCallout, notFoundPage } from '../ui/components.js';
import { cycleBlock, mountCycles } from '../ui/cycle.js';

export async function areasView() {
  return {
    title: 'All areas',
    body: html`<div class="container">${pageHead({ title: 'Choose an area', lede: 'Seven areas of life, each with a plain-language explanation, an everyday example, step-by-step exercises ranked by evidence, and the research behind them.' })}
      <div class="grid" style="--min:320px">${AREAS.map((a) => { const n = exercisesForArea(a.id).length; const done = store.query({ area: a.id }).length; return html`<a class="card card-link area-card" href="#/area/${a.id}" ${areaStyle(a.id)}>
        <div class="card-head"><span class="area-icon">${icon(a.icon)}</span><div><h2 style="font-size:1.2rem;margin:0">${a.name}</h2><p class="small muted" style="margin:2px 0 0">${a.tagline}</p></div></div>
        <p class="small" style="margin:12px 0 0">${a.simple.split('. ').slice(0, 2).join('. ')}.</p>
        <div class="meta" style="margin-top:12px"><span>${n} exercises</span><span>${research.filter((r) => r.areas.includes(a.id)).length} studies</span>${done ? html`<span>${done} of your entries</span>` : ''}</div></a>`; })}</div>
      ${adSlot('banner')}</div>`,
  };
}

export async function areaView({ params }) {
  const a = AREA_BY_ID[params.id];
  if (!a) return notFoundPage('Area', '#/areas', 'See all areas');
  const exs = a.order.map((id) => EXERCISE_BY_ID[id]);
  const cross = exercisesForArea(a.id).filter((e) => !a.order.includes(e.id));
  const refs = research.filter((r) => r.areas.includes(a.id)).sort((x, y) => (y.areas[0] === a.id) - (x.areas[0] === a.id) || (/meta|review/i.test(y.type) - /meta|review/i.test(x.type)) || y.year - x.year);
  const check = ASSESSMENT_BY_ID[a.checkin];
  const lastCheck = store.query({ kind: 'assessment', type: a.checkin })[0];
  const count = (id) => store.query({ type: id }).length;
  const cycles = [{ id: a.id, name: a.short, ...a.cycle }];

  const body = html`<div class="container" ${areaStyle(a.id)}>
    ${pageHead({ crumbs: [{ label: 'Areas', href: '#/areas' }, { label: a.name }], title: a.name, lede: a.tagline, area: a.id,
      actions: html`<div class="cluster"><a class="btn primary" href="#/exercise/${a.startHere[0]}">${icon('play')} Start here</a><a class="btn" href="#/check-in/${a.checkin}">${icon('clipboard')} ${check.name} check</a></div>` })}

    <div class="grid-2 wide-left">
      <section class="callout simple"><div class="callout-title">${icon('info')} In simple words</div><p>${a.simple}</p>
        ${a.definitionRef ? html`<p class="small muted" style="margin:0">Definition based on ${cite(a.definitionRef)}.</p>` : ''}</section>
      <section class="card flat"><h2 class="h3">${icon('clipboard')} Where are you now?</h2>
        ${lastCheck ? html`<p class="small">Your last ${check.name} check was ${relTime(lastCheck.createdAt)}.</p>` : html`<p class="small muted">Take the ${check.minutes}-minute ${check.title.toLowerCase()} to get a baseline you can track.</p>`}
        <a class="btn small soft" href="#/check-in/${a.checkin}">${lastCheck ? 'Check in again' : 'Take it now'}</a></section>
    </div>

    <section class="section grid-2">
      <div><h2>Common signs</h2><ul class="ticks">${a.signs.map((s) => html`<li>${s}</li>`)}</ul></div>
      <div><h2>How CBT helps</h2><ul class="ticks">${a.howCbtHelps.map((s) => html`<li>${s}</li>`)}</ul></div>
    </section>

    <section class="section"><h2>An everyday example</h2>
      ${cycleBlock(cycles, { id: 'area', intro: 'See how one situation can spiral through thoughts, feelings, the body and behaviour — and how changing just one link breaks the cycle.' })}</section>

    <section class="section"><div class="section-head"><h2>Exercises — ranked by evidence and impact</h2><span class="small faint">Start at the top. "Start here" exercises are the best first steps.</span></div>
      <div class="grid" style="--min:280px">${exs.map((ex) => exerciseCard(ex, { stats: html`${a.startHere.includes(ex.id) ? html`<span class="badge ev-B">Start here</span>` : ''}${count(ex.id) ? html`<span>${icon('check', 'icon')} done ${count(ex.id)}×</span>` : ''}<span>${ex.frequency.split(';')[0]}</span>` }))}</div>
      ${cross.length ? html`<h3 style="margin-top:24px">Also useful for ${a.name.toLowerCase()}</h3><div class="grid" style="--min:260px">${cross.map((ex) => exerciseCard(ex))}</div>` : ''}
    </section>

    ${adSlot('inArticle')}

    <section class="section"><h2>Key facts</h2><div class="grid" style="--min:260px">${a.facts.map((f) => html`<div class="card flat"><p style="margin:0">${f.text}</p><p class="small" style="margin:8px 0 0">${cite(f.ref)}</p></div>`)}</div></section>

    <section class="section"><h2>Myths vs facts</h2><div class="stack">${a.myths.map((m) => html`<details class="more"><summary>Myth: “${m.myth}”</summary><p><strong>Fact:</strong> ${m.fact} ${cite(m.ref)}</p></details>`)}</div></section>

    <section class="section grid-2">
      <div class="callout warn"><div class="callout-title">${icon('alert')} When to get extra help</div><ul>${a.getHelp.map((g) => html`<li>${g}</li>`)}</ul><p style="margin:0"><a href="#/help">Find support and crisis lines →</a></p></div>
      ${a.id === 'depression' || a.id === 'impulsiveness' ? crisisCallout() : html`<div class="card flat"><h3>Using this with a therapist</h3><p class="small muted">Every exercise can be printed as a blank worksheet, and your Reports page can be printed or exported to share progress with a professional.</p><a class="btn small" href="#/reports">${icon('chart')} Reports</a></div>`}
    </section>

    <section class="section"><div class="section-head"><h2>The research behind this area</h2><a href="#/research?area=${a.id}">All ${refs.length} studies →</a></div>
      <div class="grid" style="--min:320px">${refs.filter((r) => r.effect).slice(0, 6).map((r) => refCard(r, { compact: true }))}</div></section>
  </div>`;
  return { title: a.name, body, mount: (root) => mountCycles(root, { area: cycles }) };
}
