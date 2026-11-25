// Plain-language learning content: the "What is CBT?" guide, thinking traps, glossary and FAQ.

export const CBT_GUIDE = [
  {
    id: 'what', title: 'CBT in one minute',
    body: [
      'CBT stands for <strong>Cognitive Behavioural Therapy</strong>. "Cognitive" means what goes on in your head — your thoughts, beliefs and the way you see things. "Behavioural" means what you do. CBT looks at both, and at how they affect the way you feel.',
      'It is a very practical kind of talking therapy. You won’t spend sessions lying on a couch analysing your childhood or your dreams. Instead, CBT focuses on what is happening in your life <em>now</em>, on clear goals, and on learning skills you can use for the rest of your life.',
      'It is one of the most researched psychological treatments in the world — hundreds of trials show it helps with depression, anxiety, stress, sleep problems, anger and much more.',
    ],
  },
  {
    id: 'idea', title: 'The big idea: thoughts, feelings, body and actions are linked',
    body: [
      'CBT is built on a simple idea: <strong>it isn’t only what happens to us that affects how we feel — it’s also how we interpret it.</strong> The same event can lead to very different feelings depending on what we tell ourselves about it.',
      'Our thoughts affect our feelings. Our feelings affect our body (a racing heart, a heavy, tired feeling). And all of these affect what we do. Then what we do feeds back into how we think and feel. Try the interactive examples below to see the cycle in action.',
    ],
  },
  {
    id: 'habit', title: 'How the cycle becomes a habit',
    body: [
      'Over weeks, months or years, the same loop of thoughts, feelings and actions can repeat so many times that it becomes automatic — like a well-worn path. You might start avoiding more and more situations, or automatically blame yourself whenever something goes wrong.',
      'The tricky part is that the things we do to feel better in the moment — avoiding, withdrawing, snapping at people, scrolling, putting things off — often keep the problem going in the long run. The more we do them, the stronger the cycle gets.',
    ],
  },
  {
    id: 'break', title: 'How CBT breaks the cycle',
    body: [
      'You can step into the cycle at any point. CBT gives you tools to:',
      '<ul><li><strong>Notice</strong> the pattern — what situations, thoughts and feelings show up.</li><li><strong>Check your thoughts</strong> — are they facts, or guesses? Is there a fairer way to see things?</li><li><strong>Change what you do</strong> — try a different action and see what really happens.</li><li><strong>Practise</strong> — new paths in the brain get stronger the more you use them.</li></ul>',
      'Changing either your thinking or your behaviour tends to improve your mood — and doing both works best.',
    ],
  },
  {
    id: 'like', title: 'What doing CBT is like',
    body: [
      'CBT is usually short-term — often somewhere between 6 and 20 sessions with a therapist, or a few weeks to months of self-help. It is structured: you agree on goals, learn a skill, and then practise it in your daily life.',
      'Between sessions you do "homework" — exercises like the ones on this site. This practice isn’t optional extra: research shows people who practise more improve more. It can feel like hard work, especially at first.',
      'CBT can be delivered one-to-one, in groups, by phone or video, through self-help books, or online — like here. Guided self-help (with some support from a person) tends to work better than doing it completely alone.',
    ],
  },
  {
    id: 'who', title: 'Who can CBT help?',
    body: [
      'There is good evidence that CBT helps with depression, generalised anxiety, panic attacks, phobias, social anxiety, OCD, PTSD, insomnia, stress, anger, eating problems, chronic pain and fatigue, and more. Its techniques also help with everyday goals like beating procrastination, building habits and managing time.',
    ],
  },
  {
    id: 'right', title: 'Is CBT right for me? An honest answer',
    body: [
      'CBT helps a lot of people — but it doesn’t work for everyone, and that is nothing to be ashamed of. Some things to know:',
      '<ul><li><strong>It takes effort.</strong> You need to practise the skills regularly to see a difference.</li><li><strong>It can feel uncomfortable.</strong> Facing fears or talking about feelings can be hard, especially at first.</li><li><strong>It is fairly short-term.</strong> Very complex or long-standing problems may need longer or different kinds of therapy.</li><li><strong>It isn’t either/or.</strong> CBT can be combined with medication and other support.</li></ul>',
      'If CBT doesn’t feel right, talk to your doctor about alternatives — such as interpersonal therapy (IPT), acceptance and commitment therapy (ACT), counselling, psychodynamic therapy, EMDR for trauma, medication or peer support. Charities like <a href="https://www.mind.org.uk/information-support/drugs-and-treatments/talking-therapy-and-counselling/" target="_blank" rel="noopener">Mind</a> (UK) and <a href="https://www.nami.org/" target="_blank" rel="noopener">NAMI</a> (US) explain the options in plain language.',
    ],
  },
  {
    id: 'site', title: 'How to use this site',
    body: [
      '<ol><li><strong>Check in</strong> — a 1–2 minute questionnaire gives you a starting point to measure progress against.</li><li><strong>Pick an area</strong> — start with the one that bothers you most.</li><li><strong>Do the "Start here" exercises</strong> — each one explains the idea in plain words, shows a worked example, and lets you do it right here.</li><li><strong>Practise little and often</strong> — 10–15 minutes most days beats one long session a week.</li><li><strong>Watch your progress</strong> — your Reports page turns your entries into charts and insights.</li></ol>',
      'Everything you type stays in this browser. Nothing is sent to a server, and there are no accounts.',
    ],
  },
];

