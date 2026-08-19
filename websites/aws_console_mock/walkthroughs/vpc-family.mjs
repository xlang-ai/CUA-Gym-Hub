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
  routeTable: ['Create route table', 'View details', 'Set main route table', 'Edit routes',
               'Edit subnet associations', 'Edit edge associations', 'Edit route propagation',
               'Manage tags', 'Delete route table'],
  securityGroup: ['Create security group', 'Export security groups to CSV',
                  'Export security groups inbound/outbound rules', 'View details',
                  'Edit inbound rules', 'Edit outbound rules', 'Manage tags', 'Manage stale rules',
                  'Copy to new security group', 'Share security group', 'Delete security groups'],
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
  // `associations` is the field the seed uses. This assertion previously read `subnets`, a
  // field the handler had invented, so check and code agreed with each other and not with the
  // data. It also asserts no stray `subnets` field reappears.
  if (!(rt.associations || []).includes(sn.id)) throw new Error('route table does not list the subnet in associations');
  if ('subnets' in rt) throw new Error('route table grew a stray `subnets` field alongside `associations`');
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


// ------------------------------------------------------------------ route tables
await page.goto(`${BASE}/vpc/route-tables?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('route table menu equals the captured list', async () => {
  await openActions();
  const got = (await menuItems()).map((i) => i.label);
  const missing = CAPTURED.routeTable.filter((w) => !got.includes(w));
  const extra = got.filter((g) => !CAPTURED.routeTable.includes(g));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  if (extra.length) throw new Error(`not in the capture: ${extra.join(', ')}`);
  await page.keyboard.press('Escape');
  return `${CAPTURED.routeTable.length} items, exact match`;
});

await step('Set main route table is gated on the incumbent', async () => {
  // Select the table that IS main: the item must be disabled, with the console's reason.
  const mainRow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    const r = rows.find((x) => x.cells[3] && x.cells[3].innerText.trim() === 'Yes');
    if (!r) return null;
    r.querySelector('input[type=checkbox]').click();
    return r.cells[1].innerText.trim();
  });
  if (!mainRow) throw new Error('no main route table in the table');
  await new Promise((r) => setTimeout(r, 300));
  await openActions();
  const item = await page.$$eval('[role=menuitem]', (els) => {
    const b = els.find((e) => e.innerText.trim() === 'Set main route table');
    return b ? { disabled: b.disabled, reason: b.title } : null;
  });
  await page.keyboard.press('Escape');
  if (!item.disabled) throw new Error('should be disabled — this table is already main');
  if (!/already the main/.test(item.reason || '')) throw new Error(`reason not stated: ${item.reason}`);
  return `${mainRow} is main; item disabled with a reason`;
});

await step('Set main route table moves the flag', async () => {
  const other = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    rows.forEach((r) => { const c = r.querySelector('input[type=checkbox]'); if (c.checked) c.click(); });
    const r = rows.find((x) => x.cells[3] && x.cells[3].innerText.trim() === 'No');
    if (!r) return null;
    r.querySelector('input[type=checkbox]').click();
    return r.cells[1].innerText.trim();
  });
  if (!other) throw new Error('no non-main route table');
  await new Promise((r) => setTimeout(r, 300));
  await openActions();
  if (!await clickText('Set main route table', '[role=menuitem]')) throw new Error('item not clickable');
  await wait(400);
  const rts = (await state()).current_state.vpc.routeTables;
  const mains = rts.filter((r) => r.main).map((r) => r.id);
  if (mains.length !== 1) throw new Error(`expected exactly one main route table, got ${mains.length}`);
  if (mains[0] !== other) throw new Error(`main is ${mains[0]}, expected ${other}`);
  return `main moved to ${other}, still exactly one`;
});

await step('Edit routes adds a route', async () => {
  await openActions();
  if (!await clickText('Edit routes', '[role=menuitem]')) throw new Error('item not clickable');
  await page.waitForFunction(() => /Add route/.test(document.body.innerText), { timeout: 4000 });
  const before = (await state()).current_state.vpc.routeTables.find((r) => r.main).routes.length;
  await clickText('Add route');
  await wait(200);
  const n = await page.$$eval('[aria-label^="Destination"]', (e) => e.length);
  await page.type(`[aria-label="Destination ${n}"]`, '192.168.50.0/24');
  await page.type(`[aria-label="Target ${n}"]`, 'igw-0abc1234');
  await clickText('Save changes');
  await wait(400);
  const rt = (await state()).current_state.vpc.routeTables.find((r) => r.main);
  if (rt.routes.length !== before + 1) throw new Error(`routes ${before} -> ${rt.routes.length}`);
  if (!rt.routes.some((r) => r.destination === '192.168.50.0/24')) throw new Error('route not persisted');
  return `routes ${before} -> ${rt.routes.length}`;
});

// ------------------------------------------------------------------ security groups
await page.goto(`${BASE}/ec2/security-groups?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('security group menu equals the captured list', async () => {
  await openActions();
  const got = (await menuItems()).map((i) => i.label);
  const missing = CAPTURED.securityGroup.filter((w) => !got.includes(w));
  const extra = got.filter((g) => !CAPTURED.securityGroup.includes(g));
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  if (extra.length) throw new Error(`not in the capture: ${extra.join(', ')}`);
  await page.keyboard.press('Escape');
  return `${CAPTURED.securityGroup.length} items, exact match`;
});

await step('both CSV exports record verifiable exports', async () => {
  for (const [label, kind] of [['Export security groups to CSV', 'security-groups-csv'],
                               ['Export security groups inbound/outbound rules', 'security-group-rules-csv']]) {
    await openActions();
    if (!await clickText(label, '[role=menuitem]')) throw new Error(`${label} not clickable`);
    await wait(400);
    const ex = ((await state()).current_state.exports || []).find((e) => e.kind === kind);
    if (!ex) throw new Error(`no export recorded for ${kind}`);
    if (!ex.rows) throw new Error(`${kind} recorded zero rows`);
  }
  const exports = (await state()).current_state.exports || [];
  return `${exports.length} exports recorded in server state`;
});

await step('Copy to new security group duplicates its rules', async () => {
  await page.click('table tbody tr:first-child input[type=checkbox]');
  await wait(300);
  const before = (await state()).current_state.securityGroups;
  await openActions();
  if (!await clickText('Copy to new security group', '[role=menuitem]')) throw new Error('item not clickable');
  await wait(400);
  const after = (await state()).current_state.securityGroups;
  if (after.length !== before.length + 1) throw new Error(`groups ${before.length} -> ${after.length}`);
  const copy = after[after.length - 1];
  const src = before.find((g) => `${g.name}-copy` === copy.name);
  if (!src) throw new Error('copy is not named after any source group');
  if ((copy.inboundRules || []).length !== (src.inboundRules || []).length) throw new Error('inbound rules not copied');
  return `${copy.id} copies ${src.id} with ${(copy.inboundRules || []).length} inbound rule(s)`;
});

await step('Share security group stays disabled with a reason', async () => {
  await openActions();
  const info = await page.$$eval('[role=menuitem]', (els) => {
    const b = els.find((e) => e.innerText.trim() === 'Share security group');
    return b ? { disabled: b.disabled, reason: b.title } : null;
  });
  await page.keyboard.press('Escape');
  if (!info.disabled) throw new Error('should be disabled — RAM is not modelled');
  if (!info.reason) throw new Error('disabled without a stated reason');
  return info.reason.slice(0, 56);
});

await browser.close();
const bad = steps.filter((s) => !s.ok);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(50)} ${s.detail}`);
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].join(' | ')}`);
console.log(`\n  ${steps.length - bad.length}/${steps.length} steps passed${bad.length || errors.length ? ', BLOCKING' : ''}\n`);
process.exit(bad.length || errors.length ? 1 : 0);
