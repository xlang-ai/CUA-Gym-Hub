// Subnet and network-ACL Actions menus, asserted against the captured console item lists and
// against /go current_state. The menu-equality checks are deliberately strict about EXTRAS as
// well as omissions: an invented item is the failure mode this project keeps producing.
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const SID = `vpcfam-${process.pid}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const CAPTURED = {
  subnet: ['Create subnet', 'View details', 'Create flow log', 'Edit subnet settings',
           'Edit IPv6 CIDRs', 'Edit network ACL association', 'Edit route table association',
           'Edit CIDR reservations', 'Share subnet', 'Manage tags', 'Delete subnet'],
  networkAcl: ['Create network ACL', 'View details', 'Edit inbound rules', 'Edit outbound rules',
               'Edit subnet associations', 'Manage tags', 'Delete network ACLs'],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async () => (await (await fetch(`${BASE}/go?sid=${SID}`)).json());
const clickText = (t, sel = 'button') => page.evaluate((t, sel) => {
  const b = [...document.querySelectorAll(sel)].find((x) => (x.innerText || '').trim() === t);
  if (!b || b.disabled) return false; b.click(); return true;
}, t, sel);
const openActions = async () => { await clickText('Actions'); await wait(220); };
const menuItems = () => page.$$eval('[role=menuitem]', (els) =>
  els.map((e) => ({ label: e.innerText.trim(), disabled: e.disabled })));

const steps = [];
const step = async (name, fn) => {
  try { steps.push({ name, ok: true, detail: await fn() }); }
  catch (e) { steps.push({ name, ok: false, detail: e.message }); }
};

await fetch(`${BASE}/post?sid=${SID}`, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', state: {} }) });

// ------------------------------------------------------------------ subnets
await page.goto(`${BASE}/vpc/subnets?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('subnet menu equals the captured list', async () => {
  await openActions();
  const got = (await menuItems()).map((i) => i.label);
  const missing = CAPTURED.subnet.filter((w) => !got.includes(w));
  const extra = got.filter((g) => !CAPTURED.subnet.includes(g));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  if (extra.length) throw new Error(`not in the capture: ${extra.join(', ')}`);
  await page.keyboard.press('Escape');
  return `${CAPTURED.subnet.length} items, exact match`;
});

await step('Share subnet stays disabled with a reason', async () => {
  await openActions();
  const info = await page.$$eval('[role=menuitem]', (els) => {
    const b = els.find((e) => e.innerText.trim() === 'Share subnet');
    return b ? { disabled: b.disabled, reason: b.title } : null;
  });
  await page.keyboard.press('Escape');
  if (!info) throw new Error('item missing');
  if (!info.disabled) throw new Error('should be disabled — RAM is not modelled');
  if (!info.reason) throw new Error('disabled without a stated reason');
  return info.reason.slice(0, 58);
});

await step('Edit subnet settings writes auto-assign public IPv4', async () => {
  await page.click('table tbody tr:first-child input[type=checkbox]');
  await wait(300);
  await openActions();
  if (!await clickText('Edit subnet settings', '[role=menuitem]')) throw new Error('item not clickable');
  await page.waitForFunction(() => /auto-assign public IPv4/i.test(document.body.innerText), { timeout: 4000 });
  const before = await page.evaluate(() => {
    const l = [...document.querySelectorAll('label')].find((x) => /auto-assign public IPv4/i.test(x.innerText));
    const c = l.querySelector('input[type=checkbox]'); const was = c.checked; c.click(); return was;
  });
  await clickText('Save changes');
  await wait(400);
  const s = await state();
  const sn = s.current_state.vpc.subnets[0];
  if (sn.autoAssignPublicIp === before) throw new Error('autoAssignPublicIp unchanged in server state');
  return `autoAssignPublicIp ${before} -> ${sn.autoAssignPublicIp}`;
});