// Extra everyday cycle example for the CBT guide (the seven area examples are added alongside it).
export const MISTAKE_CYCLE = {
  id: 'mistake', name: 'A small mistake',
  title: 'Example: a typo in a work email',
  situation: 'You notice you sent an email to your whole team with an obvious typo.',
  thought: '"Everyone will think I’m careless. I always mess things up."',
  feeling: 'Embarrassed and ashamed (shame 70/100).',
  body: 'Hot face, sinking feeling in your stomach.',
  behaviour: 'You avoid colleagues all day, re-check every message five times and stay late.',
  result: 'You’re exhausted, more anxious about mistakes, and the "I always mess up" belief grows.',
  better: {
    thought: '"Everyone makes typos. One small slip doesn’t say anything about my whole job."',
    feeling: 'A little embarrassed (shame 20/100).',
    body: 'Calmer; the hot feeling fades.',
    behaviour: 'You send a one-line correction with a smiley and carry on with your day.',
    result: 'Nobody mentions it. You learn that small mistakes are survivable.',
  },
};

export const THINKING_TRAPS = [
  { id: 'all-or-nothing', name: 'All-or-nothing thinking', simple: 'Seeing things in black and white, with no middle ground.', example: '"If I don’t get 100%, I’ve failed."', question: 'Is there a middle ground? What would 70% look like?' },
  { id: 'overgeneralising', name: 'Overgeneralising', simple: 'Treating one event as a never-ending pattern ("always", "never").', example: '"I got rejected — I’ll always be alone."', question: 'Is it really always or never? Can I think of exceptions?' },
  { id: 'mental-filter', name: 'Mental filter', simple: 'Focusing only on the negative and ignoring the rest.', example: 'Getting ten compliments and one criticism, and only thinking about the criticism.', question: 'What am I leaving out? What went well?' },
  { id: 'discounting', name: 'Discounting the positive', simple: 'Deciding good things "don’t count".', example: '"They only said that to be nice."', question: 'If a friend did this well, would I say it doesn’t count?' },
  { id: 'mind-reading', name: 'Mind reading', simple: 'Assuming you know what others are thinking — usually something bad about you.', example: '"She didn’t smile — she must be annoyed with me."', question: 'What else could explain it? How could I find out?' },
  { id: 'fortune-telling', name: 'Fortune telling', simple: 'Predicting things will go badly, as if it were certain.', example: '"The interview will be a disaster."', question: 'What actually happened the last times I predicted this?' },
  { id: 'catastrophising', name: 'Catastrophising', simple: 'Jumping to the worst possible outcome and believing you couldn’t cope.', example: '"This headache means something terrible is wrong."', question: 'What’s the most likely outcome? If the worst happened, how would I cope?' },
  { id: 'emotional-reasoning', name: 'Emotional reasoning', simple: 'Believing something is true because it feels true.', example: '"I feel stupid, so I must be stupid."', question: 'Is a feeling the same as a fact? What’s the evidence?' },
  { id: 'shoulds', name: '"Should" statements', simple: 'Rigid rules about how you or others must behave.', example: '"I should be able to handle this without help."', question: 'Who says? What would be a kinder, more flexible rule?' },
  { id: 'labelling', name: 'Labelling', simple: 'Putting a harsh label on yourself or others after one event.', example: '"I’m such an idiot."', question: 'Would I call a friend that for the same mistake? What did I actually do?' },
  { id: 'personalising', name: 'Personalising & blame', simple: 'Taking all the blame for things that had many causes — or putting all the blame on others.', example: '"The party was boring because of me."', question: 'What other factors played a part? How much is really mine?' },
  { id: 'magnifying', name: 'Magnifying / minimising', simple: 'Blowing up the bad, shrinking the good.', example: '"My mistake was huge; my success was luck."', question: 'How big will this seem in a week? A year?' },
];

