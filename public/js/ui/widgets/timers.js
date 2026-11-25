// Guided, timed practices: breathing pacer, progressive muscle relaxation, focus sprints.
import { html, raw, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { fmtDuration } from '../../core/format.js';
import { saveExercise } from '../save.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let audioCtx;
function chime(freq = 660, dur = 0.25) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur + 0.05);
  } catch { /* audio unavailable */ }
}
function speak(text, on) {
  if (!on || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; speechSynthesis.speak(u); } catch { /* ignore */ }
}
const rating = (id, label, v = 5) => html`<div class="field"><label class="label" for="${id}">${label}: <output data-o="${id}">${v}</output>/10</label><input type="range" id="${id}" min="0" max="10" value="${v}"><div class="slider-labels"><span>0 · calm</span><span>10 · extreme</span></div></div>`;

/* ---------------- Breathing pacer ---------------- */
const PATTERNS = {
  slow: { name: 'Slow breathing · 5.5 breaths/min', phases: [['Breathe in', 5.5, 1], ['Breathe out', 5.5, 0]] },
  sigh: { name: 'Cyclic sighing (long out-breath)', phases: [['Breathe in', 2.5, 0.85], ['Top up', 1, 1], ['Long breath out', 6, 0]] },
  fourSix: { name: 'Relaxing 4-6 breathing', phases: [['Breathe in', 4, 1], ['Breathe out', 6, 0]] },
  box: { name: 'Box breathing 4-4-4-4', phases: [['Breathe in', 4, 1], ['Hold', 4, 1], ['Breathe out', 4, 0], ['Hold', 4, 0]] },
};

export function breathing(el, { ex, onSaved }) {
  let timer = null, phaseIdx = 0, phaseLeft = 0, total = 0, elapsed = 0, pattern = 'slow', voice = false;
  el.innerHTML = String(html`<div class="card">
    <div class="grid" style="--min:200px;--gap:12px">
      <div class="field"><label class="label" for="br-pat">Pattern</label><select id="br-pat">${Object.entries(PATTERNS).map(([k, p]) => html`<option value="${k}">${p.name}</option>`)}</select></div>
      <div class="field"><label class="label" for="br-min">Duration</label><select id="br-min"><option value="1">1 minute</option><option value="3" selected>3 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option></select></div>
    </div>
    ${rating('br-before', 'Stress or anxiety right now')}
    <label class="check"><input type="checkbox" id="br-voice"><span>Voice cues (spoken by your browser)</span></label>
    <div class="pacer" aria-live="polite"><div class="pacer-ring" data-ring><div class="cue"><span data-cue>Ready</span><span class="count" data-count></span></div></div></div>
    <div class="timer-display" style="font-size:1.6rem" data-left>3:00</div>
    <div class="cluster" style="justify-content:center;margin-top:10px"><button class="btn primary" data-start>${icon('play')} Start</button><button class="btn" data-stop hidden>${icon('stop')} Finish</button></div>
    <div data-after hidden style="margin-top:16px">${rating('br-after', 'Stress or anxiety now')}<button class="btn primary" data-save>${icon('check')} Save session</button></div>
  </div>`);
  const $ = (s) => el.querySelector(s);
  const ring = $('[data-ring]');
  el.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { el.querySelector(`[data-o="${r.id}"]`).textContent = r.value; }));
  const setRing = (scale, secs) => { if (reduced()) return; ring.style.transitionDuration = `${secs}s`; ring.style.transform = `scale(${0.62 + 0.38 * scale})`; };
  function startPhase() {
    const [label, secs, scale] = PATTERNS[pattern].phases[phaseIdx];
    phaseLeft = secs;
    $('[data-cue]').textContent = label;
    setRing(scale, secs);
    speak(label, voice);
  }
  function tick() {
    elapsed += 0.25; phaseLeft -= 0.25;
    $('[data-count]').textContent = Math.max(0, Math.ceil(phaseLeft));
    $('[data-left]').textContent = fmtDuration(Math.max(0, total - elapsed));
    if (phaseLeft <= 0.001) { phaseIdx = (phaseIdx + 1) % PATTERNS[pattern].phases.length; startPhase(); }
    if (elapsed >= total) finish(true);
  }
  function finish(complete) {
    clearInterval(timer); timer = null;
    $('[data-cue]').textContent = complete ? 'Well done' : 'Stopped';
    $('[data-count]').textContent = '';
    setRing(0.3, 1.5);
    if (complete) chime(523, 0.6);
    $('[data-start]').hidden = false; $('[data-stop]').hidden = true; $('[data-after]').hidden = false;
  }
  const offs = [
    on(el, 'click', '[data-start]', () => {
      pattern = $('#br-pat').value; total = Number($('#br-min').value) * 60; voice = $('#br-voice').checked;
      elapsed = 0; phaseIdx = 0; startPhase();
      timer = setInterval(tick, 250);
      $('[data-start]').hidden = true; $('[data-stop]').hidden = false; $('[data-after]').hidden = true;
    }),
    on(el, 'click', '[data-stop]', () => finish(false)),
    on(el, 'click', '[data-save]', async (e, b) => {
      b.disabled = true;
      const rec = await saveExercise(ex, { pattern: PATTERNS[pattern].name, minutes: Math.round((elapsed / 60) * 10) / 10, before: Number($('#br-before').value), after: Number($('#br-after').value) });
      onSaved?.(rec);
    }),
  ];
  return () => { clearInterval(timer); offs.forEach((f) => f()); try { speechSynthesis.cancel(); } catch { /* ignore */ } };
}

