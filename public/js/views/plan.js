import { html, raw, on, toast, download } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { startOfWeek, addDays, fmtDate, dayKey } from '../core/format.js';
import { AREAS, AREA_BY_ID } from '../data/areas.js';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises/index.js';
import { ASSESSMENTS, ASSESSMENT_BY_ID, scoreAssessment } from '../data/assessments.js';
import { pageHead, areaStyle, levelBadge, cite } from '../ui/components.js';
import { buildICS } from '../lib/ics.js';

const DAYSETS = { 1: ['MO'], 2: ['MO', 'TH'], 3: ['MO', 'WE', 'FR'], 4: ['MO', 'TU', 'TH', 'SA'], 5: ['MO', 'TU', 'WE', 'TH', 'FR'], 6: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'], 7: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] };

/** Severity (0–1) per area from the latest check-ins, used to suggest focus areas. */
export function suggestedAreas() {
  const out = [];
  for (const a of ASSESSMENTS) {
    const r = store.query({ kind: 'assessment', type: a.id })[0];
    if (!r || a.area === 'general') continue;
    const s = scoreAssessment(a, r.data.answers);
    out.push({ area: a.area, severity: a.percent ? s.score / 100 : s.score / a.max, label: `${a.name} ${s.band.label.toLowerCase()}` });
  }
  return out.sort((x, y) => y.severity - x.severity);
}

export async function planView() {
  let plan = (await store.kvGet('plan', null)) || { items: [], time: '19:00' };
  const weekStart = startOfWeek(new Date());
  const done = (exId) => store.query({ type: exId, since: weekStart }).length;
  const sugg = suggestedAreas();

  const render = () => {
    const total = plan.items.reduce((s, i) => s + i.perWeek, 0);
    const got = plan.items.reduce((s, i) => s + Math.min(i.perWeek, done(i.ex)), 0);
    return html`<div class="container">${pageHead({ title: 'My plan', lede: `This week: ${fmtDate(weekStart, { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(weekStart, 6), { day: 'numeric', month: 'short' })}. Regular practice is what makes CBT work.` })}
      <div class="grid-2 wide-left">
        <section class="card">${plan.items.length ? html`
          <div class="split"><h2 style="font-size:1.2rem;margin:0">This week's practice</h2><span class="small muted">${got} of ${total} sessions done</span></div>
          <div class="progress" style="margin:10px 0 18px"><span style="width:${total ? (got / total) * 100 : 0}%"></span></div>
          ${plan.items.map((it, i) => { const ex = EXERCISE_BY_ID[it.ex]; if (!ex) return ''; const d = done(it.ex); return html`<div class="entry" ${areaStyle(ex.area)}><div class="entry-head"><a class="entry-title" href="#/exercise/${ex.id}">${ex.title}</a>
            <span class="cluster" style="--gap:6px"><span class="badge ${d >= it.perWeek ? 'ev-A' : ''}">${Math.min(d, it.perWeek)} / ${it.perWeek} this week</span>
            <select data-freq="${i}" aria-label="Times per week">${[1, 2, 3, 4, 5, 6, 7].map((n) => html`<option value="${n}" ${n === it.perWeek ? raw('selected') : ''}>${n}× / week</option>`)}</select>
            <button class="btn small ghost" data-rm="${i}" aria-label="Remove from plan">${icon('x')}</button></span></div>
            <div class="progress" style="margin-top:6px"><span style="width:${Math.min(100, (d / it.perWeek) * 100)}%"></span></div></div>`; })}
          <div class="cluster" style="margin-top:16px"><label class="small" for="pl-time">Reminder time</label><input type="time" id="pl-time" value="${plan.time || '19:00'}" style="width:auto">
            <button class="btn soft" data-ics>${icon('calendar')} Add reminders to my calendar</button></div>`
          : html`<div class="empty"><h3>No plan yet</h3><p>Pick one to three areas below and we'll suggest a starter plan based on the strongest evidence.</p></div>`}
          <div class="field" style="margin-top:18px"><label class="label" for="pl-add">Add any exercise</label><div class="cluster"><select id="pl-add" style="flex:1 1 260px">${AREAS.map((a) => html`<optgroup label="${a.name}">${EXERCISES.filter((e) => e.area === a.id).map((e) => html`<option value="${e.id}">${e.title}</option>`)}</optgroup>`)}</select><button class="btn" data-add>${icon('plus')} Add</button></div></div>
        </section>
        <aside class="stack">
          <div class="card flat"><h3>Build a starter plan</h3><p class="small muted">Choose up to 3 areas. Each adds its top evidence-based exercises.</p>
            ${sugg.length ? html`<p class="small"><strong>Suggested from your check-ins:</strong> ${sugg.slice(0, 3).map((s) => AREA_BY_ID[s.area].name).join(', ')}</p>` : html`<p class="small"><a href="#/check-in">Take a check-in</a> to get suggestions.</p>`}
            <div class="options">${AREAS.map((a) => html`<button class="chip" data-area="${a.id}" ${areaStyle(a.id)} aria-pressed="false"><span class="area-dot"></span>${a.name}</button>`)}</div>
            <button class="btn primary" style="margin-top:12px" data-build>${icon('sparkle')} Create plan</button></div>
          <div class="card flat"><h3>Why a plan?</h3><p class="small muted" style="margin:0">Deciding when and where you'll practise makes you much more likely to follow through ${cite('gollwitzer2006')}, and people who practise more between sessions improve more ${cite('mausbach2010')}.</p></div>
        </aside>
      </div></div>`;
  };

  const mount = (root) => {
    const rerender = () => { root.innerHTML = String(render()); };
    const save = async () => { await store.kvSet('plan', plan); rerender(); };
    const chosen = new Set(sugg.slice(0, 2).map((s) => s.area));
    const syncChips = () => root.querySelectorAll('[data-area]').forEach((b) => b.setAttribute('aria-pressed', String(chosen.has(b.dataset.area))));
    syncChips();
    const offs = [
      on(root, 'click', '[data-area]', (e, b) => { const id = b.dataset.area; if (chosen.has(id)) chosen.delete(id); else if (chosen.size < 3) chosen.add(id); else toast('Pick up to 3 areas — focus beats spreading thin.'); syncChips(); }),
      on(root, 'click', '[data-build]', async () => {
        if (!chosen.size) return toast('Choose at least one area.');
        const items = [];
        [...chosen].forEach((id, ai) => AREA_BY_ID[id].order.slice(0, ai === 0 ? 3 : 2).forEach((exId, k) => { if (!items.find((x) => x.ex === exId)) items.push({ ex: exId, perWeek: k === 0 ? 3 : 2 }); }));
        plan = { ...plan, items, areas: [...chosen], created: new Date().toISOString() };
        await save(); toast('Plan created. Add reminders to your calendar to make it stick.'); syncChips();
      }),
      on(root, 'click', '[data-add]', async () => { const id = root.querySelector('#pl-add').value; if (!plan.items.find((x) => x.ex === id)) { plan.items.push({ ex: id, perWeek: 2 }); await save(); } }),
      on(root, 'click', '[data-rm]', async (e, b) => { plan.items.splice(Number(b.dataset.rm), 1); await save(); }),
      on(root, 'change', '[data-freq]', async (e, s) => { plan.items[Number(s.dataset.freq)].perWeek = Number(s.value); await save(); }),
      on(root, 'change', '#pl-time', async (e, t) => { plan.time = t.value; await store.kvSet('plan', plan); }),
      on(root, 'click', '[data-ics]', () => {
        const [h, m] = (plan.time || '19:00').split(':').map(Number);
        const start = new Date(startOfWeek(new Date())); start.setHours(h, m, 0, 0);
        const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const events = plan.items.map((it, i) => { const ex = EXERCISE_BY_ID[it.ex]; const s = new Date(start.getTime() + i * 20 * 60000); return { title: `CBT practice: ${ex.title}`, start: local(s), minutes: Math.max(10, ex.minutes), rrule: `FREQ=WEEKLY;BYDAY=${DAYSETS[it.perWeek].join(',')}`, description: `${ex.tagline}\nOpen CBT Toolkit → ${ex.title}` }; });
        download('cbt-practice-plan.ics', buildICS(events, { calName: 'CBT practice plan' }), 'text/calendar');
        toast('Calendar file downloaded — open it to add weekly reminders.');
      }),
    ];
    return () => offs.forEach((f) => f());
  };
  return { title: 'My plan', body: render(), mount };
}