// Quiz items for the thinking-traps exercise: thought → correct trap id.
export const TRAP_QUIZ = [
  { thought: 'My boss asked to talk tomorrow. I’m definitely getting fired.', answer: 'fortune-telling', also: ['catastrophising'] },
  { thought: 'I ate one biscuit, so my whole diet is ruined. Might as well eat the packet.', answer: 'all-or-nothing' },
  { thought: 'He hasn’t texted back. He must think I’m boring.', answer: 'mind-reading' },
  { thought: 'I feel like a fraud, so I must be one.', answer: 'emotional-reasoning' },
  { thought: 'I failed my driving test. I never get anything right.', answer: 'overgeneralising' },
  { thought: 'They liked my presentation, but they were just being polite.', answer: 'discounting' },
  { thought: 'I should never feel anxious — strong people don’t.', answer: 'shoulds' },
  { thought: 'I forgot her birthday. I’m a terrible person.', answer: 'labelling' },
  { thought: 'The team missed the deadline — it’s all my fault.', answer: 'personalising' },
  { thought: 'My chest feels tight. What if it’s a heart attack and I collapse alone?', answer: 'catastrophising', also: ['fortune-telling'] },
  { thought: 'The review had nine good points and one suggestion. The suggestion is all I can think about.', answer: 'mental-filter' },
  { thought: 'Anyone could have won that award; it’s no big deal. But my typo was unforgivable.', answer: 'magnifying', also: ['discounting'] },
];

export const GLOSSARY = [
  { term: 'Automatic thoughts', def: 'Quick, often unnoticed thoughts that pop into your head in response to a situation. In CBT you learn to catch and check them.' },
  { term: 'Avoidance', def: 'Staying away from situations, feelings or tasks that feel uncomfortable. Brings short-term relief but usually keeps problems going.' },
  { term: 'Behavioural activation (BA)', def: 'A CBT treatment for depression: planning and doing meaningful, enjoyable activities to rebuild mood — action first, motivation follows.' },
  { term: 'Behavioural experiment', def: 'Testing a belief by doing something and observing what actually happens — like a scientist testing a prediction.' },
  { term: 'Belief rating', def: 'How strongly you believe a thought, from 0% to 100%. Useful for seeing how beliefs shift after you examine them.' },
  { term: 'Catastrophising', def: 'Jumping to the worst-case scenario and assuming you couldn’t cope with it.' },
  { term: 'Chain analysis', def: 'A DBT tool that maps the chain of events, thoughts and feelings leading to a problem behaviour, to find where to break the chain.' },
  { term: 'Cognitive restructuring', def: 'Identifying unhelpful thoughts, weighing the evidence and finding a more balanced, realistic way of seeing things.' },
  { term: 'Cognitive triad', def: 'Beck’s idea that depression involves negative views of yourself, the world and the future.' },
  { term: 'Core beliefs', def: 'Deep, long-standing beliefs about yourself, others and the world (e.g., "I’m not good enough") that shape automatic thoughts.' },
  { term: 'Decatastrophising', def: 'Working out how likely the feared outcome really is, and how you would cope if it did happen.' },
  { term: 'Dual Control Model', def: 'A model of sexual response: desire depends on "accelerators" (sexual excitation) and "brakes" (sexual inhibition).' },
  { term: 'Episodic future thinking', def: 'Vividly imagining specific future events. Shown to reduce impulsive "now over later" choices.' },
  { term: 'Exposure', def: 'Gradually and repeatedly facing feared situations, objects, thoughts or sensations so your brain learns they are safe enough.' },
  { term: 'Expectancy violation', def: 'The surprise when what you feared doesn’t happen. Maximising this surprise makes exposure more effective.' },
  { term: 'Five areas / hot cross bun model', def: 'A simple picture of how situations, thoughts, feelings, body sensations and behaviours all influence each other.' },
  { term: 'Homework', def: 'Practice between sessions. People who do more homework tend to improve more.' },
  { term: 'Hot thought', def: 'The automatic thought that carries the strongest emotion in a situation — the best one to work on.' },
  { term: 'Implementation intention', def: 'An "if–then" plan: "If situation X happens, then I will do Y." Strongly linked to following through on goals.' },
  { term: 'Inhibitory learning', def: 'The modern explanation of exposure: you don’t erase fear, you learn a new, stronger "safe" memory that competes with it.' },
  { term: 'Interoceptive exposure', def: 'Deliberately bringing on harmless body sensations (like a racing heart) to learn they are not dangerous — used for panic.' },
  { term: 'Mental contrasting (WOOP)', def: 'Imagining your wish and its best outcome, then the main obstacle inside you, then making a plan to overcome it.' },
  { term: 'Mindfulness', def: 'Paying attention to the present moment on purpose, without judging it.' },
  { term: 'Planning fallacy', def: 'Our tendency to underestimate how long our own tasks will take, even when we know similar tasks ran late before.' },
  { term: 'Reliable change', def: 'A change in a questionnaire score big enough that it is unlikely to be just measurement noise.' },
  { term: 'Responsive desire', def: 'Sexual desire that emerges after closeness or arousal has begun, rather than appearing spontaneously beforehand.' },
  { term: 'Rumination', def: 'Repetitive, passive thinking about problems and feelings ("why do I always feel like this?"). It deepens low mood.' },
  { term: 'Safety behaviours', def: 'Things people do to prevent a feared outcome (e.g., avoiding eye contact, carrying water). They stop you learning you would have been okay.' },
  { term: 'Sensate focus', def: 'A structured sex-therapy exercise of mindful, pressure-free touching, built up in stages.' },
  { term: 'Stimulus control', def: 'Changing cues in your environment to change behaviour — e.g., only worrying during a set "worry time", or using bed only for sleep.' },
  { term: 'SUDS', def: 'Subjective Units of Distress Scale: a 0–100 rating of how distressed you feel right now.' },
  { term: 'Temptation bundling', def: 'Only allowing yourself a guilty pleasure while doing a task you tend to avoid.' },
  { term: 'Urge surfing', def: 'Noticing an urge in your body and riding it like a wave — it rises, peaks and falls — without acting on it.' },
  { term: 'Values', def: 'What matters most to you and how you want to live. Values give direction to goals and habits.' },
  { term: 'Worry time', def: 'Postponing worries to a set 15–30 minute slot each day, rather than worrying on and off all day.' },
];

