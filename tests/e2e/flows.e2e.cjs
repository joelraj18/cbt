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
  check('result panel links back to Today', await page.isVisible('.result-panel a[href="#/today"], a.btn[href="#/today"]:has-text("Back to Today")'));
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

  // daily loop: Today → check in → personalised suggestions → programme → skill → reflection → reminders
  await go('#/today');
  check('Today page renders the four daily steps', (await page.locator('.mini-steps li').count()) === 4);
  check('a mood logged earlier today already counts as checked in', await page.isVisible('#today-checkin .badge:has-text("Done")'));
  if (!(await page.isVisible('#ci-mood'))) await page.click('#today-checkin summary');
  await page.fill('#ci-mood', '3');
  await page.fill('#ci-anx', '8');
  await page.fill('#ci-energy', '3');
  await page.click('[data-focus="anxiety"]');
  await page.fill('#ci-int', 'Walk at lunch');
  await page.click('form[data-checkin] button[type=submit]');
  await page.waitForTimeout(600);
  const dailyCheckins = await page.evaluate(async () => (await import('./js/core/store.js')).store.query({ kind: 'mood' }).filter((r) => r.data.source === 'today').length);
  check('daily check-in saved', dailyCheckins === 1);
  check('focus moves to today’s practice after checking in', await page.evaluate(() => document.activeElement?.id === 'h-practice'));
  const recTitles = await page.locator('#today-practice .rec-card h3').allTextContents();
  const reasons = (await page.locator('#today-practice .rec-card').allTextContents()).join(' ');
  check('suggestions respond to the check-in, each with a reason', recTitles.length >= 3 && /low mood|anxious|anxiety|energy/i.test(reasons), recTitles.join(' | '));
  check('exercises already done today are not suggested again', !recTitles.some((t) => /paced breathing/i.test(t)));

  await go('#/programs');
  await page.click('[data-start="calm"]');
  await page.waitForTimeout(700);
  check('programme started and Today shows day 1', page.url().includes('#/today') && (await page.isVisible('#h-prog')) && (await page.evaluate(async () => (await (await import('./js/core/store.js')).store.kvGet('program'))?.id)) === 'calm');
  await go('#/check-in/gad7');
  for (let i = 0; i < 7; i++) await page.check(`input[name=q${i}][value="1"]`);
  await page.click('form[data-q] button[type=submit]');
  await page.waitForTimeout(400);
  await go('#/today');
  check('programme day 1 ticks itself off after the check-in', await page.isVisible('text=Calm: day 1 complete'));
  check('day 2 waits for tomorrow, with the option to go on early', await page.isVisible('[data-early]'));

  await page.click('[data-skill]');
  await page.waitForTimeout(400);
  check('skill of the day marked as learned', await page.isVisible('[data-skill][disabled]'));
  await page.fill('#rf-rate', '7');
  await page.fill('#rf-win', 'Asked a question in the meeting');
  await page.fill('#rf-tom', 'Walk at 12:30');
  await page.click('form[data-reflect] button[type=submit]');
  await page.waitForTimeout(600);
  check('evening reflection saved', (await page.evaluate(async () => (await import('./js/core/store.js')).store.query({ kind: 'daily' }).length)) === 1);
  check('all four daily steps done', await page.isVisible('h1:has-text("all done today")'));
  check('streak counts today', /1 day/.test(await page.locator('.today-top .stat').first().innerText()));
  const [icsDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-ics]')]);
  const icsText = require('fs').readFileSync(await icsDl.path(), 'utf8');
  check('daily reminders download as a repeating calendar event that links back', /RRULE:FREQ=DAILY/.test(icsText) && /#\/today/.test(icsText));
  await go('#/');
  check('home shows “Your day” for returning users', await page.isVisible('.today-card-home'));
  await go('#/journal');
  check('journal lists daily check-ins and reflections', (await page.isVisible('.entry-title:has-text("Daily check-in")')) && (await page.isVisible('.entry-title:has-text("Evening reflection")')));

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
