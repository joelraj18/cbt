import { html, raw, on, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { CRISIS_LINES, EMERGENCY, FIND_THERAPIST } from '../data/resources.js';
import { pageHead, cite } from '../ui/components.js';

const PLAN = [
  ['signs', 'My warning signs', 'Thoughts, moods, situations or behaviours that tell me a crisis may be building.'],
  ['coping', 'Things I can do on my own to take my mind off things', 'e.g. a walk, a shower, music, the breathing tool.'],
  ['places', 'People and places that help distract me', 'e.g. a friend I can text about anything, a café, the gym.'],
  ['people', 'People I can ask for help (names & numbers)', 'People I trust to tell how I am really feeling.'],
  ['pros', 'Professionals and services I can contact', 'GP / doctor, therapist, crisis line, emergency number.'],
  ['safe', 'Making my environment safer', 'Ways to put distance between me and anything I could use to hurt myself.'],
  ['reasons', 'My reasons for living', 'People, pets, plans, values — what matters to me.'],
];

export async function helpView() {
  const plan = (await store.kvGet('safety-plan', null)) || {};
  const regions = [...new Set(CRISIS_LINES.map((c) => c.region))];
  const body = html`<div class="container">
    ${pageHead({ title: 'Get help now', lede: 'If you are in danger or thinking about ending your life, please contact someone right now. You don’t have to go through this alone.' })}
    <div class="callout crisis"><div class="callout-title">${icon('phone')} Emergency</div><p style="margin:0">If your life or someone else’s is in immediate danger, call your local emergency number: ${EMERGENCY.map((e, i) => html`${i ? ' · ' : ''}<strong>${e.number}</strong> (${e.region})`)}.</p></div>
    <section class="section"><h2>Free, confidential crisis lines</h2><div class="table-wrap"><table class="data"><thead><tr><th>Where</th><th>Service</th><th>How to reach them</th><th>Hours</th></tr></thead><tbody>
      ${CRISIS_LINES.map((c) => html`<tr><td>${c.region}</td><td><a href="${c.url}" target="_blank" rel="noopener">${c.name}</a></td><td><strong>${c.contact}</strong></td><td>${c.hours}</td></tr>`)}</tbody></table></div>
      <p class="small muted">Elsewhere? <a href="https://findahelpline.com" target="_blank" rel="noopener">Find A Helpline</a> lists free services in over 130 countries.</p></section>

    <section class="section grid-2">
      <div class="card"><h2 style="font-size:1.25rem">${icon('shield')} My safety plan</h2>
        <p class="small muted">A safety plan is a short, personal list you write when you feel okay, to use if a crisis builds. Safety planning with follow-up was linked to about 45% fewer suicidal behaviours in a large study ${cite('stanley2018')}. It is saved only on this device. ${cite('stanley2012')}</p>
        <form data-plan>${PLAN.map(([k, label, help]) => html`<div class="field"><label class="label" for="sp-${k}">${label}</label><p class="help">${help}</p><textarea id="sp-${k}" data-k="${k}" rows="2">${plan[k] || ''}</textarea></div>`)}
          <div class="cluster"><button class="btn primary" type="submit">${icon('check')} Save my plan</button><button class="btn" type="button" data-print>${icon('print')} Print</button></div></form></div>
      <div class="stack">
        <div class="card flat"><h2 style="font-size:1.25rem">When to seek professional help</h2><ul>
          <li>Thoughts of suicide or self-harm — today, not later.</li><li>Symptoms lasting more than two weeks and affecting daily life.</li><li>You can’t look after yourself, work or study.</li><li>Alcohol or drugs are being used to cope.</li><li>Panic, intrusive thoughts or compulsions are taking over.</li><li>Trauma memories, flashbacks or nightmares.</li><li>Sudden changes in desire, pain during sex, or side-effects of medication.</li></ul>
          <p class="small muted" style="margin:0">Your doctor (GP) is often the best first step: they can check for physical causes, discuss medication and refer you to therapy.</p></div>
        <div class="card flat"><h2 style="font-size:1.25rem">Find a CBT therapist</h2><ul class="list">${FIND_THERAPIST.map((f) => html`<li><a href="${f.url}" target="_blank" rel="noopener">${f.name}</a><br><span class="small muted">${f.desc}</span></li>`)}</ul></div>
        <div class="card flat"><h3>Helping someone else?</h3><p class="small" style="margin:0">Ask directly and calmly if they are thinking about suicide — asking does not put the idea in their head. Listen without judging, stay with them if they are at risk, help them contact a crisis line or emergency services, and remove access to means if you safely can.</p></div>
      </div></section>
  </div>`;
  return {
    title: 'Get help now', body,
    mount: (root) => {
      const offs = [
        on(root, 'submit', '[data-plan]', async (e) => {
          e.preventDefault();
          const data = {}; root.querySelectorAll('[data-k]').forEach((t) => { data[t.dataset.k] = t.value; });
          await store.kvSet('safety-plan', { ...data, updated: new Date().toISOString() });
          toast('Safety plan saved on this device.');
        }),
        on(root, 'click', '[data-print]', () => {
          const pr = document.getElementById('print-root');
          pr.innerHTML = String(html`<div class="ws"><h1>My safety plan</h1>${PLAN.map(([k, label]) => html`<div class="ws-field"><div class="ws-label">${label}</div><p>${root.querySelector(`#sp-${k}`).value || ''}</p><div class="line"></div></div>`)}<p class="ws-help">Crisis lines: US/Canada 988 · UK & Ireland Samaritans 116 123 · Australia Lifeline 13 11 14 · findahelpline.com · Emergency: 911 / 999 / 112 / 000</p></div>`);
          document.body.classList.add('printing-worksheet');
          window.print();
          setTimeout(() => { document.body.classList.remove('printing-worksheet'); pr.innerHTML = ''; }, 800);
        }),
      ];
      return () => offs.forEach((f) => f());
    },
  };
}
