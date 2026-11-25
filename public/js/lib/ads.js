// Google AdSense integration — privacy-first:
//  • nothing loads unless a publisher ID is configured in js/config.js
//  • nothing loads until the visitor explicitly agrees (consent stored only in this browser)
//  • ad-free routes (crisis help, exercises, journal, check-ins, reports…) never render slots
//  • SPA-safe: each new <ins class="adsbygoogle"> is pushed exactly once
import { ADS } from '../config.js';
import { pref, html } from '../core/dom.js';
import { perf } from '../core/perf.js';

let scriptPromise = null;

export const ads = {
  get configured() { return Boolean(ADS.enabled && ADS.client); },
  get consent() { return pref.get('ads-consent'); },
  routeAllowed(section) { return !ADS.adFreeRoutes.includes(section); },
  setConsent(value) {
    pref.set('ads-consent', value);
    perf.event(`Advertising consent: ${value}`);
    document.getElementById('consent-banner')?.remove();
    if (value === 'granted') this.activate(document);
    else document.querySelectorAll('.ad-slot:not(.placeholder)').forEach((s) => { s.hidden = true; });
  },
  loadScript() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const t0 = perf.now();
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADS.client)}`;
      s.crossOrigin = 'anonymous';
      s.onload = () => { perf.event('Loaded Google AdSense script', perf.now() - t0, 'after your consent'); resolve(); };
      s.onerror = () => { perf.event('AdSense script blocked or failed (ad blocker?)'); reject(new Error('ads blocked')); };
      document.head.append(s);
    });
    return scriptPromise;
  },
  /** Fill any new ad units inside root (call after each route render). */
  activate(root = document) {
    if (!this.configured) return;
    if (ADS.requireConsent && this.consent !== 'granted') return;
    const units = [...root.querySelectorAll('ins.adsbygoogle:not([data-pushed])')];
    if (!units.length) return;
    this.loadScript().then(() => {
      units.forEach((u) => {
        if (u.dataset.pushed || !u.isConnected) return;
        u.dataset.pushed = '1';
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.warn('AdSense push failed', e); }
      });
    }).catch(() => { units.forEach((u) => u.closest('.ad-slot')?.setAttribute('hidden', '')); });
  },
  /** Show the consent prompt once, only when ads are configured and the visitor hasn't decided yet. */
  maybeAskConsent() {
    if (!this.configured || !ADS.requireConsent || this.consent) return;
    if (document.getElementById('consent-banner')) return;
    const box = document.createElement('div');
    box.id = 'consent-banner';
    box.className = 'consent no-print';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Advertising consent');
    box.innerHTML = String(html`<p><strong>Keeping this toolkit free.</strong> We'd like to show a few ads from Google on content pages (never on exercises, check-ins, your journal, reports or crisis pages). Google may use cookies to show and measure ads. Your CBT entries stay on this device and are never shared. <a href="#/privacy">Privacy policy</a></p>
      <div class="cluster"><button class="btn primary small" data-consent="granted">Allow ads</button><button class="btn small" data-consent="denied">No thanks</button></div>`);
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-consent]'); if (b) this.setConsent(b.dataset.consent); });
    document.body.append(box);
  },
};
