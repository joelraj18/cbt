// Today: the daily CBT hub — check in, practise, learn one skill, reflect. About 10–15 minutes a day.
import { html, raw, on, toast, pref, download } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { go } from '../core/router.js';
import { fmtDate, fmtTime, dayKey } from '../core/format.js';
import { AREAS, AREA_BY_ID, areaColor } from '../data/areas.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { PROGRAMS } from '../data/programs.js';
import { skillForDate } from '../data/daily.js';
import { SITE } from '../config.js';
import { dailyStats, todaysCheckin, todaysReflection, typesDoneToday, recommend, programProgress, autoCompleteProgram, dayTarget, reminderEvents, DEFAULT_SETTINGS } from '../lib/coach.js';
import { buildICS } from '../lib/ics.js';
import { canInstall, promptInstall, isIOS, isStandalone, onInstallChange } from '../lib/install.js';
import { pageHead, cite, levelBadge, areaChip, crisisCallout } from '../ui/components.js';

// Where to land after the page re-renders (e.g. straight to today's practice after checking in).
let landOn = null;

export const siteURL = () => (SITE.url ? SITE.url.replace(/\/$/, '') + '/' : `${location.origin}${location.pathname}`);

function greeting(now) {
  const h = now.getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export async function todayView() {
  const t0 = perf.now();
  const now = new Date();
  const settings = { ...DEFAULT_SETTINGS, ...((await store.kvGet('daily-settings', null)) || {}) };
  let programState = await store.kvGet('program', null);
  let justFinishedDay = null;
  const upd = autoCompleteProgram(programState, store.all(), now);
  if (upd) {
    const before = programProgress(programState, store.all(), now);
    await store.kvSet('program', upd);
    justFinishedDay = before ? { program: before.program, index: before.index } : null;
    programState = upd;
  }
  const plan = await store.kvGet('plan', null);
  const records = store.all();
  const stats = dailyStats(records, now, settings.weeklyGoal);
  const checkin = todaysCheckin(records, now);
  const reflection = todaysReflection(records, now);
  const doneTypes = typesDoneToday(records, now);
  const practisedToday = records.some((r) => r.kind === 'exercise' && dayKey(r.createdAt) === dayKey(now));
  const prog = programProgress(programState, records, now);
  const recs = recommend({ records, now, plan, programState, limit: 4 });
  const skill = skillForDate(now);
  const skillSeen = pref.get('skill-seen') === dayKey(now);
  const evening = now.getHours() >= 17;
  const steps = [['Check in', !!checkin, '#today-checkin'], ['Practise', practisedToday, '#today-practice'], ['Learn a skill', skillSeen, '#today-skill'], ['Reflect', !!reflection, '#today-reflect']];
  const stepsDone = steps.filter((s) => s[1]).length;
  const flagged = recs.some((r) => r.kind === 'help');
  perf.event('Planned your day', perf.now() - t0, `${recs.length} suggestions · streak ${stats.streak}`);

  const body = html`<div class="container">
    ${pageHead({ title: `${greeting(now)}${stepsDone === 4 ? ' — all done today' : ''}`, lede: html`${fmtDate(now, { weekday: 'long', day: 'numeric', month: 'long' })}. Your daily CBT takes about 10–15 minutes: check in, practise one skill, learn one idea, reflect.` })}
    ${flagged ? crisisCallout() : ''}
    ${stats.returningAfterGap ? html`<div class="callout good" style="margin-bottom:16px"><div class="callout-title">${icon('sparkle')} Welcome back</div><p style="margin:0">Missing a few days doesn’t undo your progress — in habit research, a missed day made no lasting difference ${cite('lally2010')}. The trick is not to miss twice: even a 2-minute check-in today keeps the habit alive.</p></div>` : ''}
    ${stats.milestone ? html`<div class="callout good" style="margin-bottom:16px"><div class="callout-title">${icon('sparkle')} ${stats.milestone}-day streak!</div><p style="margin:0">You have shown up ${stats.milestone} days in a row. Regular practice is what makes CBT work ${cite('mausbach2010')}.</p></div>` : ''}
    ${justFinishedDay ? html`<div class="callout good" style="margin-bottom:16px"><div class="callout-title">${icon('check')} ${justFinishedDay.program.name}: day ${justFinishedDay.index + 1} complete</div><p style="margin:0">${justFinishedDay.index + 1 >= justFinishedDay.program.days ? 'You finished the whole programme — brilliant. Compare your check-ins in your progress report.' : 'Nice work. The next day unlocks tomorrow — spacing practice out helps it stick.'}</p></div>` : ''}

    <section class="today-top">
      <div class="stat"><div class="label">Streak</div><div class="value">${icon('bolt', 'icon')} ${stats.streak} day${stats.streak === 1 ? '' : 's'}</div><div class="delta faint">Best ${stats.best}</div></div>
      <div class="stat"><div class="label">This week</div><div class="value">${stats.weekPractice} / ${stats.weeklyGoal} <span class="small faint">days</span></div>
        <div class="week-dots" aria-label="Practice days this week">${stats.week.map((w) => html`<span class="wd ${w.practice ? 'on' : w.any ? 'some' : ''} ${w.isToday ? 'today' : ''}" title="${fmtDate(w.date, { weekday: 'long' })}: ${w.practice ? 'practised' : w.any ? 'checked in' : w.future ? 'to come' : 'no practice'}">${fmtDate(w.date, { weekday: 'narrow' })}</span>`)}</div></div>
      <div class="stat today-steps"><div class="label">Today</div><div class="value">${stepsDone} / 4 <span class="small faint">steps</span></div>
        <ol class="mini-steps">${steps.map(([l, ok, href], i) => html`<li class="${ok ? 'ok' : ''}"><a href="${href}" data-jump="${href}">${ok ? '✓' : i + 1} ${l}</a></li>`)}</ol></div>
    </section>

    <div class="grid-2 wide-left section" style="margin-top:20px">
      <div class="stack" style="--gap:20px">
        <section class="card" id="today-checkin" aria-labelledby="h-checkin">
          <h2 class="h3" id="h-checkin">${icon('smile')} 1 · Check in ${checkin ? html`<span class="badge ev-A">Done ${fmtTime(checkin.createdAt)}</span>` : ''}</h2>
          ${checkin ? html`<p style="margin:0">Mood <strong>${checkin.data.mood ?? '–'}</strong>/10 · anxiety <strong>${checkin.data.anxiety ?? '–'}</strong>/10 · energy <strong>${checkin.data.energy ?? '–'}</strong>/10${checkin.data.sleep != null ? html` · slept ${checkin.data.sleep} h` : ''}${checkin.data.focus && AREA_BY_ID[checkin.data.focus] ? html` · focus: ${AREA_BY_ID[checkin.data.focus].name.toLowerCase()}` : ''}</p>
            ${checkin.data.intention ? html`<p class="small muted" style="margin:6px 0 0">Today’s intention: ${checkin.data.intention}</p>` : ''}
            <details class="more" style="margin-top:12px"><summary>Check in again</summary>${checkinForm()}</details>`
          : html`<p class="muted small">30 seconds. Your answers shape today’s suggestions below.</p>${checkinForm()}`}
        </section>

        <section class="card" id="today-practice" aria-labelledby="h-practice">
          <h2 class="h3" id="h-practice" tabindex="-1">${icon('play')} 2 · Today’s practice</h2>
          <p class="muted small">Picked for you from your check-in, your plan, your programme and the time of day. Each one says why.</p>
          <div class="stack" style="--gap:10px">${recs.map((r) => recCard(r))}</div>
          ${doneTypes.size ? html`<p class="small" style="margin:14px 0 0"><strong>Done today:</strong> ${[...doneTypes].map((t, i) => html`${i ? ', ' : ''}<a href="#/exercise/${t}?tab=history">${EXERCISE_BY_ID[t]?.title || t}</a>`)}</p>` : ''}
          <p class="small" style="margin:10px 0 0"><a href="#/toolbox">Toolbox</a> · <a href="#/areas">All exercises</a> · <a href="#/plan">My weekly plan</a></p>
        </section>

        <section class="card" id="today-skill" aria-labelledby="h-skill">
          <h2 class="h3" id="h-skill">${icon('book')} 3 · Skill of the day ${skillSeen ? html`<span class="badge ev-A">Done</span>` : ''}</h2>
          <div class="eyebrow" style="margin-bottom:2px">${skill.kind}</div>
          <h3 class="h4" style="margin:0 0 6px">${skill.title}</h3>
          <p class="small">${skill.text}${skill.ref ? html` ${cite(skill.ref)}` : ''}</p>
          ${skill.tip ? html`<p class="small"><strong>${skill.tip}</strong></p>` : ''}
          <div class="cluster"><button class="btn small ${skillSeen ? '' : 'primary'}" data-skill ${skillSeen ? raw('disabled') : ''}>${icon('check')} ${skillSeen ? 'Learned today' : 'Got it'}</button><a class="btn small ghost" href="${skill.href}">Learn more</a></div>
        </section>

        <section class="card" id="today-reflect" aria-labelledby="h-reflect" ${evening && !reflection ? raw('style="border-color:var(--primary)"') : ''}>
          <h2 class="h3" id="h-reflect">${icon('moon')} 4 · Evening reflection ${reflection ? html`<span class="badge ev-A">Done</span>` : ''}</h2>
          ${reflection ? html`<p style="margin:0">Day rated <strong>${reflection.data.rating ?? '–'}</strong>/10.${reflection.data.win ? html` Win: ${reflection.data.win}` : ''}</p>${reflection.data.tomorrow ? html`<p class="small muted" style="margin:6px 0 0">Tomorrow: ${reflection.data.tomorrow}</p>` : ''}`
          : html`<p class="muted small">${evening ? 'It’s evening — three quick questions to close the day.' : 'Come back this evening, or do it now.'} Noticing wins and planning one step for tomorrow builds momentum.</p>${reflectForm()}`}
        </section>
      </div>

      <aside class="stack" style="--gap:20px">
        ${programCard(prog)}
        <section class="card flat" aria-labelledby="h-stay">
          <h2 class="h3" id="h-stay">${icon('calendar')} Stay on track</h2>
          <form data-settings class="stack" style="--gap:10px">
            <div class="cluster"><label class="small" for="ds-m" style="min-width:120px">Morning check-in</label><input type="time" id="ds-m" value="${settings.morning}" style="width:auto"></div>
            <div class="cluster"><label class="small" for="ds-e" style="min-width:120px">Evening reflection</label><input type="time" id="ds-e" value="${settings.evening}" style="width:auto"></div>
            <div class="cluster"><label class="small" for="ds-g" style="min-width:120px">Weekly goal</label><select id="ds-g" style="width:auto">${[3, 4, 5, 6, 7].map((n) => html`<option value="${n}" ${n === Number(settings.weeklyGoal) ? raw('selected') : ''}>${n} days a week</option>`)}</select></div>
            <div class="cluster"><button class="btn small" type="submit">Save</button><button class="btn small soft" type="button" data-ics>${icon('calendar')} Add daily reminders to my calendar</button></div>
          </form>
          <p class="small faint" style="margin:10px 0 0">Calendar reminders work on any phone or computer, with no account and no tracking. Tying practice to a set time makes it far more likely to happen ${cite('gollwitzer2006')}.</p>
          <div data-install style="margin-top:12px"></div>
        </section>
        <section class="card flat" aria-labelledby="h-why">
          <h2 class="h3" id="h-why">${icon('flask')} Why a daily routine works</h2>
          <ul class="small" style="margin:0">
            <li>People who practise more between sessions improve more ${cite('mausbach2010')}.</li>
            <li>Tracking your progress raises the odds of reaching goals ${cite('harkin2016')}.</li>
            <li>A new routine takes about 66 days to feel automatic — and one missed day doesn’t matter ${cite('lally2010')}.</li>
            <li>Regular check-ins help you notice what is working ${cite('lambert2018')}.</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>`;

  const mount = (root) => {
    if (landOn) {
      const target = root.querySelector(landOn);
      landOn = null;
      if (target) { target.scrollIntoView({ block: 'start' }); target.querySelector('h2[tabindex]')?.focus({ preventScroll: true }); }
    }
    root.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { const o = root.querySelector(`[data-o="${r.id}"]`); if (o) o.textContent = r.value; }));
    const renderInstall = () => {
      const box = root.querySelector('[data-install]');
      if (!box) return;
      box.innerHTML = String(isStandalone() ? html`<p class="small" style="margin:0">${icon('check', 'icon')} Installed as an app on this device.</p>`
        : canInstall() ? html`<button class="btn small" data-install-btn>${icon('download')} Install the app</button><p class="small faint" style="margin:6px 0 0">Opens from your home screen and works offline.</p>`
        : isIOS() ? html`<p class="small" style="margin:0">${icon('info', 'icon')} On iPhone or iPad: tap Share, then <strong>Add to Home Screen</strong> to open CBT Toolkit like an app.</p>` : '');
    };
    renderInstall();
    const offInstall = onInstallChange(renderInstall);
    const focus = { value: null };
    const offs = [
      on(root, 'click', '[data-focus]', (e, b) => { focus.value = focus.value === b.dataset.focus ? null : b.dataset.focus; root.querySelectorAll('[data-focus]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.focus === focus.value))); }),
      on(root, 'submit', '[data-checkin]', async (e, form) => {
        e.preventDefault();
        const v = (id) => form.querySelector(id).value;
        const data = { mood: Number(v('#ci-mood')), anxiety: Number(v('#ci-anx')), energy: Number(v('#ci-energy')), sleep: v('#ci-sleep') === '' ? null : Number(v('#ci-sleep')), focus: focus.value, intention: v('#ci-int').trim(), source: 'today' };
        await store.add({ kind: 'mood', type: 'mood', data, metrics: { mood: data.mood, anxiety: data.anxiety, energy: data.energy, sleep: data.sleep } });
        toast('Checked in. Today’s suggestions are updated.');
        landOn = '#today-practice';
        go('/today', {}, { replace: true, keepScroll: true });
      }),
      on(root, 'submit', '[data-reflect]', async (e, form) => {
        e.preventDefault();
        const v = (id) => form.querySelector(id).value.trim();
        const data = { rating: Number(form.querySelector('#rf-rate').value), win: v('#rf-win'), helped: v('#rf-help'), tomorrow: v('#rf-tom'), note: v('#rf-note') };
        await store.add({ kind: 'daily', type: 'reflection', data, metrics: { rating: data.rating } });
        toast('Reflection saved. See you tomorrow!');
        go('/today', {}, { replace: true });
      }),
      on(root, 'click', '[data-skill]', (e, b) => { pref.set('skill-seen', dayKey(new Date())); b.disabled = true; b.classList.remove('primary'); b.innerHTML = String(html`${icon('check')} Learned today`); perf.event('Skill of the day learned'); go('/today', {}, { replace: true, keepScroll: true }); }),
      on(root, 'click', '[data-jump]', (e, a) => { e.preventDefault(); root.querySelector(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }),
      on(root, 'submit', '[data-settings]', async (e) => {
        e.preventDefault();
        const s = { morning: root.querySelector('#ds-m').value || DEFAULT_SETTINGS.morning, evening: root.querySelector('#ds-e').value || DEFAULT_SETTINGS.evening, weeklyGoal: Number(root.querySelector('#ds-g').value) || 5 };
        await store.kvSet('daily-settings', s);
        toast('Saved.');
        go('/today', {}, { replace: true, keepScroll: true });
      }),
      on(root, 'click', '[data-ics]', () => {
        const ev = reminderEvents({ morning: root.querySelector('#ds-m').value, evening: root.querySelector('#ds-e').value }, `${siteURL()}#/today`);
        download('cbt-daily-reminders.ics', buildICS(ev, { calName: 'Daily CBT' }), 'text/calendar');
        toast('Calendar file downloaded — open it to add your daily reminders.');
      }),
      on(root, 'click', '[data-install-btn]', async () => { const ok = await promptInstall(); toast(ok ? 'Installed! Find CBT Toolkit on your home screen.' : 'Maybe later — you can install any time from Today.'); }),
      on(root, 'click', '[data-start-program]', async (e, b) => { await startProgram(b.dataset.startProgram); go('/today', {}, { replace: true }); }),
      on(root, 'click', '[data-early]', async () => { const st = await store.kvGet('program', null); if (st) { await store.kvSet('program', { ...st, early: true }); go('/today', {}, { replace: true, keepScroll: true }); } }),
      on(root, 'click', '[data-mark-day]', async () => {
        const st = await store.kvGet('program', null);
        const pr = programProgress(st, store.all(), new Date());
        if (!pr || pr.finished) return;
        await store.kvSet('program', { ...st, early: false, done: { ...(st.done || {}), [pr.index]: new Date().toISOString() } });
        toast(`Day ${pr.index + 1} done.`);
        go('/today', {}, { replace: true });
      }),
    ];
    return () => { offs.forEach((f) => f()); offInstall(); };
  };
  return { title: 'Today', body, mount };
}

function slider(id, label, lo, hi, v = 5) {
  return html`<div class="field"><label class="label" for="${id}">${label}${/[?!]$/.test(label) ? '' : ':'} <output data-o="${id}">${v}</output>/10</label><input type="range" id="${id}" min="0" max="10" value="${v}"><div class="slider-labels"><span>0 · ${lo}</span><span>10 · ${hi}</span></div></div>`;
}

function checkinForm() {
  return html`<form data-checkin style="margin-top:12px">
    ${slider('ci-mood', 'Mood', 'very low', 'great')}
    ${slider('ci-anx', 'Anxiety or stress', 'calm', 'extreme')}
    ${slider('ci-energy', 'Energy', 'exhausted', 'full of energy')}
    <div class="field"><label class="label" for="ci-sleep">Hours slept last night <span class="faint small">(optional)</span></label><input type="number" id="ci-sleep" min="0" max="16" step="0.5" inputmode="decimal" style="max-width:140px"></div>
    <div class="field"><span class="label" id="ci-focus-l">What would you most like to work on today? <span class="faint small">(optional)</span></span>
      <div class="options" role="group" aria-labelledby="ci-focus-l">${AREAS.map((a) => html`<button type="button" class="chip" data-focus="${a.id}" aria-pressed="false" style="--area:${areaColor(a.id)}"><span class="area-dot"></span>${a.short}</button>`)}</div></div>
    <div class="field"><label class="label" for="ci-int">One small intention for today <span class="faint small">(optional)</span></label><input type="text" id="ci-int" placeholder="e.g. Go for a 10-minute walk at lunch" maxlength="200"></div>
    <button class="btn primary" type="submit">${icon('check')} Check in</button></form>`;
}

function reflectForm() {
  return html`<form data-reflect style="margin-top:12px">
    ${slider('rf-rate', 'How was today overall?', 'very hard', 'great')}
    <div class="field"><label class="label" for="rf-win">One win today, however small</label><input type="text" id="rf-win" placeholder="e.g. I answered the email I was dreading" maxlength="300"></div>
    <div class="field"><label class="label" for="rf-help">What helped? <span class="faint small">(a skill, a person, a choice)</span></label><input type="text" id="rf-help" maxlength="300"></div>
    <div class="field"><label class="label" for="rf-tom">One small step for tomorrow</label><input type="text" id="rf-tom" placeholder="If it’s 9am, then I will…" maxlength="300"></div>
    <div class="field"><label class="label" for="rf-note">Anything else on your mind? <span class="faint small">(optional)</span></label><textarea id="rf-note" rows="2" maxlength="2000"></textarea></div>
    <button class="btn primary" type="submit">${icon('check')} Save reflection</button></form>`;
}

function recCard(r) {
  return html`<article class="rec-card" style="--area:${r.area && AREA_BY_ID[r.area] ? areaColor(r.area) : 'var(--primary)'}">
    <div class="rec-main"><div class="cluster" style="--gap:6px;margin-bottom:4px">${r.kind === 'program' ? html`<span class="badge ev-B">Programme</span>` : r.kind === 'checkin' ? html`<span class="badge">Check-in</span>` : r.kind === 'help' ? html`<span class="badge ev-D">Support</span>` : ''}${r.level ? levelBadge(r.level, false) : ''}<span class="badge">${r.minutes} min</span>${r.area && AREA_BY_ID[r.area] ? areaChip(r.area) : ''}</div>
      <h3 class="h4" style="margin:2px 0 4px">${r.title}</h3>
      <p class="small muted" style="margin:0"><strong>Why today:</strong> ${r.reason} ${(r.refs || []).map((id) => cite(id))}</p></div>
    <a class="btn ${r.kind === 'help' ? 'danger' : 'primary'} small" href="${r.href}">${r.kind === 'help' ? 'Get support' : 'Start'} ${icon('arrow')}</a></article>`;
}

function programCard(pr) {
  if (!pr) {
    return html`<section class="card" aria-labelledby="h-prog"><h2 class="h3" id="h-prog">${icon('map')} Follow a guided programme</h2>
      <p class="small muted">Not sure what to do each day? A programme gives you one short lesson and one exercise a day.</p>
      <div class="stack" style="--gap:8px">${PROGRAMS.slice(0, 4).map((p) => html`<div class="split"><span class="small"><strong>${p.name}</strong> · ${p.days} days${p.area ? html` · ${AREA_BY_ID[p.area].name.toLowerCase()}` : ''}</span><button class="btn small soft" data-start-program="${p.id}">Start</button></div>`)}</div>
      <p class="small" style="margin:12px 0 0"><a href="#/programs">See all ${PROGRAMS.length} programmes →</a></p></section>`;
  }
  const p = pr.program;
  if (pr.finished) {
    return html`<section class="card" aria-labelledby="h-prog"><h2 class="h3" id="h-prog">${icon('sparkle')} ${p.name} complete</h2><p class="small">You finished all ${p.days} days. Keep the skills that helped most in your weekly plan, or start another programme.</p>
      <div class="cluster"><a class="btn small primary" href="#/reports">See your progress</a><a class="btn small" href="#/programs">Choose another</a></div></section>`;
  }
  const t = dayTarget(pr.day);
  return html`<section class="card" aria-labelledby="h-prog" ${p.area ? raw(`style="--area:${areaColor(p.area)}"`) : ''}>
    <div class="split"><h2 class="h3" id="h-prog" style="margin:0">${icon('map')} ${p.name}</h2><a class="small" href="#/programs/${p.id}">All days</a></div>
    <div class="progress" style="margin:10px 0 6px" role="progressbar" aria-valuenow="${pr.completed}" aria-valuemin="0" aria-valuemax="${p.days}" aria-label="Programme progress"><span style="width:${pr.percent}%"></span></div>
    <p class="small faint" style="margin:0 0 12px">${pr.completed} of ${p.days} days done</p>
    ${pr.availableToday ? html`<div class="eyebrow">Day ${pr.index + 1}</div><h3 class="h4" style="margin:0 0 6px">${pr.day.title}</h3><p class="small">${pr.day.lesson}</p><p class="small"><strong>Today:</strong> ${pr.day.task}</p>
      <div class="cluster"><a class="btn small primary" href="${t.href}">${icon('play')} Start · ${t.minutes} min</a>${pr.day.learn ? html`<button class="btn small" data-mark-day>${icon('check')} Mark as done</button>` : ''}</div>`
    : html`<p class="small"><strong>Done for today.</strong> Day ${pr.index + 1}, “${pr.day.title}”, unlocks tomorrow — spacing practice out helps it stick.</p><button class="btn small ghost" data-early>Start it now anyway</button>`}
  </section>`;
}

export async function startProgram(id) {
  const prev = await store.kvGet('program', null);
  if (prev) {
    const hist = (await store.kvGet('program-history', [])) || [];
    hist.push({ id: prev.id, start: prev.start, done: Object.keys(prev.done || {}).length, ended: new Date().toISOString() });
    await store.kvSet('program-history', hist.slice(-20));
  }
  await store.kvSet('program', { id, start: new Date().toISOString(), done: {} });
  perf.event(`Started programme: ${id}`);
  toast('Programme started — Day 1 is ready.');
}
