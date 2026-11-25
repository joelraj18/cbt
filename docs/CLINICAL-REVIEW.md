# Clinical review kit

*For licensed psychologists and accredited CBT therapists reviewing CBT Toolkit's self-guided CBT course.*

CBT Toolkit does **not** claim to be endorsed by psychologists. The site follows published standards and guidelines and cites every source, but it has not yet been independently reviewed. This kit is how that review happens. A reviewer is listed on the site only after they have completed a review **and** agreed in writing to be named.

The app is a static website and every piece of content is data in the repository. Each item below points to the screen to look at and the file it comes from.

---

## 1. Reviewer declaration

| | |
|---|---|
| Name | |
| Profession and title | e.g. clinical psychologist, accredited CBT therapist |
| Registration body and number | e.g. HCPC, BABCP, state licence, APA membership |
| Scope of review | e.g. whole site · depression and anxiety courses only · safety rules only |
| Date of review and site version | (version in `public/js/config.js`; commit hash) |
| Conflicts of interest | |
| May we name you on the site? | ☐ Yes, with the details above ☐ No, record the review anonymously |
| Signature | |

Only after this is signed should the site owner update `CLINICAL_REVIEW` in `public/js/config.js` (`status: 'reviewed'`, `reviewers: [...]`). The Clinical standards page (`#/standards`) then shows the details. Keep the signed declaration on file.

---

## 2. Claims and scope

Check that nothing on the site overstates what a self-guided website can do.

- [ ] Home page hero and buttons (`#/`, `public/js/views/home.js`)
- [ ] Course chooser: "What this course is — and isn't" (`#/course`, `public/js/views/course.js`)
- [ ] Clinical standards page, including the coverage ratings in both tables (`#/standards`, `public/js/views/standards.js`)
- [ ] Privacy and About pages (`#/privacy`, `#/about`)
- [ ] No wording implies diagnosis, cure, endorsement or equivalence to therapy with a clinician

## 3. Safety

| Rule | Where | Agree? | Comments |
|---|---|---|---|
| PHQ-9 item 9 > 0, or the weekly safety question (same wording) > 0 → immediate crisis message; "Talk to someone today" first on Today; flagged in clinician summary | `lib/therapy.js` (`triage`, `courseAlerts`), `lib/coach.js` | ☐ | |
| Suitability screen (seven items) → recommend professional assessment first; two items are treated as urgent | `data/courses.js` (`SUITABILITY`) | ☐ | |
| PHQ-9 ≥ 16 (NICE NG222 "more severe") or GAD-7 ≥ 15 → recommend a professional, course alongside | `lib/therapy.js` | ☐ | |
| PHQ-9 or GAD-7 ≥ 10 → recommend guided self-help (a supporter reviews progress) | `lib/therapy.js` | ☐ | |
| Reliable deterioration on the main measure → "not on track" review alert | `lib/therapy.js` | ☐ | |
| No reliable change after ≥ 4 weekly measures and ≥ 5 sessions, starting in the clinical range → prompt to review and consider stepping up | `lib/therapy.js` | ☐ | |
| Crisis lines by country are correct for your region | `data/resources.js`, `#/help` | ☐ | |
| Crisis message wording | `views/course.js` (`riskNote`), `ui/components.js` (`crisisCallout`) | ☐ | |

## 4. Measures

- [ ] PHQ-9 and GAD-7 reproduced verbatim, scored correctly, bands correct (`data/assessments.js`; tests in `tests/scoring.test.mjs`)
- [ ] Reliable change (PHQ-9 ≥ 6, GAD-7 ≥ 4) and caseness (PHQ-9 ≥ 10, GAD-7 ≥ 8) match NHS Talking Therapies (`lib/therapy.js` `outcome`)
- [ ] Area check-ins (5) and the life impact check: wording acceptable, and clearly labelled as original and unvalidated
- [ ] Measurement schedule: main measure every session; PHQ-9, GAD-7 and life impact at sessions 1, 4 and 8

## 5. Course structure

- [ ] Eight sessions, at least six days apart (the user can choose to go on early): assessment → CBT map and goals → five skill sessions → staying well
- [ ] Each skill session follows: check-in measures → agenda → practice review → learning with guided-discovery questions → in-session practice → if–then action plan → summary and feedback
- [ ] Practice (homework) is counted automatically from saved exercises and reviewed at the next session
- [ ] CBT map (case formulation) prompts are appropriate: five areas, maintaining factors, triggers, downward arrow, core beliefs, rules, strengths (`views/course.js` `mapSchema`)
- [ ] Maintaining factors → technique mapping is sensible (`data/courses.js` `MAINTAINERS`)
- [ ] Staying-well plan prompts (warning signs, plan, people, setbacks) and check-ups at 1, 3 and 6 months

## 6. Course content

