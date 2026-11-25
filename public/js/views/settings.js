import { html, raw, on, toast, confirmDialog, promptDialog, download, pref } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { perf } from '../core/perf.js';
import { fmtBytes, fmtNum, fmtMs, dayKey } from '../core/format.js';
import { encryptJSON, decryptJSON } from '../lib/crypto.js';
import { sanitizeBackup } from '../lib/sanitize.js';
import { ads } from '../lib/ads.js';
import { ADS, SITE } from '../config.js';
import { pageHead } from '../ui/components.js';

export async function settingsView() {
  const est = await store.estimate();
  const kinds = { exercise: 0, assessment: 0, mood: 0 };
  store.all().forEach((r) => { kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
  const theme = pref.get('theme') || 'system', text = pref.get('text') || 'normal';
  const body = html`<div class="container narrow">${pageHead({ title: 'Settings, backup & privacy', lede: 'Everything is stored only in this browser. Back it up, move it to another device, or delete it — you are in control.' })}
    <section class="card"><h2 style="font-size:1.2rem">${icon('eye')} Appearance</h2>
      <div class="field"><span class="label">Theme</span><div class="options">${[['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => html`<button class="chip" data-theme-set="${v}" aria-pressed="${theme === v}">${l}</button>`)}</div></div>
      <div class="field"><span class="label">Text size</span><div class="options">${[['normal', 'Normal'], ['large', 'Larger']].map(([v, l]) => html`<button class="chip" data-text-set="${v}" aria-pressed="${text === v}">${l}</button>`)}</div></div>
      <p class="small muted" style="margin:0">Animations are reduced automatically if your device asks for reduced motion.</p></section>

    <section class="card section"><h2 style="font-size:1.2rem">${icon('lock')} Your data on this device</h2>
      <dl class="kv"><dt>Storage</dt><dd>${est.backend}</dd><dt>Entries</dt><dd>${fmtNum(est.records)} (${fmtNum(kinds.exercise)} exercises · ${fmtNum(kinds.assessment)} check-ins · ${fmtNum(kinds.mood)} mood logs)</dd>
      <dt>Size of your entries</dt><dd>${fmtBytes(est.recordsBytes)}</dd>${est.usage != null ? html`<dt>Total site storage</dt><dd>${fmtBytes(est.usage)} used${est.quota ? ` of ${fmtBytes(est.quota)} available` : ''} (includes the offline copy of the site)</dd>` : ''}<dt>Sent to servers</dt><dd><strong>0 bytes</strong> — there is no server-side storage</dd></dl></section>

    <section class="card section"><h2 style="font-size:1.2rem">${icon('download')} Back up & move your data</h2>
      <p class="small muted">Browsers can clear site data (e.g. in private mode or after "clear browsing data"). Download a backup regularly. Add a passphrase to encrypt it with AES-256 — without the passphrase nobody can read it, including you.</p>
      <div class="cluster"><button class="btn primary" data-export>${icon('download')} Download backup</button><button class="btn" data-export-enc>${icon('lock')} Encrypted backup</button><label class="btn" for="imp-file">${icon('upload')} Restore from backup</label><input type="file" id="imp-file" accept="application/json,.json" hidden></div>
      <p class="small faint" data-io-status style="margin:10px 0 0"></p></section>

    ${ADS.enabled && ADS.client ? html`<section class="card section"><h2 style="font-size:1.2rem">${icon('info')} Advertising</h2><p class="small muted">Current choice: <strong>${ads.consent || 'not decided'}</strong>. Ads only appear on content pages and never see your entries.</p>
      <div class="cluster"><button class="btn small" data-ads="granted">Allow ads</button><button class="btn small" data-ads="denied">Don't show ads</button></div></section>` : ''}

    <section class="card section"><h2 style="font-size:1.2rem">${icon('trash')} Delete</h2>
      <div class="cluster"><button class="btn" data-clear-drafts>Clear unsaved drafts</button><button class="btn danger" data-wipe>${icon('trash')} Delete all my data</button></div>
      <p class="small faint" style="margin:10px 0 0">Deleting is permanent unless you have a backup.</p></section>
    <p class="small faint section">${SITE.name} v${SITE.version} · <a href="#/about">About & methodology</a> · <a href="#/privacy">Privacy</a></p></div>`;

  const mount = (root) => {
    const status = (t) => { root.querySelector('[data-io-status]').textContent = t; };
    const exportFile = async (encrypt) => {
      const t0 = perf.now();
      let data = await store.exportAll();
      if (encrypt) {
        const pass = await promptDialog({ title: 'Encrypt backup', body: 'Choose a passphrase (at least 8 characters). Keep it safe — it cannot be recovered.', label: 'Passphrase', type: 'password', confirm: 'Encrypt & download' });
        if (!pass) return;
        if (pass.length < 8) return toast('Passphrase must be at least 8 characters.');
        data = await encryptJSON(data, pass);
      }
      const json = JSON.stringify(data);
      download(`cbt-toolkit-backup-${dayKey(new Date())}${encrypt ? '-encrypted' : ''}.json`, json, 'application/json');
      const ms = perf.now() - t0;
      perf.event(`Created ${encrypt ? 'encrypted ' : ''}backup`, ms, fmtBytes(new Blob([json]).size));
      status(`Backup created in ${fmtMs(ms)} (${fmtBytes(new Blob([json]).size)}).`);
    };
    const offs = [
      on(root, 'click', '[data-theme-set]', (e, b) => { const v = b.dataset.themeSet; if (v === 'system') { pref.del('theme'); document.documentElement.removeAttribute('data-theme'); } else { pref.set('theme', v); document.documentElement.setAttribute('data-theme', v); } root.querySelectorAll('[data-theme-set]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }),
      on(root, 'click', '[data-text-set]', (e, b) => { const v = b.dataset.textSet; if (v === 'large') { pref.set('text', 'large'); document.documentElement.setAttribute('data-text', 'large'); } else { pref.del('text'); document.documentElement.removeAttribute('data-text'); } root.querySelectorAll('[data-text-set]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }),
      on(root, 'click', '[data-export]', () => exportFile(false)),
      on(root, 'click', '[data-export-enc]', () => exportFile(true)),
      on(root, 'change', '#imp-file', async (e, input) => {
        const file = input.files[0]; if (!file) return;
        try {
          let data = JSON.parse(await file.text());
          if (data.encrypted) {
            const pass = await promptDialog({ title: 'Encrypted backup', label: 'Passphrase', type: 'password', confirm: 'Decrypt' });
            if (!pass) return;
            data = await decryptJSON(data, pass);
          }
          const { data: clean, report } = sanitizeBackup(data);
          const replace = await confirmDialog({ title: 'How should we restore?', body: `This backup has ${report.kept} valid entries${report.dropped ? ` (${report.dropped} invalid entries will be skipped)` : ''}. "Replace" deletes what is on this device first; "Merge" keeps both.`, confirm: 'Replace', cancel: 'Merge' });
          const res = await store.importAll(clean, replace ? 'replace' : 'merge');
          status(`Restored ${res.records} entries and ${res.kv} saved tools${report.dropped ? `; skipped ${report.dropped} invalid entries` : ''}.`);
          toast('Backup restored.');
        } catch (err) { status(`Could not restore: ${err.message}`); toast('Restore failed.'); }
        input.value = '';
      }),
      on(root, 'click', '[data-ads]', (e, b) => { ads.setConsent(b.dataset.ads); toast(b.dataset.ads === 'granted' ? 'Ads allowed on content pages.' : 'Ads turned off.'); }),
      on(root, 'click', '[data-clear-drafts]', () => { try { Object.keys(localStorage).filter((k) => k.startsWith('cbt:draft:')).forEach((k) => localStorage.removeItem(k)); toast('Drafts cleared.'); } catch { toast('Could not access drafts.'); } }),
      on(root, 'click', '[data-wipe]', async () => {
        const typed = await promptDialog({ title: 'Delete everything?', body: 'This permanently deletes all entries, check-ins, mood logs, plans, habits, ladders and your safety plan from this device. Type DELETE to confirm.', label: 'Type DELETE', confirm: 'Delete everything' });
        if (typed !== 'DELETE') { if (typed != null) toast('Not deleted — you must type DELETE.'); return; }
        await store.clearAll();
        try { Object.keys(localStorage).filter((k) => k.startsWith('cbt:') && !['cbt:theme', 'cbt:text'].includes(k)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
        toast('All data deleted from this device.');
        location.hash = '#/';
      }),
    ];
    return () => offs.forEach((f) => f());
  };
  return { title: 'Settings', body, mount };
}
