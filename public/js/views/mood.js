import { html, raw, on, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { fmtDateTime, dayKey, relTime, fmtNum } from '../core/format.js';
import { mean, dailyMeans, pearson, describeR, streaks } from '../lib/stats.js';
import { lineChart, heatmap, barChart } from '../lib/charts.js';
import { pageHead, statTile } from '../ui/components.js';
import { go } from '../core/router.js';
import { EMOTIONS } from '../ui/forms.js';

const ACTIVITIES = ['Exercise', 'Time outside', 'Saw friends/family', 'Work/study', 'Hobby', 'Rest', 'Lots of screen time', 'Alcohol', 'Argument/conflict', 'Achieved something'];

export async function moodView() {
  const recs = store.query({ kind: 'mood' });
  const st = streaks(recs.map((r) => r.createdAt));
  const last7 = recs.filter((r) => Date.now() - new Date(r.createdAt) < 7 * 864e5);
  const prev7 = recs.filter((r) => { const d = Date.now() - new Date(r.createdAt); return d >= 7 * 864e5 && d < 14 * 864e5; });
  const avg = (list, k) => mean(list.map((r) => r.data[k]).filter((v) => v != null));
  const a7 = avg(last7, 'mood'), p7 = avg(prev7, 'mood');
  const body = html`<div class="container">${pageHead({ title: 'Daily mood log', lede: 'Ten seconds a day. Patterns appear within a week or two — which days, activities and sleep go with better moods.' })}
    <div class="grid-2 wide-left">
      <form class="card" data-mood>
        <h2 style="font-size:1.2rem">How are you right now?</h2>
        ${['mood', 'anxiety', 'energy'].map((k) => html`<div class="field"><label class="label" for="md-${k}">${{ mood: 'Mood', anxiety: 'Anxiety / stress', energy: 'Energy' }[k]}: <output data-o="${k}">5</output>/10</label><input type="range" id="md-${k}" data-k="${k}" min="0" max="10" value="5"><div class="slider-labels"><span>0 · ${k === 'anxiety' ? 'calm' : 'very low'}</span><span>10 · ${k === 'anxiety' ? 'extreme' : 'great'}</span></div></div>`)}
        <div class="field"><label class="label" for="md-sleep">Hours slept last night</label><input type="number" id="md-sleep" min="0" max="16" step="0.5" placeholder="e.g. 7"></div>
        <div class="field"><span class="label">Feelings (optional)</span><div class="options">${EMOTIONS.slice(0, 16).map((e) => html`<button type="button" class="chip" data-emo="${e}" aria-pressed="false">${e}</button>`)}</div></div>
        <div class="field"><span class="label">Today included… (optional)</span><div class="options">${ACTIVITIES.map((e) => html`<button type="button" class="chip" data-act="${e}" aria-pressed="false">${e}</button>`)}</div></div>
        <div class="field"><label class="label" for="md-note">Note (optional)</label><input type="text" id="md-note" placeholder="Anything worth remembering?"></div>
        <button class="btn primary" type="submit">${icon('check')} Save</button>
      </form>
      <aside class="stack">
        <div class="stats" style="grid-template-columns:repeat(2,1fr)">${statTile('Average mood (7 days)', a7 != null ? a7.toFixed(1) : '–', a7 != null && p7 != null ? html`<span class="${a7 >= p7 ? 'kpi-up' : 'kpi-down'}">${a7 >= p7 ? '▲' : '▼'} ${Math.abs(a7 - p7).toFixed(1)} vs previous week</span>` : '')}
          ${statTile('Logging streak', `${st.current} day${st.current === 1 ? '' : 's'}`, `${recs.length} logs total`)}</div>
        <div class="card flat"><h3>Activity calendar</h3><div data-heat></div></div>
      </aside>
    </div>
    <section class="section card"><h2 style="font-size:1.2rem">Mood, anxiety & energy (daily averages)</h2><div data-trend></div></section>
    <section class="section grid-2"><div class="card"><h3>What goes with a better mood?</h3><div data-acts></div></div><div class="card"><h3>Sleep and mood</h3><div data-sleep></div></div></section>
    <section class="section card"><h2 style="font-size:1.2rem">Recent logs</h2>${recs.length ? recs.slice(0, 15).map((r) => html`<div class="entry"><div class="entry-head"><span class="entry-title">Mood ${r.data.mood ?? '–'} · anxiety ${r.data.anxiety ?? '–'} · energy ${r.data.energy ?? '–'}</span><span class="small faint">${fmtDateTime(r.createdAt)}</span></div>${r.data.note || r.data.emotions?.length ? html`<div class="entry-body">${[...(r.data.emotions || []), ...(r.data.activities || [])].join(', ')}${r.data.note ? ` — ${r.data.note}` : ''}</div>` : ''}</div>`) : html`<p class="muted">No logs yet.</p>`}</section>
  </div>`;

  const mount = (root) => {
    const sel = { emo: new Set(), act: new Set() };
    const stops = [];
    root.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { root.querySelector(`[data-o="${r.dataset.k}"]`).textContent = r.value; }));
    const offs = [
      on(root, 'click', '[data-emo],[data-act]', (e, b) => { const k = b.dataset.emo ? 'emo' : 'act', v = b.dataset.emo || b.dataset.act; sel[k].has(v) ? sel[k].delete(v) : sel[k].add(v); b.setAttribute('aria-pressed', String(sel[k].has(v))); }),
      on(root, 'submit', '[data-mood]', async (e) => {
        e.preventDefault();
        const g = (k) => Number(root.querySelector(`#md-${k}`).value);
        const sleep = root.querySelector('#md-sleep').value;
        const data = { mood: g('mood'), anxiety: g('anxiety'), energy: g('energy'), sleep: sleep === '' ? null : Number(sleep), emotions: [...sel.emo], activities: [...sel.act], note: root.querySelector('#md-note').value.trim() };
        await store.add({ kind: 'mood', type: 'mood', data, metrics: { mood: data.mood, anxiety: data.anxiety, energy: data.energy, sleep: data.sleep } });
        toast('Mood saved on this device.');
        go('/mood', {}, { replace: true });
      }),
    ];
    // charts
    const all = store.query({ kind: 'mood' }).slice().reverse();
    const counts = new Map();
    store.all().forEach((r) => { const k = dayKey(r.createdAt); counts.set(k, (counts.get(k) || 0) + 1); });
    heatmap(root.querySelector('[data-heat]'), { counts, weeks: 18, label: 'entries' });
    const series = (k, name, color) => ({ name, color, points: dailyMeans(all.filter((r) => r.data[k] != null).map((r) => ({ x: r.createdAt, y: r.data[k] }))) });
    stops.push(lineChart(root.querySelector('[data-trend]'), { yMin: 0, yMax: 10, caption: 'Daily mood, anxiety and energy', series: [series('mood', 'Mood', 'var(--s1)'), series('anxiety', 'Anxiety', 'var(--s2)'), series('energy', 'Energy', 'var(--s3)')] }));
    const byAct = ACTIVITIES.map((a) => { const w = all.filter((r) => (r.data.activities || []).includes(a)); return { label: a, value: mean(w.map((r) => r.data.mood)), n: w.length }; }).filter((x) => x.n >= 2 && x.value != null).sort((a, b) => b.value - a.value);
    stops.push(barChart(root.querySelector('[data-acts]'), { items: byAct.map((x) => ({ label: x.label, value: x.value, detail: `${x.n} days`, color: 'var(--s1)' })), max: 10, format: (v) => v.toFixed(1), caption: 'Average mood on days with each activity', emptyText: 'Tag activities on at least 2 logs to see which ones go with a better mood.' }));
    const pr = pearson(all.map((r) => r.data.sleep), all.map((r) => r.data.mood), 5);
    root.querySelector('[data-sleep]').innerHTML = pr ? String(html`<p style="font-size:1.3rem;font-weight:650;margin:0">r = ${pr.r.toFixed(2)}</p><p class="muted">${describeR(pr.r)} between hours slept and mood across ${pr.n} logs. ${pr.r > 0.3 ? 'Protecting your sleep may be one of the best things you can do for your mood.' : ''} Correlation isn’t proof — but it’s a useful clue. See the <a href="#/exercise/sleep-diary">sleep diary</a>.</p>`) : '<p class="muted">Add hours slept to at least 5 logs to see how sleep and mood relate.</p>';
    return () => { offs.forEach((f) => f()); stops.forEach((f) => f()); };
  };
  return { title: 'Mood log', body, mount };
}
