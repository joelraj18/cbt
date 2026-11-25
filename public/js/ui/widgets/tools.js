// Persistent tools (state kept in the local key-value store): fear ladder, worry list,
// priority matrix and habit tracker.
import { html, raw, on, uid, toast, confirmDialog, promptDialog, download } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { store } from '../../core/store.js';
import { dayKey, addDays, startOfDay, fmtDate, relTime, daysBetween } from '../../core/format.js';
import { buildICS } from '../../lib/ics.js';

const sudsColor = (s) => (s >= 70 ? 'var(--band-high)' : s >= 40 ? 'var(--band-mid)' : 'var(--band-good)');

/* ---------------- Fear ladder ---------------- */
export function ladder(el) {
  let ladders = [], current = null;
  const save = () => store.kvSet('tool:ladders', ladders);
  const attempts = (text) => store.query({ type: 'exposure-practice' }).filter((r) => (r.data.step || '').trim().toLowerCase() === text.trim().toLowerCase()).length;
  function render() {
    const L = ladders.find((l) => l.id === current);
    el.innerHTML = String(html`<div class="card">
      <div class="split"><div class="cluster">${ladders.map((l) => html`<button class="chip" data-pick="${l.id}" aria-pressed="${l.id === current}">${l.name}</button>`)}<button class="chip" data-new>${icon('plus')} New ladder</button></div></div>
      ${!L ? html`<div class="empty" style="margin-top:14px"><h3>Start your first fear ladder</h3><p>Name the fear you want to work on, e.g. "Speaking in groups" or "Driving on motorways".</p><button class="btn primary" data-new>${icon('plus')} Create a ladder</button></div>` : html`
        <h3 style="margin:16px 0 4px">${L.name}</h3><p class="small muted">Steps sorted from easiest (bottom) to hardest (top). Practise each step several times before moving up.</p>
        <form class="cluster" data-add style="align-items:flex-end;margin:12px 0"><div style="flex:1 1 240px"><label class="label small" for="ld-text">New step</label><input id="ld-text" type="text" placeholder="e.g. Ask a colleague a question" required></div>
          <div style="flex:1 1 160px"><label class="label small" for="ld-suds">Fear (0–100): <output data-sout>50</output></label><input id="ld-suds" type="range" min="0" max="100" step="5" value="50"></div><button class="btn primary" type="submit">${icon('plus')} Add</button></form>
        ${L.steps.length ? html`<ol class="ladder">${L.steps.slice().sort((a, b) => a.suds - b.suds).map((s) => { const n = attempts(s.text); return html`<li class="${s.done ? 'done' : ''}">
          <span class="suds" style="background:${sudsColor(s.suds)}">${s.suds}</span>
          <span><strong>${s.text}</strong><br><span class="small faint">${n ? `${n} practice${n === 1 ? '' : 's'} logged` : 'Not practised yet'}${s.done ? ' · mastered ✓' : ''}</span></span>
          <span class="cluster" style="--gap:4px"><a class="btn small soft" href="#/exercise/exposure-practice?tab=do&step=${encodeURIComponent(s.text)}">Practise</a>
          <button class="btn small ghost" data-done="${s.id}" aria-label="Mark mastered">${icon('check')}</button><button class="btn small ghost" data-del="${s.id}" aria-label="Delete step">${icon('trash')}</button></span></li>`; })}</ol>`
        : html`<p class="muted">Add 8–12 steps, from mildly uncomfortable to very scary.</p>`}
        <div class="cluster" style="margin-top:12px"><button class="btn small danger" data-remove-ladder>${icon('trash')} Delete this ladder</button></div>`}
    </div>`);
    const r = el.querySelector('#ld-suds'); if (r) r.addEventListener('input', () => { el.querySelector('[data-sout]').textContent = r.value; });
  }
  const offs = [
    on(el, 'click', '[data-pick]', (e, b) => { current = b.dataset.pick; render(); }),
    on(el, 'click', '[data-new]', async () => {
      const name = await promptDialog({ title: 'New fear ladder', label: 'What fear is this ladder for?', placeholder: 'e.g. Speaking in groups', confirm: 'Create' });
      if (!name) return;
      const l = { id: uid(), name: name.slice(0, 80), steps: [], created: new Date().toISOString() };
      ladders.push(l); current = l.id; await save(); render();
    }),
    on(el, 'submit', '[data-add]', async (e) => {
      e.preventDefault();
      const L = ladders.find((l) => l.id === current);
      const text = el.querySelector('#ld-text').value.trim(); if (!text) return;
      L.steps.push({ id: uid(), text, suds: Number(el.querySelector('#ld-suds').value), done: false });
      await save(); render(); el.querySelector('#ld-text')?.focus();
    }),
    on(el, 'click', '[data-done]', async (e, b) => { const s = ladders.find((l) => l.id === current).steps.find((x) => x.id === b.dataset.done); s.done = !s.done; await save(); render(); if (s.done) toast('Step mastered — time to move up a rung.'); }),
    on(el, 'click', '[data-del]', async (e, b) => { const L = ladders.find((l) => l.id === current); L.steps = L.steps.filter((x) => x.id !== b.dataset.del); await save(); render(); }),
    on(el, 'click', '[data-remove-ladder]', async () => { if (!(await confirmDialog({ title: 'Delete this ladder?', body: 'Your logged exposure practices are kept.', confirm: 'Delete', danger: true }))) return; ladders = ladders.filter((l) => l.id !== current); current = ladders[0]?.id || null; await save(); render(); }),
  ];
  store.kvGet('tool:ladders', []).then((v) => { ladders = v || []; current = ladders[0]?.id || null; render(); });
  el.innerHTML = '<div class="card"><span class="loader"></span></div>';
  return () => offs.forEach((f) => f());
}

