// Describe stored records consistently (journal, search, reports).
import { EXERCISE_BY_ID } from '../data/exercises/index.js';
import { ASSESSMENT_BY_ID, scoreAssessment } from '../data/assessments.js';
import { fmtNum } from '../core/format.js';

export function describeRecord(r) {
  if (r.kind === 'exercise' || r.kind === 'session') {
    const ex = EXERCISE_BY_ID[r.type];
    let summary = '';
    try { summary = ex?.summarize ? ex.summarize(r.data || {}) : ''; } catch { summary = ''; }
    return { title: ex?.title || r.type, type: 'Exercise', summary, url: `#/exercise/${r.type}?tab=history&open=${r.id}`, area: ex?.area || r.area };
  }
  if (r.kind === 'assessment') {
    const a = ASSESSMENT_BY_ID[r.type];
    const s = a ? scoreAssessment(a, r.data.answers || []) : null;
    return { title: a?.title || r.type, type: 'Check-in', summary: s ? `Score ${fmtNum(s.score)}${a.percent ? '%' : ` / ${a.max}`} — ${s.band.label}` : '', url: `#/check-in/${r.type}`, area: a?.area };
  }
  if (r.kind === 'mood') {
    const d = r.data || {};
    return { title: 'Mood log', type: 'Mood', summary: `Mood ${d.mood ?? '–'}/10 · anxiety ${d.anxiety ?? '–'}/10 · energy ${d.energy ?? '–'}/10${d.note ? ' · ' + String(d.note).slice(0, 60) : ''}`, url: '#/mood', area: null };
  }
  return { title: r.type, type: r.kind, summary: '', url: '#/journal', area: r.area };
}