export const FAQ = [
  { q: 'Is my information private?', a: 'Yes. Everything you enter is stored only in this browser on this device (IndexedDB). There are no accounts and nothing is uploaded. You can export an encrypted backup, and delete everything at any time in Settings.' },
  { q: 'Is this therapy?', a: 'No. This is an educational self-help toolkit based on CBT research. It can be used on its own or alongside a therapist, but it is not a replacement for professional assessment or treatment.' },
  { q: 'How often should I practise?', a: 'Little and often works best — around 10–20 minutes on most days. Research shows that the amount of practice people actually do predicts how much they improve.' },
  { q: 'What if an exercise makes me feel worse?', a: 'Some exercises (like exposure) are meant to feel uncomfortable at first — that discomfort is part of learning. But if you feel overwhelmed, unsafe, or much worse for more than a few days, pause and speak to a professional. If you are in crisis, use Get help now.' },
  { q: 'Which area should I start with?', a: 'Start with whatever is causing you the most trouble. If you are not sure, take the wellbeing check-in and the depression and anxiety questionnaires — they will point you in a direction.' },
  { q: 'Can therapists use this with clients?', a: 'Yes. Every exercise can be printed as a blank worksheet, clients can share their own printed or exported progress reports, and every technique links to its research.' },
  { q: 'Where does the research come from?', a: 'From published studies, reviews, guidelines and books. Every reference with a DOI was matched against Crossref (the official DOI registry) and, where available, its key numbers were checked against the PubMed or OpenAlex abstract. Books and official guidelines link to their publisher. The Research page shows the details and links to every paper.' },
  { q: 'Why is there advertising?', a: 'Ads (if enabled by the site owner) keep the toolkit free. They only load if you agree, are never shown on crisis, exercise, journal, check-in or report pages, and your entries are never shared with anyone.' },
];

// "Why CBT? The evidence" — shown on the Learn page (each point links to verified research).
export const EVIDENCE_POINTS = [
  { title: 'It is one of the most tested therapies', text: 'A review of 106 meta-analyses found strong support for CBT across anxiety, stress, anger, depression and more. An earlier review of 16 rigorous meta-analyses found large effects for depression and most anxiety disorders.', refs: ['hofmann2012', 'butler2006'] },
  { title: 'It works for depression — and keeps working', text: 'Across 409 trials, CBT had moderate-to-large effects that lasted 6–12 months, matched medication in the short term and beat it at follow-up. High-quality trials suggest a moderate true effect.', refs: ['cuijpers2023', 'cuijpers2013'] },
  { title: 'Self-help and online CBT work too', text: 'Guided self-help worked as well as face-to-face CBT for depression; self-guided internet CBT still helped (number needed to treat: 8). Internet CBT shows moderate-to-large effects for anxiety and depression.', refs: ['cuijpers2019formats', 'karyotaki2017', 'andersson2019'] },
  { title: 'Practice is the active ingredient', text: 'Therapy with homework had larger effects than therapy without (d = 0.48), and the more practice people did, the more they improved (r = .26).', refs: ['kazantzis2010', 'mausbach2010'] },
  { title: 'Measuring progress improves outcomes', text: 'Routinely tracking scores and feeding them back reduced deterioration and nearly doubled reliable improvement for people at risk of poor outcomes. This site uses the same "reliable change" thresholds as NHS services.', refs: ['lambert2018', 'jacobson1991', 'gyani2013', 'nhs-tt-manual'] },
];