/* ---------------- Worry list (for worry time) ---------------- */
export function worryList(el, { resetForm }) {
  let worries = [];
  const save = () => store.kvSet('tool:worries', worries);
  const pending = () => worries.filter((w) => !w.reviewed);
  function render() {
    const p = pending();
    el.innerHTML = String(html`<div class="card" style="margin-bottom:18px"><h3>${icon('clock')} Postpone a worry</h3>
      <p class="small muted">When a worry pops up during the day, jot it here and tell yourself: "Not now — at worry time."</p>
      <form class="cluster" data-add><input type="text" data-text placeholder="What's the worry?" style="flex:1 1 240px" required><button class="btn primary" type="submit">${icon('plus')} Postpone</button></form>
      ${p.length ? html`<ul class="list" style="margin-top:12px">${p.map((w) => html`<li class="split"><span>${w.text}<br><span class="small faint">${relTime(w.at)}</span></span><button class="btn small ghost" data-del="${w.id}" aria-label="Remove">${icon('x')}</button></li>`)}</ul>
        <button class="btn soft" style="margin-top:10px" data-start>${icon('play')} Start worry time with these ${p.length} worries</button>` : html`<p class="small faint" style="margin-top:10px">No postponed worries waiting.</p>`}</div>`);
  }
  const offs = [
    on(el, 'submit', '[data-add]', async (e) => { e.preventDefault(); const t = el.querySelector('[data-text]').value.trim(); if (!t) return; worries.push({ id: uid(), text: t.slice(0, 200), at: new Date().toISOString(), reviewed: false }); await save(); render(); toast('Postponed until worry time.'); el.querySelector('[data-text]')?.focus(); }),
    on(el, 'click', '[data-del]', async (e, b) => { worries = worries.filter((w) => w.id !== b.dataset.del); await save(); render(); }),
    on(el, 'click', '[data-start]', () => { resetForm?.({ worries: pending().map((w) => ({ worry: w.text, still: false, practical: false, plan: '', _id: w.id })) }); }),
  ];
  store.kvGet('tool:worries', []).then((v) => { worries = v || []; render(); });
  return {
    cleanup: () => offs.forEach((f) => f()),
    async afterSave(data) {
      const ids = new Set((data.worries || []).map((w) => w._id).filter(Boolean));
      worries = worries.map((w) => (ids.has(w.id) ? { ...w, reviewed: true } : w)).filter((w) => !w.reviewed || daysBetween(w.at, new Date()) < 14);
      await save();
      render();
    },
  };
}

