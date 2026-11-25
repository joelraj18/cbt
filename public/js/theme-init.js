// Runs before first paint (render-blocking on purpose, tiny) so the saved theme/text size applies without a flash.
(function () {
  try {
    var t = localStorage.getItem('cbt:theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    if (localStorage.getItem('cbt:text') === 'large') document.documentElement.setAttribute('data-text', 'large');
  } catch (e) { /* storage blocked: fall back to system theme */ }
  window.__bootStart = (window.performance && performance.now) ? performance.now() : 0;
})();
