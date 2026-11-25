# CBT Toolkit

**Evidence-based CBT exercises, explained simply — private by design.**

A free, static web app that helps people work on seven areas of life with Cognitive Behavioural Therapy (CBT) techniques:

| Area | Examples of exercises |
|---|---|
| **Depression** | Behavioural activation (activity scheduling & monitoring), thought records, problem solving, rumination → action, exercise for mood, sleep diary (CBT-I), self-compassion |
| **Anxiety** | Fear ladder + exposure practice with live fear ratings, behavioural experiments, worry time, worry tree, decatastrophising, safety-behaviour audit, panic-sensation practice, relaxation, breathing pacer |
| **Productivity** | If–then plans, task breakdown, done list, WOOP, focus sprints, distraction design, procrastination thought record, the "procrastination equation" |
| **Self-discipline** | 66-day habit tracker, temptation-proofing, values compass, lapse recovery, temptation bundling, commitment contracts, future-self letter |
| **Time management** | Time audit, weekly time-blocking (exports to your calendar), priority matrix, estimate-vs-actual (personal planning-fallacy multiplier), brain dump, weekly review, batching |
| **Sexual desire & intimacy** | Desire styles, brakes & accelerators, sensate focus, mindful body awareness, connection plan, intimacy thought record, desire diary, unwanted-urge trigger map |
| **Impulsiveness** | Urge surfing (live urge-wave chart), STOP skill, chain analysis, pause rule, episodic future thinking, anger cool-down, HALT vulnerability check, pros & cons |

**59 interactive exercises · 8 questionnaires (PHQ-9, GAD-7, WHO-5 + 5 area check-ins) · 188 research references** (168 DOI-verified against Crossref, 129 checked against PubMed abstracts).

### Highlights
- **Plain language first.** Every area and exercise opens with "In simple words" and an everyday worked example; an interactive *thought → feeling → body → behaviour* cycle shows how problems keep going and how CBT breaks the loop. The research is one click deeper.
- **Honest evidence labels.** Each exercise is graded A (strong) → D (practice-based) and links to the studies behind it, with sample sizes and effect sizes.
- **Fully interactive.** Step-by-step wizards with autosaved drafts, timers, trackers, charts, printable blank worksheets, and calendar (.ics) reminders.
- **Progress reports.** Reliable-change analysis of questionnaire scores (NHS Talking Therapies thresholds), mood trends, exercise insights linked to the research — generated live with every step timed. Print/PDF, HTML, JSON and CSV export.
- **Transparent.** A "What's happening?" panel shows every operation and how long it took (boot ≈ 0.2 s, search ≈ 7 ms).
- **Private.** No accounts, no analytics, no server storage. Data lives in the browser (IndexedDB), with optional AES-256 encrypted backups.
- **Built-in search engine.** BM25F ranking, stemming, synonyms ("libido" → sexual desire), typo tolerance, phrase search, facets — entirely client-side.
- **Works offline** (service worker) and is installable as an app. Light/dark themes, larger text option, keyboard shortcuts (Ctrl/⌘ K), WCAG-minded markup.
- **Safety net.** "Get help now" on every page, crisis lines for many countries, a private safety plan, and an automatic crisis prompt if the PHQ-9 self-harm item is endorsed.
- **AdSense-ready.** Reserved ad slots, a consent prompt, ad-free zones for sensitive pages, `ads.txt`, and an automatic CSP switch.

> CBT Toolkit is an educational self-help resource. It is not a diagnosis or a substitute for professional care.

---

## Quick start

Requires Node.js 20+ (only for the dev server and tests — the site itself has no dependencies or build step).

```bash
npm run dev
```

Open http://localhost:8788.

```bash
npm test
```

Runs 37 unit and content-integrity tests (search engine, scoring, reliable change, report engine, statistics, calendar export, encryption, and checks that every exercise, citation and form is complete).

Optional browser test of the main user flows (needs Playwright):

```bash
npm i -D playwright && npx playwright install chromium
```

```bash
npm run e2e
```

Re-verify every DOI against Crossref (network required):

```bash
npm run verify-citations
```

---

## Deploy to Cloudflare Pages (from GitHub)

The site is the static folder `public/`. Pick **one** of these options.

### Option A — Cloudflare Git integration (recommended, no secrets)
1. Push this repository to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → choose the repository.
3. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `public`
4. Deploy. Every push to your production branch redeploys; other branches get preview URLs.

