# CBT Toolkit — Audit and Daily-Practice Upgrade

*November 2026. The goals were to audit the site (accessibility, links, security, mobile, bugs and UX), fix what was found, and make it easy to do CBT every day.*

---

## 1. Summary

| | Before | After |
|---|---|---|
| Accessibility (axe-core, WCAG 2.2 AA + best practice) | 147 violations across 4 rules (8 nested-interactive, 65 colour-contrast, 26 prohibited-ARIA, 48 heading-order) | **0**: 35 routes × light/dark with data, plus first-visit and active-programme states |
| Security | Exercise outputs could render user-typed HTML. Backup import trusted the file. | Escaped by default. Imports are validated, coerced and reported. |
| Mobile | Sideways scrolling on phones (header, glossary, research cards, long badges) | **0 overflow** on all 218 routes at 320 px and 375 px |
| Bugs | Enter key cancelled prompt dialogs. Weekly plan could crash. Not-found pages had no heading. | Fixed, with tests |
| Daily use | No daily starting point, nothing to bring people back, no reminders, no structured path | **Today** hub, **8 guided programmes**, coach suggestions with reasons, streaks, calendar reminders, install as an app |
| Tests | 37 unit · 15 e2e checks | **55 unit · 32 e2e checks** |

---

## 2. How the audit was done

- **Accessibility.** axe-core ran headless in Chromium on 35 key routes, in light and dark themes, with realistic sample data. It ran again on a first-visit (empty) profile and with a programme in progress. Rule sets were WCAG 2.0/2.1/2.2 A and AA plus best practice.
- **Internal links.** Every `#/…` link on the audited pages was resolved against the router and the content data (exercises, areas, questionnaires, references, programmes).
- **External links.** All 32 non-DOI links were requested. DOIs are verified separately with `npm run verify-citations`.
- **Route smoke test.** 288 routes were checked: every page, every exercise tab, every programme and unknown IDs. Each must render an `<h1>` with no JavaScript errors.
- **Mobile.** Page overflow was swept across all 218 content routes at 320 px and 375 px, and across key pages at 320–768 px. Today was screenshotted on phone and desktop in both themes.
- **Code review.** Every `innerHTML` sink and computed output was reviewed, along with the import path, dialogs and date logic.
- **UX review.** Reviewed whether someone could realistically use the site every day.

---

## 3. Findings and fixes

Severity: **High** = broken function, data or safety risk · **Medium** = significant barrier · **Low** = polish.

### Accessibility

| # | Sev. | Finding | Fix |
|---|---|---|---|
| A1 | High | The CBT-cycle diagram was a `role="img"` SVG with focusable buttons inside (8 nodes, 4 pages). Screen readers could not reach the controls properly. | The SVG is now a labelled `group`, and its nodes are real buttons. |
| A2 | High | Colour contrast below 4.5:1 on 65 elements: muted text (4.34:1), the current wizard step dot (4.12:1 light, 3.43:1 dark), and search highlights on links (4.3:1). | Muted text darkened to `#5f6571`. The step dot uses the text colour. Highlights are now an underline band that keeps the link's own contrast. |
| A3 | High | Chart shapes carried `aria-label` without a role (26 nodes). | Charts are labelled groups. Bars are `img`. A keyboard overlay (`button`, "explore with the arrow keys") gives the values. |
| A4 | Medium | Skipped heading levels on 24 pages (48 nodes). | Headings re-levelled. Visual size now comes from classes (`.h3`, `.h4`). Tab panels and result lists got hidden headings, and footer headings are `h2`. |
| A5 | Medium | "Not found" pages for unknown exercises, areas, references, questionnaires and programmes had no `<h1>`, so focus had nowhere to land. | A shared `notFoundPage()` with a heading, a way back, and search. |

### Bugs

