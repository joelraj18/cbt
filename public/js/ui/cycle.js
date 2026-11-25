// Interactive "thoughts → feelings → body → behaviour" cycle with everyday examples,
// switching between the unhelpful loop and the CBT way of breaking it.
import { html, raw, on } from '../core/dom.js';
import { icon } from '../core/icons.js';

const NODES = [
  { k: 'situation', label: 'Situation', sub: 'what happens' },
  { k: 'thought', label: 'Thoughts', sub: 'what you tell yourself' },
  { k: 'feeling', label: 'Feelings', sub: 'emotions' },
  { k: 'body', label: 'Body', sub: 'physical sensations' },
  { k: 'behaviour', label: 'Behaviour', sub: 'what you do' },
];

function svg(mode) {
  const W = 420, H = 360, cx = W / 2, cy = H / 2 + 6, R = 132;
  const pos = NODES.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / NODES.length; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  const bw = 124, bh = 46;
  const arrows = pos.map((p, i) => {
    const q = pos[(i + 1) % pos.length];
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, pad = 40;
    const x1 = p[0] + ux * pad, y1 = p[1] + uy * pad, x2 = q[0] - ux * (pad + 6), y2 = q[1] - uy * (pad + 6);
    const mx = (x1 + x2) / 2 - uy * 14, my = (y1 + y2) / 2 + ux * 14;
    const ang = Math.atan2(y2 - my, x2 - mx);
    const hx = x2, hy = y2;
    const head = `${hx},${hy} ${hx - 9 * Math.cos(ang - 0.45)},${hy - 9 * Math.sin(ang - 0.45)} ${hx - 9 * Math.cos(ang + 0.45)},${hy - 9 * Math.sin(ang + 0.45)}`;
    return `<path class="arrow" d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"/><polygon class="arrow-head" points="${head}"/>`;
  }).join('');
  const nodes = NODES.map((nd, i) => `<g class="node" data-node="${nd.k}" tabindex="0" role="button" aria-label="${nd.label}"><rect x="${pos[i][0] - bw / 2}" y="${pos[i][1] - bh / 2}" width="${bw}" height="${bh}" rx="12"/><text x="${pos[i][0]}" y="${pos[i][1] - 2}" text-anchor="middle">${nd.label}</text><text class="sub" x="${pos[i][0]}" y="${pos[i][1] + 14}" text-anchor="middle">${nd.sub}</text></g>`).join('');
  const center = `<g class="center"><rect x="${cx - 70}" y="${cy - 18}" width="140" height="36" rx="18"/><text x="${cx}" y="${cy + 5}" text-anchor="middle">${mode === 'better' ? 'Breaking the cycle' : 'The vicious cycle'}</text></g>`;
  return `<svg class="cycle-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cycle diagram: situation, thoughts, feelings, body and behaviour all affect each other">${arrows}${nodes}${center}</svg>`;
}

function steps(c, mode) {
  const b = mode === 'better' ? c.better : c;
  const rows = [['situation', 'Situation', c.situation], ['thought', 'Thoughts', b.thought], ['feeling', 'Feelings', b.feeling], ['body', 'Body', b.body], ['behaviour', 'Behaviour', b.behaviour], ['result', mode === 'better' ? 'What happens next' : 'How the cycle keeps going', b.result]];
  return html`${rows.map(([k, label, text]) => html`<div class="cycle-step ${k === 'situation' ? '' : mode === 'better' ? 'better' : 'worse'}" data-step="${k}"><div class="k">${label}</div><div>${text}</div></div>`)}`;
}

/** cycles: [{id, name, title, situation, thought, …, better:{…}}] */
export function cycleBlock(cycles, { id = 'cycle', intro = '' } = {}) {
  const first = cycles[0];
  return html`<section class="card" data-cycle-root="${id}">
    ${intro ? html`<p class="muted">${raw(intro)}</p>` : ''}
    ${cycles.length > 1 ? html`<div class="options" role="group" aria-label="Choose an example" style="margin-bottom:14px">${cycles.map((c, i) => html`<button type="button" class="chip" data-cycle-pick="${i}" aria-pressed="${i === 0}">${c.name}</button>`)}</div>` : ''}
    <div class="split" style="margin-bottom:12px"><h3 style="margin:0" data-cycle-title>${first.title}</h3>
      <div class="toggle-row" role="group" aria-label="Show cycle"><button type="button" data-cycle-mode="worse" aria-pressed="true">${icon('cycle')} Stuck in the cycle</button><button type="button" data-cycle-mode="better" aria-pressed="false">${icon('sparkle')} Breaking it with CBT</button></div></div>
    <div class="cycle-wrap"><div data-cycle-svg>${raw(svg('worse'))}</div><div class="cycle-text" data-cycle-text aria-live="polite">${steps(first, 'worse')}</div></div>
  </section>`;
}

export function mountCycles(root, cyclesById) {
  const offs = [];
  root.querySelectorAll('[data-cycle-root]').forEach((box) => {
    const cycles = cyclesById[box.dataset.cycleRoot];
    if (!cycles) return;
    let idx = 0, mode = 'worse';
    const render = () => {
      box.querySelector('[data-cycle-title]').textContent = cycles[idx].title;
      box.querySelector('[data-cycle-svg]').innerHTML = svg(mode);
      box.querySelector('[data-cycle-text]').innerHTML = String(steps(cycles[idx], mode));
      box.querySelectorAll('[data-cycle-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cycleMode === mode)));
      box.querySelectorAll('[data-cycle-pick]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.cyclePick) === idx)));
    };
    const highlight = (k) => {
      box.querySelectorAll('.node').forEach((n) => n.classList.toggle('active', n.dataset.node === k));
      const el = box.querySelector(`[data-step="${k}"]`);
      box.querySelectorAll('.cycle-step').forEach((s) => { s.style.outline = s === el ? '2px solid var(--area, var(--primary))' : ''; });
    };
    offs.push(on(box, 'click', '[data-cycle-pick]', (e, b) => { idx = Number(b.dataset.cyclePick); render(); }));
    offs.push(on(box, 'click', '[data-cycle-mode]', (e, b) => { mode = b.dataset.cycleMode; render(); }));
    offs.push(on(box, 'click', '.node', (e, n) => highlight(n.dataset.node)));
    offs.push(on(box, 'keydown', '.node', (e, n) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); highlight(n.dataset.node); } }));
  });
  return () => offs.forEach((f) => f());
}
