// Interactive calculators: procrastination equation (Temporal Motivation Theory) and values compass.
import { html, raw, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { saveExercise } from '../save.js';
import { barChart } from '../../lib/charts.js';

/* ---------------- Procrastination equation ---------------- */
const LEVERS = {
  expectancy: { label: 'Expectancy — how confident am I that I can do this well?', low: true, fixes: ['Break it into small, doable steps (Break it down exercise).', 'Recall a similar task you managed before.', 'Ask for help or an example to follow.', 'Aim for a rough first draft, not perfection.'], ex: 'task-breakdown' },
  value: { label: 'Value — how rewarding or meaningful does it feel?', low: true, fixes: ['Link it to something you care about (Values compass).', 'Pair it with something enjoyable (temptation bundling).', 'Plan a small reward for finishing a step.', 'Work alongside a friend or tell someone your plan.'], ex: 'temptation-bundling' },
  impulsiveness: { label: 'Distractibility — how easily am I pulled away right now?', low: false, fixes: ['Remove the main distraction (Design out distractions).', 'Use a 25-minute focus sprint.', 'Make an if–then plan for the urge to switch tasks.', 'Use a commitment device or a website blocker.'], ex: 'distraction-design' },
  delay: { label: 'Delay — how far away is the deadline or reward?', low: false, fixes: ['Set mini-deadlines this week.', 'Track daily progress (Done list).', 'Tell someone your deadline for each step.', 'Start a tiny step today, not "when it’s closer".'], ex: 'progress-log' },
};
const tmtScore = ({ expectancy, value, impulsiveness, delay }) => Math.round(((Math.max(1, expectancy) * Math.max(1, value)) / (1 + (impulsiveness / 10) * delay)) * 10) / 10;

export function tmt(el, { ex, onSaved }) {
  const v = { expectancy: 5, value: 5, impulsiveness: 5, delay: 5 };
  el.innerHTML = String(html`<div class="card">
    <div class="field"><label class="label" for="tm-task">Which task are you putting off?</label><input id="tm-task" type="text" placeholder="e.g. My tax return"></div>
    ${Object.entries(LEVERS).map(([k, L]) => html`<div class="field"><label class="label" for="tm-${k}">${L.label}: <output data-o="${k}">5</output>/10</label><input type="range" id="tm-${k}" data-k="${k}" min="0" max="10" value="5"><div class="slider-labels"><span>0 · ${L.low ? 'very low' : 'not at all / very soon'}</span><span>10 · ${L.low ? 'very high' : 'extremely / far away'}</span></div></div>`)}
    <div class="callout info" data-out aria-live="polite"></div>
    <button class="btn primary" style="margin-top:12px" data-save>${icon('check')} Save diagnosis</button></div>`);
  const out = el.querySelector('[data-out]');
  function render() {
    const score = tmtScore(v);
    // which lever improves the score most if moved 3 points in the helpful direction?
    const gains = Object.keys(LEVERS).map((k) => { const t = { ...v }; t[k] = LEVERS[k].low ? Math.min(10, t[k] + 3) : Math.max(0, t[k] - 3); return [k, tmtScore(t) - score]; }).sort((a, b) => b[1] - a[1]);
    const [top, second] = gains;
    out.innerHTML = String(html`<div class="split"><div><div class="small muted">Motivation score</div><div style="font-size:2rem;font-weight:700">${score}<span class="small muted"> / 100</span></div></div>
      <div class="small" style="max-width:420px">Motivation = (Expectancy × Value) ÷ (1 + Distractibility × Delay). ${score < 15 ? 'Very low — no wonder this task keeps slipping.' : score < 35 ? 'Low — expect to keep delaying unless something changes.' : score < 60 ? 'Moderate — a nudge on one lever should get you started.' : 'Good — start now while motivation is high.'}</div></div>
      <h3 class="h4" style="margin:12px 0 4px">Pull this lever first: ${LEVERS[top[0]].label.split(' — ')[0]} (+${top[1].toFixed(1)})</h3>
      <ul class="small" style="margin-bottom:6px">${LEVERS[top[0]].fixes.map((f) => html`<li>${f}</li>`)}</ul>
      <p class="small" style="margin:0">Then: <strong>${LEVERS[second[0]].label.split(' — ')[0]}</strong> — try <a href="#/exercise/${LEVERS[second[0]].ex}">this exercise</a>. Open <a href="#/exercise/${LEVERS[top[0]].ex}">the matching exercise →</a></p>`);
    return { score, top: top[0] };
  }
  const offs = [
    on(el, 'input', 'input[type=range]', (e, r) => { v[r.dataset.k] = Number(r.value); el.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value; render(); }),
    on(el, 'click', '[data-save]', async (e, b) => { b.disabled = true; const { score, top } = render(); onSaved?.(await saveExercise(ex, { task: el.querySelector('#tm-task').value, ...v, score, weakest: top })); }),
  ];
  render();
  return () => offs.forEach((f) => f());
}

/* ---------------- Values compass ---------------- */
const DOMAINS = ['Family', 'Partner / intimate relationship', 'Friendships', 'Work / career', 'Learning & growth', 'Fun & recreation', 'Meaning & spirituality', 'Community & helping others', 'Physical health', 'Mental wellbeing & self-care'];

export function values(el, { ex, onSaved }) {
  const r = Object.fromEntries(DOMAINS.map((d) => [d, { imp: 5, con: 5 }]));
  let stopChart = () => {};
  el.innerHTML = String(html`<div class="card"><p class="small muted">For each area: how <strong>important</strong> is it to you, and how much have your <strong>actions</strong> in the last two weeks matched it?</p>
    <div class="table-wrap"><table class="data"><thead><tr><th>Life area</th><th>Importance</th><th>Actions matched</th></tr></thead><tbody>
    ${DOMAINS.map((d, i) => html`<tr><td><strong>${d}</strong></td><td><input type="range" min="0" max="10" value="5" data-d="${i}" data-f="imp" aria-label="${d} importance"><output data-o="imp${i}">5</output></td><td><input type="range" min="0" max="10" value="5" data-d="${i}" data-f="con" aria-label="${d} consistency"><output data-o="con${i}">5</output></td></tr>`)}
    </tbody></table></div>
    <h3 style="margin-top:18px">Biggest gaps (importance − action)</h3><div data-chart></div>
    <div class="field" style="margin-top:14px"><label class="label" for="vc-dom">Choose an area to act on this week</label><select id="vc-dom">${DOMAINS.map((d) => html`<option>${d}</option>`)}</select></div>
    <div class="field"><label class="label" for="vc-act">One small committed action</label><input id="vc-act" type="text" placeholder="e.g. Call my brother on Sunday"></div>
    <button class="btn primary" data-save>${icon('check')} Save my compass</button></div>`);
  const chart = el.querySelector('[data-chart]');
  const gaps = () => DOMAINS.map((d) => ({ label: d, value: Math.max(0, r[d].imp - r[d].con) })).sort((a, b) => b.value - a.value);
  const draw = () => { stopChart(); const g = gaps().filter((x) => x.value > 0); stopChart = barChart(chart, { items: g.slice(0, 6).map((x) => ({ ...x, color: 'var(--s4)' })), max: 10, format: (v) => `${v}`, caption: 'Gap between importance and action', emptyText: 'No gaps — your actions match what matters to you.' }); if (g[0]) el.querySelector('#vc-dom').value = g[0].label; };
  const offs = [
    on(el, 'input', 'input[type=range]', (e, x) => { const d = DOMAINS[Number(x.dataset.d)]; r[d][x.dataset.f] = Number(x.value); el.querySelector(`[data-o="${x.dataset.f}${x.dataset.d}"]`).textContent = x.value; draw(); }),
    on(el, 'click', '[data-save]', async (e, b) => {
      b.disabled = true;
      const g = gaps();
      const sumImp = DOMAINS.reduce((s, d) => s + r[d].imp, 0) || 1;
      const consistency = Math.round((DOMAINS.reduce((s, d) => s + r[d].imp * r[d].con, 0) / (sumImp * 10)) * 100);
      onSaved?.(await saveExercise(ex, { ratings: r, domain: el.querySelector('#vc-dom').value, action: el.querySelector('#vc-act').value, topGap: g[0]?.value ? g[0].label : '', meanGap: Math.round((g.reduce((s, x) => s + x.value, 0) / g.length) * 10) / 10, consistency }));
    }),
  ];
  draw();
  return () => { stopChart(); offs.forEach((f) => f()); };
}