For each skill session, read the lesson, example and questions on screen (`#/course` → start a course, or `public/js/data/courses.js`). Check that the content is accurate, safe and in line with the cited evidence.

### Lifting low mood (depression)

Main measure: phq9 · also at sessions 1, 4 and 8: gad7, life impact · first-week monitoring: Activity & mood diary ×7

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | Do more of what matters | Plan a mood-boosting activity | Plan a mood-boosting activity ×4, Activity & mood diary ×3 | Ekers et al. 2014; Cuijpers et al. 2007; Martell et al. 2001 | ☐ | ☐ | |
| 4 | From stuck thinking to action | From "why?" to "how?" | From "why?" to "how?" ×3, Plan a mood-boosting activity ×4 | Watkins 2008; Watkins et al. 2011; Nolen-Hoeksema et al. 2008 | ☐ | ☐ | |
| 5 | Catch your thoughts | Spot the thinking traps | Thought record ×3, Plan a mood-boosting activity ×3 | Beck et al. 1979; Cuijpers et al. 2023 | ☐ | ☐ | |
| 6 | Weigh up your thoughts | Thought record | Thought record ×3, Self-compassion break ×3 | Beck et al. 1979; Braun et al. 2015; Ferrari et al. 2019 | ☐ | ☐ | |
| 7 | Solve problems step by step | Step-by-step problem solving | Step-by-step problem solving ×2, Plan a mood-boosting activity ×4 | Cuijpers et al. 2018; Bell & D'Zurilla 2009 | ☐ | ☐ | |

### Calming anxiety and worry (anxiety)

Main measure: gad7 · also at sessions 1, 4 and 8: phq9, life impact · first-week monitoring: Worry time ×5

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | Understand anxiety and calm your body | Progressive muscle relaxation | Progressive muscle relaxation ×5, Slow breathing ×3 | Öst 1987; Manzoni et al. 2008 | ☐ | ☐ | |
| 4 | Let worry go — or act on it | The worry tree | Worry time ×5, The worry tree ×3 | Borkovec et al. 1983; McGowan & Behar 2013; Dugas & Robichaud 2007 | ☐ | ☐ | |
| 5 | Face your fears, step by step | Build your fear ladder | Exposure practice ×3 | Craske et al. 2014; Wolitzky-Taylor et al. 2008; Hofmann & Smits 2008 | ☐ | ☐ | |
| 6 | Drop safety behaviours and test predictions | Drop your safety behaviours | Behavioural experiment ×2, Exposure practice ×3 | Salkovskis 1991; Bennett-Levy et al. 2004 | ☐ | ☐ | |
| 7 | Catastrophes and what-ifs | Decatastrophising | Decatastrophising ×3, Exposure practice ×3 | Hofmann & Smits 2008; Ladouceur et al. 2000 | ☐ | ☐ | |

### Beating procrastination (productivity)

Main measure: checkin-productivity · also at sessions 1, 4 and 8: phq9, gad7, life impact · first-week monitoring: Done list & progress log ×5

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | Why we put things off | Diagnose your procrastination | Done list & progress log ×5, Break it down ×2 | Steel 2007; Sirois & Pychyl 2013 | ☐ | ☐ | |
| 4 | Make starting easy | Break it down | If–then plans ×5, Done list & progress log ×5 | Gollwitzer & Sheeran 2006; Rozental et al. 2015 | ☐ | ☐ | |
| 5 | Answer the excuses | Answer your procrastination excuses | Answer your procrastination excuses ×3, If–then plans ×3 | Rozental et al. 2018; Rozental et al. 2015 | ☐ | ☐ | |
| 6 | Protect your focus | Design out distractions | Focus sprints ×5 | Mark et al. 2008; Leroy 2009 | ☐ | ☐ | |
| 7 | Wish, obstacle, plan | WOOP: Wish, Outcome, Obstacle, Plan | WOOP: Wish, Outcome, Obstacle, Plan ×2, If–then plans ×3 | Oettingen 2012; Duckworth et al. 2011 | ☐ | ☐ | |

### Building habits and self-control (self-discipline)

Main measure: checkin-self-discipline · also at sessions 1, 4 and 8: phq9, gad7, life impact · first-week monitoring: Habit builder ×7

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | Start with what matters | Values compass | Habit builder ×7 | Wilson et al. 2010; A-Tjak et al. 2015 | ☐ | ☐ | |
| 4 | Tiny habits, same cue | Habit builder | Habit builder ×7 | Lally et al. 2010; Gardner et al. 2012; Wood & Rünger 2016 | ☐ | ☐ | |
| 5 | Change the situation, not your willpower | Temptation-proof your surroundings | Temptation-proof your surroundings ×2, Habit builder ×7 | Duckworth et al. 2016; Galla & Duckworth 2015; Hofmann et al. 2012 | ☐ | ☐ | |
| 6 | Make it fun — or make it binding | Temptation bundling | Temptation bundling ×3, Commitment contract ×1 | Milkman et al. 2014; Giné et al. 2010 | ☐ | ☐ | |
| 7 | Bounce back from slips | Bounce back from a slip | Habit builder ×7, Bounce back from a slip ×1 | Marlatt & Gordon 1985; Breines & Chen 2012 | ☐ | ☐ | |

