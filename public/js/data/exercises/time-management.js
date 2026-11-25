import { rate, text, long, num, chips, radio, info, when, date, n, short } from './_fields.js';
import { mean, median } from '../../lib/stats.js';

export const TIME_CATS = [['sleep', 'Sleep'], ['work', 'Work / study'], ['commute', 'Commuting'], ['chores', 'Chores & errands'], ['exercise', 'Exercise'], ['social', 'Family & friends'], ['screens', 'Leisure screens'], ['hobbies', 'Hobbies & creative'], ['selfcare', 'Self-care & meals'], ['other', 'Other']];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default [
  {
    id: 'time-audit', area: 'time-management', also: ['productivity'], title: 'Time audit',
    tagline: 'Find out where your hours really go.', level: 'B', minutes: 5, difficulty: 'Easy',
    frequency: 'Daily for one week, then occasionally.',
    simple: 'Most of us don’t know where our time actually goes — we guess, and we’re often wrong. For a week, record roughly how many hours you spent on each type of activity each day. The averages show your real week, your biggest time leaks, and where there’s room for what matters.',
    why: 'You can’t manage what you can’t see. Monitoring time use is a core time-management behaviour linked to greater perceived control of time — which research finds is the main route by which time management reduces stress and improves wellbeing.',
    steps: ['Each evening, estimate the hours spent in each category (they should add up to about 24).', 'Note your most valuable hour and your biggest time leak.', 'After a week, look at the average breakdown in History.', 'Choose one leak to shrink and one valuable activity to protect.'],
    example: { title: 'Leo’s eye-opener', rows: [['Leisure screens', '4.5 h/day (he guessed 1–2)'], ['Exercise', '0.2 h/day'], ['Decision', 'Phone off at 9pm; 30-minute walk after dinner']] },
    tips: ['Rough estimates are fine — the pattern matters.', 'Screen-time reports on your phone help you be accurate.'],
    pitfalls: ['Judging yourself — curiosity first, changes later.'],
    science: 'Time-management behaviours relate to perceived control of time, lower stress and better wellbeing; time management is linked even more strongly to wellbeing than to performance.',
    refs: ['claessens2007', 'macan1994', 'aeon2021', 'harkin2016'],
    form: { fields: [
      date('date', 'Day'),
      ...TIME_CATS.map(([id, label]) => num(id, `${label} (hours)`, { min: 0, max: 24, step: 0.25 })),
      { id: 'total', type: 'computed', label: 'Total', compute: (d) => { const t = TIME_CATS.reduce((s, [id]) => s + (n(d[id]) || 0), 0); return `${t.toFixed(2).replace(/\.00$/, '')} hours ${Math.abs(t - 24) <= 1 ? '✓' : t > 24 ? '— that’s more than 24, check your numbers' : '— about ' + (24 - t).toFixed(1) + ' h unaccounted for'}`; } },
      text('valuable', 'Most valuable hour today'),
      text('leak', 'Biggest time leak'),
      rate('satisfaction', 'How satisfied are you with how you spent today?'),
    ] },
    summarize: (d) => { const top = TIME_CATS.filter(([id]) => n(d[id])).sort((a, b) => d[b[0]] - d[a[0]]).slice(0, 2); return top.map(([id, l]) => `${l} ${d[id]}h`).join(' · ') || 'Time audit'; },
    metrics: (d) => ({ ...Object.fromEntries(TIME_CATS.map(([id]) => [id, n(d[id])])), satisfaction: n(d.satisfaction) }),
    chart: [{ key: 'satisfaction', label: 'Satisfaction' }],
    yMax: 10,
    insight: (recs) => {
      if (!recs.length) return null;
      const items = TIME_CATS.map(([id, label]) => ({ label, value: mean(recs.map((r) => n(r.data[id]) || 0)) })).filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
      return { title: `Average day (from ${recs.length} audits)`, items, format: (v) => `${v.toFixed(1)} h`, note: 'Hours per day on average.' };
    },
  },
  {
    id: 'weekly-plan', area: 'time-management', also: ['productivity'], title: 'Plan your week (time blocking)',
    tagline: 'Give your priorities real slots in your calendar.', level: 'B', minutes: 20, difficulty: 'Medium',
    frequency: 'Once a week (Sunday or Monday morning).',
    simple: 'A to-do list says what; a calendar says when. Time blocking means choosing your top priorities for the week and booking specific blocks of time for them — like appointments with yourself — with buffer space for the unexpected. You can send the blocks straight to your phone’s calendar.',
    why: 'Planning when and where you’ll act makes follow-through far more likely, and time-management training increases people’s sense of control over time and reduces stress. Building in buffers corrects for the planning fallacy.',
    steps: ['Pick your top 3 priorities for the week.', 'Block time for each — ideally at your sharpest time of day.', 'Add buffer time (about 30%) for overruns and surprises.', 'Batch small tasks (email, admin) into one or two blocks a day.', 'Download the blocks to your calendar.', 'Review at the end of the week.'],
    example: { title: 'Nia’s week', rows: [['Priorities', 'Finish grant draft · prepare workshop · 3 gym sessions'], ['Blocks', 'Mon–Wed 9–11 grant · Thu 2–4 workshop · Mon/Wed/Fri 6pm gym'], ['Buffer', 'Fri 9–12 left open']] },
    tips: ['Protect blocks like meetings.', 'Put the hardest work at your peak time of day.'],
    pitfalls: ['Filling every minute — leave space.', 'Planning more hours than you actually have.'],
    science: 'Implementation intentions (deciding when and where) strongly improve follow-through. Time-management training increased perceived control of time and reduced stress in RCTs; we systematically underestimate task durations.',
    refs: ['gollwitzer2006', 'hafner2010', 'hafner2015', 'buehler1994', 'schmidt2007'],
    form: { fields: [
      date('week', 'Week starting'),
      { id: 'priorities', type: 'list', label: 'Top priorities this week', rowLabel: 'Priority', minRows: 3, maxRows: 5, fields: [text('p', 'Priority')] },
      { id: 'blocks', type: 'list', label: 'Time blocks', rowLabel: 'Block', minRows: 1, addLabel: 'Add a block', fields: [text('title', 'What'), { id: 'day', type: 'select', label: 'Day', options: DAYS }, { id: 'start', type: 'time', label: 'Start' }, num('mins', 'Minutes', { min: 5, max: 600 })] },
      rate('buffer', 'Buffer to keep free (%)', { min: 0, max: 60, step: 5, minLabel: '0%', maxLabel: '60%', start: 30 }),
      { id: 'tot', type: 'computed', label: 'Planned', compute: (d) => { const m = (d.blocks || []).reduce((s, b) => s + (n(b.mins) || 0), 0); return m ? `${(m / 60).toFixed(1)} hours blocked · with ${d.buffer ?? 30}% buffer that’s ${((m / 60) * (1 + (d.buffer ?? 30) / 100)).toFixed(1)} hours of capacity needed.` : 'Add blocks to see your total.'; } },
    ] },
    summarize: (d) => `${(d.blocks || []).filter((b) => b.title).length} blocks · ${(d.priorities || []).map((p) => p.p).filter(Boolean).join(', ')}`,
    metrics: (d) => ({ blocks: (d.blocks || []).filter((b) => b.title).length, hours: Math.round(((d.blocks || []).reduce((s, b) => s + (n(b.mins) || 0), 0) / 60) * 10) / 10 }),
    chart: [{ key: 'hours', label: 'Hours blocked' }],
    calendar: (d) => {
      const base = d.week ? new Date(d.week + 'T00:00:00') : new Date();
      const monday = new Date(base); monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
      return (d.blocks || []).filter((b) => b.title && b.day && b.start).map((b) => {
        const day = new Date(monday); day.setDate(monday.getDate() + DAYS.indexOf(b.day));
        const [h, m] = b.start.split(':').map(Number); day.setHours(h, m, 0, 0);
        const local = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        return { title: b.title, start: local, minutes: n(b.mins) || 60, description: 'Time block planned with CBT Toolkit' };
      });
    },
  },
  {
    id: 'priority-matrix', area: 'time-management', also: ['productivity'], title: 'Priority matrix',
    tagline: 'Sort tasks by importance, not just urgency.', level: 'C', minutes: 10, difficulty: 'Easy',
    frequency: 'Daily or weekly planning.',
    simple: 'Urgent things shout; important things whisper. The priority matrix sorts your tasks into four boxes: Do now (urgent & important), Schedule (important, not urgent), Delegate or shrink (urgent, not important), and Drop (neither). The magic is in the "Schedule" box — that’s where the things that really matter live.',
    why: 'Experiments show people choose urgent tasks over important ones even when the important task has a better payoff. Deliberately sorting by importance counteracts this "mere urgency" bias.',
    steps: ['Add everything on your plate.', 'Mark each task as important (matters for your goals/values) and/or urgent (deadline soon).', 'Do the urgent & important first.', 'Book time for important-not-urgent tasks.', 'Shrink, delegate or batch urgent-not-important ones.', 'Drop what’s neither.'],
    example: { title: 'Kate’s Monday matrix', rows: [['Do now', 'Pay rent (due today)'], ['Schedule', 'Study for certification · call grandma'], ['Delegate / shrink', 'Reply to group chat · approve minor requests'], ['Drop', 'Reorganise photo folders']] },
    tips: ['Most growth lives in "Schedule" — protect time for it.', 'Re-sort weekly; urgency changes.'],
    pitfalls: ['Living permanently in "Do now" — a sign you need more planning time.'],
    science: 'The mere urgency effect: people prefer urgent tasks even when important ones pay more. Direct trials of the matrix itself are lacking, so we rate this as emerging evidence.',
    refs: ['zhu2018', 'claessens2007', 'aeon2021'],
    widget: 'matrix', tool: true,
  },
  {
    id: 'estimate-vs-actual', area: 'time-management', also: ['productivity'], title: 'Estimate vs actual',
    tagline: 'Measure your personal planning fallacy — then correct for it.', level: 'B', minutes: 2, difficulty: 'Easy',
    frequency: 'For a few tasks each week.',
    simple: 'Almost everyone underestimates how long their own tasks will take — even when they know similar tasks ran late before. Log your estimate before starting a task and the real time afterwards. After a few entries, the app calculates your personal multiplier (for example "×1.6") so you can plan realistically.',
    why: 'The planning fallacy is robust: students predicted their thesis would take 34 days and it took 56. Two fixes work: base estimates on your past track record, and "unpack" tasks into steps before estimating.',
    steps: ['Before starting, estimate how long the task will take.', 'Note whether you listed the steps before estimating.', 'When done, enter the actual time (edit the entry from History).', 'Check your multiplier and use it for future plans.'],
    example: { title: 'Ben’s numbers after 10 tasks', rows: [['Typical ratio', 'Actual ÷ estimate = 1.7'], ['With steps listed first', '1.3'], ['New rule', 'Multiply estimates by 1.5 and always list steps']] },
    tips: ['Include interruptions in the actual time — they’re part of reality.'],
    pitfalls: ['Only logging tasks that went well.'],
    science: 'People underestimate their own completion times but not others’; linking predictions to past experiences removed the bias, and unpacking tasks into components reduced it.',
    refs: ['buehler1994', 'kruger2004'],
    form: { fields: [
      text('task', 'Task', { required: true }),
      num('estimate', 'Your estimate (minutes)', { min: 1, max: 10000, required: true }),
      { id: 'unpacked', type: 'checkbox', label: 'Unpacked', checkLabel: 'I listed the steps before estimating' },
      num('actual', 'Actual time (minutes) — add later if needed', { min: 1, max: 10000 }),
      { id: 'ratio', type: 'computed', label: 'Ratio', compute: (d) => (n(d.estimate) && n(d.actual) ? `Took ${(d.actual / d.estimate).toFixed(2)}× your estimate${d.actual > d.estimate ? ' — classic planning fallacy.' : '.'}` : 'Enter the actual time after you finish.') },
    ] },
    summarize: (d) => `${short(d.task, 50)} · est ${d.estimate ?? '–'}m${n(d.actual) ? ` · actual ${d.actual}m (×${(d.actual / d.estimate).toFixed(1)})` : ' · in progress'}`,
    metrics: (d) => ({ estimate: n(d.estimate), actual: n(d.actual), ratio: n(d.estimate) && n(d.actual) ? Math.round((d.actual / d.estimate) * 100) / 100 : null, unpacked: d.unpacked ? 1 : 0 }),
    chart: [{ key: 'ratio', label: 'Actual ÷ estimate' }],
    insight: (recs) => {
      const done = recs.filter((r) => n(r.data.estimate) && n(r.data.actual));
      if (done.length < 2) return null;
      const ratios = done.map((r) => r.data.actual / r.data.estimate);
      const up = done.filter((r) => r.data.unpacked).map((r) => r.data.actual / r.data.estimate);
      const notUp = done.filter((r) => !r.data.unpacked).map((r) => r.data.actual / r.data.estimate);
      const items = [{ label: 'All tasks (median)', value: median(ratios) }];
      if (up.length) items.push({ label: 'Steps listed first', value: median(up) });
      if (notUp.length) items.push({ label: 'No steps listed', value: median(notUp) });
      return { title: `Your planning multiplier: ×${median(ratios).toFixed(2)}`, items, format: (v) => `×${v.toFixed(2)}`, note: `Based on ${done.length} completed tasks. Multiply future estimates by this number.` };
    },
  },
  {
    id: 'brain-dump', area: 'time-management', also: ['anxiety', 'productivity'], title: 'Brain dump: close your open loops',
    tagline: 'Get everything out of your head and give each item a next step.', level: 'B', minutes: 10, difficulty: 'Easy',
    frequency: 'Weekly, or whenever your head feels full. Great before bed.',
    simple: 'Unfinished tasks keep popping into your mind until they have a plan. A brain dump means writing down everything that’s on your mind — tasks, worries, ideas — and then giving each one a next action and a "when" (today, this week, later), or deciding to delegate or drop it. Your mind can then let go.',
    why: 'Experiments show that making a specific plan for an unfinished goal stops it from intruding on your thoughts. Writing a specific to-do list for 5 minutes at bedtime helped people fall asleep faster.',
    steps: ['Write everything on your mind — don’t organise yet.', 'For each item, decide the very next physical action.', 'Give it a "when": today, this week, later, delegate or drop.', 'Put dated items into your calendar or task list.', 'Rate how cluttered your mind feels before and after.'],
    example: { title: 'Sunday night dump', rows: [['Car service', 'Next action: call garage · this week'], ['Mum’s birthday', 'Order flowers online · today'], ['"Should I change job?"', 'Next action: list pros/cons · later'], ['Fix the shelf', 'Drop — it’s fine as it is']] },
    tips: ['Next actions should be physical and visible: "email Sam", not "sort out project".'],
    pitfalls: ['Writing the list but never looking at it again.'],
    science: 'Plan-making eliminated the intrusive effects of unfulfilled goals in experiments; writing a specific to-do list at bedtime shortened sleep onset compared with writing about completed tasks.',
    refs: ['masicampo2011', 'scullin2018', 'heylighen2008'],
    form: { fields: [
      rate('before', 'How cluttered does your mind feel?', { minLabel: '0 = clear', maxLabel: '10 = overloaded' }),
      long('dump', 'Everything on your mind (one per line)', { required: true, rows: 8 }),
      { id: 'items', type: 'list', label: 'Sort the important ones', rowLabel: 'Item', minRows: 1, addLabel: 'Add item', fields: [text('item', 'Item'), text('next', 'Very next action'), { id: 'when', type: 'select', label: 'When', options: ['Today', 'This week', 'Later', 'Delegate', 'Drop'] }] },
      rate('after', 'How cluttered does your mind feel now?', { minLabel: '0 = clear', maxLabel: '10 = overloaded' }),
    ] },
    summarize: (d) => `${String(d.dump || '').split('\n').filter((x) => x.trim()).length} items dumped · clutter ${d.before ?? '–'} → ${d.after ?? '–'}`,
    metrics: (d) => ({ before: n(d.before), after: n(d.after), items: String(d.dump || '').split('\n').filter((x) => x.trim()).length }),
    chart: [{ key: 'before', label: 'Mental clutter before' }, { key: 'after', label: 'Mental clutter after' }],
    yMax: 10,
  },
  {
    id: 'weekly-review', area: 'time-management', also: ['productivity', 'self-discipline'], title: 'Weekly review',
    tagline: '15 minutes to learn from the week and set up the next.', level: 'B', minutes: 15, difficulty: 'Easy',
    frequency: 'Once a week, same time.',
    simple: 'Once a week, look back and look ahead: what went well, what didn’t and why, what you learned, and what your top priorities are for next week. It turns busy weeks into learning, keeps your plans realistic, and gives you a feeling of control.',
    why: 'Regularly monitoring progress improves goal attainment, and planning for unfinished goals frees your mind. A weekly review combines both and catches problems before they snowball.',
    steps: ['Celebrate wins — big and small.', 'Note what didn’t get done and why (without blame).', 'Write one lesson.', 'Check next week’s calendar for deadlines and commitments.', 'Choose next week’s top 3 priorities and block time for them.'],
    example: { title: 'Ade’s Friday review', rows: [['Wins', 'Submitted the bid · ran twice'], ['Not done', 'Budget review — underestimated the bid work'], ['Lesson', 'Big submissions need 2 extra days of buffer'], ['Next week', 'Budget review · start course · run 3×']] },
    tips: ['Same time each week — e.g. Friday afternoon.', 'Keep it short; 15 minutes is enough.'],
    pitfalls: ['Turning it into a self-criticism session.'],
    science: 'Progress monitoring increases goal attainment (d = 0.40); specific plans for unfinished goals reduce intrusive thoughts.',
    refs: ['harkin2016', 'masicampo2011', 'locke2002'],
    form: { fields: [
      date('date', 'Week ending'),
      long('wins', 'Wins this week', { required: true }),
      long('notDone', 'What didn’t happen, and why?'),
      text('lesson', 'One lesson for next week'),
      { id: 'next', type: 'list', label: 'Next week’s top priorities', rowLabel: 'Priority', minRows: 3, maxRows: 5, fields: [text('p', 'Priority')] },
      { id: 'calendar', type: 'checkbox', label: 'Calendar', checkLabel: 'I checked next week’s calendar' },
      rate('satisfaction', 'How satisfied are you with this week?'),
    ] },
    summarize: (d) => `Week review · satisfaction ${d.satisfaction ?? '–'}/10`,
    metrics: (d) => ({ satisfaction: n(d.satisfaction) }),
    chart: [{ key: 'satisfaction', label: 'Satisfaction' }],
    yMax: 10,
  },
  {
    id: 'single-tasking', area: 'time-management', also: ['productivity'], title: 'Batch & single-task',
    tagline: 'Group small tasks and protect deep work from switching.', level: 'B', minutes: 5, difficulty: 'Medium',
    frequency: 'Daily.',
    simple: 'Every time you switch tasks — checking an email mid-report — you pay a hidden cost: it takes time to refocus and part of your mind stays on the last task. Batching means grouping similar small tasks (emails, calls, admin) into set times, so you can single-task on important work in between. Log your blocks and count interruptions to see the difference.',
    why: 'Task switching has a reliable time cost, especially for complex tasks, and leaving a task unfinished leaves "attention residue" that hurts performance on the next one. Interruptions also increase stress.',
    steps: ['Choose one deep-work block today.', 'Batch small tasks into one or two set times.', 'Turn off notifications during the block.', 'Count interruptions and switches.', 'Rate your focus and look for patterns over the week.'],
    example: { title: 'Femi’s Wednesday', rows: [['Deep work', '9:00–11:00 data analysis'], ['Batched', 'Email at 11:15 and 4pm · calls 2–2:30'], ['Interruptions', '2 (down from ~12)'], ['Focus', '8/10']] },
    tips: ['Tell colleagues when your deep-work blocks are.', 'End blocks by noting where you’ll restart — it reduces attention residue.'],
    pitfalls: ['Checking "just one" message during deep work.'],
    science: 'Switching costs are well established; attention residue lowers performance after switching; interrupted work increases stress and time pressure.',
    refs: ['monsell2003', 'leroy2009', 'rubinstein2001', 'mark2008'],
    form: { fields: [
      date('date', 'Day'),
      text('focus', 'Deep-work block — what and when?', { required: true }),
      chips('batched', 'What did you batch?', ['Email', 'Messages', 'Calls', 'Admin', 'Errands', 'Meetings']),
      { id: 'notifOff', type: 'checkbox', label: 'Notifications', checkLabel: 'Notifications were off during the block' },
      num('interruptions', 'Interruptions during the block', { min: 0, max: 200 }),
      num('switches', 'Times you switched tasks yourself', { min: 0, max: 200 }),
      rate('quality', 'Focus quality'),
    ] },
    summarize: (d) => `${short(d.focus, 50)} · ${d.interruptions ?? '–'} interruptions · focus ${d.quality ?? '–'}/10`,
    metrics: (d) => ({ interruptions: n(d.interruptions), switches: n(d.switches), quality: n(d.quality) }),
    chart: [{ key: 'quality', label: 'Focus quality' }, { key: 'interruptions', label: 'Interruptions' }],
  },
];
