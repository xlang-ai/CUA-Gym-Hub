// End-to-end walkthrough of the VPC Actions menu, verified against server state.
// A menu item is only "done" if /go?sid= reports the mutation in state_diff — a toast
// proves nothing, and neither does the build.
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const SID = `vpcwalk-${process.pid}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const state = async () => (await (await fetch(`${BASE}/go?sid=${SID}`)).json());
const byText = async (t, sel = 'button') => {
  const h = await page.evaluateHandle((t, sel) => [...document.querySelectorAll(sel)]
    .find((b) => (b.innerText || '').trim() === t), t, sel);
  const el = h.asElement();
  if (!el) throw new Error(`no ${sel} with text "${t}"`);
  return el;
};
const openActions = async () => { await (await byText('Actions')).click(); await new Promise(r => setTimeout(r, 120)); };
const menuItems = () => page.$$eval('[role=menuitem]',
  (els) => els.map((e) => ({ label: e.innerText.trim(), disabled: e.disabled })));

const steps = [];
const step = async (name, fn) => {
  try { const d = await fn(); steps.push({ name, ok: true, detail: d }); }
  catch (e) { steps.push({ name, ok: false, detail: e.message }); }
};

// Pin an initial state before touching the UI, exactly as a task harness does. Without
// this there is no .initial.json, `/go` falls back to `initial = current`, and state_diff
// is empty by construction — which reads as "the agent changed nothing" for every session.
await fetch(`${BASE}/post?sid=${SID}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'set', state: {} }),
});