### Option B — GitHub Actions
`.github/workflows/deploy-cloudflare.yml` deploys on every push to `main`. Add two repository secrets:
- `CLOUDFLARE_API_TOKEN` — an API token with **Cloudflare Pages: Edit** permission
- `CLOUDFLARE_ACCOUNT_ID` — your account ID

Without the secrets the workflow simply skips the deploy step. `ci.yml` runs the tests on every push and pull request.

### Option C — Wrangler CLI
```bash
npx wrangler pages deploy public --project-name cbt-toolkit
```

After deploying, set `SITE.url` in `public/js/config.js` to your domain and run `npm run build` (updates `sitemap.xml` / `robots.txt`).

**Why it works on any static host:** routing uses URL hashes (`#/area/anxiety`), so no server rewrites are needed; search, storage, reports and exports all run in the browser. `public/_headers` sets security headers (Cloudflare Pages reads it automatically).

---

## Enable Google AdSense

Ad space is already reserved (dashed "Ad space reserved" boxes) on content pages: home, area pages, research library, learn and search.

1. Apply at [adsense.google.com](https://adsense.google.com) and wait for approval.
2. In `public/js/config.js` set `ADS.client` to your publisher ID (`ca-pub-…`) and paste your ad-unit slot IDs into `ADS.slots` (`banner`, `inArticle`, `sidebar`, `footer`).
3. In `public/ads.txt` replace `pub-0000000000000000` with your ID and remove the leading `#`.
4. Run `npm run build` (Cloudflare runs it automatically with Option A). This switches the Content-Security-Policy in `_headers` from *strict* to *AdSense-compatible*. Google's reference AdSense CSP uses per-request nonces, which a static site cannot generate, so the build uses Google's documented fallback sources instead.
5. In AdSense → **Privacy & messaging**, turn on the European regulations (GDPR) message (and US state messages if relevant) — Google's certified consent management for EEA/UK/Swiss visitors.

How ads behave:
- Nothing loads until a publisher ID is set **and** the visitor clicks **Allow ads** in the consent prompt (choice stored locally; changeable in Settings).
- **Ad-free zones** (configurable in `ADS.adFreeRoutes`): crisis help, exercises, toolbox, check-ins, journal, mood, plan, reports, settings, privacy. Sensitive pages never show ads.
- Slots keep a fixed height, so pages don't jump when ads load. Set `ADS.showPlaceholders = false` to hide the empty boxes before approval.
- The privacy policy page already includes Google's required third-party cookie disclosures.

---

## Customise
- **Name and branding:** `SITE` in `public/js/config.js`, plus the `<title>`/meta tags in `public/index.html`. Colours are CSS tokens at the top of `public/css/app.css` (light and dark).
- **Crisis lines:** `public/js/data/resources.js` — put your country first.
- **Add an exercise:** add an object to the right file in `public/js/data/exercises/` (title, plain-language `simple`, `why`, `steps`, `example`, `tips`, evidence `level`, `refs`, and a `form` schema). `npm test` checks it is complete and that every reference exists.
- **Add research:** add an entry to `public/js/data/research.js` (include the DOI), then run `npm run verify-citations`.

## Project structure
```
public/                 ← the deployable site (Cloudflare Pages output directory)
  index.html            app shell (no inline scripts; strict CSP)
  css/app.css           design system (light/dark tokens, print styles)
  js/app.js             boot sequence, header/nav, search palette, live activity panel
  js/config.js          site name + Google AdSense settings
  js/core/              router (hash), IndexedDB store, safe HTML templating, perf log, icons
  js/lib/               search engine, stemmer, charts (SVG), stats, report engine, .ics, crypto, ads
  js/ui/                form/wizard engine, cycle diagram, shared components, 10 interactive widgets
  js/views/             pages: home, areas, exercise, check-ins, mood, plan, journal, reports, research, search, toolbox, learn, help, settings…
  js/data/              areas, 59 exercises, questionnaires, 188 research references, learning content, crisis lines
  sw.js · manifest.webmanifest · _headers · ads.txt · robots.txt · sitemap.xml · icons/
scripts/                dev server, build (sw precache, CSP, sitemap), citation verifier
tests/                  node:test unit tests + optional Playwright e2e flows
docs/REPORT.md          project report: plan, research method, evidence summary, QA results
```

## Credits & licences
- PHQ-9 and GAD-7: developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.
- WHO-5 Well-Being Index © Psychiatric Research Unit, WHO Collaborating Centre in Mental Health — free to use.
- Research metadata from Crossref, PubMed and OpenAlex; plain-language summaries are original.
- Code: MIT licence.
