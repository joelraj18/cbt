// Clinical standards: how the CBT course maps onto the standards psychologists use — and where it falls short.
import { html } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { fmtDate } from '../core/format.js';
import { CLINICAL_REVIEW } from '../config.js';
import { COURSES, SESSION_COUNT } from '../data/courses.js';
import { ASSESSMENT_BY_ID } from '../data/assessments.js';
import { pageHead, cite, refCard, REF_BY_ID } from '../ui/components.js';

// The session elements rated by the Cognitive Therapy Scale–Revised (Blackburn et al., 2001; summarised in Muse & McManus, 2013),
// and how a self-guided session covers each one.
const CTSR = [
  ['Agenda', 'Every weekly session opens with the same agenda, and you can add your own item.', 'full'],
  ['Feedback', 'Each session ends with a summary in your own words, a helpfulness rating and space to say what was unclear.', 'full'],
  ['Collaboration', 'You choose the focus, the goals and the practice; the course suggests, it doesn’t decide. A supporter can review your summary.', 'partial'],
  ['Pacing and use of time', 'Sessions take about 25–30 minutes, one a week, with progress shown at every step.', 'full'],
  ['Interpersonal effectiveness', 'Warm, plain, non-judgemental language — but a website cannot offer the empathy and attunement of a therapist.', 'limited'],
  ['Guided discovery', 'Each session asks the kind of open questions a CBT therapist would ask (Socratic questioning) instead of giving answers.', 'partial'],
  ['Conceptualisation', 'Session 2 builds your CBT map (case formulation), and the course links what keeps the problem going to the skills that target it.', 'full'],
  ['Key cognitions', 'Your “hot” thought, the downward arrow and deeper beliefs are part of your map; thought records test them.', 'full'],
  ['Change methods', 'Thought records, decatastrophising, behavioural experiments and other cognitive methods, matched to your course.', 'full'],
  ['Behavioural techniques', 'Activity scheduling, exposure, habit and situation design, urge surfing and more — practised between sessions.', 'full'],
  ['Homework', 'Practice is planned with an if–then plan and obstacles, then counted automatically and reviewed at the next session.', 'full'],
  ['Facilitation of emotional expression', 'Emotions are named and rated in check-ins and exercises; there is no live person to help you stay with difficult feelings.', 'partial'],
];

// Roth & Pilling's five domains of CBT competence (summarised in Muse & McManus, 2013).
const DOMAINS = [
  ['Generic therapeutic competences', 'Knowledge of mental health problems, engaging the person, building a therapeutic relationship.', 'Plain-language explanations of each problem and a respectful, private experience. The relationship with a therapist cannot be replicated by a website.', 'limited'],
  ['Basic CBT competences', 'Explaining the CBT rationale, agreeing goals, structuring sessions, using measures, planning and reviewing practice, planned endings.', 'Built into every course: rationale in session 1, goals in session 2, a fixed session structure, weekly measures, homework review and a staying-well ending.', 'full'],
  ['Specific CBT techniques', 'Guided discovery, thought records, exposure, activity scheduling, behavioural experiments, problem solving and others.', `${COURSES.length * 5} skill sessions across ${COURSES.length} courses, each linked to an interactive exercise and the research behind it.`, 'full'],
  ['Problem-specific competences', 'Using the treatment protocol that research supports for the particular problem.', 'Each course follows the evidence-based approach for its problem — for example behavioural activation and cognitive therapy for low mood.', 'partial'],
  ['Metacompetences', 'Judgement: adapting the approach to the person, choosing the right method, managing obstacles.', 'Partly automated — suggestions follow your map, scores and practice, and “not on track” alerts prompt a review — but clinical judgement needs a person.', 'limited'],
];

const COVER = { full: ['Covered', 'ev-A'], partial: ['Partly', 'ev-B'], limited: ['Limited', 'ev-C'] };
const coverBadge = (k) => html`<span class="badge ${COVER[k][1]}">${COVER[k][0]}</span>`;

