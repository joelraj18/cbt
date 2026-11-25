// End-to-end user-flow test (optional; needs a browser).
//   npm i -D playwright && npx playwright install chromium
//   npm run dev            (in another terminal)
//   node tests/e2e/flows.e2e.cjs [http://localhost:8788/]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8788/';
const results = [];
const check = (name, ok, detail = '') => { results.push([name, ok]); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(400); };
  const count = (type) => page.evaluate(async (t) => (await import('./js/core/store.js')).store.query(t ? { type: t } : {}).length, type);

  await page.goto(BASE);
  await page.waitForFunction(() => document.querySelector('.hero'), null, { timeout: 20000 });
  check('home page renders', true);

  // quick mood
  await page.fill('#quick-mood', '7');
  await page.click('[data-quick-save]');
  await page.waitForTimeout(300);
  check('quick mood saved', (await count('mood')) === 1);

  // thought record wizard
  await go('#/exercise/thought-record?tab=do');
  await page.fill('textarea[data-fid="situation"]', 'My manager did not comment on my idea');
  await page.click('[data-next]');
  await page.click('[data-emo-toggle="emotions"][data-value="Sad"]');
  await page.click('[data-next]');
  await page.fill('textarea[data-fid="thoughts"]', 'She thinks it was stupid');
  await page.fill('input[data-fid="hot"]', 'I am useless at this job');
  await page.click('[data-next]');
  await page.fill('textarea[data-fid="evidenceAgainst"]', 'She praised my report last week');
  await page.click('[data-next]');
  await page.fill('textarea[data-fid="balanced"]', 'One meeting does not make me useless');
  await page.click('[data-save]');
  await page.waitForTimeout(500);
  check('thought record saved via 5-step wizard', (await count('thought-record')) === 1);
  check('result panel shown', await page.isVisible('text=Saved — nice work.'));
  await page.click('[data-tab="history"]');
  await page.waitForTimeout(300);
  check('history tab lists the entry', (await page.locator('[data-list] details').count()) === 1);

  // PHQ-9
  await go('#/check-in/phq9');
  for (let i = 0; i < 9; i++) await page.check(`input[name=q${i}][value="${i < 5 ? 1 : 0}"]`);
  await page.click('form[data-q] button[type=submit]');
  await page.waitForTimeout(400);
  check('PHQ-9 scored (5 = mild)', await page.isVisible('text=Mild'));

  // search palette
  await page.keyboard.press('Control+k');
  await page.fill('[data-palette-input]', 'worry');
  await page.waitForTimeout(250);
  const n = await page.locator('.palette-item').count();
  check('search palette returns results', n > 2, `${n} items`);
  await page.keyboard.press('Escape');

  // fear ladder (prompt dialog)
  await go('#/exercise/fear-ladder');
  await page.click('.empty [data-new]');
  await page.fill('#dlg-input', 'Speaking in groups');
  await page.click('dialog button[value=ok]');
  await page.waitForTimeout(300);
  await page.fill('#ld-text', 'Ask a question in a meeting');
  await page.click('[data-add] button[type=submit]');
  await page.waitForTimeout(300);
  check('fear ladder step added', (await page.locator('.ladder li').count()) === 1);

  // habit tracker
  await go('#/exercise/habit-builder');
  await page.fill('#hb-name', 'Read 2 pages');
  await page.click('[data-add] button[type=submit]');
  await page.waitForTimeout(300);
  await page.click('.habit-cell.today');
  await page.waitForTimeout(300);
  check('habit added and ticked today', (await page.locator('.habit-cell.on').count()) === 1);

  // urge surfing tracker
  await go('#/exercise/urge-surfing?tab=do');
  await page.fill('input[data-fid="urge"]', 'buy something online');
  await page.click('[data-next]');
  await page.click('[data-track-start="wave"]');
  await page.fill('[data-track-rate="wave"]', '8');
  await page.click('[data-track-log="wave"]');
  await page.waitForTimeout(1200);
  await page.fill('[data-track-rate="wave"]', '3');
  await page.click('[data-track-log="wave"]');
  await page.click('[data-track-stop="wave"]');
  await page.click('[data-next]');
  await page.check('input[data-fid="outcome"][value="Rode it out"]');
  await page.click('[data-save]');
  await page.waitForTimeout(400);
  const urge = await page.evaluate(async () => (await import('./js/core/store.js')).store.query({ type: 'urge-surfing' })[0]?.metrics);
  check('urge surfing saved with live ratings', urge && urge.peak === 8 && urge.end === 3, JSON.stringify(urge));

  // breathing pacer
  await go('#/exercise/paced-breathing');
  await page.selectOption('#br-min', '1');
  await page.click('[data-start]');
  await page.waitForTimeout(1500);
  await page.click('[data-stop]');
  await page.click('[data-save]');
  await page.waitForTimeout(300);
  check('breathing session saved', (await count('paced-breathing')) === 1);

  // report
  await go('#/reports');
  await page.waitForTimeout(2000);
  check('report generated with pipeline', (await page.locator('.pipeline li.done').count()) === 8);

  // backup → wipe → restore
  await go('#/settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export]')]);
  const file = await dl.path();
  const before = await count();
  await page.click('[data-wipe]');
  await page.fill('#dlg-input', 'DELETE');
  await page.click('dialog button[value=ok]');
  await page.waitForTimeout(500);
  check('delete all data', (await count()) === 0);
  await go('#/settings');
  await page.setInputFiles('#imp-file', file);
  await page.waitForTimeout(300);
  await page.click('dialog button[value=ok]');
  await page.waitForTimeout(600);
  check('backup restored', (await count()) === before, `${before} entries`);

  check('no JavaScript errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
