# CBT Toolkit — Project Report

*Plan, research method, evidence base, build and quality assurance for an evidence-based CBT exercise website (static, Cloudflare Pages + GitHub, browser-only storage).*

---

## 1. Summary

CBT Toolkit is a free, private web app with **59 interactive CBT exercises** across seven areas — depression, anxiety, productivity, self-discipline, time management, sexual desire & intimacy, and impulsiveness. It includes **8 questionnaires**, a **progress-report engine**, a **daily practice hub (Today)** with **8 guided programmes**, and a **research library of 188 references**. All 168 references with a DOI were verified against Crossref's DOI registry, and the key numbers in 153 were checked against their PubMed (127) or OpenAlex (26) abstracts.

The guiding principle is to **explain things simply and show the science openly**. Every area and exercise starts with a plain-language explanation and an everyday example. Every claim links to its source, and every operation the app performs is timed and shown to the user.

| What | Result |
|---|---|
| Exercises | 59 (12 rated A · 37 B · 9 C · 1 D) |
| Questionnaires | PHQ-9, GAD-7, WHO-5 (validated, verbatim) + 5 original area check-ins |
| References | 188 (76 meta-analyses/reviews/guidelines · 30 randomised trials · 82 other studies, books, measures) |
| Verification | 168 DOIs resolved via Crossref · numbers in 153 checked against abstracts (127 PubMed, 26 OpenAlex) |
| Daily practice | Today hub (check-in → personalised practice → skill of the day → reflection), streaks and weekly goal, 8 programmes (126 programme days), calendar reminders, installable app |
| App start-up | ≈ 140 ms to interactive (local, headless Chromium) |
| Search | 349 documents · 3,301 terms indexed in ≈ 48 ms · ≈ 6.5 ms per query |
| Tests | 55/55 unit tests · 288/288 route renders with 0 JS errors · 32/32 end-to-end checks · 0 axe-core accessibility violations · no sideways scrolling at 320 px |
| Privacy | 0 bytes of user data sent anywhere; IndexedDB + optional AES-256-GCM encrypted backups |

---

## 2. Requirements

| Requirement | How it is met |
|---|---|
| CBT behaviour exercises for 7 areas, "every single detail" | 59 exercises. Each has a plain summary, why it works, steps, a worked example, tips, pitfalls, evidence grade, studies and an interactive form or tool. |
| Exercises are actually done on the site | Step-by-step wizards with autosaved drafts, validation and live computed results. Ten custom tools: fear ladder, habit tracker, priority matrix, breathing pacer, guided muscle relaxation, focus timer, urge and anxiety trackers, thinking-traps quiz, motivation calculator and values compass. |
| Information stored in the browser alone | IndexedDB (with a localStorage fallback). No accounts, analytics or server storage. Export, encrypted backup, restore and delete-all are all available. |
| Search engine, Cloudflare/GitHub compatible | A custom client-side engine (BM25F, stemming, synonyms, typo tolerance, phrases, facets). The site is fully static with hash routing, so it needs no server and runs on any host. |
| Research papers: proven, scientific, most impactful | 188 verified references. Exercises are graded A–D and ordered by evidence and impact, with "Start here" picks per area. |
| Show research details, "what's going on", load numbers | Paper cards show sample size, effect size, DOI, PubMed and "cite this". The "What's happening?" panel times every operation. Search shows result counts and milliseconds, and reports show a live, timed generation pipeline. |
| "I also want to have this report" | In-app progress reports (print/PDF, HTML, JSON, CSV), plus this project report. |
| *Added:* simple and understandable, with examples (like the Mind video) | A "What is CBT?" guide in plain words: the thought–feeling–behaviour cycle, how it becomes a habit, how CBT breaks it, and whether CBT is right for you. An interactive cycle diagram has 8 everyday examples, and every exercise has a worked example. All text is original. |
| *Added:* room for Google AdSense | Reserved fixed-height slots, a consent prompt and ad-free sensitive pages. Also `ads.txt`, the privacy disclosures, and a build-time CSP switch. |
| *Added:* audit and improve; help me do CBT daily | A full audit with fixes (see `docs/AUDIT.md`). A **Today** page is the app's start page: a 30-second check-in, up to four suggestions each with a reason and its study, a skill of the day, and an evening reflection. Also streaks, a weekly goal, guided day-by-day programmes, daily calendar reminders and an install prompt. |

---

## 3. Research method

