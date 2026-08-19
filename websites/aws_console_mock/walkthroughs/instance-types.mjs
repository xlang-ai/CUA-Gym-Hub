// End-to-end walkthrough of the EC2 instance-types page, whose three controls — Instance
// type finder, Actions, and the "Select an instance type" panel — shipped as buttons with no
// onClick at all. Each is asserted against observable state, never against a toast.
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const SID = `itypes-${process.pid}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

const state = async () => (await (await fetch(`${BASE}/go?sid=${SID}`)).json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (t, sel = 'button') => page.evaluate((t, sel) => {
  const b = [...document.querySelectorAll(sel)].find((x) => (x.innerText || '').trim() === t);
  if (!b) return false; b.click(); return true;
}, t, sel);
const rowCount = () => page.$$eval('table tbody tr', (r) => r.length);

const steps = [];
const step = async (name, fn) => {
  try { steps.push({ name, ok: true, detail: await fn() }); }
  catch (e) { steps.push({ name, ok: false, detail: e.message }); }
};

await fetch(`${BASE}/post?sid=${SID}`, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', state: {} }) });
await page.goto(`${BASE}/ec2/instance-types?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('panel shows the console placeholder', async () => {
  const txt = await page.evaluate(() => document.body.innerText);
  if (!/Select an instance type/.test(txt)) throw new Error('placeholder missing');
  return 'placeholder present with nothing selected';
});

await step('selecting a type opens the six captured tabs', async () => {
  await page.click('table tbody tr:first-child input[type=checkbox]');
  await wait(400);
  const tabs = await page.$$eval('[role=tab]', (e) => e.map((x) => x.innerText.trim()));
  const want = ['Details', 'Compute', 'Networking', 'Storage', 'Accelerators', 'Pricing'];
  const missing = want.filter((w) => !tabs.includes(w));
  if (missing.length) throw new Error(`missing tabs: ${missing.join(', ')}`);
  const head = await page.evaluate(() => document.body.innerText);
  if (!/Instance type: /.test(head)) throw new Error('panel heading did not switch to the selected type');
  return `${want.length} tabs, heading switched`;
});

await step('every panel tab renders real fields', async () => {
  const empty = [];
  for (const t of ['Details', 'Compute', 'Networking', 'Storage', 'Accelerators', 'Pricing']) {
    await clickText(t, '[role=tab]');
    await wait(160);
    const n = await page.$$eval('[role=tabpanel] dt', (e) => e.length).catch(() => 0);
    if (n === 0) empty.push(t);
  }
  if (empty.length) throw new Error(`tabs with no fields: ${empty.join(', ')}`);
  return 'all six tabs populated';
});

await step('Actions carries the three captured items', async () => {
  await clickText('Actions');
  await wait(250);
  const items = await page.$$eval('[role=menuitem]', (e) => e.map((x) => x.innerText.trim()));
  const want = ['Launch instance', 'Create launch template', 'Download list CSV'];
  const missing = want.filter((w) => !items.includes(w));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  await page.keyboard.press('Escape');
  return items.join(', ');
});

await step('Download list CSV records a verifiable export', async () => {
  await clickText('Actions');
  await wait(250);
  if (!await clickText('Download list CSV', '[role=menuitem]')) throw new Error('menu item not clickable');
  await wait(500);
  const s = await state();
  const ex = (s.current_state.exports || []).find((e) => e.kind === 'instance-types-csv');
  if (!ex) throw new Error('no export recorded in server state');
  if (!ex.rows || !ex.bytes) throw new Error('export recorded without row/byte counts');
  return `${ex.filename}, ${ex.rows} rows, ${ex.bytes} bytes`;
});

await step('Instance type finder narrows the table', async () => {
  const before = await rowCount();
  if (!await clickText('Instance type finder')) throw new Error('finder button not found');
  await page.waitForFunction(() => /Instance type requirements/.test(document.body.innerText), { timeout: 4000 });
  await page.select('#finder-cpu', 'XWS Graviton');
  if (!await clickText('Get instance type advice')) throw new Error('submit not found');
  await wait(500);
  const after = await rowCount();
  const banner = await page.evaluate(() => /Advice applied/.test(document.body.innerText));
  if (!banner) throw new Error('no advice banner');
  if (after >= before) throw new Error(`table did not narrow (${before} -> ${after})`);
  return `Graviton filter ${before} -> ${after} rows, banner shown`;
});

await step('Clear advice restores the table', async () => {
  const before = await rowCount();
  if (!await clickText('Clear advice')) throw new Error('clear button not found');
  await wait(400);
  const after = await rowCount();
  if (after <= before) throw new Error(`table did not restore (${before} -> ${after})`);
  return `${before} -> ${after} rows`;
});

await browser.close();
const bad = steps.filter((s) => !s.ok);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(46)} ${s.detail}`);
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].join(' | ')}`);
console.log(`\n  ${steps.length - bad.length}/${steps.length} steps passed${bad.length || errors.length ? ', BLOCKING' : ''}\n`);
process.exit(bad.length || errors.length ? 1 : 0);
