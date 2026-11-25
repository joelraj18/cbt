// Thinking-traps quiz: learn the 12 traps, then identify them in everyday thoughts.
import { html, raw, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { THINKING_TRAPS, TRAP_QUIZ } from '../../data/learn.js';
import { saveExercise } from '../save.js';

const TRAP = Object.fromEntries(THINKING_TRAPS.map((t) => [t.id, t]));
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export function trapQuiz(el, { ex, onSaved }) {
  let items = [], i = 0, score = 0, answers = [], phase = 'learn';
  const start = () => { items = shuffle(TRAP_QUIZ).map((q) => ({ ...q, options: shuffle([q.answer, ...shuffle(THINKING_TRAPS.map((t) => t.id).filter((id) => id !== q.answer && !(q.also || []).includes(id))).slice(0, 3)]) })); i = 0; score = 0; answers = []; phase = 'quiz'; render(); };
  function render() {
    if (phase === 'learn') {
      el.innerHTML = String(html`<div class="card"><h3>The 12 thinking traps</h3><p class="muted small">Skim these first — then test yourself.</p>
        <div class="stack" style="--gap:8px">${THINKING_TRAPS.map((t) => html`<details class="more"><summary>${t.name}</summary><p class="small" style="margin:0">${t.simple}<br><em>${t.example}</em><br><strong>Ask:</strong> ${t.question}</p></details>`)}</div>
        <button class="btn primary" style="margin-top:14px" data-start>${icon('play')} Start the quiz (${TRAP_QUIZ.length} questions)</button></div>`);
      return;
    }
    if (phase === 'done') {
      el.innerHTML = String(html`<div class="card"><h3>You scored ${score} / ${items.length}</h3><p>${score >= items.length * 0.8 ? 'Excellent — you can spot thinking traps quickly.' : score >= items.length * 0.5 ? 'Good start. Thoughts often fit more than one trap, so don’t worry about "near misses".' : 'These take practice. Review the list and try again — spotting traps gets easier with time.'}</p>
        <div class="cluster"><button class="btn" data-start>${icon('refresh')} Try again</button><a class="btn primary" href="#/exercise/thought-record">${icon('edit')} Use it in a thought record</a></div></div>`);
      return;
    }
    const q = items[i];
    el.innerHTML = String(html`<div class="card"><div class="split"><span class="small muted">Question ${i + 1} of ${items.length}</span><span class="small muted">Score ${score}</span></div>
      <div class="progress" style="margin:8px 0 16px"><span style="width:${(i / items.length) * 100}%"></span></div>
      <p style="font-size:1.15rem;font-weight:600">“${q.thought}”</p><p class="small muted">Which thinking trap is this?</p>
      <div data-opts>${q.options.map((id) => html`<button class="btn quiz-option" data-opt="${id}">${TRAP[id].name}</button>`)}</div><div data-feedback></div></div>`);
  }
  const off = on(el, 'click', 'button', async (e, b) => {
    if ('start' in b.dataset) return start();
    if (b.dataset.opt && phase === 'quiz') {
      const q = items[i];
      const ok = b.dataset.opt === q.answer || (q.also || []).includes(b.dataset.opt);
      if (ok) score++;
      answers.push({ thought: q.thought, chosen: b.dataset.opt, correct: ok });
      el.querySelectorAll('[data-opt]').forEach((x) => { x.disabled = true; if (x.dataset.opt === q.answer) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      const t = TRAP[q.answer];
      el.querySelector('[data-feedback]').innerHTML = String(html`<div class="callout ${ok ? 'good' : 'info'}" style="margin-top:12px"><div class="callout-title">${ok ? 'Correct!' : `It’s mainly ${t.name}`}</div><p class="small" style="margin:0">${t.simple} <strong>Helpful question:</strong> ${t.question}</p></div>
        <button class="btn primary" style="margin-top:12px" data-next>${i + 1 < items.length ? 'Next question' : 'See my score'} ${icon('arrow')}</button>`);
      return;
    }
    if ('next' in b.dataset) {
      i++;
      if (i >= items.length) { phase = 'done'; render(); const rec = await saveExercise(ex, { score, total: items.length, answers }); onSaved?.(rec); } else render();
    }
  });
  render();
  return off;
}
