// Re-verify every DOI in the research library against Crossref (title, year, journal).
//   node scripts/verify-citations.mjs          → prints a report; exits 1 on mismatches
// Uses the public Crossref REST API (no key needed). Run occasionally; not part of CI (network).
import { research } from '../public/js/data/research.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
const overlap = (a, b) => { const A = new Set(norm(a)), B = new Set(norm(b)); let i = 0; for (const w of A) if (B.has(w)) i++; return i / Math.max(1, Math.min(A.size, B.size)); };
const withDoi = research.filter((r) => r.doi);
let bad = 0, done = 0;
async function check(r) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(r.doi)}`, { headers: { 'User-Agent': 'cbt-toolkit-citation-check/1.0' } });
      if (res.status === 404) return { r, problem: 'DOI not found in Crossref' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const m = (await res.json()).message;
      const title = [(m.title || [''])[0], (m.subtitle || [''])[0]].join(' ');
      const year = (m['published-print'] || m.issued || m['published-online'] || {})['date-parts']?.[0]?.[0];
      const problems = [];
      if (overlap(r.title, title) < 0.7) problems.push(`title differs: "${(m.title || [''])[0]}"`);
      if (year && Math.abs(year - r.year) > 1) problems.push(`year ${year} vs ${r.year}`);
      return { r, problem: problems.join('; ') };
    } catch (e) { if (attempt === 2) return { r, problem: `request failed (${e.message})` }; await new Promise((s) => setTimeout(s, 1000 * (attempt + 1))); }
  }
}
const queue = withDoi.slice();
const results = [];
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) { const r = queue.shift(); results.push(await check(r)); done++; if (done % 25 === 0) console.log(`…${done}/${withDoi.length}`); } }));
for (const { r, problem } of results) if (problem) { bad++; console.log(`✗ ${r.id} (${r.doi}): ${problem}`); }
console.log(`\n${withDoi.length - bad}/${withDoi.length} DOIs verified against Crossref · ${research.length - withDoi.length} references without DOI (books, guidelines, fact sheets).`);
process.exit(bad ? 1 : 0);
