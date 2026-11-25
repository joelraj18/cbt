// Self-guided CBT courses: 8 weekly sessions for each area, structured the way CBT is delivered by psychologists.
//
//   Session 1      Assessment: the problem in your own words, standard measures, safety and suitability,
//                  and a recommended level of support (NICE stepped care).
//   Session 2      Your CBT map (a collaborative case formulation: Kuyken, Padesky & Dudley, 2009) and goals.
//   Sessions 3–7   Skill modules taken from the evidence-based treatment for that problem.
//   Session 8      Staying well: look back, a relapse-prevention plan and check-ups.
//
// Every weekly session uses the same structure — check-in measures, agenda, practice review, learning with
// guided-discovery questions, in-session practice, a new action plan, then summary and feedback. These are the
// session elements psychologists rate when judging CBT quality (Cognitive Therapy Scale–Revised; Blackburn et al.,
// 2001). Guided self-help in NICE guidance (NG222) usually runs to about 8 regular sessions.
//
// All text is original. Every module cites the research behind it (ids in data/research.js).

export const SESSION_COUNT = 8;
export const SESSION_GAP_DAYS = 6; // weekly rhythm; the next session unlocks after 6 days (you can choose to go on early)

/** "What keeps it going" — maintenance processes shared across many problems, each linked to techniques that target it. */
export const MAINTAINERS = [
  { id: 'avoidance', label: 'Avoiding or escaping situations, tasks or feelings', ex: ['fear-ladder', 'activity-scheduling', 'task-breakdown'] },
  { id: 'withdrawal', label: 'Doing less — withdrawing from people and activities', ex: ['activity-scheduling', 'activity-monitoring'] },
  { id: 'safety', label: 'Safety behaviours: over-preparing, checking, seeking reassurance, “just in case” habits', ex: ['safety-behaviors', 'behavioral-experiment'] },
  { id: 'rumination', label: 'Going over and over things (rumination)', ex: ['rumination-to-action', 'problem-solving'] },
  { id: 'worry', label: 'Worrying about what might happen', ex: ['worry-time', 'worry-tree'] },
  { id: 'self-criticism', label: 'Harsh self-criticism', ex: ['self-compassion-break', 'thought-record'] },
  { id: 'thinking-traps', label: 'Unhelpful thinking patterns, such as catastrophising or mind-reading', ex: ['thinking-traps', 'thought-record', 'decatastrophizing'] },
  { id: 'perfectionism', label: 'Very high standards, or fear of not doing things well enough', ex: ['procrastination-thoughts', 'behavioral-experiment'] },
  { id: 'impulsive', label: 'Acting on urges in the moment', ex: ['urge-surfing', 'stop-skill', 'pause-rule'] },
  { id: 'numbing', label: 'Using alcohol, food, scrolling or spending to escape feelings', ex: ['urge-surfing', 'vulnerability-check', 'chain-analysis'] },
  { id: 'procrastination', label: 'Putting things off until later', ex: ['task-breakdown', 'if-then-plans', 'procrastination-thoughts'] },
  { id: 'sleep', label: 'Poor sleep or an irregular daily routine', ex: ['sleep-diary'] },
  { id: 'body-focus', label: 'Focusing on body sensations, or on how you come across', ex: ['interoceptive-exposure', 'mindful-sensing'] },
  { id: 'overload', label: 'Overloaded, unplanned or constantly interrupted days', ex: ['brain-dump', 'weekly-plan', 'single-tasking'] },
];

/** Situations where a professional assessment should come first (self-guided CBT can still be used alongside, with their agreement). */
export const SUITABILITY = [
  { id: 'suicide-plan', label: 'I have thoughts of ending my life and have made plans, or feel I might act on them', urgent: true },
  { id: 'harm', label: 'I am worried I might hurt someone, or someone is hurting or threatening me', urgent: true },
  { id: 'psychosis', label: 'I hear or see things other people don’t, or feel my thoughts are being controlled' },
  { id: 'mania', label: 'I have had days of extremely high energy or mood with very little need for sleep' },
  { id: 'eating', label: 'I severely restrict food, make myself sick, or have lost a lot of weight' },
  { id: 'substances', label: 'Alcohol or drug use is hard to control, or I need it to get through the day' },
  { id: 'trauma', label: 'I have frequent flashbacks or nightmares about something traumatic' },
];

