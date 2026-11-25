import { html } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { pageHead, areaStyle, levelBadge } from '../ui/components.js';

const TOOLS = [
  ['paced-breathing', 'leaf', 'Feeling stressed or panicky'], ['urge-surfing', 'wave', 'An urge you don’t want to act on'], ['stop-skill', 'hand', 'About to react in the heat of the moment'],
  ['grounding', 'eye', 'Overwhelmed or spaced out'], ['pmr', 'activity', 'Tense body, can’t relax'], ['focus-sprints', 'timer', 'Can’t get started or focus'],
  ['worry-time', 'clock', 'Worries going round and round'], ['thought-record', 'edit', 'A thought that’s making you feel bad'], ['self-compassion-break', 'heart', 'Being hard on yourself'],
  ['anger-cool-down', 'bolt', 'Angry and want to cool down'], ['brain-dump', 'list', 'Too much in your head'], ['vulnerability-check', 'pulse', 'Feeling fragile and impulsive'],
];

export async function toolboxView() {
  return {
    title: 'Toolbox',
    body: html`<div class="container">${pageHead({ title: 'Toolbox', lede: 'Quick, guided tools for hard moments. Pick what matches how you feel right now.' })}
      <div class="grid" style="--min:250px">${TOOLS.map(([id, ic, when]) => { const ex = EXERCISE_BY_ID[id]; return html`<a class="card card-link" href="#/exercise/${id}?tab=do" ${areaStyle(ex.area)}>
        <div class="card-head"><span class="area-icon">${icon(ic)}</span><div><div class="small faint">When: ${when}</div><h3 style="margin:2px 0 0">${ex.title}</h3></div></div>
        <p class="small muted" style="margin:10px 0 8px">${ex.tagline}</p><div class="cluster" style="--gap:6px">${levelBadge(ex.level)}<span class="badge">${ex.minutes} min</span></div></a>`; })}</div>
      <div class="callout crisis" style="margin-top:24px"><div class="callout-title">${icon('phone')} In crisis?</div><p style="margin:0">If you might act on thoughts of suicide or self-harm, these tools are not enough on their own. <a href="#/help">Get help now →</a></p></div></div>`,
  };
}