1. **Candidate list.** About 165 key papers were drafted from the CBT and behaviour-science literature: meta-analyses first, then landmark RCTs, treatment manuals and measurement papers for each area.
2. **Bibliographic verification (Crossref).** Every paper was looked up by title, first author and year. The DOI, journal, volume, issue, pages and full author list in the database come from the Crossref record, not from memory. About ten mismatches (reprints, book chapters, typos in the registry) were corrected by hand and re-checked by DOI.
3. **Numeric verification (PubMed/OpenAlex).** Abstracts were retrieved for 147 papers. Every number shown on the site was checked against them: effect sizes, sample sizes, percentages and response rates. Figures that only appear in paper bodies were confirmed separately. Examples include Buehler et al.'s thesis estimate of 33.9 days against an actual 55.5 days, and the Natsal-3 figures for lacking interest in sex (15.0% of men, 34.2% of women), which turned out to come from Graham et al. 2017 rather than Mitchell et al. 2013. Claims that could not be confirmed were removed or reworded; for example, an "80–95% of students procrastinate" figure was replaced.
4. **Current statistics.** WHO prevalence figures were updated to the current fact sheets: depression ≈ 5.7% of adults, about 332 million people; anxiety 359 million in 2021. The NHS Talking Therapies thresholds were confirmed: PHQ-9 caseness ≥ 10 with reliable change ≥ 6, and GAD-7 caseness ≥ 8 with reliable change ≥ 4.
5. **Original summaries.** Each reference has a one-line plain-language takeaway and a short technical finding written for this site. Publishers' abstracts are not reproduced.
6. **Ongoing verification.** `npm run verify-citations` re-checks every DOI's title and year against Crossref.

**Evidence grades used on every exercise**

| Grade | Meaning |
|---|---|
| A — Strong | Several randomised trials or meta-analyses for this problem |
| B — Good | RCTs or experiments, or a core ingredient of proven CBT programmes |
| C — Emerging | Promising experiments or small trials; mixed or limited findings |
| D — Practice-based | Widely used clinically, little direct testing |

---

## 4. Evidence summary by area (what is most impactful)

| Area | Best-supported techniques (site order) | Key numbers |
|---|---|---|
| **Depression** | Behavioural activation, thought records, problem solving, exercise, CBT-I | CBT vs control g = 0.79 across 409 trials with 52,702 patients (Cuijpers 2023). BA vs control SMD −0.74 (Ekers 2014). BA was non-inferior to CBT, at 0.1 PHQ-9 points (Richards 2016). Walking/jogging g −0.62 (Noetel 2024). PST g = 0.79, or 0.34 in low-bias trials (Cuijpers 2018). |
| **Anxiety** | Exposure (fear ladder + practice), behavioural experiments, worry time, safety-behaviour dropping, interoceptive exposure | CBT vs placebo g = 0.73 (Hofmann 2008) and g = 0.56 (Carpenter 2018). GAD therapy g = 0.84 (Cuijpers 2014). 77% of GAD patients recovered with IU-focused CBT (Ladouceur 2000). Social phobia CT: 84% vs 42% recovered (Clark 2006). |
| **Productivity** | If–then plans, task breakdown, progress monitoring, WOOP | Implementation intentions d = 0.65 across 94 tests (Gollwitzer 2006). Progress monitoring d = 0.40 across 138 studies (Harkin 2016). MCII g = 0.34 (Wang 2021). Internet CBT for procrastination d up to 0.81 (Rozental 2015). |
| **Self-discipline** | Habit formation, situation selection, values, lapse recovery, temptation bundling, commitment devices | Habits took a median of 66 days (18–254) to become automatic (Lally 2010). Self-control works mainly through habits (de Ridder 2012, 102 studies). Ego depletion d = 0.04 across 23 labs (Hagger 2016). Temptation bundling gave +51% gym visits at first (Milkman 2014). |
| **Time management** | Time audit, time blocking, planning-fallacy correction, brain dump, weekly review | Time management is linked more to wellbeing than to performance (Aeon 2021). Planning fallacy: 33.9 days predicted vs 55.5 actual (Buehler 1994). A bedtime to-do list sped sleep onset (Scullin 2018). |
| **Sexual desire & intimacy** | Psychoeducation (responsive desire, brakes and accelerators), sensate focus, mindfulness, communication and novelty; CBT/ACT for unwanted urges | Psychological treatments d = 0.58 (Frühauf 2013). Mindfulness group therapy improved desire in 117 women (Brotto 2014). Sexual communication is linked to sexual function (r = .35). ACT cut problematic porn use 93% vs 21% (Crosby 2016). |
| **Impulsiveness** | Urge surfing, DBT STOP and chain analysis, if–then plans, episodic future thinking, CBT for anger | Urge surfing reduced smoking without reducing urges (Bowen 2009). MBRP had the most durable effect at 12 months (Bowen 2014). DBT halved suicide attempts (Linehan 2006). CBT for anger d ≈ 0.70 (Beck & Fernandez 1998). |