/* ---------------- Progressive muscle relaxation ---------------- */
const GROUPS_FULL = [
  ['Right hand & forearm', 'Make a tight fist'], ['Right upper arm', 'Bend your elbow and tense your biceps'], ['Left hand & forearm', 'Make a tight fist'], ['Left upper arm', 'Bend your elbow and tense your biceps'],
  ['Forehead', 'Raise your eyebrows as high as you can'], ['Eyes & cheeks', 'Squeeze your eyes shut'], ['Mouth & jaw', 'Clench your teeth and pull back the corners of your mouth'], ['Neck', 'Gently press your head back'],
  ['Shoulders', 'Lift your shoulders up towards your ears'], ['Chest & back', 'Take a deep breath and pull your shoulder blades together'], ['Stomach', 'Tighten your stomach muscles'],
  ['Right thigh & calf', 'Point your toes and tense your leg'], ['Left thigh & calf', 'Point your toes and tense your leg'], ['Feet', 'Curl your toes downwards'],
];
const GROUPS_SHORT = [['Hands & arms', 'Make fists and tense both arms'], ['Face', 'Scrunch up your whole face'], ['Neck & shoulders', 'Shrug your shoulders up to your ears'], ['Chest & stomach', 'Breathe in and tighten your stomach'], ['Back', 'Arch gently and squeeze shoulder blades'], ['Legs', 'Straighten your legs and point your toes'], ['Feet', 'Curl your toes']];

