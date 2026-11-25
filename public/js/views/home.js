import { html, raw, on, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { fmtNum, relTime, startOfWeek } from '../core/format.js';
import { streaks } from '../lib/stats.js';
import { AREAS, LEVELS } from '../data/areas.js';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises/index.js';
import { research } from '../data/research.js';
import { MISTAKE_CYCLE } from '../data/learn.js';
import { ASSESSMENT_BY_ID, scoreAssessment } from '../data/assessments.js';
import { areaStyle, adSlot, levelBadge, statTile } from '../ui/components.js';
import { cycleBlock, mountCycles } from '../ui/cycle.js';
import { describeRecord } from '../ui/records.js';

export async function homeView() {
  const all = store.all();
  const has = all.length > 0;
  const st = streaks(all.map((r) => r.createdAt));
  const weekStart = startOfWeek(new Date()).toISOString();
  const thisWeek = all.filter((r) => r.createdAt >= weekStart && r.kind !== 'mood').length;
  const lastCheck = store.query({ kind: 'assessment' })[0];
  const lastScore = lastCheck ? (() => { const a = ASSESSMENT_BY_ID[lastCheck.type]; const s = scoreAssessment(a, lastCheck.data.answers); return `${a.name}: ${s.score}${a.percent ? '%' : ''} (${s.band.label})`; })() : null;
  const recent = store.all().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4);
  const cycles = [{ ...MISTAKE_CYCLE }, ...AREAS.map((a) => ({ id: a.id, name: a.short, ...a.cycle }))];

  const body = html`<div class="container">
    <section class="hero"><div class="hero-card">
      <p class="eyebrow">Cognitive Behavioural Therapy, made simple</p>
      <h1>Small, proven steps to feel better and get more out of life.</h1>
      <p class="lead">Practical CBT exercises for low mood, anxiety, procrastination, habits, time, intimacy and impulses — explained in plain words with everyday examples, and backed by ${research.length} research papers you can check yourself.</p>
      <div class="cluster" style="margin-top:18px">
        <a class="btn primary" href="#/check-in">${icon('clipboard')} Take a 2-minute check-in</a>
        <a class="btn" href="#/learn">${icon('book')} What is CBT? (3-minute read)</a>
      </div>
      <div class="meta" style="margin-top:16px"><span>${icon('lock')} Private — saved only on this device</span><span>${icon('check')} ${EXERCISES.length} interactive exercises</span><span>${icon('flask')} ${research.length} verified studies</span><span>${icon('sparkle')} Free · no account</span></div>
    </div></section>

    <section class="section grid-2 wide-left">
      <div class="card">
        <h2 style="font-size:1.25rem">How are you feeling right now?</h2>
        <p class="muted small">A 5-second mood check. Over time it becomes your mood chart.</p>
        <div class="slider-wrap"><input type="range" min="0" max="10" value="5" id="quick-mood" aria-label="Mood from 0 (very low) to 10 (great)"><output id="quick-mood-out" style="font-size:1.6rem">5</output></div>
        <div class="slider-labels"><span>0 · very low</span><span>10 · great</span></div>
        <div class="cluster" style="margin-top:12px"><button class="btn primary" data-quick-save>${icon('check')} Save mood</button><a class="btn ghost" href="#/mood">Detailed log →</a></div>
      </div>
      <div class="card tint">
        <h2 style="font-size:1.25rem">${has ? 'Your progress' : 'How it works'}</h2>
        ${has ? html`<div class="stats" style="grid-template-columns:repeat(2,1fr)">
            ${statTile('Entries this week', fmtNum(thisWeek))}
            ${statTile('Day streak', fmtNum(st.current), `Longest ${st.longest}`)}
          </div>
          ${lastScore ? html`<p class="small" style="margin:12px 0 0">Last check-in — ${lastScore} · ${relTime(lastCheck.createdAt)}</p>` : html`<p class="small" style="margin:12px 0 0"><a href="#/check-in">Take a check-in</a> to measure your progress over time.</p>`}
          <div class="cluster" style="margin-top:12px"><a class="btn small" href="#/reports">${icon('chart')} See report</a><a class="btn small ghost" href="#/plan">My plan</a></div>`
        : html`<ol class="steps-list" style="margin:0"><li><strong>Check in</strong> — a quick questionnaire gives you a baseline.</li><li><strong>Pick an area</strong> and start with the two "Start here" exercises.</li><li><strong>Practise little and often</strong> — 10–15 minutes most days.</li><li><strong>Watch your progress</strong> in charts and reports.</li></ol>`}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Choose an area to work on</h2><a href="#/areas">All areas →</a></div>
      <div class="grid" style="--min:300px">${AREAS.map((a) => html`<article class="card area-card" ${areaStyle(a.id)}>
        <div class="card-head"><span class="area-icon">${icon(a.icon)}</span><div><h3 style="margin:0"><a href="#/area/${a.id}" style="color:inherit;text-decoration:none">${a.name}</a></h3><p class="small muted" style="margin:2px 0 0">${a.tagline}</p></div></div>
        <div class="small" style="margin-top:12px"><span class="faint">Start here:</span> ${a.startHere.map((id, i) => html`${i ? ' · ' : ''}<a href="#/exercise/${id}">${EXERCISE_BY_ID[id].title}</a>`)}</div>
        <div class="card-foot"><a class="btn small soft" href="#/area/${a.id}">Explore ${icon('arrow')}</a><span class="small faint">${EXERCISES.filter((e) => e.area === a.id || (e.also || []).includes(a.id)).length} exercises</span></div>
      </article>`)}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>The CBT idea in one picture</h2><a href="#/learn">Read the plain-language guide →</a></div>
      ${cycleBlock(cycles, { id: 'home', intro: 'What we <strong>think</strong> affects how we <strong>feel</strong> and what we <strong>do</strong> — and what we do feeds back into how we think. Pick an everyday example and switch between the stuck cycle and how CBT breaks it.' })}
    </section>

    ${adSlot('banner')}

    ${recent.length ? html`<section class="section"><div class="section-head"><h2>Recent activity</h2><a href="#/journal">Open journal →</a></div>
      <div class="card flat">${recent.map((r) => { const d = describeRecord(r); return html`<div class="entry"><div class="entry-head"><a class="entry-title" href="${d.url}">${d.title}</a><span class="small faint">${relTime(r.createdAt)}</span></div><div class="entry-body">${d.summary}</div></div>`; })}</div></section>` : ''}

    <section class="section">
      <div class="section-head"><h2>Quick tools for hard moments</h2><a href="#/toolbox">Toolbox →</a></div>
      <div class="grid" style="--min:220px">${['paced-breathing', 'urge-surfing', 'focus-sprints', 'thought-record'].map((id) => { const ex = EXERCISE_BY_ID[id]; return html`<a class="card card-link" href="#/exercise/${id}?tab=do" ${areaStyle(ex.area)}><span class="area-icon">${icon({ 'paced-breathing': 'leaf', 'urge-surfing': 'wave', 'focus-sprints': 'timer', 'thought-record': 'edit' }[id])}</span><h3 style="margin-top:10px">${ex.title}</h3><p class="small muted" style="margin:0">${ex.tagline}</p></a>`; })}</div>
    </section>

    <section class="section grid-2">
      <div class="card"><h2 style="font-size:1.25rem">${icon('flask')} Built on evidence — and honest about it</h2>
        <p class="muted">Every exercise shows how strong its evidence is and links to the studies behind it. Each of the ${research.length} references was matched against Crossref (the official DOI registry), and most were checked against their PubMed abstracts.</p>
        <div class="stack" style="--gap:8px">${Object.entries(LEVELS).map(([k, v]) => html`<div class="cluster" style="--gap:10px">${levelBadge(k)}<span class="small muted">${v.desc}</span></div>`)}</div>
        <p style="margin:14px 0 0"><a href="#/research">Browse the research library →</a></p></div>
      <div class="card"><h2 style="font-size:1.25rem">${icon('lock')} Private by design</h2>
        <ul class="ticks"><li>No accounts, no sign-up, no tracking of your entries.</li><li>Your exercises, check-ins and notes are stored only in this browser (IndexedDB).</li><li>Export an encrypted backup whenever you like; delete everything in one click.</li><li>Works offline once loaded.</li></ul>
        <p style="margin:0"><a href="#/privacy">Read the privacy policy →</a></p></div>
    </section>
  </div>`;

  return {
    title: '', body,
    mount(root) {
      const offs = [mountCycles(root, { home: cycles })];
      const r = root.querySelector('#quick-mood'), o = root.querySelector('#quick-mood-out');
      r.addEventListener('input', () => { o.textContent = r.value; });
      offs.push(on(root, 'click', '[data-quick-save]', async (e, b) => {
        b.disabled = true;
        await store.add({ kind: 'mood', type: 'mood', data: { mood: Number(r.value) }, metrics: { mood: Number(r.value) } });
        toast(`Mood ${r.value}/10 saved on this device.`, { action: 'Add details', onAction: () => { location.hash = '#/mood'; } });
        b.disabled = false; b.innerHTML = String(html`${icon('check')} Saved`);
      }));
      return () => offs.forEach((f) => f());
    },
  };
}