Cross-cutting evidence that shaped the design:
- **Practice predicts outcome**: homework d = 0.48 and compliance r = .26 (Kazantzis 2010; Mausbach 2010). This motivated the plans, reminders and streaks.
- **Measurement improves outcomes**: routine outcome monitoring reduces deterioration (Lambert 2018). This motivated the check-ins and reliable-change reports.
- **Self-help works, and works better with support**: guided self-help performs like face-to-face CBT, and unguided self-help still helps with NNT 8 (Cuijpers 2019; Karyotaki 2017). This motivated the therapist-friendly worksheets and reports.
- **Safety**: safety planning with follow-up was linked to 45% fewer suicidal behaviours (Stanley 2018). This motivated the private safety-plan tool.

---

## 5. Architecture

- **Static single-page app.** Plain HTML, CSS and ES modules with no framework and no build step required. Hash routing (`#/exercise/thought-record`) works on any static host.
- **Data layer.** IndexedDB with `records` (kind, type, area, timestamps, data, metrics) and `kv` (persistent tools such as the ladder, habits, matrix, plan and safety plan), plus an in-memory mirror for instant queries. It falls back to localStorage. Backups are JSON, optionally encrypted with PBKDF2-SHA-256 (310k iterations) and AES-256-GCM.
- **Content as data.** Areas, exercises (with form schemas and metric, summary and insight functions), questionnaires, research and learning content live in `public/js/data/`, and tests check their integrity.
- **Form engine.** Schema-driven wizards supporting 17 field types: sliders, chips, lists, emotion pickers, timed trackers, computed fields and more. Drafts autosave and entries can be edited later.
- **Search engine.** BM25F with field boosts (title ×3, tags ×2.2, summary ×1.6), Porter stemming, UK/US spelling normalisation, synonyms, prefix expansion, Damerau–Levenshtein typo tolerance against surface words and stems, phrase filtering, facets and snippets. The user's own entries get a separate, in-memory personal index.
- **Charts.** Dependency-free SVG line charts (severity bands and a keyboard-accessible crosshair tooltip), bars and columns, and a calendar heatmap. Every chart has a data-table view, and the colours come from a CVD-validated categorical palette.
- **Reports.** A pure, unit-tested engine produces the overview, questionnaire trends with Jacobson–Truax/NHS reliable change, mood trend (least-squares slope), exercise findings and research-linked insights. The UI reveals each step with its measured time.
- **Daily coach.** `lib/coach.js` holds pure, unit-tested functions. They compute streaks and the weekly goal, today's steps, and programme progress. Pacing is one programme day per calendar day, and days tick themselves off when the matching exercise or check-in is saved. They also rank suggestions from today's check-in, the weekly plan, the programme, measurement due dates and the time of day. Every suggestion carries a reason and a citation. Safety comes first: a recently endorsed PHQ-9 item 9 puts "Talk to someone today" at the top.
- **Offline/PWA.** A service worker precaches every app file with a content-hash version. The app opens on Today, with shortcuts to Today, mood log, toolbox and help. Navigations are network-first and assets stale-while-revalidate. The app has a manifest, icons and shortcuts.
- **Security.** No inline scripts, and all interpolations are escaped by the safe `html` tagged template, including computed exercise outputs. Imported backups are validated and sanitised: known kinds only, schema-typed fields, no prototype keys, capped depth. The CSP is strict (`script-src 'self'`) unless AdSense is configured. Cloudflare `_headers` add nosniff, referrer and permissions policies, frame protection and COOP.

---

## 6. Google AdSense design

- Slots are reserved at a fixed height (no layout shift) on home, area, research, learn and search pages only.
- Ad-free routes include Today, programmes, help/crisis, exercises, toolbox, check-ins, journal, mood, plan, reports, settings and privacy.
- No script loads until a publisher ID is configured **and** the visitor consents. Consent is stored locally and can be changed in Settings. Google's certified CMP (Privacy & messaging) should be enabled for EEA/UK/CH.
- SPA-safe activation pushes each `<ins class="adsbygoogle">` exactly once per page view.
- `scripts/build.mjs` switches `_headers` to an AdSense-compatible CSP when `ADS.client` is set. Google's reference policy needs per-request nonces, which static hosting cannot provide.
- `ads.txt` is a template, and the privacy policy includes Google's required disclosures and opt-out links.