await step('Edit route table association updates both sides', async () => {
  await openActions();
  if (!await clickText('Edit route table association', '[role=menuitem]')) throw new Error('item not clickable');
  await page.waitForFunction(() => /Edit route table association/.test(document.body.innerText), { timeout: 4000 });
  const picked = await page.$eval('#picker-value option:nth-child(2)', (o) => o.value);
  await page.select('#picker-value', picked);
  await clickText('Save');
  await wait(400);
  const s = await state();
  const sn = s.current_state.vpc.subnets[0];
  if (sn.routeTable !== picked) throw new Error(`subnet.routeTable is ${sn.routeTable}, expected ${picked}`);
  const rt = s.current_state.vpc.routeTables.find((r) => r.id === picked);
  if (!(rt.subnets || []).includes(sn.id)) throw new Error('route table does not list the subnet');
  return `${sn.id} <-> ${picked}, both sides updated`;
});

await step('Create flow log works from the subnet menu', async () => {
  await openActions();
  if (!await clickText('Create flow log', '[role=menuitem]')) throw new Error('item not clickable');
  await page.waitForFunction(() => /Maximum aggregation interval/.test(document.body.innerText), { timeout: 4000 });
  await clickText('Create flow log', 'button[type=submit]');
  await wait(400);
  const s = await state();
  const sn = s.current_state.vpc.subnets[0];
  const fl = (s.current_state.vpc.flowLogs || []).find((x) => x.resourceId === sn.id);
  if (!fl) throw new Error('no flow log recorded for the subnet');
  return `${fl.id} on ${fl.resourceId}`;
});

// ------------------------------------------------------------------ network ACLs
await page.goto(`${BASE}/vpc/network-acls?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('network ACL list route resolves to its own page', async () => {
  const h1 = await page.evaluate(() => (document.querySelector('h1')?.innerText || '').trim());
  if (!/Network ACLs/.test(h1)) throw new Error(`landed on "${h1}" — the route falls through`);
  return h1;
});

await step('network ACL menu equals the captured list', async () => {
  await openActions();
  const got = (await menuItems()).map((i) => i.label);
  const missing = CAPTURED.networkAcl.filter((w) => !got.includes(w));
  const extra = got.filter((g) => !CAPTURED.networkAcl.includes(g));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  if (extra.length) throw new Error(`not in the capture: ${extra.join(', ')}`);
  await page.keyboard.press('Escape');
  return `${CAPTURED.networkAcl.length} items, exact match`;
});

await step('Edit inbound rules adds a rule', async () => {
  await page.click('table tbody tr:first-child input[type=checkbox]');
  await wait(300);
  await openActions();
  if (!await clickText('Edit inbound rules', '[role=menuitem]')) throw new Error('item not clickable');
  await page.waitForFunction(() => /Add new rule/.test(document.body.innerText), { timeout: 4000 });
  const before = (await state()).current_state.vpc.networkAcls[0].inbound.length;
  await clickText('Add new rule');
  await wait(200);
  await page.type('[aria-label="Port range 2"]', '443');
  await clickText('Save changes');
  await wait(400);
  const acl = (await state()).current_state.vpc.networkAcls[0];
  if (acl.inbound.length !== before + 1) throw new Error(`inbound ${before} -> ${acl.inbound.length}`);
  const added = acl.inbound[acl.inbound.length - 1];
  if (String(added.portRange) !== '443') throw new Error(`port range not saved: ${added.portRange}`);
  return `inbound ${before} -> ${acl.inbound.length}, rule ${added.ruleNumber} port ${added.portRange}`;
});

await step('default network ACL cannot be deleted', async () => {
  await openActions();
  if (!await clickText('Delete network ACLs', '[role=menuitem]')) throw new Error('item not clickable');
  await wait(400);
  const s = await state();
  if (!s.current_state.vpc.networkAcls.some((a) => a.isDefault)) throw new Error('default ACL was deleted');
  const refused = await page.evaluate(() => /Cannot delete the default network ACL/.test(document.body.innerText));
  if (!refused) throw new Error('no refusal surfaced');
  return 'default ACL preserved, refusal shown';
});

await browser.close();
const bad = steps.filter((s) => !s.ok);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(50)} ${s.detail}`);
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].join(' | ')}`);
console.log(`\n  ${steps.length - bad.length}/${steps.length} steps passed${bad.length || errors.length ? ', BLOCKING' : ''}\n`);
process.exit(bad.length || errors.length ? 1 : 0);
