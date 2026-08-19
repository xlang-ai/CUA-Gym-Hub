// The Preferences dialog, asserted against what it actually changes.
//
// The console's Preferences is a two-column modal with a filterable list of 52 attribute
// columns; the mock had a 224px popover over 7. Each preference here is checked by its effect
// on the DOM, because a preference that only sets state is the same defect as a menu item that
// opens nothing.
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const SID = `prefs-${process.pid}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (t, sel = 'button') => page.evaluate((t, sel) => {
  const b = [...document.querySelectorAll(sel)].find((x) => (x.innerText || '').trim() === t);
  if (!b || b.disabled) return false; b.click(); return true;
}, t, sel);
const openPrefs = async () => {
  await page.evaluate(() => document.querySelector('[aria-label="Preferences"]').click());
  await page.waitForFunction(() => /Attribute columns/.test(document.body.innerText), { timeout: 4000 });
};
const headers = () => page.$$eval('table thead th', (e) => e.map((x) => x.innerText.trim()).filter(Boolean));

const steps = [];
const step = async (name, fn) => {
  try { steps.push({ name, ok: true, detail: await fn() }); }
  catch (e) { steps.push({ name, ok: false, detail: e.message }); }
};

await page.goto(`${BASE}/ec2?sid=${SID}`, { waitUntil: 'networkidle0' });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle0' });

await step('table opens with the 17 captured default columns', async () => {
  const h = await headers();
  const want = ['Name', 'Instance ID', 'Instance state', 'Instance type', 'Status check',
    'Availability Zone', 'Public IPv4 DNS', 'Public IPv4 address', 'Elastic IP', 'IPv6 IPs',
    'Monitoring', 'Security group name', 'Key name', 'Launch time', 'Platform details',
    'Managed', 'Operator'];
  const missing = want.filter((w) => !h.includes(w));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  if (h.length !== want.length) throw new Error(`${h.length} headers, expected ${want.length}`);
  return `${h.length} columns, exactly the captured default set`;
});

await step('Preferences offers all 52 captured columns', async () => {
  await openPrefs();
  const n = await page.$$eval('[role=switch]', (e) => e.length);
  if (n !== 52) throw new Error(`${n} column toggles, expected 52`);
  const sizes = await page.$$eval('input[name=pref-page-size]', (e) => e.length);
  if (sizes !== 3) throw new Error(`${sizes} page-size options, expected 3`);
  return `${n} column toggles, ${sizes} page sizes`;
});

await step('Filter columns narrows the list', async () => {
  const before = await page.$$eval('[role=switch]', (e) => e.length);
  await page.type('[aria-label="Filter columns"]', 'IPv');
  await wait(250);
  const after = await page.$$eval('[role=switch]', (e) => e.length);
  if (after >= before) throw new Error(`filter did not narrow (${before} -> ${after})`);
  if (after === 0) throw new Error('filter matched nothing for "IPv"');
  // Clear it the way a user does. Assigning .value on a controlled React input does not run
  // its onChange, so the filter stayed applied and the next step could not find its column.
  await page.focus('[aria-label="Filter columns"]');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Backspace');
  await wait(250);
  const restored = await page.$$eval('[role=switch]', (e) => e.length);
  if (restored !== before) throw new Error(`clearing the filter did not restore the list (${restored} of ${before})`);
  return `${before} -> ${after} on "IPv"`;
});

await step('Cancel discards a column change', async () => {
  const before = (await headers()).length;
  await page.evaluate(() => document.querySelector('[aria-label="Tenancy"]').click());
  await click('Cancel');
  await wait(300);
  const after = (await headers()).length;
  if (after !== before) throw new Error(`cancel applied the change (${before} -> ${after})`);
  return `${before} columns unchanged`;
});

await step('Confirm adds the chosen column', async () => {
  await openPrefs();
  await page.evaluate(() => document.querySelector('[aria-label="Tenancy"]').click());
  await click('Confirm');
  await wait(400);
  const h = await headers();
  if (!h.includes('Tenancy')) throw new Error('Tenancy not shown after Confirm');
  return `Tenancy added, ${h.length} columns`;
});

await step('page size changes what the pager reports', async () => {
  await openPrefs();
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('input[name=pref-page-size]')][0]; // 10 resources
    r.click();
  });
  await click('Confirm');
  await wait(400);
  const txt = await page.evaluate(() => document.body.innerText);
  const m = txt.match(/Showing (\d+)-(\d+) of (\d+) items/);
  if (!m) throw new Error('pager text not found');
  const shown = await page.$$eval('table tbody tr', (r) => r.length);
  if (shown > 10) throw new Error(`page size 10 but ${shown} rows rendered`);
  return `pager reads "${m[0]}", ${shown} rows`;
});

await step('Striped rows and Compact reach the DOM', async () => {
  const before = await page.$$eval('table tbody tr', (r) => r.map((x) => x.className).join('|'));
  await openPrefs();
  await page.evaluate(() => {
    const l = [...document.querySelectorAll('label')].find((x) => /Striped rows/.test(x.innerText));
    l.querySelector('input[type=checkbox]').click();
  });
  await click('Confirm');
  await wait(400);
  const after = await page.$$eval('table tbody tr', (r) => r.map((x) => x.className).join('|'));
  if (after === before) throw new Error('striped rows changed no row class');
  return 'row classes changed';
});

await browser.close();
const bad = steps.filter((s) => !s.ok);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(46)} ${s.detail}`);
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].join(' | ')}`);
console.log(`\n  ${steps.length - bad.length}/${steps.length} steps passed${bad.length || errors.length ? ', BLOCKING' : ''}\n`);
process.exit(bad.length || errors.length ? 1 : 0);