| # | Sev. | Finding | Fix |
|---|---|---|---|
| B1 | High | In text-prompt dialogs, pressing **Enter cancelled** instead of confirming. Cancel was the form's first submit button. This affected naming a fear ladder and typing `DELETE` to wipe data. | Cancel is now `type="button"` and closes explicitly. Enter confirms. |
| B2 | Medium | The weekly plan crashed if a stored "times per week" value had no matching day pattern. | Falls back to a safe pattern. |
| B3 | Medium | *(Found while building the daily loop.)* Programme pacing: one busy evening could tick off several future days. | A day only counts practice done after it unlocks. One visit catches up days already earned, one per calendar day. Covered by a regression test. |
| B4 | Low | Computed outputs and tracker charts did not coerce imported numbers. | Numbers are coerced and clamped before drawing. |

### Security and privacy

| # | Sev. | Finding | Fix |
|---|---|---|---|
| S1 | High | Some exercises built result HTML as strings that included the user's own text (for example "if–then" plans, contracts and sleep summaries). Feedback lines were inserted unescaped. Self-XSS was possible, and stored XSS through a crafted backup file. | Computed outputs are escaped unless they are trusted `SafeHTML`. Exercise code now uses the safe `html` template instead of hand-rolled escaping. Feedback is escaped. |
| S2 | High | **Backup import trusted the file**: unknown record kinds, `__proto__` keys, markup inside numeric fields, unlimited nesting, and arbitrary settings keys. | New `sanitizeBackup()`. It accepts only known kinds and types, coerces every field to its schema type, recomputes metrics, strips prototype-polluting keys, caps nesting depth, and allows only known settings keys. It tells the user what was skipped. Four unit tests. |
| S3 | — | Re-checked: no inline scripts, strict CSP (`script-src 'self'`), and 0 bytes of user data leave the device. | No change needed. |

### Links and content accuracy

| # | Sev. | Finding | Fix |
|---|---|---|---|
| L1 | Medium | Ireland's crisis text-line link was out of date. The US "find a CBT therapist" deep link failed. | Updated to `textaboutit.ie` and `abct.org`. |
| L2 | Low | Verification counts were slightly overstated. The site said "each of the 188 references was matched against Crossref" (only the 168 with DOIs can be) and counted 130 PubMed IDs as "checked against PubMed abstract" (127 were; 26 more were checked against OpenAlex abstracts). Two places hard-coded "186". | All counts are now computed from the data and worded exactly. |

**External link status** (32 links): 26 OK. 2 returned 403 and 1 returned 429 from sites that block automated checkers (mind.org.uk, aboutads.info); they open normally in a browser. `telemanas.mohfw.gov.in` serves an incomplete TLS certificate chain to command-line clients, so its phone number (14416) is the primary contact. The sitemap URL is a placeholder until `SITE.url` is set. **Internal links: 0 broken.**

### Mobile layout

| # | Sev. | Finding | Fix |
|---|---|---|---|
| R1 | Medium | Sideways scrolling on phones. Header icons spilled over at ≤ 390 px (+3 px), the glossary at ≤ 390 px (+7 to +77 px), research cards at 320 px (+36 px), and long evidence badges and wide grid children elsewhere. | The header compacts (tagline hidden ≤ 430 px, logo only ≤ 350 px). Grids use `min(…, 100%)` and grid children may shrink. Definition lists stack ≤ 520 px. Badges wrap on phones. |
| R2 | Low | On Today, three stat tiles filled the first phone screen. | Compact two-column tiles, so the check-in is visible straight away. |

### Daily-use UX (the biggest gap)

| # | Sev. | Finding | Fix |
|---|---|---|---|
| U1 | High | No daily starting point. Every visit began with "what should I do?" and nothing brought people back. | **Today** page: the app's start page (manifest `start_url`), first in the navigation, and a "Your day" card on the home page. |
| U2 | High | Beginners had 59 exercises and no order to do them in. | **8 guided programmes**: a 28-day CBT Foundations programme and seven 14-day area programmes. They unlock one day per calendar day and tick themselves off when the matching exercise or check-in is saved. |
| U3 | Medium | No reminders. | One-tap **daily calendar reminders** (`.ics` with a daily RRULE and a link back to Today) for morning check-in and evening reflection. The app can be **installed** to the home screen (Android/desktop prompt, iPhone instructions). |
| U4 | Medium | No feedback loop. | Streak, best streak, weekly practice goal with day dots, milestones, a "welcome back" after a gap, and a check-in consistency insight in reports. |
| U5 | Low | Ad slots on tool pages used in hard moments. | Today, programmes and the toolbox are ad-free. |

