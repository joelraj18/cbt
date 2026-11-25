import { html } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SITE, ADS } from '../config.js';
import { research } from '../data/research.js';
import { EXERCISES } from '../data/exercises/index.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { LEVELS } from '../data/areas.js';
import { getEngine } from '../lib/search-index.js';
import { pageHead, levelBadge, isSynthesis } from '../ui/components.js';
import { fmtNum } from '../core/format.js';

export async function privacyView() {
  return {
    title: 'Privacy policy',
    body: html`<div class="container narrow">${pageHead({ title: 'Privacy policy', lede: 'Short version: what you write stays on your device. We never see it.' })}
      <section class="stack" style="--gap:18px">
        <div class="card flat"><h2 style="font-size:1.2rem">Your entries</h2><ul>
          <li>Exercises, check-ins, mood logs, plans, habits and your safety plan are stored only in your browser’s local database (IndexedDB) on this device.</li>
          <li>There are no accounts, and no entries are uploaded to ${SITE.name} or anyone else.</li>
          <li>Search runs inside your browser; your search words are not sent anywhere.</li>
          <li>You can export (optionally encrypted) backups and delete everything at any time in <a href="#/settings">Settings</a>.</li>
          <li>Anyone with access to this browser profile could open the site and see your entries. Use a device lock, and delete your data if you share a device.</li></ul></div>
        <div class="card flat"><h2 style="font-size:1.2rem">Technical data</h2><ul>
          <li>The site is static and hosted on Cloudflare Pages. Like any web host, Cloudflare processes standard request data (such as IP address) to deliver pages and protect against abuse.</li>
          <li>A service worker stores a copy of the site’s files so it works offline.</li>
          <li>Your theme, text-size and advertising choices are saved in your browser’s local storage.</li>
          <li>We do not use analytics or tracking scripts.</li></ul></div>
        <div class="card flat"><h2 style="font-size:1.2rem">Advertising (Google AdSense)</h2>
          <p>${ADS.client ? 'This site may show ads from Google AdSense on content pages to help keep it free.' : 'Advertising is currently switched off. If the site owner enables Google AdSense, the following applies.'}</p><ul>
          <li>Ads are only loaded after you choose "Allow ads", and are never shown on crisis, exercise, toolbox, check-in, journal, mood, plan or report pages.</li>
          <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites. Google’s use of advertising cookies enables it and its partners to serve ads based on your visits to this and other sites.</li>
          <li>You may opt out of personalised advertising in <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google Ads Settings</a>, or opt out of some third-party vendors’ cookies at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">aboutads.info</a>.</li>
          <li>Learn <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">how Google uses information from sites that use its services</a>.</li>
          <li>Ad scripts never receive your CBT entries; nothing you write is placed in ad requests.</li>
          <li>You can change your choice at any time in <a href="#/settings">Settings</a>.</li></ul></div>
        <div class="card flat"><h2 style="font-size:1.2rem">Not medical advice</h2><p style="margin:0">${SITE.name} is an educational self-help resource. It does not provide diagnosis or treatment. If you are in crisis, please use <a href="#/help">Get help now</a>.</p></div>
      </section></div>`,
  };
}