### Taking back your time (time-management)

Main measure: checkin-time-management · also at sessions 1, 4 and 8: phq9, gad7, life impact · first-week monitoring: Time audit ×3

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | See where your time goes | Time audit | Time audit ×2, Brain dump: close your open loops ×2 | Aeon et al. 2021; Macan 1994 | ☐ | ☐ | |
| 4 | Decide what matters most | Priority matrix | Priority matrix ×2, Brain dump: close your open loops ×3 | Zhu et al. 2018; Claessens et al. 2007 | ☐ | ☐ | |
| 5 | Plan your week realistically | Plan your week (time blocking) | Estimate vs actual ×5, Plan your week (time blocking) ×1 | Buehler et al. 1994; Aeon et al. 2021 | ☐ | ☐ | |
| 6 | One thing at a time | Batch & single-task | Batch & single-task ×5 | Rubinstein et al. 2001; Leroy 2009 | ☐ | ☐ | |
| 7 | Review and adjust | Weekly review | Weekly review ×1, Estimate vs actual ×3 | Harkin et al. 2016; Aeon et al. 2021 | ☐ | ☐ | |

### Desire and connection (sexual-desire)

Main measure: checkin-sexual-desire · also at sessions 1, 4 and 8: phq9, gad7, life impact · first-week monitoring: Desire & context diary ×5

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | How desire really works | How desire works for you | Desire & context diary ×5 | Basson 2000; Mitchell et al. 2013 | ☐ | ☐ | |
| 4 | Brakes and accelerators | Brakes & accelerators | Desire & context diary ×4, Connection & novelty plan ×1 | Bancroft et al. 2009; Nagoski 2015 | ☐ | ☐ | |
| 5 | Get out of your head | Mindful body awareness | Mindful body awareness ×4 | Brotto & Basson 2014; Brotto et al. 2008 | ☐ | ☐ | |
| 6 | Touch without pressure | Sensate focus | Sensate focus ×2, Mindful body awareness ×2 | Weiner & Avery-Clark 2014; Masters & Johnson 1970 | ☐ | ☐ | |
| 7 | Kinder beliefs about sex | Thought record for intimacy worries | Thought record for intimacy worries ×2, Connection & novelty plan ×1 | Nobre & Pinto‐Gouveia 2006; Mallory et al. 2019 | ☐ | ☐ | |

### Managing urges and impulses (impulsiveness)

Main measure: checkin-impulsiveness · also at sessions 1, 4 and 8: phq9, gad7, life impact · first-week monitoring: Vulnerability check (HALT) ×5

| # | Session | In-session exercise | Practice set | Sources | Accurate? | Safe? | Comments |
|---|---|---|---|---|---|---|---|
| 3 | Ride the wave | Urge surfing | Urge surfing ×3, Vulnerability check (HALT) ×5 | Bowen & Marlatt 2009; Bowen et al. 2014 | ☐ | ☐ | |
| 4 | Pause before you act | The STOP skill | The STOP skill ×3, The pause rule ×5 | Linehan 2014 | ☐ | ☐ | |
| 5 | Map the chain | Chain analysis | Chain analysis ×1, The STOP skill ×3 | Rizvi & Ritschel 2014; Linehan 2014 | ☐ | ☐ | |
| 6 | Make the future feel real | Episodic future thinking | Episodic future thinking ×3, Pros & cons (short vs long term) ×1 | Daniel et al. 2013; Peters & Büchel 2010 | ☐ | ☐ | |
| 7 | Cool down anger | Anger cool-down | Anger cool-down ×2, Urge surfing ×2 | Del Vecchio & O'Leary 2004 | ☐ | ☐ | |

## 7. Exercises

There are 59 interactive exercises (`#/areas`, `public/js/data/exercises/`). Each has a plain-language summary, rationale, steps, worked example, tips, pitfalls, an evidence grade (A–D) and references. Please spot-check at least the exercises used in the courses you review.

## 8. Clinician summary

- [ ] `#/course/summary`: useful for a GP or therapist? Anything misleading or missing (risk, measures, formulation, goals, practice, staying-well plan)?

## 9. Sending your findings

Open an issue in the project repository, or use the contact in `CLINICAL_REVIEW.contact` if the site owner has set one. Please include the section number and the file or screen. Every change made in response is recorded in the commit history.