---

## 7. Quality assurance

| Check | Result |
|---|---|
| Unit tests (`npm test`) | **55/55 pass**: the daily coach (streaks, weekly goal, suggestions, safety-first, programme pacing and catch-up, programme and citation integrity, reminders), backup-import sanitising, search relevance, typo tolerance, synonyms, phrases, facets and speed; PHQ-9/GAD-7/WHO-5 scoring and bands; self-harm flag; reliable change and recovery; report engine; sleep efficiency; statistics; .ics validity; encryption round-trip. Content integrity covers every exercise's fields, forms, references and functions, every reference is used, and crisis lines exist. |
| Route smoke test (headless Chromium) | **288/288** views render (every area, all 59 exercises × 4 tabs, every check-in, programme and page, plus unknown IDs) with **0** JavaScript errors |
| End-to-end flows (`npm run e2e`) | **32/32**: quick mood, 5-step thought record, history, PHQ-9 scoring, search palette, fear ladder, habit tracker, urge-surfing tracker, breathing pacer. The full daily loop: check-in, suggestions, programme start, day 1 ticking itself off, skill, reflection, streak and calendar reminders. Then report pipeline and backup → delete-all → restore. |
| Accessibility (axe-core, WCAG 2.2 AA + best practice) | **0 violations** on 35 routes in light and dark, plus first-visit and active-programme states (147 found and fixed in the audit) |
| Mobile | No horizontal page overflow on any of 218 routes at 320 px and 375 px |
| Performance (median of 3) | Ready in 142 ms · index 47.8 ms · DOMContentLoaded 67 ms · query avg 6.5 ms (max 12.5 ms) · report compute 1.1 ms · planning a day from 1,000 entries 2–4 ms · 843 KB uncompressed over 66 files (compressed further by Cloudflare) |

**Bugs found and fixed during QA**

1. **Startup freeze (~46 s).** The footer's live-stats listener requested the search index while it was being built, which started recursive rebuilds until the stack overflowed. The engine is now stored before the event fires, and activity listeners are notified asynchronously in batches. Start-up went from about 46 s to about 0.2 s.
2. **Blocking storage persistence.** `navigator.storage.persist()` could stall start-up in some browsers. It is now fire-and-forget.
3. A mixed `??`/`||` syntax error in the charts module, a citation-spacing issue, organisation names shortened incorrectly ("NHS England" shown as "NHS"), header nav wrapping at 1280 px, and visible focus rings on programmatically focused headings.
4. Interactive quick tools now open straight on "Do it", which suits hard moments better.

The later audit (accessibility, security, mobile, links, bugs and daily-use UX) and its fixes are written up in [`AUDIT.md`](AUDIT.md).

---

## 8. Limitations and next steps

- **Not a clinical service.** Content is educational. A clinical review by a licensed psychologist is recommended before promoting the site as a clinical tool.
- **Area check-ins are original and unvalidated** for productivity, self-discipline, time management, desire and impulsiveness. Validated scales such as the Pure Procrastination Scale, Brief Self-Control Scale, BIS-11 and FSFI may require licences or permission.
- **SEO.** Hash routes are not indexed individually. Pre-rendering static HTML pages per area and exercise would improve discoverability.
- **Languages.** English only. The content-as-data design makes translation straightforward.
- **Device-bound data.** Browser storage can be cleared, so users are prompted to make backups. Optional end-to-end-encrypted sync would be a future feature.
- **Reminders without a server.** Daily reminders are calendar events (`.ics`), not push notifications. Web push needs a server that stores subscriptions, which would break the "nothing leaves your device" promise.
- **Evidence moves.** Re-run `npm run verify-citations` periodically and review new meta-analyses (for example, newer procrastination and sex-therapy trials).

---

## 9. Deployment checklist

1. Push to GitHub. Connect the repository in Cloudflare Pages with build `npm run build` and output `public`, or add the API token and account ID secrets for the Actions workflow.
2. Set `SITE.url` in `public/js/config.js` and run `npm run build`.
3. For AdSense, after approval: set `ADS.client` and the slot IDs, update `ads.txt`, run `npm run build`, and enable Privacy & messaging in AdSense.
4. Put your country's crisis lines first in `public/js/data/resources.js`.
5. Optionally run `npm run verify-citations` and `npm run e2e` before launch.