---

## 4. The daily routine

Today takes 10–15 minutes and has four steps:

1. **Check in (30 s):** mood, anxiety, energy, sleep, an optional focus area, and one intention. A mood logged anywhere else that day also counts.
2. **Practise:** up to four suggestions, each with a "why today" and its source.
3. **Skill of the day:** 104 short cards (thinking traps, myths vs facts, research facts, CBT words) in a fixed daily rotation.
4. **Evening reflection:** rate the day, one win, what helped, and one small step for tomorrow.

How suggestions are chosen (pure functions in `public/js/lib/coach.js`, unit-tested):

| Signal | Suggestion | Source shown |
|---|---|---|
| PHQ-9 item 9 endorsed in the last 14 days | "Talk to someone today" first, plus the safety plan | Brief safety planning reduces suicidal behaviour (Stanley et al., 2018) |
| A programme day is available | That day's task | The programme's lead study |
| Mood ≤ 3 | Plan a mood-boosting activity; self-compassion break | Ekers et al., 2014; Ferrari et al., 2019 |
| Anxiety ≥ 7 | Slow breathing, then the worry tree | Balban et al., 2023; Dugas et al., 1998 |
| Energy ≤ 3 | Move for your mood | Noetel et al., 2024 |
| Chosen focus area | That area's next "start here" exercise | That exercise's lead study |
| Weekly-plan items behind target | That item ("0 of 3 this week") | More between-session practice, better outcomes (Mausbach et al., 2010) |
| No questionnaire yet / PHQ-9 or GAD-7 ≥ 14 days old | WHO-5 baseline / re-check | Measurement-based care (Lambert et al., 2018) |
| Morning / evening | If–then plan / brain dump and three good things | Gollwitzer & Sheeran, 2006; Scullin et al., 2018; Seligman et al., 2005 |
| Monday / Friday or Sunday | Weekly plan / weekly review | Fresh-start effect (Dai et al., 2014); progress monitoring (Harkin et al., 2016) |
| An exercise not used for 7+ days | A refresher | Homework practice (Kazantzis et al., 2010) |
| Always available | Activity scheduling, thought record, slow breathing | Cuijpers et al., 2007; Cuijpers et al., 2023; Zaccaro et al., 2018 |

An exercise already done today is never suggested again, and suggestions are de-duplicated.

---

## 5. Verification results

| Check | Result |
|---|---|
| Unit tests (`npm test`) | **55/55**, including 14 new daily-loop tests (streaks, weekly goal, gap and milestone, suggestions, safety-first, pacing and catch-up, programme integrity, reminders, citation integrity) and 4 import-sanitiser tests |
| End-to-end (`npm run e2e`) | **32/32**, including the daily loop: check-in, suggestions, programme start, auto-tick, skill, reflection, 4/4 steps, streak, calendar reminders, home card and journal |
| Accessibility (axe-core) | **0 violations**: 35 routes × 2 themes with data, 6 routes first-visit, 4 routes with an active programme |
| Route smoke test | **288/288** routes render an `<h1>`, with **0** JavaScript errors |
| Mobile overflow | **0** across 218 routes at 320 px and 375 px |
| Performance (median of 3) | Ready in **142 ms**. DOMContentLoaded 67 ms. Search index 47.8 ms (349 documents, 3,301 terms, 25,256 words). Query 6.5 ms average (12.5 ms max). Report 1.1 ms. Planning a day with 1,000 saved entries: 2–4 ms. |

---

## 6. Not done, and why

- **Push notifications.** Web push needs a server that holds subscriptions, which would break "your data never leaves the device". Calendar reminders work on every phone with no account.
- **Clinical review.** The content is educational. A licensed psychologist should review it before the site is promoted as a clinical tool.
- **Sites that block bots** (Mind, aboutads.info) could not be checked automatically. Check them by hand before launch.
