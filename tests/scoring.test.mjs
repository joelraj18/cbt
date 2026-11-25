import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASSESSMENT_BY_ID, ASSESSMENTS, scoreAssessment, compareScores } from '../public/js/data/assessments.js';

const phq = ASSESSMENT_BY_ID.phq9, gad = ASSESSMENT_BY_ID.gad7, who = ASSESSMENT_BY_ID.who5;

test('validated questionnaires have the standard number of items', () => {
  assert.equal(phq.items.length, 9);
  assert.equal(gad.items.length, 7);
  assert.equal(who.items.length, 5);
});

test('PHQ-9 scoring and severity bands (Kroenke et al., 2001)', () => {
  const cases = [[[0, 0, 0, 0, 0, 0, 0, 0, 0], 0, 'Minimal'], [[1, 1, 1, 1, 1, 0, 0, 0, 0], 5, 'Mild'], [[2, 2, 2, 1, 1, 1, 1, 0, 0], 10, 'Moderate'], [[2, 2, 2, 2, 2, 2, 2, 1, 0], 15, 'Moderately severe'], [[3, 3, 3, 3, 3, 3, 2, 0, 0], 20, 'Severe'], [[3, 3, 3, 3, 3, 3, 3, 3, 3], 27, 'Severe']];
  for (const [answers, score, band] of cases) {
    const s = scoreAssessment(phq, answers);
    assert.equal(s.score, score);
    assert.equal(s.band.label, band);
  }
});

test('PHQ-9 item 9 raises a self-harm safety flag', () => {
  assert.deepEqual(scoreAssessment(phq, [0, 0, 0, 0, 0, 0, 0, 0, 1]).flags, ['self-harm']);
  assert.deepEqual(scoreAssessment(phq, [3, 3, 3, 3, 3, 3, 3, 3, 0]).flags, []);
});

test('GAD-7 bands (Spitzer et al., 2006)', () => {
  assert.equal(scoreAssessment(gad, [0, 0, 0, 0, 0, 0, 4]).band.label, 'Minimal');
  assert.equal(scoreAssessment(gad, [1, 1, 1, 1, 1, 0, 0]).band.label, 'Mild');
  assert.equal(scoreAssessment(gad, [2, 2, 2, 2, 1, 1, 0]).band.label, 'Moderate');
  assert.equal(scoreAssessment(gad, [3, 3, 3, 3, 3, 0, 0]).band.label, 'Severe');
});

test('WHO-5 raw score is multiplied by 4 (0–100)', () => {
  assert.equal(scoreAssessment(who, [5, 5, 5, 5, 5]).score, 100);
  assert.equal(scoreAssessment(who, [2, 2, 2, 1, 0]).score, 28);
  assert.equal(scoreAssessment(who, [2, 2, 2, 1, 0]).band.label, 'Low wellbeing');
});

test('area check-ins score as a percentage and ignore "doesn’t apply"', () => {
  const sd = ASSESSMENT_BY_ID['checkin-sexual-desire'];
  assert.equal(scoreAssessment(sd, [4, 4, null, null, null, null]).score, 100);
  assert.equal(scoreAssessment(sd, [0, 0, 0, 0, 0, 0]).score, 0);
  const pr = ASSESSMENT_BY_ID['checkin-productivity'];
  assert.equal(scoreAssessment(pr, [2, 2, 2, 2, 2, 2]).score, 50);
});

test('reliable change follows NHS Talking Therapies thresholds', () => {
  const a = compareScores(phq, 16, 10);
  assert.equal(a.reliable, true); assert.equal(a.better, true); assert.equal(a.recovered, false);
  const b = compareScores(phq, 12, 6);
  assert.equal(b.recovered, true);
  const c = compareScores(phq, 12, 8);
  assert.equal(c.reliable, false);
  assert.equal(compareScores(gad, 12, 8).reliable, true);
  assert.equal(compareScores(gad, 12, 9).reliable, false);
  const w = compareScores(who, 40, 60);
  assert.equal(w.better, true); assert.equal(w.reliable, true);
  assert.equal(compareScores(phq, null, 5), null);
});

test('every questionnaire has bands covering its full range', () => {
  for (const a of ASSESSMENTS) {
    for (let s = 0; s <= a.max; s++) assert.ok(a.bands.some((b) => s >= b.min && s <= b.max), `${a.id} has no band for ${s}`);
  }
});