export async function standardsView() {
  const rv = CLINICAL_REVIEW || { status: 'not-reviewed', reviewers: [] };
  const reviewed = rv.status === 'reviewed' && (rv.reviewers || []).length > 0;
  const body = html`<div class="container">
    ${pageHead({ title: 'Clinical standards', lede: 'How the CBT course is built on the standards psychologists themselves use — what it covers, what it can’t, and the evidence for each choice.' })}

    <div class="callout ${reviewed ? 'good' : 'warn'}"><div class="callout-title">${icon('shield')} Honest status</div>
      <p style="margin:0 0 6px">No website can truthfully claim to be backed by every psychologist. CBT Toolkit is not endorsed by any professional body. What it does is follow the published standards, guidelines and research that psychologists use — and show you exactly how, with every source linked.</p>
      <p style="margin:0"><strong>Independent clinical review:</strong> ${reviewed
        ? html`reviewed by ${rv.reviewers.map((r, i) => html`${i ? '; ' : ''}${r.name} (${r.role}${r.registration ? `, ${r.registration}` : ''}${r.scope ? ` — ${r.scope}` : ''}${r.date ? `, ${fmtDate(r.date)}` : ''})`)}.`
        : rv.status === 'in-review' ? 'in progress — no reviewer has signed off yet.' : 'not yet reviewed by an independent psychologist.'}
      ${rv.contact ? html` Psychologists can send review feedback to <a href="${/^https?:/.test(rv.contact) ? rv.contact : `mailto:${rv.contact}`}">${rv.contact.replace(/^mailto:/, '')}</a>.` : ''}</p></div>

    <section class="section"><h2>Each weekly session follows the elements of a good CBT session</h2>
      <p class="muted">Psychologists judge the quality of a CBT session with rating scales such as the Cognitive Therapy Scale–Revised ${cite('blackburn2001')} ${cite('muse2013')}. The course’s session structure — mood check, agenda, practice review, skill, new action plan, summary and feedback — is the one taught in the standard CBT textbook ${cite('beck2020')}.</p>
      <div class="table-wrap"><table class="data"><thead><tr><th>Session element</th><th>How the course does it</th><th>Coverage</th></tr></thead><tbody>
        ${CTSR.map(([k, how, cov]) => html`<tr><td><strong>${k}</strong></td><td>${how}</td><td>${coverBadge(cov)}</td></tr>`)}</tbody></table></div></section>

    <section class="section"><h2>The competences CBT therapists need</h2>
      <p class="muted">The UK framework for CBT competences, developed for NHS psychological therapy services, groups them into five domains ${cite('roth2008')} ${cite('muse2013')}.</p>
      <div class="table-wrap"><table class="data"><thead><tr><th>Domain</th><th>What it means</th><th>In this course</th><th>Coverage</th></tr></thead><tbody>
        ${DOMAINS.map(([k, what, how, cov]) => html`<tr><td><strong>${k}</strong></td><td class="small">${what}</td><td class="small">${how}</td><td>${coverBadge(cov)}</td></tr>`)}</tbody></table></div></section>

    <section class="section"><h2>Guidelines it follows</h2>
      <div class="grid" style="--min:280px">
        <div class="card flat"><h3 class="h4">NICE: depression (NG222)</h3><p class="small">Guided self-help — structured CBT or behavioural activation materials with a practitioner reviewing progress, usually over about 8 sessions — is a first-line option for less severe depression (PHQ-9 below 16). For more severe depression (16 or more), NICE recommends therapy with a professional, and sometimes medication.</p><p class="small" style="margin:0"><strong>Here:</strong> 8 weekly sessions; a recommendation to see a professional when PHQ-9 is 16 or more ${cite('nice-ng222')}.</p></div>
        <div class="card flat"><h3 class="h4">NICE: anxiety (CG113)</h3><p class="small">Stepped care: education and CBT-based self-help first, then high-intensity CBT or applied relaxation if needed; CBT for panic disorder.</p><p class="small" style="margin:0"><strong>Here:</strong> the anxiety course uses applied relaxation, worry management, exposure and behavioural experiments ${cite('nice-cg113')}.</p></div>
        <div class="card flat"><h3 class="h4">NHS Talking Therapies</h3><p class="small">PHQ-9 and GAD-7 at every session, with reliable improvement (PHQ-9 ≥ 6 points, GAD-7 ≥ 4) and recovery thresholds (PHQ-9 ≥ 10, GAD-7 ≥ 8).</p><p class="small" style="margin:0"><strong>Here:</strong> the same questionnaires and thresholds in every course and in the clinician summary ${cite('nhs-tt-manual')}.</p></div>
        <div class="card flat"><h3 class="h4">American Psychological Association</h3><p class="small">The APA’s depression guideline recommends cognitive-behavioural therapy, cognitive therapy and behavioural therapy for adults (an update is in progress).</p><p class="small" style="margin:0"><strong>Here:</strong> the low-mood course combines behavioural activation and cognitive therapy ${cite('apa2019')}.</p></div>
      </div></section>

    <section class="section"><h2>Does self-guided CBT work?</h2>
      <p class="muted">Yes — with honest caveats. These are the key studies; each card links to the paper.</p>
      <div class="grid" style="--min:320px">${['cuijpers2010gsh', 'carlbring2018', 'karyotaki2021', 'karyotaki2017', 'gellatly2007', 'linardon2019', 'cuijpers2019formats'].filter((id) => REF_BY_ID[id]).map((id) => refCard(REF_BY_ID[id], { compact: true }))}</div>
      <div class="callout info" style="margin-top:14px"><div class="callout-title">What this means for you</div><p style="margin:0">Self-guided CBT helps, especially for mild to moderate difficulties. Support from a person makes it work better when symptoms are moderate or worse — so the course recommends a supporter when your scores are higher, and creates a clinician summary you can share.</p></div></section>

    <section class="section"><h2>Safety and stepped care</h2>
      <div class="table-wrap"><table class="data"><thead><tr><th>When</th><th>What the course does</th><th>Basis</th></tr></thead><tbody>
        <tr><td>Thoughts of being better off dead or of self-harm (PHQ-9 item 9, also asked weekly on its own)</td><td>Shows crisis support straight away, puts “Talk to someone today” first on Today, and flags it in the clinician summary</td><td>${cite('stanley2018')}</td></tr>
        <tr><td>PHQ-9 16+ or GAD-7 15+ (at assessment or any later session), or a specialist need (e.g. psychosis, mania, eating disorder, substance dependence, trauma)</td><td>Recommends seeing a professional, with the course used alongside</td><td>${cite('nice-ng222')} ${cite('nice-cg113')}</td></tr>
        <tr><td>PHQ-9 or GAD-7 of 10 or more</td><td>Recommends guided self-help: share progress with a doctor, therapist or trusted supporter</td><td>${cite('karyotaki2021')} ${cite('gellatly2007')}</td></tr>
        <tr><td>Reliable deterioration on the main measure</td><td>“Not on track” alert: review with a professional</td><td>${cite('lambert2018')} ${cite('dejong2021')}</td></tr>
        <tr><td>No reliable change after 4+ weekly measures (starting in the clinical range)</td><td>Prompts a review of the plan and suggests stepping up to therapy</td><td>${cite('lambert2018')} ${cite('dejong2021')}</td></tr>
      </tbody></table></div></section>

    <section class="section grid-2">
      <div class="card"><h2 class="h3">${icon('clipboard')} Measures</h2><ul class="small" style="margin:0">
        <li><strong>PHQ-9</strong> and <strong>GAD-7</strong>: validated questionnaires used in NHS services, reproduced verbatim (no permission required) ${cite('kroenke2001')} ${cite('spitzer2006')}.</li>
        <li><strong>Area check-ins</strong> and the <strong>${ASSESSMENT_BY_ID.impact.title.toLowerCase()}</strong>: original questions written for this site. Useful for tracking your own change, but not validated — and the life impact check is not the Work and Social Adjustment Scale ${cite('mundt2002')}.</li>
        <li>Nothing here is a diagnosis. Only a qualified professional can diagnose.</li></ul></div>
      <div class="card"><h2 class="h3">${icon('alert')} Limits</h2><ul class="small" style="margin:0">
        <li>It is self-guided CBT, not therapy with a psychologist: there is no therapeutic relationship, no live judgement and no crisis service.</li>
        <li>It suits mild to moderate difficulties in adults. It is not designed for psychosis, bipolar disorder, eating disorders, addiction, PTSD or OCD.</li>
        <li>The courses have not been tested in their own clinical trial; they combine methods that have been.</li>
        <li>Content is written in plain English and based on research mostly from Western countries.</li></ul></div>
    </section>

    <section class="section"><h2>For psychologists: how to review this</h2>
      <p>A structured review checklist covers every course and session, the safety rules, the measures and thresholds, the wording of claims and the citations. It is in <code>docs/CLINICAL-REVIEW.md</code> in the project repository. The site lists a reviewer only after they have completed the review and agreed to be named.</p>
      <p class="small muted" style="margin:0">${COURSES.length} courses · ${COURSES.length * SESSION_COUNT} sessions · every module cites its sources. <a href="#/course">See the courses →</a> · <a href="#/research">Research library →</a> · <a href="#/about">Methodology →</a></p></section>
  </div>`;
  return { title: 'Clinical standards', body };
}