/* ---------------- Priority matrix ---------------- */
export function matrix(el) {
  let tasks = [];
  const save = () => store.kvSet('tool:matrix', tasks);
  const Q = [
    { k: 'q1', t: 'Do now', s: 'Urgent & important', f: (x) => x.urgent && x.important },
    { k: 'q2', t: 'Schedule', s: 'Important, not urgent — where growth happens', f: (x) => !x.urgent && x.important },
    { k: 'q3', t: 'Delegate or shrink', s: 'Urgent, not important', f: (x) => x.urgent && !x.important },
    { k: 'q4', t: 'Drop', s: 'Neither urgent nor important', f: (x) => !x.urgent && !x.important },
  ];
  function render() {
    el.innerHTML = String(html`<div class="card" style="margin-bottom:16px"><form data-add class="stack" style="--gap:10px"><label class="label" for="mx-text">Add a task</label>
      <div class="cluster"><input id="mx-text" type="text" placeholder="e.g. Book dentist appointment" style="flex:1 1 260px" required>
      <label class="check" style="padding:0"><input type="checkbox" id="mx-u"><span>Urgent</span></label><label class="check" style="padding:0"><input type="checkbox" id="mx-i"><span>Important</span></label>
      <button class="btn primary" type="submit">${icon('plus')} Add</button></div></form></div>
      <div class="quadrants">${Q.map((q) => { const list = tasks.filter(q.f); return html`<section class="quad ${q.k}"><h4>${q.t} <span class="faint small">(${list.filter((x) => !x.done).length})</span></h4><div class="q-sub">${q.s}</div>
        ${list.length ? list.map((x) => html`<div class="task-item ${x.done ? 'done' : ''}"><input type="checkbox" data-done="${x.id}" ${x.done ? raw('checked') : ''} aria-label="Done"><span class="grow">${x.text}</span>
          <button class="btn small ghost" data-u="${x.id}" title="Toggle urgent">${x.urgent ? 'U✓' : 'U'}</button><button class="btn small ghost" data-i="${x.id}" title="Toggle important">${x.important ? 'I✓' : 'I'}</button><button class="btn small ghost" data-del="${x.id}" aria-label="Delete">${icon('trash')}</button></div>`) : html`<p class="small faint">Nothing here.</p>`}</section>`; })}</div>
      <div class="cluster" style="margin-top:12px"><button class="btn small" data-clear>${icon('trash')} Clear completed</button><span class="small faint">Tip: book time in your calendar for everything in "Schedule".</span></div>`);
  }
  const find = (id) => tasks.find((x) => x.id === id);
  const offs = [
    on(el, 'submit', '[data-add]', async (e) => { e.preventDefault(); const t = el.querySelector('#mx-text').value.trim(); if (!t) return; tasks.push({ id: uid(), text: t.slice(0, 200), urgent: el.querySelector('#mx-u').checked, important: el.querySelector('#mx-i').checked, done: false, created: new Date().toISOString() }); await save(); render(); el.querySelector('#mx-text')?.focus(); }),
    on(el, 'change', '[data-done]', async (e, b) => { find(b.dataset.done).done = b.checked; await save(); render(); }),
    on(el, 'click', '[data-u]', async (e, b) => { const x = find(b.dataset.u); x.urgent = !x.urgent; await save(); render(); }),
    on(el, 'click', '[data-i]', async (e, b) => { const x = find(b.dataset.i); x.important = !x.important; await save(); render(); }),
    on(el, 'click', '[data-del]', async (e, b) => { tasks = tasks.filter((x) => x.id !== b.dataset.del); await save(); render(); }),
    on(el, 'click', '[data-clear]', async () => { tasks = tasks.filter((x) => !x.done); await save(); render(); }),
  ];
  store.kvGet('tool:matrix', []).then((v) => { tasks = v || []; render(); });
  return () => offs.forEach((f) => f());
}