export function pmr(el, { ex, onSaved }) {
  let timer = null, list = GROUPS_SHORT, gi = 0, phase = 'tense', left = 0, voice = false, startedAt = 0;
  el.innerHTML = String(html`<div class="card">
    <div class="field"><label class="label" for="pm-ver">Version</label><select id="pm-ver"><option value="short">Short — 7 muscle groups (~3 minutes)</option><option value="full">Full — 14 muscle groups (~6 minutes)</option></select></div>
    ${rating('pm-before', 'How tense do you feel?')}
    <label class="check"><input type="checkbox" id="pm-voice"><span>Voice guidance</span></label>
    <div class="big-cue" data-cue style="margin-top:14px">Get comfortable, then press start.</div>
    <div class="timer-display" data-left style="font-size:2.2rem"></div>
    <div class="progress" style="margin:10px 0"><span data-bar style="width:0%"></span></div>
    <div class="cluster" style="justify-content:center"><button class="btn primary" data-start>${icon('play')} Start</button><button class="btn" data-skip hidden>Skip ›</button><button class="btn" data-stop hidden>${icon('stop')} Finish</button></div>
    <div data-after hidden style="margin-top:16px">${rating('pm-after', 'How tense do you feel now?')}<button class="btn primary" data-save>${icon('check')} Save session</button></div></div>`);
  const $ = (s) => el.querySelector(s);
  el.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { el.querySelector(`[data-o="${r.id}"]`).textContent = r.value; }));
  const say = (t) => { $('[data-cue]').textContent = t; speak(t, voice); };
  function next() {
    if (phase === 'tense') { phase = 'release'; left = 12; say(`Release… let ${list[gi][0].toLowerCase()} go loose. Notice the difference.`); chime(440); }
    else { gi++; if (gi >= list.length) return finish(true); phase = 'tense'; left = 5; say(`${list[gi][0]}: ${list[gi][1]}. Hold…`); chime(660); }
  }
  function tick() {
    left -= 1; $('[data-left]').textContent = left > 0 ? left : '';
    $('[data-bar]').style.width = `${((gi + (phase === 'release' ? 0.5 : 0)) / list.length) * 100}%`;
    if (left <= 0) next();
  }
  function finish(complete) {
    clearInterval(timer); timer = null;
    say(complete ? 'Finished. Take a slow breath and notice how your body feels.' : 'Stopped.');
    $('[data-bar]').style.width = complete ? '100%' : $('[data-bar]').style.width;
    $('[data-start]').hidden = false; $('[data-skip]').hidden = true; $('[data-stop]').hidden = true; $('[data-after]').hidden = false;
  }
  const offs = [
    on(el, 'click', '[data-start]', () => {
      list = $('#pm-ver').value === 'full' ? GROUPS_FULL : GROUPS_SHORT; voice = $('#pm-voice').checked;
      gi = 0; phase = 'tense'; left = 5; startedAt = Date.now();
      say(`${list[0][0]}: ${list[0][1]}. Hold…`); chime(660);
      timer = setInterval(tick, 1000);
      $('[data-start]').hidden = true; $('[data-skip]').hidden = false; $('[data-stop]').hidden = false; $('[data-after]').hidden = true;
    }),
    on(el, 'click', '[data-skip]', () => { left = 0; next(); }),
    on(el, 'click', '[data-stop]', () => finish(false)),
    on(el, 'click', '[data-save]', async (e, b) => { b.disabled = true; onSaved?.(await saveExercise(ex, { version: $('#pm-ver').value, minutes: Math.round(((Date.now() - startedAt) / 60000) * 10) / 10, before: Number($('#pm-before').value), after: Number($('#pm-after').value) })); }),
  ];
  return () => { clearInterval(timer); offs.forEach((f) => f()); try { speechSynthesis.cancel(); } catch { /* ignore */ } };
}

