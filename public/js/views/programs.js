// Guided programmes: browse, start, and follow day-by-day.
import { html, raw, on, confirmDialog, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { go } from '../core/router.js';
import { fmtDate } from '../core/format.js';
import { PROGRAMS, PROGRAM_BY_ID } from '../data/programs.js';
import { AREA_BY_ID, areaColor } from '../data/areas.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { ASSESSMENT_BY_ID } from '../data/assessments.js';
import { programProgress, autoCompleteProgram, dayTarget } from '../lib/coach.js';
import { pageHead, cite, areaChip, notFoundPage } from '../ui/components.js';
import { startProgram } from './today.js';

async function current() {
  let st = await store.kvGet('program', null);
  const upd = autoCompleteProgram(st, store.all(), new Date());
  if (upd) { await store.kvSet('program', upd); st = upd; }
  return st;
}

export async function programsView() {
  const st = await current();
  const pr = programProgress(st, store.all(), new Date());
  const body = html`<div class="container">${pageHead({ title: 'Guided programmes', lede: 'One short lesson and one exercise a day, in an order that builds skills step by step. Each programme starts and ends with a check-in so you can see what changed.' })}
    ${pr ? html`<section class="card" style="margin-bottom:20px${pr.program.area ? `;--area:${areaColor(pr.program.area)}` : ''}"><div class="split"><div><div class="eyebrow">Your programme</div><h2 class="h3" style="margin:0">${pr.program.name}</h2></div>
      <a class="btn primary" href="#/today">${pr.finished ? 'See Today' : `Continue · Day ${pr.index + 1}`} ${icon('arrow')}</a></div>
      <div class="progress" style="margin:12px 0 4px"><span style="width:${pr.percent}%"></span></div><p class="small faint" style="margin:0">${pr.completed} of ${pr.program.days} days done${st.start ? ` · started ${fmtDate(st.start)}` : ''}</p></section>` : ''}
    <h2 class="sr-only">All programmes</h2>
    <div class="grid" style="--min:300px">${PROGRAMS.map((p) => html`<article class="card ${p.area ? 'area-card' : ''}" ${p.area ? raw(`style="--area:${areaColor(p.area)}"`) : ''}>
      <div class="cluster" style="--gap:6px;margin-bottom:8px"><span class="badge">${p.days} days</span>${p.area ? areaChip(p.area) : html`<span class="badge ev-B">All areas</span>`}${st?.id === p.id ? html`<span class="badge ev-A">In progress</span>` : ''}</div>
      <h3 style="margin:0 0 6px"><a href="#/programs/${p.id}" style="color:inherit">${p.name}</a></h3>
      <p class="small muted">${p.summary}</p>
      <p class="small" style="margin:0 0 10px">Based on ${p.refs.map((id, i) => html`${i ? ', ' : ''}${cite(id)}`)}</p>
      <div class="cluster"><a class="btn small" href="#/programs/${p.id}">See all days</a>${st?.id === p.id ? '' : html`<button class="btn small primary" data-start="${p.id}">Start</button>`}</div></article>`)}</div>
    <div class="callout info section"><div class="callout-title">${icon('info')} How programmes work</div><p style="margin:0">Each day unlocks the next calendar day, so practice is spread out — spaced practice sticks better than cramming. You can always choose to go on early. Finishing a day’s exercise ticks it off automatically. Programmes are structured self-help, similar to internet CBT courses ${cite('andersson2019')}, not a replacement for therapy.</p></div>
  </div>`;
  return { title: 'Programmes', body, mount: (root) => on(root, 'click', '[data-start]', (e, b) => confirmStart(b.dataset.start)) };
}

async function confirmStart(id) {
  const st = await store.kvGet('program', null);
  if (st && st.id !== id && !(await confirmDialog({ title: `Switch to ${PROGRAM_BY_ID[id].name}?`, body: `You are on day ${Object.keys(st.done || {}).length + 1} of ${PROGRAM_BY_ID[st.id]?.name}. Your entries are kept; only the programme progress restarts.`, confirm: 'Switch' }))) return;
  await startProgram(id);
  go('/today');
}

export async function programDetailView({ params }) {
  const p = PROGRAM_BY_ID[params.id];
  if (!p) return notFoundPage('Programme', '#/programs', 'All programmes');
  const st = await current();
  const active = st?.id === p.id;
  const pr = active ? programProgress(st, store.all(), new Date()) : null;
  const status = (i) => (!active ? '' : st.done?.[i] ? 'done' : i === pr.index ? 'current' : 'todo');
  const body = html`<div class="container narrow" ${p.area ? raw(`style="--area:${areaColor(p.area)}"`) : ''}>
    ${pageHead({ crumbs: [{ label: 'Programmes', href: '#/programs' }, { label: p.name }], title: p.name, lede: p.summary,
      actions: active ? html`<a class="btn primary" href="#/today">${pr.finished ? 'Finished' : `Day ${pr.index + 1}`} ${icon('arrow')}</a>` : html`<button class="btn primary" data-start="${p.id}">${icon('play')} Start this programme</button>` })}
    <div class="meta" style="margin:-8px 0 18px"><span>${icon('calendar')} ${p.days} days · about 10–20 minutes a day</span>${p.area ? areaChip(p.area) : ''}<span><span class="plain">Based on ${p.refs.map((id, i) => html`${i ? ', ' : ''}${cite(id)}`)}</span></span></div>
    <ol class="program-days">${p.plan.map((day, i) => {
      const t = dayTarget(day);
      const s = status(i);
      return html`<li class="pday ${s}"><div class="pday-num" aria-hidden="true">${s === 'done' ? '✓' : i + 1}</div><div>
        <div class="split"><h2 class="h4" style="margin:0">Day ${i + 1}: ${day.title}</h2>${s === 'done' ? html`<span class="small faint">${fmtDate(st.done[i], { day: 'numeric', month: 'short' })}</span>` : s === 'current' ? html`<span class="badge ev-B">Today</span>` : ''}</div>
        <p class="small" style="margin:4px 0">${day.lesson}</p><p class="small muted" style="margin:0"><strong>Task:</strong> ${day.task} · <a href="${t.href}">${day.ex ? EXERCISE_BY_ID[day.ex].title : day.checkin ? ASSESSMENT_BY_ID[day.checkin].title : 'CBT guide'}</a> (${t.minutes} min)</p></div></li>`;
    })}</ol>
    ${active ? html`<div class="cluster section"><button class="btn small danger" data-restart>${icon('refresh')} Restart from day 1</button><button class="btn small ghost" data-stop>Stop this programme</button></div>` : ''}
  </div>`;
  const mount = (root) => {
    const offs = [
      on(root, 'click', '[data-start]', (e, b) => confirmStart(b.dataset.start)),
      on(root, 'click', '[data-restart]', async () => { if (await confirmDialog({ title: 'Restart the programme?', body: 'Progress goes back to day 1. Your saved entries are kept.', confirm: 'Restart', danger: true })) { await startProgram(p.id); go(`/programs/${p.id}`, {}, { replace: true }); } }),
      on(root, 'click', '[data-stop]', async () => { if (await confirmDialog({ title: 'Stop this programme?', body: 'Your saved entries are kept. You can start any programme again later.', confirm: 'Stop' })) { await store.kvDel('program'); toast('Programme stopped.'); go('/programs', {}, { replace: true }); } }),
    ];
    return () => offs.forEach((f) => f());
  };
  return { title: p.name, body, mount };
}