export async function aboutView() {
  const s = getEngine().stats;
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  EXERCISES.forEach((e) => { counts[e.level]++; });
  return {
    title: 'About & methodology',
    body: html`<div class="container narrow">${pageHead({ title: 'About & methodology', lede: 'How this toolkit was built, how evidence is graded and checked, and what it can and can’t do.' })}
      <section class="stack" style="--gap:18px">
        <div class="stats">${[['Exercises', EXERCISES.length], ['Questionnaires', ASSESSMENTS.length], ['References', research.length], ['Meta-analyses & reviews', research.filter(isSynthesis).length], ['DOI-verified', research.filter((r) => r.doi).length], ['Search terms indexed', s.terms]].map(([l, v]) => html`<div class="stat"><div class="label">${l}</div><div class="value">${fmtNum(v)}</div></div>`)}</div>
        <div class="card flat"><h2 style="font-size:1.2rem">Principles</h2><ul>
          <li><strong>Plain language first.</strong> Every area and exercise starts with "In simple words" and an everyday example; the science is one click away.</li>
          <li><strong>What works best comes first.</strong> Exercises in each area are ordered by strength of evidence and how practical they are to start with.</li>
          <li><strong>Honest evidence labels.</strong> We say when evidence is strong, emerging or mainly clinical experience.</li>
          <li><strong>Built on psychologists’ own standards — without claiming their endorsement.</strong> The 8-session CBT course follows the CBT competence framework, the elements of a good CBT session, and NICE and NHS Talking Therapies guidance. <a href="#/standards">See the clinical standards</a>, including what the course can’t do.</li>
          <li><strong>Private by design.</strong> No accounts, no uploads, no analytics.</li></ul></div>
        <div class="card flat"><h2 style="font-size:1.2rem">How evidence is graded</h2><div class="stack" style="--gap:8px">${Object.entries(LEVELS).map(([k, v]) => html`<div class="cluster" style="--gap:10px">${levelBadge(k)}<span class="small">${v.desc} <span class="faint">(${counts[k]} exercises)</span></span></div>`)}</div></div>
        <div class="card flat"><h2 style="font-size:1.2rem">How citations were verified</h2><ol>
          <li>Each paper was looked up in <a href="https://www.crossref.org" target="_blank" rel="noopener">Crossref</a> (the official DOI registry) by title, first author and year; the DOI, journal, volume, issue and pages shown come from that record.</li>
          <li>Where available, the abstract was retrieved from PubMed (or OpenAlex) and key numbers — sample sizes, effect sizes, percentages — were checked against it.</li>
          <li>Books, guidelines and fact sheets link to the publisher or official source.</li>
          <li>Plain-language summaries are original writing; publishers’ abstracts are not reproduced.</li></ol>
          <p class="small muted" style="margin:0">Re-check every DOI at any time with <code>node scripts/verify-citations.mjs</code> in the project repository.</p></div>
        <div class="card flat"><h2 style="font-size:1.2rem">Questionnaires</h2><p>The PHQ-9 and GAD-7 (developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc.; no permission required to reproduce) and the WHO-5 Well-Being Index (free to use) are reproduced verbatim with standard scoring. Area check-ins for productivity, self-discipline, time management, desire & intimacy and impulsiveness are original self-reflection questions — useful for tracking change, but not validated.</p></div>
        <div class="card flat"><h2 style="font-size:1.2rem">Technology</h2><ul>
          <li>A static web app (HTML, CSS and JavaScript modules, no frameworks) deployed on Cloudflare Pages from GitHub.</li>
          <li>A built-in search engine (BM25F ranking, Porter stemming, synonyms, typo tolerance) indexes ${fmtNum(s.docs)} documents in the browser.</li>
          <li>Data is stored with IndexedDB (localStorage fallback); backups can be encrypted with AES-256-GCM.</li>
          <li>Works offline after the first visit (service worker) and can be installed as an app.</li></ul></div>
        <div class="card flat"><h2 style="font-size:1.2rem">Limitations</h2><p style="margin:0">Self-help CBT works for many people, but not everyone, and it is not suitable on its own for severe or complex problems or crises. Research findings describe averages; your experience may differ. If things are not improving after a few weeks of regular practice, or are getting worse, please talk to a professional.</p></div>
      </section></div>`,
  };
}

export async function notFoundView() {
  return { title: 'Page not found', body: html`<div class="container narrow"><div class="empty"><h1>Page not found</h1><p>That page doesn’t exist. Try searching, or start from the home page.</p><div class="cluster" style="justify-content:center"><a class="btn primary" href="#/">${icon('home')} Home</a><button class="btn" data-open-search>${icon('search')} Search</button></div></div></div>` };
}
