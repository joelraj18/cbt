// "Install the app" support (Progressive Web App). Installed apps live on the home screen,
// which makes a daily habit easier to keep. Works in Chromium browsers; iOS uses Share → Add to Home Screen.
import { perf } from '../core/perf.js';

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; perf.event('App installed to this device'); notify(); });
}
export const canInstall = () => Boolean(deferred);
export const isStandalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } };
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
export function onInstallChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  e.prompt();
  const choice = await e.userChoice.catch(() => ({ outcome: 'dismissed' }));
  perf.event(`Install prompt: ${choice.outcome}`);
  notify();
  return choice.outcome === 'accepted';
}