/* ---------------- Habit tracker ---------------- */
export function habits(el) {
  let list = [];
  const save = () => store.kvSet('tool:habits', list);
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const streak = (h) => { let s = 0; let d = h.log[dayKey(today)] ? today : addDays(today, -1); while (h.log[dayKey(d)]) { s++; d = addDays(d, -1); } return s; };
  const consistency = (h) => { const span = Math.min(30, Math.max(1, daysBetween(h.created, today) + 1)); let c = 0; for (let i = 0; i < span; i++) if (h.log[dayKey(addDays(today, -i))]) c++; return Math.round((c / span) * 100); };
  const total = (h) => Object.values(h.log).filter(Boolean).length;
  function render() {
    el.innerHTML = String(html`<div class="card" style="margin-bottom:16px"><h3>${icon('plus')} New habit</h3>
      <form data-add class="grid" style="--min:220px;--gap:12px">
        <div><label class="label small" for="hb-name">Tiny habit</label><input id="hb-name" type="text" placeholder="e.g. Read 2 pages" required></div>
        <div><label class="label small" for="hb-anchor">After I… (anchor)</label><input id="hb-anchor" type="text" placeholder="e.g. get into bed"></div>
        <div><label class="label small" for="hb-why">Why it matters</label><input id="hb-why" type="text" placeholder="e.g. I want to be a reader again"></div>
        <div><label class="label small" for="hb-time">Reminder time (optional)</label><input id="hb-time" type="time"></div>
        <div style="align-self:end"><button class="btn primary" type="submit">${icon('plus')} Add habit</button></div></form></div>
      ${list.length ? html`<div class="card"><div class="table-wrap"><div class="habit-grid" style="min-width:560px">
        <div class="habit-row"><span></span>${days.map((d) => html`<span class="habit-head">${fmtDate(d, { weekday: 'narrow' })}<br>${d.getDate()}</span>`)}<span class="habit-head">Streak</span></div>
        ${list.map((h) => html`<div class="habit-row"><span class="small"><strong>${h.name}</strong>${h.anchor ? html`<br><span class="faint">after I ${h.anchor}</span>` : ''}</span>
          ${days.map((d) => { const k = dayKey(d); return html`<button class="habit-cell ${h.log[k] ? 'on' : ''} ${k === dayKey(today) ? 'today' : ''}" data-tog="${h.id}" data-day="${k}" aria-pressed="${!!h.log[k]}" aria-label="${h.name} on ${fmtDate(d)}"></button>`; })}
          <span class="small num" style="text-align:center"><strong>${streak(h)}</strong></span></div>`)}</div></div>
        <div class="stack" style="--gap:14px;margin-top:16px">${list.map((h) => { const t = total(h), miss = !h.log[dayKey(addDays(today, -1))] && !h.log[dayKey(today)] && daysBetween(h.created, today) >= 1; return html`<div>
          <div class="split"><strong>${h.name}</strong><span class="small muted">${t} / 66 days · ${consistency(h)}% consistent (last 30 days)</span></div>
          <div class="progress" style="margin:6px 0" role="progressbar" aria-valuenow="${Math.min(66, t)}" aria-valuemin="0" aria-valuemax="66" aria-label="${h.name} progress to 66 days"><span style="width:${Math.min(100, (t / 66) * 100)}%"></span></div>
          ${miss ? html`<p class="small" style="color:var(--warn);margin:0">${icon('alert', 'icon')} You missed yesterday — that's fine. Just don't miss twice: do a tiny version today.</p>` : ''}
          <div class="cluster" style="margin-top:6px">${h.time ? html`<button class="btn small ghost" data-ics="${h.id}">${icon('calendar')} Daily reminder (.ics)</button>` : ''}<button class="btn small ghost" data-del="${h.id}">${icon('trash')} Remove</button></div></div>`; })}</div></div>`
      : html`<div class="empty"><h3>No habits yet</h3><p>Start with one tiny habit anchored to something you already do every day.</p></div>`}`);
  }
  const offs = [
    on(el, 'submit', '[data-add]', async (e) => {
      e.preventDefault();
      const name = el.querySelector('#hb-name').value.trim(); if (!name) return;
      list.push({ id: uid(), name: name.slice(0, 80), anchor: el.querySelector('#hb-anchor').value.trim().slice(0, 80), why: el.querySelector('#hb-why').value.trim().slice(0, 140), time: el.querySelector('#hb-time').value, created: new Date().toISOString(), log: {} });
      await save(); render(); toast('Habit added. Tick it off each day.');
    }),
    on(el, 'click', '[data-tog]', async (e, b) => {
      const h = list.find((x) => x.id === b.dataset.tog);
      h.log[b.dataset.day] = !h.log[b.dataset.day];
      if (!h.log[b.dataset.day]) delete h.log[b.dataset.day];
      await save(); render();
      if (h.log[b.dataset.day]) { const t = total(h); if ([7, 21, 30, 50, 66].includes(t)) toast(`🎉 ${t} days of "${h.name}"!`); }
    }),
    on(el, 'click', '[data-del]', async (e, b) => { if (!(await confirmDialog({ title: 'Remove this habit?', body: 'Its tick history will be deleted.', confirm: 'Remove', danger: true }))) return; list = list.filter((x) => x.id !== b.dataset.del); await save(); render(); }),
    on(el, 'click', '[data-ics]', (e, b) => { const h = list.find((x) => x.id === b.dataset.ics); const start = `${dayKey(today)}T${h.time}`; download(`habit-${h.name.replace(/\W+/g, '-').toLowerCase()}.ics`, buildICS([{ title: `Habit: ${h.name}${h.anchor ? ` (after I ${h.anchor})` : ''}`, start, minutes: 10, rrule: 'FREQ=DAILY', description: h.why || 'Tiny habit from CBT Toolkit' }]), 'text/calendar'); }),
  ];
  store.kvGet('tool:habits', []).then((v) => { list = v || []; render(); });
  el.innerHTML = '<div class="card"><span class="loader"></span></div>';
  return () => offs.forEach((f) => f());
}