/* ---------------- Focus sprints ---------------- */
export function focus(el, { ex, onSaved }) {
  let timer = null, left = 0, mode = 'idle', distractions = 0, sprintMin = 25, startedAt = 0, done = 0;
  const title0 = document.title;
  el.innerHTML = String(html`<div class="card">
    <div class="grid" style="--min:180px;--gap:12px">
      <div class="field" style="grid-column:1/-1"><label class="label" for="fc-task">What will you work on?</label><input id="fc-task" type="text" placeholder="e.g. Draft the introduction"></div>
      <div class="field"><label class="label" for="fc-len">Sprint</label><select id="fc-len"><option value="15">15 minutes</option><option value="25" selected>25 minutes</option><option value="50">50 minutes</option></select></div>
      <div class="field"><label class="label" for="fc-brk">Break</label><select id="fc-brk"><option value="5" selected>5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></div>
    </div>
    <div class="big-cue" data-cue>Phone away, notifications off. Ready?</div>
    <div class="timer-display" data-left>25:00</div>
    <div class="cluster" style="justify-content:center;margin:12px 0"><button class="btn primary" data-start>${icon('play')} Start sprint</button><button class="btn" data-distract hidden>${icon('bolt')} I got distracted <span data-dcount class="badge">0</span></button><button class="btn" data-stop hidden>${icon('stop')} End early</button></div>
    <div data-after hidden>${raw(rating('fc-focus', 'How focused were you?', 7).toString().replace('0 · calm', '0 · scattered').replace('10 · extreme', '10 · fully focused'))}<button class="btn primary" data-save>${icon('check')} Save sprint</button></div>
    <p class="small faint" data-done-count style="text-align:center"></p></div>`);
  const $ = (s) => el.querySelector(s);
  el.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => { el.querySelector(`[data-o="${r.id}"]`).textContent = r.value; }));
  const show = () => { $('[data-left]').textContent = fmtDuration(left); if (mode !== 'idle') document.title = `${fmtDuration(left)} · ${mode === 'sprint' ? 'Focus' : 'Break'}`; };
  function tick() {
    left--; show();
    if (left <= 0) {
      clearInterval(timer); timer = null; chime(784, 0.5); setTimeout(() => chime(988, 0.5), 300);
      if (mode === 'sprint') { mode = 'rate'; $('[data-cue]').textContent = 'Sprint complete! Rate your focus, then take your break.'; $('[data-after]').hidden = false; $('[data-distract]').hidden = true; $('[data-stop]').hidden = true; document.title = title0; }
      else { mode = 'idle'; $('[data-cue]').textContent = 'Break over. Ready for another sprint?'; $('[data-start]').hidden = false; document.title = title0; left = sprintMin * 60; show(); }
    }
  }
  function startBreak() { mode = 'break'; left = Number($('#fc-brk').value) * 60; $('[data-cue]').textContent = 'Break time — stand up, stretch, get water. Avoid scrolling.'; show(); timer = setInterval(tick, 1000); }
  $('#fc-len').addEventListener('change', () => { if (mode === 'idle') { left = Number($('#fc-len').value) * 60; show(); } });
  const offs = [
    on(el, 'click', '[data-start]', () => {
      sprintMin = Number($('#fc-len').value); left = sprintMin * 60; distractions = 0; startedAt = Date.now(); mode = 'sprint';
      $('[data-dcount]').textContent = '0'; $('[data-cue]').textContent = `Focus: ${$('#fc-task').value || 'one task only'}`;
      $('[data-start]').hidden = true; $('[data-distract]').hidden = false; $('[data-stop]').hidden = false; $('[data-after]').hidden = true;
      show(); timer = setInterval(tick, 1000); chime(660);
    }),
    on(el, 'click', '[data-distract]', () => { distractions++; $('[data-dcount]').textContent = String(distractions); $('[data-cue]').textContent = 'Noticed. Gently back to the task.'; }),
    on(el, 'click', '[data-stop]', () => { clearInterval(timer); timer = null; left = 0; mode = 'rate'; $('[data-after]').hidden = false; $('[data-distract]').hidden = true; $('[data-stop]').hidden = true; $('[data-cue]').textContent = 'Sprint ended. Rate your focus.'; document.title = title0; }),
    on(el, 'click', '[data-save]', async (e, b) => {
      b.disabled = true;
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const rec = await saveExercise(ex, { task: $('#fc-task').value, minutes, planned: sprintMin, focus: Number($('#fc-focus').value), distractions });
      done++; $('[data-done-count]').textContent = `${done} sprint${done === 1 ? '' : 's'} saved this session.`;
      $('[data-after]').hidden = true; b.disabled = false;
      onSaved?.(rec); startBreak();
    }),
  ];
  left = 25 * 60; show();
  return () => { clearInterval(timer); document.title = title0; offs.forEach((f) => f()); };
}
