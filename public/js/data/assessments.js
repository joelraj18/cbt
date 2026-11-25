// Questionnaires. PHQ-9 and GAD-7 (Spitzer, Williams, Kroenke & colleagues; "No permission required to
// reproduce, translate, display or distribute") and the WHO-5 Well-Being Index (free to use) are reproduced
// verbatim. The five area check-ins are ORIGINAL self-reflection questions written for this site: useful for
// tracking change over time, but not validated instruments and never a diagnosis.

const FREQ = [
  { value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' },
];
const OFTEN = [
  { value: 0, label: 'Never' }, { value: 1, label: 'Rarely' }, { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' }, { value: 4, label: 'Almost always' },
];
const WHO = [
  { value: 5, label: 'All of the time' }, { value: 4, label: 'Most of the time' }, { value: 3, label: 'More than half of the time' },
  { value: 2, label: 'Less than half of the time' }, { value: 1, label: 'Some of the time' }, { value: 0, label: 'At no time' },
];

const IMPACT = [
  { value: 0, label: 'Not at all' }, { value: 1, label: 'A little' }, { value: 2, label: 'Moderately' },
  { value: 3, label: 'A lot' }, { value: 4, label: 'Completely' },
];

const band = (label, tone, advice) => ({ label, tone, advice });

export const ASSESSMENTS = [
  {
    id: 'phq9', name: 'PHQ-9', title: 'Depression check (PHQ-9)', area: 'depression', minutes: 2, validated: true,
    intro: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    options: FREQ,
    items: [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
      'Trouble concentrating on things, such as reading the newspaper or watching television',
      'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
      'Thoughts that you would be better off dead or of hurting yourself in some way',
    ],
    extra: { q: 'If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?', options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'] },
    max: 27, higherIsWorse: true,
    bands: [
      { min: 0, max: 4, ...band('Minimal', 'good', 'Your answers suggest few depressive symptoms right now. Keep using the habits that help you.') },
      { min: 5, max: 9, ...band('Mild', 'info', 'Mild symptoms. Self-help CBT (especially behavioural activation) is a good fit; re-check in 2 weeks.') },
      { min: 10, max: 14, ...band('Moderate', 'warn', 'Moderate symptoms. Self-help can help, and it is worth talking to a doctor or therapist about support.') },
      { min: 15, max: 19, ...band('Moderately severe', 'crisis', 'Moderately severe symptoms. Please speak to a doctor or mental health professional — treatment works well.') },
      { min: 20, max: 27, ...band('Severe', 'crisis', 'Severe symptoms. Please seek professional help soon. If you feel unsafe, use Get help now.') },
    ],
    reliableChange: 6, caseness: 10,
    flags: (a) => (a[8] > 0 ? ['self-harm'] : []),
    refs: ['kroenke2001', 'nhs-tt-manual'],
    attribution: 'PHQ-9 developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.',
    chartBands: [{ from: 0, to: 4.5, label: 'Minimal', fill: 'var(--band-good)' }, { from: 4.5, to: 9.5, label: 'Mild' }, { from: 9.5, to: 14.5, label: 'Moderate', fill: 'var(--band-mid)' }, { from: 14.5, to: 27, label: 'Mod-severe+', fill: 'var(--band-high)' }],
  },
  {
    id: 'gad7', name: 'GAD-7', title: 'Anxiety check (GAD-7)', area: 'anxiety', minutes: 2, validated: true,
    intro: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    options: FREQ,
    items: [
      'Feeling nervous, anxious, or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid, as if something awful might happen',
    ],
    extra: { q: 'If you checked off any problems, how difficult have these made it for you to do your work, take care of things at home, or get along with other people?', options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'] },
    max: 21, higherIsWorse: true,
    bands: [
      { min: 0, max: 4, ...band('Minimal', 'good', 'Few anxiety symptoms right now.') },
      { min: 5, max: 9, ...band('Mild', 'info', 'Mild anxiety. Worry time, exposure and relaxation skills are a good fit; re-check in 2 weeks.') },
      { min: 10, max: 14, ...band('Moderate', 'warn', 'Moderate anxiety. CBT self-help can help, and it is worth discussing support with a doctor or therapist.') },
      { min: 15, max: 21, ...band('Severe', 'crisis', 'Severe anxiety. Please speak to a doctor or mental health professional — CBT for anxiety works well.') },
    ],
    reliableChange: 4, caseness: 8,
    flags: () => [],
    refs: ['spitzer2006', 'nhs-tt-manual'],
    attribution: 'GAD-7 developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.',
    chartBands: [{ from: 0, to: 4.5, label: 'Minimal', fill: 'var(--band-good)' }, { from: 4.5, to: 9.5, label: 'Mild' }, { from: 9.5, to: 14.5, label: 'Moderate', fill: 'var(--band-mid)' }, { from: 14.5, to: 21, label: 'Severe', fill: 'var(--band-high)' }],
  },
  {
    id: 'who5', name: 'WHO-5', title: 'Wellbeing check (WHO-5)', area: 'general', minutes: 1, validated: true,
    intro: 'Please indicate for each of the five statements which is closest to how you have been feeling over the last two weeks.',
    options: WHO,
    items: [
      'I have felt cheerful and in good spirits',
      'I have felt calm and relaxed',
      'I have felt active and vigorous',
      'I woke up feeling fresh and rested',
      'My daily life has been filled with things that interest me',
    ],
    max: 100, higherIsWorse: false, multiplier: 4,
    bands: [
      { min: 0, max: 28, ...band('Low wellbeing', 'crisis', 'A score this low often goes with depression. Please consider the PHQ-9 and talking to a professional.') },
      { min: 29, max: 50, ...band('Below average', 'warn', 'Your wellbeing is lower than it could be. The depression and anxiety areas have tools that help.') },
      { min: 51, max: 75, ...band('Fair', 'info', 'Reasonable wellbeing with room to grow.') },
      { min: 76, max: 100, ...band('Good', 'good', 'Good wellbeing — keep doing what works.') },
    ],
    reliableChange: 10,
    flags: () => [],
    refs: ['topp2015'],
    attribution: 'WHO-5 Well-Being Index © Psychiatric Research Unit, WHO Collaborating Centre in Mental Health, Frederiksborg General Hospital. Free to use.',
    chartBands: [{ from: 0, to: 28.5, label: 'Low', fill: 'var(--band-high)' }, { from: 28.5, to: 50.5, label: 'Below avg', fill: 'var(--band-mid)' }, { from: 75.5, to: 100, label: 'Good', fill: 'var(--band-good)' }],
  },
  {
    // Everyday functioning matters as much as symptoms. These questions are ORIGINAL; they cover similar areas of life to
    // standard functioning measures, but they are not the Work and Social Adjustment Scale and are not validated.
    id: 'impact', name: 'Life impact', title: 'Life impact check', area: 'general', minutes: 1, validated: false, allowNA: true,
    intro: 'Over the last 2 weeks, how much have your difficulties got in the way of each part of your life?',
    options: IMPACT,
    items: [
      'Work, study or volunteering',
      'Looking after your home, money and everyday tasks',
      'Social life and time with other people',
      'Time on your own: hobbies, interests and rest',
      'Close relationships with a partner, family or friends',
    ],
    max: 100, higherIsWorse: true, percent: true,
    bands: [
      { min: 0, max: 24, ...band('Little impact', 'good', 'Your difficulties are not getting in the way of daily life much right now.') },
      { min: 25, max: 49, ...band('Some impact', 'info', 'Your difficulties are affecting parts of daily life. Watch which areas improve as you practise.') },
      { min: 50, max: 74, ...band('Considerable impact', 'warn', 'Your difficulties are getting in the way of a lot of daily life. Consider talking to a doctor or therapist alongside self-help.') },
      { min: 75, max: 100, ...band('Severe impact', 'crisis', 'Your difficulties are affecting almost every part of life. Please talk to a doctor or mental health professional about support.') },
    ],
    reliableChange: 20,
    flags: () => [],
    refs: ['mundt2002'],
    attribution: 'Original questions written for CBT Toolkit. They cover similar areas of life to standard functioning measures such as the Work and Social Adjustment Scale (Mundt et al., 2002), but this is not the WSAS, it is not validated, and its scores cannot be compared with WSAS scores.',
    chartBands: [{ from: 0, to: 24.5, label: 'Little', fill: 'var(--band-good)' }, { from: 49.5, to: 74.5, label: 'Considerable', fill: 'var(--band-mid)' }, { from: 74.5, to: 100, label: 'Severe', fill: 'var(--band-high)' }],
  },
  checkin('checkin-productivity', 'productivity', 'Productivity check-in', [
    'I put off important tasks until the last minute.',
    'I start working on something and quickly get distracted.',
    'I wait until I "feel like it" before starting.',
    'I avoid tasks because I worry I won’t do them well enough.',
    'I end the day feeling the important things didn’t get done.',
    'I feel stressed or guilty about tasks I’m avoiding.',
  ]),
  checkin('checkin-self-discipline', 'self-discipline', 'Self-discipline check-in', [
    'I give in to temptations I later regret.',
    'I start new routines but drop them within a couple of weeks.',
    'After one slip, I give up on my goal altogether.',
    'My daily actions don’t match what really matters to me.',
    'I rely on motivation that comes and goes.',
    'I find it hard to stick to plans I’ve made with myself.',
  ]),
  checkin('checkin-time-management', 'time-management', 'Time management check-in', [
    'I run late or rush to meet deadlines.',
    'Urgent but unimportant tasks crowd out important ones.',
    'Tasks take much longer than I planned.',
    'I keep my to-do list in my head.',
    'I switch between tasks or get interrupted many times a day.',
    'I feel I have little control over how my time is spent.',
  ]),
  checkin('checkin-sexual-desire', 'sexual-desire', 'Desire & intimacy check-in', [
    'I have little or no interest in sexual activity, and this bothers me.',
    'I worry about my performance, my body or what my partner thinks during intimacy.',
    'My mind drifts or I feel "in my head" during intimate moments.',
    'I avoid physical closeness in case it leads to sex.',
    'Differences in desire cause tension in my relationship.',
    'Sexual urges or behaviours feel out of my control or clash with my values.',
  ], true),
  checkin('checkin-impulsiveness', 'impulsiveness', 'Impulsiveness check-in', [
    'I act on urges without thinking about the consequences.',
    'I say or do things in the heat of the moment that I later regret.',
    'I buy, eat, drink or scroll more than I intended.',
    'I lose my temper quickly.',
    'I find it hard to wait for things I want.',
    'I act more impulsively when I’m upset, tired or bored.',
  ]),
];

function checkin(id, area, title, items, allowNA = false) {
  return {
    id, name: title.replace(' check-in', ''), title, area, minutes: 1, validated: false, allowNA,
    intro: 'Over the last 2 weeks, how often has each statement been true for you?',
    options: OFTEN, items, max: 100, higherIsWorse: true, percent: true,
    bands: [
      { min: 0, max: 24, ...band('Low difficulty', 'good', 'This area seems to be going fairly well. You can still use the tools to build on it.') },
      { min: 25, max: 49, ...band('Some difficulty', 'info', 'Some difficulties. The "Start here" exercises for this area are a good next step.') },
      { min: 50, max: 74, ...band('Moderate difficulty', 'warn', 'This area is a real struggle at the moment. Pick one or two exercises and practise them most days.') },
      { min: 75, max: 100, ...band('High difficulty', 'crisis', 'This is a big source of difficulty. Consider support from a professional alongside the exercises.') },
    ],
    reliableChange: 20,
    flags: () => [],
    refs: [],
    attribution: 'Original self-reflection questions written for CBT Toolkit. Not a validated questionnaire and not a diagnosis — use it to track your own change over time.',
    chartBands: [{ from: 0, to: 24.5, label: 'Low', fill: 'var(--band-good)' }, { from: 49.5, to: 74.5, label: 'Moderate', fill: 'var(--band-mid)' }, { from: 74.5, to: 100, label: 'High', fill: 'var(--band-high)' }],
  };
}

export const ASSESSMENT_BY_ID = Object.fromEntries(ASSESSMENTS.map((a) => [a.id, a]));

/** Score a completed questionnaire. answers: array of numbers (null = not applicable). */
export function scoreAssessment(a, answers) {
  const vals = answers.slice(0, a.items.length);
  const answered = vals.filter((v) => v != null && v !== '');
  const raw = answered.reduce((s, v) => s + Number(v), 0);
  let score;
  if (a.multiplier) score = raw * a.multiplier;
  else if (a.percent) score = answered.length ? Math.round((raw / (answered.length * (a.options.length - 1))) * 100) : 0;
  else score = raw;
  const b = a.bands.find((x) => score >= x.min && score <= x.max) || a.bands.at(-1);
  return { score, raw, max: a.max, band: b, flags: a.flags(vals), answered: answered.length };
}

/** Compare two scores using the questionnaire's reliable-change threshold. */
export function compareScores(a, prev, next) {
  if (prev == null || next == null) return null;
  const diff = next - prev;
  const better = a.higherIsWorse ? diff < 0 : diff > 0;
  const reliable = Math.abs(diff) >= a.reliableChange;
  let label;
  if (!diff) label = 'No change';
  else if (reliable) label = better ? 'Reliable improvement' : 'Reliable worsening';
  else label = better ? 'Slightly better (within normal ups and downs)' : 'Slightly worse (within normal ups and downs)';
  const recovered = a.caseness != null && prev >= a.caseness && next < a.caseness && reliable && better;
  return { diff, better, reliable, label, recovered };
}