await page.goto(`${BASE}/vpc/vpcs?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('menu is gated on selection', async () => {
  await openActions();
  const before = await menuItems();
  const enabled = before.filter((i) => !i.disabled).map((i) => i.label);
  if (enabled.length) throw new Error(`enabled with no selection: ${enabled.join(', ')}`);
  await page.keyboard.press('Escape');
  return `${before.length} items, all disabled until a VPC is selected`;
});

await step('select one VPC', async () => {
  await page.click('table tbody tr:first-child input[type=checkbox]');
  await openActions();
  const items = await menuItems();
  const dis = items.filter((i) => i.disabled).map((i) => i.label);
  if (dis.length) throw new Error(`still disabled: ${dis.join(', ')}`);
  await page.keyboard.press('Escape');
  return `${items.length} items enabled: ${items.map((i) => i.label).join(', ')}`;
});

await step('Edit CIDRs associates a secondary block', async () => {
  await openActions();
  await (await byText('Edit CIDRs', '[role=menuitem]')).click();
  await page.waitForFunction(() => /Edit CIDRs/.test(document.body.innerText));
  await (await byText('Add new IPv4 CIDR')).click();
  await page.waitForSelector('input[placeholder="10.1.0.0/16"]');
  await page.type('input[placeholder="10.1.0.0/16"]', '10.99.0.0/16');
  await (await byText('Save changes')).click();
  await new Promise(r => setTimeout(r, 300));
  const s = await state();
  const hit = s.current_state.vpc.vpcs.find((v) => (v.secondaryCidrs || []).includes('10.99.0.0/16'));
  if (!hit) throw new Error('secondaryCidrs not persisted to server state');
  const shown = await page.evaluate(() => document.querySelector('table').innerText);
  if (!shown.includes('10.99.0.0/16')) throw new Error('persisted but not rendered in the table');
  return `10.99.0.0/16 on ${hit.id}, persisted and rendered`;
});

await step('Manage tags writes a tag', async () => {
  await openActions();
  await (await byText('Manage tags', '[role=menuitem]')).click();
  await page.waitForFunction(() => /Manage tags/.test(document.body.innerText));
  await (await byText('Add new tag')).click();
  const n = await page.$$eval('[aria-label^="Tag key"]', (e) => e.length);
  await page.type(`[aria-label="Tag key ${n}"]`, 'CostCenter');
  await page.type(`[aria-label="Tag value ${n}"]`, 'rl-4417');
  await (await byText('Save changes')).click();
  await new Promise(r => setTimeout(r, 300));
  const s = await state();
  const hit = s.current_state.vpc.vpcs.find((v) =>
    (v.tags || []).some((t) => t.Key === 'CostCenter' && t.Value === 'rl-4417'));
  if (!hit) throw new Error('tag not persisted to server state');
  return `CostCenter=rl-4417 on ${hit.id}`;
});

await step('Create flow log creates a flow log', async () => {
  await openActions();
  await (await byText('Create flow log', '[role=menuitem]')).click();
  await page.waitForFunction(() => /Maximum aggregation interval/.test(document.body.innerText));
  await page.type('input[placeholder="my-flow-log"]', 'audit-fl');
  await page.evaluate(() => [...document.querySelectorAll('input[name=flow-filter]')][2].click());
  await (await byText('Create flow log', 'button[type=submit]')).click();
  await new Promise(r => setTimeout(r, 300));
  const s = await state();
  const fl = (s.current_state.vpc.flowLogs || [])[0];
  if (!fl) throw new Error('flowLogs empty after submit');
  if (fl.filter !== 'REJECT') throw new Error(`filter radio ignored: got ${fl.filter}`);
  return `${fl.id} filter=${fl.filter} dest=${fl.destinationType}`;
});

await step('Edit DNS hostnames toggles the column', async () => {
  const before = await page.evaluate(() =>
    document.querySelector('table tbody tr:first-child').innerText.includes('Enabled'));
  await openActions();
  await (await byText('Edit DNS hostnames', '[role=menuitem]')).click();
  await new Promise(r => setTimeout(r, 300));
  const after = await page.evaluate(() =>
    document.querySelector('table tbody tr:first-child').innerText.includes('Enabled'));
  if (before === after) throw new Error('DNS hostnames column did not change');
  const s = await state();
  if (!('vpc' in (s.state_diff || {}))) throw new Error('mutation absent from state_diff');
  return `Enabled ${before} -> ${after}, recorded in state_diff`;
});

await step('Delete VPC refuses a default VPC', async () => {
  // The first row is the default VPC; the console refuses to delete one from this screen.
  await openActions();
  await (await byText('Delete VPC', '[role=menuitem]')).click();
  await new Promise(r => setTimeout(r, 300));
  const id = 'vpc-0abc1234def56789';
  const s = await state();
  if (!s.current_state.vpc.vpcs.some((v) => v.id === id)) throw new Error('default VPC was deleted');
  if (!/Cannot delete default VPC/.test(await page.evaluate(() => document.body.innerText)))
    throw new Error('no refusal message shown');
  return `${id} preserved, refusal surfaced`;
});

await step('Delete VPC removes a non-default VPC', async () => {
  // Re-select on a non-default row so the deletion path itself is exercised, not just
  // the guard: a guard that always fires would otherwise look like a passing delete.
  const target = await page.evaluate(() => {
    const row = [...document.querySelectorAll('table tbody tr')]
      .find((r) => r.cells[5] && r.cells[5].innerText.trim() === 'No');
    if (!row) return null;
    [...document.querySelectorAll('table tbody tr input[type=checkbox]:checked')].forEach((c) => c.click());
    row.querySelector('input[type=checkbox]').click();
    return row.cells[1].innerText.trim();
  });
  if (!target) throw new Error('no non-default VPC in the table');
  const before = await page.$$eval('table tbody tr', (r) => r.length);
  await openActions();
  await (await byText('Delete VPC', '[role=menuitem]')).click();
  await new Promise(r => setTimeout(r, 300));
  const after = await page.$$eval('table tbody tr', (r) => r.length);
  const s = await state();
  if (s.current_state.vpc.vpcs.some((v) => v.id === target)) throw new Error(`${target} still in server state`);
  if (after >= before) throw new Error(`row count did not drop (${before} -> ${after})`);
  return `${target} deleted, ${before} -> ${after} rows`;
});

await browser.close();
const bad = steps.filter((s) => !s.ok);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(42)} ${s.detail}`);
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].join(' | ')}`);
console.log(`\n  ${steps.length - bad.length}/${steps.length} steps passed${bad.length ? ', BLOCKING' : ''}\n`);
process.exit(bad.length || errors.length ? 1 : 0);