export const TRIGGERS = ['Work or study stress', 'Conflict with someone', 'Being alone', 'Poor sleep', 'Money worries', 'Health problems or pain', 'Big changes or losses', 'Alcohol or drugs', 'Hormones or menstrual cycle', 'Social media', 'Evenings', 'Weekends'];
export const BODY = ['Tense muscles', 'Racing heart', 'Tired or heavy', 'Restless', 'Butterflies or nausea', 'Hot or flushed', 'Shaky', 'Tight chest', 'Headache', 'Numb or empty'];
export const STRENGTHS = ['Kind', 'Determined', 'Funny', 'Creative', 'Organised', 'Loyal friend', 'Patient', 'Curious', 'Brave', 'Hard-working', 'Good listener', 'Practical', 'Honest', 'Calm in a crisis'];
export const CORE_BELIEFS = ['I’m not good enough', 'I’m a failure', 'I’m unlovable', 'I’m weak', 'I’m bad', 'I don’t belong', 'I’m helpless', 'Others will let me down', 'The world is dangerous'];

/** The three non-module sessions shared by every course. */
export const SESSION_TEMPLATES = {
  1: { stage: 'assessment', title: 'Getting started: where you are now', minutes: 25,
    aim: 'Describe the problem in your own words, measure where you are starting from, check that self-guided CBT suits you, and plan your weekly sessions.',
    refs: ['nice-ng222', 'nhs-tt-manual', 'karyotaki2021'] },
  2: { stage: 'map', title: 'Your CBT map and goals', minutes: 30,
    aim: 'Map one recent example of the problem, find what keeps it going, and set goals you can measure.',
    refs: ['kuyken2009', 'tryon2018', 'barlow2017'] },
  8: { stage: 'ending', title: 'Staying well', minutes: 30,
    aim: 'Look back at what has changed, write your personal staying-well plan and book check-ups with yourself.',
    refs: ['biesheuvel2015', 'beck2020'] },
};

const m = (title, o) => ({ title, ...o });

export const COURSES = [
  {
    id: 'depression', area: 'depression', name: 'Lifting low mood', weeks: 8, primary: 'phq9', checkpoints: ['gad7'],
    summary: 'Behavioural activation and cognitive therapy — the two best-supported psychological treatments for depression — in eight weekly sessions.',
    basis: 'Behavioural activation (Martell et al.) and cognitive therapy (Beck et al.), the approaches used in guided self-help for depression in NHS Talking Therapies.',
    refs: ['ekers2014', 'cuijpers2023', 'richards2016', 'nice-ng222'],
    monitoring: { ex: 'activity-monitoring', perWeek: 7, why: 'Notice how what you do links to how you feel.' },
    warningSigns: ['Pulling away from people', 'Staying in bed or sleeping much more', 'Dropping activities I enjoy', 'Harsh self-talk returning', 'Going over and over things', 'Losing interest in things'],
    modules: [
      m('Do more of what matters', {
        learn: 'Low mood drains energy, so we do less — and doing less means fewer good moments, which lowers mood further. Behavioural activation breaks the loop from the outside in: you plan small activities that bring pleasure, achievement or closeness, and do them whether or not you feel like it. Motivation usually follows action, not the other way round.',
        example: 'Sam hadn’t seen friends for weeks. Instead of waiting to “feel up to it”, he planned a 20-minute coffee on Saturday at 11, and rated his mood before (3/10) and after (5/10).',
        questions: ['Looking back at last week, which activities lifted your mood even a little?', 'What is one small activity you used to enjoy, or that matters to you, that you could plan this week?'],
        ex: 'activity-scheduling', homework: [['activity-scheduling', 4], ['activity-monitoring', 3]], refs: ['ekers2014', 'cuijpers2007ba', 'martell2001'] }),
      m('From stuck thinking to action', {
        learn: 'When we feel low we often go over and over problems: “Why am I like this? Why did that happen?” It feels like problem-solving, but it keeps mood low and takes the place of action. Notice when you are ruminating, then switch from “why?” to “how?”: what is one concrete step you could take right now?',
        example: 'Priya caught herself replaying a mistake at work for an hour. She asked, “How could I put this right?”, sent a two-line email to her manager and went for a walk.',
        questions: ['When do you tend to go over things — what time, place or mood?', 'If you switched from “why?” to “how?”, what would your first small step be?'],
        ex: 'rumination-to-action', homework: [['rumination-to-action', 3], ['activity-scheduling', 4]], refs: ['watkins2008', 'watkins2011', 'nolenhoeksema2008'] }),
      m('Catch your thoughts', {
        learn: 'Low mood brings quick, automatic thoughts — “I’m useless”, “Nothing will change” — that feel like facts. The first step is simply to catch them: when your mood drops, ask “What was going through my mind just then?” Naming the thinking trap, such as mind-reading or all-or-nothing thinking, puts a little distance between you and the thought.',
        example: 'When a friend didn’t reply, Jo noticed the thought “Nobody actually likes me” and felt sad (80%). She recognised it as mind-reading and jumping to conclusions.',
        questions: ['Think of a moment this week when your mood dropped. What went through your mind?', 'Which thinking traps do you fall into most often?'],
        ex: 'thinking-traps', homework: [['thought-record', 3], ['activity-scheduling', 3]], refs: ['beck1979', 'cuijpers2023'] }),
      m('Weigh up your thoughts', {
        learn: 'Thoughts are guesses, not facts. Like a fair-minded detective, look at the evidence for and against the “hot” thought, then write a more balanced one that fits all the facts. The aim isn’t positive thinking — just fairer, more accurate thinking. Ask yourself the questions a CBT therapist would ask, and be as kind to yourself as you would be to a friend.',
        example: 'Evidence for “I’m a failure”: I missed a deadline. Against: I’ve met most deadlines this year and my manager praised my last report. Balanced thought: “I missed one deadline in a hard month — that isn’t failure.” Belief in the old thought fell from 85% to 40%.',
        questions: ['What would you say to a friend who had this thought?', 'Is there anything — even something small — that doesn’t fit the thought?'],
        ex: 'thought-record', homework: [['thought-record', 3], ['self-compassion-break', 3]], refs: ['beck1979', 'braun2015', 'ferrari2019'] }),
      m('Solve problems step by step', {
        learn: 'Some low mood is fuelled by real problems — money, work, relationships. Problem solving turns a big, vague worry into steps: define the problem, list options without judging them, weigh the pros and cons, choose one, plan it, then review how it went.',
        example: 'Overwhelmed by debt, Leo listed options: call the bank, see a free debt adviser, cancel subscriptions, ignore it. He chose to book a free debt-advice appointment for Tuesday.',
        questions: ['Which practical problem is weighing on you most right now?', 'What first step would be small enough to do this week?'],
        ex: 'problem-solving', homework: [['problem-solving', 2], ['activity-scheduling', 4]], refs: ['cuijpers2018pst', 'bell2009'] }),
    ],
  },
  {
    id: 'anxiety', area: 'anxiety', name: 'Calming anxiety and worry', weeks: 8, primary: 'gad7', checkpoints: ['phq9'],
    summary: 'Applied relaxation, worry management, gradual exposure and behavioural experiments — the core of CBT for anxiety — in eight weekly sessions.',
    basis: 'CBT for anxiety as recommended by NICE (CG113): applied relaxation, worry management, exposure and behavioural experiments.',
    refs: ['hofmann2008', 'cuijpers2014gad', 'nice-cg113'],
    monitoring: { ex: 'worry-time', perWeek: 5, why: 'Write worries down as they show up, to see the pattern.' },
    warningSigns: ['Avoiding places or tasks again', 'Checking or asking for reassurance more', 'Worrying for most of the day', 'Sleep getting worse', 'Using safety behaviours again', 'Physical tension most days'],
    modules: [
      m('Understand anxiety and calm your body', {
        learn: 'Anxiety is your body’s alarm system: it speeds up your heart and breathing to get you ready for danger. It is unpleasant but not harmful. The trouble starts when the alarm goes off too easily and we avoid things to make it stop. Learning to relax your body on purpose gives you a skill to use in the moment — as a way to stay in a situation, not to escape it.',
        example: 'Before presentations Ana’s heart raced and she wanted to cancel. She practised muscle relaxation every day, then used a one-minute version just before speaking — and stayed.',
        questions: ['What does anxiety feel like in your body?', 'What do you do when you feel it — and does that help in the long run?'],
        ex: 'pmr', homework: [['pmr', 5], ['paced-breathing', 3]], refs: ['ost1987', 'manzoni2008'] }),
      m('Let worry go — or act on it', {
        learn: 'Worry tries to solve problems that haven’t happened yet. Two tools help. The worry tree sorts worries: if you can act, plan the action; if you can’t, practise letting it go. Worry time postpones worrying to a set 15–30 minutes a day, which shrinks how much of your day it takes over.',
        example: 'At 2 am Tom was worrying about his job. He wrote “job security” on his worry list and told himself, “I’ll think about this at 6 pm.” By 6 pm it felt smaller, and he wrote one action: update his CV on Saturday.',
        questions: ['Which of your worries are about things you can act on, and which aren’t?', 'What usually happens to a worry when you postpone it?'],
        ex: 'worry-tree', homework: [['worry-time', 5], ['worry-tree', 3]], refs: ['borkovec1983', 'mcgowan2013', 'dugas2007'] }),
      m('Face your fears, step by step', {
        learn: 'Avoidance keeps fear alive, because you never get the chance to learn that you can cope. Exposure means facing feared situations on purpose, starting with easier ones, and staying long enough to learn something new — that what you feared didn’t happen, or that you could handle it. Build a ladder of steps from easiest to hardest.',
        example: 'Mia feared motorway driving. Her ladder started with a quiet road at 7 am (fear 30/100) and built up over several weeks to a 20-minute motorway drive at rush hour (fear 90/100).',
        questions: ['What do you avoid because of anxiety?', 'What do you predict would happen if you faced it — and how could you test that?'],
        ex: 'fear-ladder', homework: [['exposure-practice', 3]], refs: ['craske2014', 'wolitzkytaylor2008', 'hofmann2008'] }),
      m('Drop safety behaviours and test predictions', {
        learn: 'Safety behaviours are the little things we do to feel safe: over-preparing, avoiding eye contact, always carrying water, checking. They feel helpful but stop you learning that you were safe anyway. A behavioural experiment tests a fearful prediction directly: write down what you expect, do the thing without the safety behaviour, and see what really happens.',
        example: 'Raj believed “If I don’t rehearse every word, I’ll freeze.” He spoke at a meeting without notes. He stumbled once, nobody seemed to notice, and his belief fell from 90% to 30%.',
        questions: ['What do you do to stop the worst from happening?', 'Which prediction could you test this week?'],
        ex: 'safety-behaviors', homework: [['behavioral-experiment', 2], ['exposure-practice', 3]], refs: ['salkovskis1991', 'bennettlevy2004'] }),
      m('Catastrophes and what-ifs', {
        learn: 'Anxious thinking makes bad outcomes seem both more likely and more awful than they are. Decatastrophising asks three questions: what are the worst, best and most likely outcomes? How would I cope if the worst happened? And how have similar fears turned out before?',
        example: 'Ella feared “If I make a mistake, I’ll be fired.” Most likely: a colleague spots it and she fixes it. Even in the worst case she would find another job — she has done it before.',
        questions: ['What is the most likely outcome of your main worry?', 'If the worst did happen, how would you cope, and who could help?'],
        ex: 'decatastrophizing', homework: [['decatastrophizing', 3], ['exposure-practice', 3]], refs: ['hofmann2008', 'ladouceur2000'] }),
    ],
  },
  {
    id: 'productivity', area: 'productivity', name: 'Beating procrastination', weeks: 8, primary: 'checkin-productivity', checkpoints: ['phq9', 'gad7'],
    summary: 'The CBT approach to procrastination tested in randomised trials — understand your delay, make starting easy, answer the excuses and protect your focus.',
    basis: 'CBT for procrastination (Rozental et al.), implementation intentions and mental contrasting, plus research on interruptions and attention.',
    refs: ['rozental2015', 'rozental2018meta', 'steel2007'],
    monitoring: { ex: 'progress-log', perWeek: 5, why: 'Log what you did — and what you put off — to see the pattern.' },
    warningSigns: ['Tasks piling up again', 'Last-minute rushes', 'Avoiding my inbox or to-do list', 'Telling myself I’ll do it when I feel like it', 'Working with my phone next to me again'],
    modules: [
      m('Why we put things off', {
        learn: 'Procrastination isn’t laziness. It is mostly a way of escaping bad feelings — boredom, anxiety, self-doubt — right now, at the cost of more stress later. It gets worse when a task feels unpleasant, the reward is far away and we doubt we will succeed. Knowing which of these drives your delay tells you what to fix.',
        example: 'Kai kept delaying his tax return. His diagnosis: low confidence (“I’ll get it wrong”) and a distant reward. His fix: ask a friend to sit with him for the first 30 minutes.',
        questions: ['Which task have you been putting off longest, and what feeling comes up when you think of it?', 'What do you do instead — and how do you feel afterwards?'],
        ex: 'procrastination-equation', homework: [['progress-log', 5], ['task-breakdown', 2]], refs: ['steel2007', 'sirois2013'] }),
      m('Make starting easy', {
        learn: 'Big, vague tasks invite delay. Break them into steps so small they feel almost too easy (5–10 minutes), then decide exactly when and where you will do the first one with an if–then plan: “If it’s 9 am on Tuesday, then I’ll open the report and write the headings.” Across many studies, if–then plans had a medium-to-large effect on reaching goals.',
        example: '“Write thesis chapter” became: open the document and write three bullet points (10 minutes). If–then: “If I’ve finished breakfast, then I’ll sit at my desk and write the bullets.”',
        questions: ['What is the very first physical step of your task?', 'When and where exactly will you do it?'],
        ex: 'task-breakdown', homework: [['if-then-plans', 5], ['progress-log', 5]], refs: ['gollwitzer2006', 'rozental2015'] }),
      m('Answer the excuses', {
        learn: 'Procrastination comes with persuasive thoughts: “I’ll do it when I feel like it”, “I work better under pressure”, “It has to be perfect.” Catch these thoughts and answer them, as you would in a thought record: is it true? What happened the last few times? What would help me start?',
        example: 'Thought: “I’ll do it tomorrow when I’m fresh.” Answer: “I said that yesterday. I don’t need to feel like it — I just need to start for 10 minutes.”',
        questions: ['What do you usually tell yourself just before you put something off?', 'What actually happened the last few times you believed that?'],
        ex: 'procrastination-thoughts', homework: [['procrastination-thoughts', 3], ['if-then-plans', 3]], refs: ['rozental2018', 'rozental2015'] }),
      m('Protect your focus', {
        learn: 'Interruptions cost more than the moment they take. People work faster to make up for them, but feel more stressed, and part of their attention stays stuck on the previous task. Design distractions out — phone in another room, notifications off, one tab open — and work in short timed sprints with breaks.',
        example: 'Zoe put her phone in the kitchen and worked in 25-minute sprints. She cleared her inbox and drafted a report before lunch — something that usually took her all day.',
        questions: ['What interrupts you most?', 'What could you change around you to make distraction harder?'],
        ex: 'distraction-design', homework: [['focus-sprints', 5]], refs: ['mark2008', 'leroy2009'] }),
      m('Wish, obstacle, plan', {
        learn: 'Positive daydreaming on its own can drain energy. Mental contrasting works better: picture the outcome you want, then the main obstacle inside you, then make an if–then plan for that obstacle (WOOP). It helps you choose realistic goals and prepares you for the moment things get hard.',
        example: 'Wish: finish my course. Outcome: feel proud. Obstacle: I scroll on my phone after dinner. Plan: if I pick up my phone after dinner, then I’ll put it on charge in the hall and open my notes.',
        questions: ['What is the main obstacle inside you — a habit, a feeling or a thought?', 'What will you do when that obstacle shows up?'],
        ex: 'woop', homework: [['woop', 2], ['if-then-plans', 3]], refs: ['oettingen2012', 'duckworth2011'] }),
    ],
  },
  {
    id: 'self-discipline', area: 'self-discipline', name: 'Building habits and self-control', weeks: 8, primary: 'checkin-self-discipline', checkpoints: ['phq9', 'gad7'],
    summary: 'What research says works better than willpower: values, tiny habits, changing your surroundings, smart commitments and bouncing back from slips.',
    basis: 'Habit-formation research, situational self-control strategies and relapse-prevention methods.',
    refs: ['lally2010', 'duckworth2016', 'wood2016'],
    monitoring: { ex: 'habit-builder', perWeek: 7, why: 'Choose one small habit and track it daily, noticing what helps and what gets in the way.' },
    warningSigns: ['Skipping my habit several days in a row', '“I’ve blown it now” thinking after a slip', 'Temptations back within easy reach', 'Relying on motivation again'],
    modules: [
      m('Start with what matters', {
        learn: 'Self-discipline is easier when the goal is truly yours. Values are what you want your life to stand for — health, family, learning, creativity. Acting on your values is at the heart of acceptance and commitment therapy, a well-supported relative of CBT, and it helps you choose which habits are worth the effort.',
        example: 'Ben felt he “should” go to the gym. When he looked at his values, what mattered was being able to play football with his kids — so he chose a 10-minute evening walk with them instead.',
        questions: ['Which areas of life matter most to you right now?', 'Where is the biggest gap between what matters and what you actually do?'],
        ex: 'values-compass', homework: [['habit-builder', 7]], refs: ['wilson2010', 'atjak2015'] }),
      m('Tiny habits, same cue', {
        learn: 'Habits form through repetition in the same situation, until the cue starts the action automatically. In one study it took a median of 66 days (anywhere from 18 to 254) for a daily behaviour to feel automatic — and missing a single day made no real difference. Make the habit tiny, tie it to an existing routine (“after I pour my coffee…”) and repeat.',
        example: 'After brushing her teeth at night, Amira does two minutes of stretching. Some nights it’s only 30 seconds — but she never skips the cue.',
        questions: ['Which existing routine could be the cue for your new habit?', 'How could you make the habit so small you could do it on your worst day?'],
        ex: 'habit-builder', homework: [['habit-builder', 7]], refs: ['lally2010', 'gardner2012', 'wood2016'] }),
      m('Change the situation, not your willpower', {
        learn: 'Self-control works best before temptation arrives. Changing your situation — so the good choice is easy and the tempting one is hard — is often more effective and less tiring than resisting in the moment. People with good self-control lean heavily on good habits rather than constant effort.',
        example: 'Carlos moved his games console into a cupboard and left his study books on the sofa. He studied more without “trying harder”.',
        questions: ['Where and when do your temptations usually show up?', 'What one change to your surroundings would make the right choice easier?'],
        ex: 'temptation-proofing', homework: [['temptation-proofing', 2], ['habit-builder', 7]], refs: ['duckworth2016', 'galla2015', 'hofmann2012temptation'] }),
      m('Make it fun — or make it binding', {
        learn: 'Two clever tricks. Temptation bundling pairs something you should do with something you love — a favourite podcast only at the gym. Commitment devices lock in your future choice with a public promise, a buddy, or money on the line.',
        example: 'Nina only watches her favourite series while ironing. Joe promised his brother £20 for every missed run — he hasn’t missed one yet.',
        questions: ['What could you pair with a habit you keep avoiding?', 'Who could you make a commitment to?'],
        ex: 'temptation-bundling', homework: [['temptation-bundling', 3], ['commitment-contract', 1]], refs: ['milkman2014', 'gine2010'] }),
      m('Bounce back from slips', {
        learn: 'Everyone slips. The danger is the “what-the-hell” effect: one slip feels like total failure, so we give up altogether. Treat a slip as information, not proof. Be kind to yourself, work out what triggered it, and get back on track at the very next opportunity. Self-compassion after a setback makes people more motivated to improve, not less.',
        example: 'Ama skipped three runs during a busy week. Instead of quitting, she noted what got in the way (late meetings) and switched to morning runs.',
        questions: ['What usually happens after you slip up?', 'What would you say to a friend who had the same slip?'],
        ex: 'lapse-recovery', homework: [['habit-builder', 7], ['lapse-recovery', 1]], refs: ['marlatt1985', 'breines2012'] }),
    ],
  },
  {
    id: 'time-management', area: 'time-management', name: 'Taking back your time', weeks: 8, primary: 'checkin-time-management', checkpoints: ['phq9', 'gad7'],
    summary: 'See where your time goes, decide what matters, plan realistically, protect your attention and review each week.',
    basis: 'Time-management research (Aeon et al., 2021), the planning fallacy and the costs of task switching.',
    refs: ['aeon2021', 'claessens2007'],
    monitoring: { ex: 'time-audit', perWeek: 3, why: 'Record how you really spend your time on a few typical days.' },
    warningSigns: ['Skipping my weekly review', 'Constantly firefighting urgent tasks', 'Running late again', 'Keeping my to-do list in my head'],
    modules: [
      m('See where your time goes', {
        learn: 'Most of us misjudge how we spend our time. A short time audit — noting what you actually did every hour or so for a few days — shows where time leaks away and when your energy is highest. Good time management is linked with better wellbeing and less distress, even more than with better performance.',
        example: 'Lucy’s audit showed two hours a day lost to “quick” email checks. She moved email to 11 am and 4 pm.',
        questions: ['What surprised you most about how you spent your time?', 'When in the day is your energy highest?'],
        ex: 'time-audit', homework: [['time-audit', 2], ['brain-dump', 2]], refs: ['aeon2021', 'macan1994'] }),
      m('Decide what matters most', {
        learn: 'Urgent tasks shout; important ones wait quietly. Experiments show people pick urgent tasks over important ones even when the important task pays off more — the “mere urgency effect”. Sorting tasks by importance and urgency protects time for what matters before it becomes a crisis.',
        example: 'Dev’s matrix showed he’d spent the whole week on “urgent” messages and none on his project proposal — the task his promotion depended on.',
        questions: ['Which important task keeps getting pushed back by urgent ones?', 'What could you delete, hand over or do later?'],
        ex: 'priority-matrix', homework: [['priority-matrix', 2], ['brain-dump', 3]], refs: ['zhu2018', 'claessens2007'] }),
      m('Plan your week realistically', {
        learn: 'We all underestimate how long our own tasks will take — the planning fallacy. Plan your week in time blocks, put important tasks in your best hours first, and add a buffer. Then compare your estimates with what actually happened to learn your personal multiplier.',
        example: 'Ivy guessed her presentation would take 2 hours; it took 5. Her multiplier is about 2.5, so she now blocks two and a half times her first guess.',
        questions: ['Which tasks usually take longer than you expect?', 'What would your week look like if the important things were scheduled first?'],
        ex: 'weekly-plan', homework: [['estimate-vs-actual', 5], ['weekly-plan', 1]], refs: ['buehler1994', 'aeon2021'] }),
      m('One thing at a time', {
        learn: 'Switching between tasks has a hidden cost: each switch takes time to re-focus and leaves part of your attention on the previous task. Batch similar jobs (all calls together) and give one task your full attention for a set period.',
        example: 'Instead of answering messages all day, Omar batches them at 12 and 5, and works on one task in between.',
        questions: ['Which tasks could you batch together?', 'When could you protect an hour for one task?'],
        ex: 'single-tasking', homework: [['single-tasking', 5]], refs: ['rubinstein2001', 'leroy2009'] }),
      m('Review and adjust', {
        learn: 'Plans only get better if you look back. A 15-minute weekly review — what got done, what didn’t, what got in the way, what to change — turns each week into an experiment. Keeping track of progress towards your goals makes you more likely to reach them.',
        example: 'Every Friday at 4 pm Grace reviews her week, moves unfinished tasks and blocks next week’s priorities. Her Mondays feel calmer.',
        questions: ['What went well this week, and what got in the way?', 'What one change will you make next week?'],
        ex: 'weekly-review', homework: [['weekly-review', 1], ['estimate-vs-actual', 3]], refs: ['harkin2016', 'aeon2021'] }),
    ],
  },
  {
    id: 'sexual-desire', area: 'sexual-desire', name: 'Desire and connection', weeks: 8, primary: 'checkin-sexual-desire', checkpoints: ['phq9', 'gad7'],
    summary: 'How desire really works, easing the brakes, getting out of your head, touch without pressure and kinder beliefs about sex.',
    basis: 'Sex-therapy and CBT approaches: responsive desire (Basson), the dual control model (Bancroft), mindfulness-based therapy (Brotto) and sensate focus (Masters & Johnson).',
    refs: ['brotto2014', 'basson2000', 'bancroft2009'],
    medicalNote: 'Pain during sex, a sudden change in desire, or erection or arousal problems can have medical causes, including some medicines. Please see a doctor about these.',
    monitoring: { ex: 'desire-diary', perWeek: 5, why: 'Notice when desire shows up and what is going on around it.' },
    warningSigns: ['Avoiding closeness again', 'Pressure and worry before intimacy', 'Stress or tiredness building up', 'Stopping talking about it with my partner'],
    modules: [
      m('How desire really works', {
        learn: 'Many people expect desire to appear out of the blue (spontaneous desire). But for many people — especially in long relationships — desire is responsive: it shows up after closeness has begun, once you feel relaxed and connected. Both are normal, and knowing your style takes pressure off.',
        example: 'Kim worried she “never felt like it” any more. Her diary showed that desire did appear — usually after cuddling on the sofa, not beforehand.',
        questions: ['When does desire tend to show up for you — before or after closeness begins?', 'What helps you feel relaxed and connected?'],
        ex: 'desire-styles', homework: [['desire-diary', 5]], refs: ['basson2000', 'mitchell2013'] }),
      m('Brakes and accelerators', {
        learn: 'Desire depends on two systems: accelerators (things that turn you on) and brakes (things that turn you off — stress, worry, tiredness, feeling judged). Often the problem isn’t too little accelerator but too much brake. Find your biggest brakes and ease off them.',
        example: 'For Ruth the biggest brakes were a cluttered bedroom and work emails on her phone. A tidier room and phone-free evenings made a noticeable difference.',
        questions: ['What are your biggest brakes right now?', 'What reliably presses your accelerator?'],
        ex: 'brakes-accelerators', homework: [['desire-diary', 4], ['connection-plan', 1]], refs: ['bancroft2009', 'nagoski2015'] }),
      m('Get out of your head', {
        learn: 'Worrying and monitoring yourself during intimacy — “Am I doing it right? What do they think of my body?” — act as strong brakes. Mindfulness trains your attention back to physical sensations without judging them. In trials, mindfulness-based group therapy improved women’s desire, arousal and satisfaction.',
        example: 'During a body scan Lena noticed her mind racing to tomorrow’s to-do list. Each time, she gently brought her attention back to the warmth of her hands.',
        questions: ['What does your mind do during intimate moments?', 'Where in your body can you notice pleasant sensations, even small ones?'],
        ex: 'mindful-sensing', homework: [['mindful-sensing', 4]], refs: ['brotto2014', 'brotto2008'] }),
      m('Touch without pressure', {
        learn: 'Sensate focus is a structured way for couples to rebuild touch without pressure to perform. You take turns touching and being touched, focusing on sensation rather than arousal, with sex off the menu at first. Removing the goal removes the pressure. If you don’t have a partner, practise mindful self-touch instead.',
        example: 'Ali and Sara agreed on three 20-minute sessions with genital touch off-limits. Without pressure to “get somewhere”, both felt more relaxed and curious.',
        questions: ['What pressure do you feel around intimacy?', 'What kind of touch feels comfortable and enjoyable right now?'],
        ex: 'sensate-focus', homework: [['sensate-focus', 2], ['mindful-sensing', 2]], refs: ['weiner2014', 'masters1970'] }),
      m('Kinder beliefs about sex', {
        learn: 'Beliefs such as “Real desire should be spontaneous” or “If I’m not in the mood at the start, something is wrong with me” add pressure and worry — and unhelpful sexual beliefs are a known vulnerability for sexual problems. Catch these thoughts and test them, as in any thought record. Talking openly with a partner also goes with better sexual function.',
        example: 'Thought: “If he wanted me, he’d make the first move.” Evidence against: he’s exhausted from night shifts and suggested a date night. Balanced thought: “It’s tiredness, not a lack of attraction.”',
        questions: ['What beliefs do you hold about how sex “should” be?', 'What would you like your partner to understand?'],
        ex: 'sexual-thought-record', homework: [['sexual-thought-record', 2], ['connection-plan', 1]], refs: ['nobre2006', 'mallory2019'] }),
    ],
  },
  {
    id: 'impulsiveness', area: 'impulsiveness', name: 'Managing urges and impulses', weeks: 8, primary: 'checkin-impulsiveness', checkpoints: ['phq9', 'gad7'],
    summary: 'Skills from dialectical behaviour therapy and mindfulness-based relapse prevention: ride out urges, pause, map the chain and make the future feel real.',
    basis: 'Dialectical behaviour therapy skills (Linehan), mindfulness-based relapse prevention (urge surfing) and episodic future thinking.',
    refs: ['linehan2014', 'bowen2014', 'daniel2013'],
    monitoring: { ex: 'vulnerability-check', perWeek: 5, why: 'Notice how hunger, anger, loneliness and tiredness affect your urges.' },
    warningSigns: ['Acting on urges without pausing', 'Being hungry, angry, lonely or tired more often', 'More arguments', 'Spending, eating or scrolling more than I meant to'],
    modules: [
      m('Ride the wave', {
        learn: 'Urges feel as if they will keep growing until you act, but they rise, peak and fall like a wave — usually within minutes. Urge surfing means noticing the urge in your body, breathing with it and watching it change without acting. In a study of smokers, brief urge-surfing instructions didn’t make urges weaker, but people smoked fewer cigarettes over the next week: it changed how they responded.',
        example: 'At 11 pm Fran felt a strong urge to buy shoes online (8/10). She set a timer and rated the urge every minute. After 12 minutes it was 3/10, and she went to bed.',
        questions: ['Which urges are hardest for you, and where do you feel them in your body?', 'How long do your urges usually last if you don’t act on them?'],
        ex: 'urge-surfing', homework: [['urge-surfing', 3], ['vulnerability-check', 5]], refs: ['bowen2009', 'bowen2014'] }),
      m('Pause before you act', {
        learn: 'Impulsive actions happen in the gap between urge and action. Widen the gap. The STOP skill (Stop, Take a step back, Observe, Proceed mindfully) and a personal pause rule — “I wait 24 hours before any purchase over £50” — give your thinking brain time to catch up.',
        example: 'Wes made a rule: no replying to angry messages for an hour. The reply he sent an hour later was nearly always calmer, and he rarely regretted it.',
        questions: ['In which situations do you act fastest?', 'Which pause rule would help you most?'],
        ex: 'stop-skill', homework: [['stop-skill', 3], ['pause-rule', 5]], refs: ['linehan2014'] }),
      m('Map the chain', {
        learn: 'Impulsive behaviour rarely comes out of nowhere. A chain analysis traces the links — vulnerability (tired, hungry), trigger, thoughts, feelings, urge, action, consequences — so you can find the earliest link where a different choice was possible.',
        example: 'Ron’s chain: slept badly → skipped lunch → criticised by his boss → thought “I deserve a treat” → ordered a takeaway and three beers. The weakest link was skipping lunch, so he now packs one.',
        questions: ['Pick one recent impulsive action. What happened just before it?', 'Where in the chain could you have done something different?'],
        ex: 'chain-analysis', homework: [['chain-analysis', 1], ['stop-skill', 3]], refs: ['rizvi2014', 'linehan2014'] }),
      m('Make the future feel real', {
        learn: 'Impulsivity is partly a “now versus later” problem: a reward now feels bigger than a better reward later. Vividly imagining specific future events — episodic future thinking — makes the future feel real, and in experiments it reduced impulsive choices. Weighing the short- and long-term pros and cons helps too.',
        example: 'Before payday Mel pictures the weekend away she is saving for — the cottage, the walk by the sea — and the urge to spend fades.',
        questions: ['Which future event matters to you that today’s impulses could get in the way of?', 'What are the short- and long-term pros and cons of acting on your urge?'],
        ex: 'future-thinking', homework: [['future-thinking', 3], ['consequences-grid', 1]], refs: ['daniel2013', 'peters2010'] }),
      m('Cool down anger', {
        learn: 'Anger pushes you to act fast. Cooling down before you respond — stepping away, slowing your breathing and questioning hot thoughts such as “They did that on purpose” — prevents regrets. Anger treatments, including cognitive approaches, have shown medium-to-large effects.',
        example: 'When his teenager slammed the door, Paul noticed his jaw clench, said “I’ll talk when I’m calm”, took a 10-minute walk, and then talked.',
        questions: ['What are your early warning signs of anger?', 'What helps you cool down before you respond?'],
        ex: 'anger-cool-down', homework: [['anger-cool-down', 2], ['urge-surfing', 2]], refs: ['delvecchio2004'] }),
    ],
  },
];

export const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));

/** Every research id cited by the course content (used by tests and the standards page). */
export const COURSE_REFS = [...new Set([
  ...Object.values(SESSION_TEMPLATES).flatMap((s) => s.refs),
  ...COURSES.flatMap((c) => [...c.refs, ...c.modules.flatMap((x) => x.refs)]),
])];
