/**
 * The EC2 Actions menu, walked the way the state gating says it must be walked.
 *
 * The claim under test is not "a menu exists". It is that resizing an instance is a
 * multi-step task because the console refuses it while the instance runs — captured from the
 * live console on 2026-08-18 and encoded in src/lib/instanceActions.js. If the mock lets the
 * type change at any time, the task collapses to one click and the training signal is gone.
 */
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const SID = `ec2walk-${process.pid}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async () => (await (await fetch(`${BASE}/go?sid=${SID}`)).json());

const openMenu = async (label) => {
  await page.evaluate((l) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith(l));
    b.click();
  }, label);
  await sleep(200);
};
const menuState = () => page.$$eval('[role=menuitem]', (els) => els.map((e) => ({
  label: e.innerText.trim(), disabled: e.disabled, reason: e.getAttribute('title') })));
const openSub = async (name) => {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('[role=menu] button')].find((x) => x.innerText.trim() === n);
    b.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    b.click();
  }, name);
  await sleep(300);
};
const clickItem = async (label) => {
  await page.evaluate((l) => {
    const b = [...document.querySelectorAll('[role=menuitem]')].find((x) => x.innerText.trim() === l);
    if (!b) throw new Error('no item ' + l);
    b.click();
  }, label);
  await sleep(400);
};

const steps = [];
const step = async (name, fn) => {
  try { steps.push({ name, ok: true, detail: await fn() }); }
  catch (e) { steps.push({ name, ok: false, detail: e.message }); }
};

await fetch(`${BASE}/post?sid=${SID}`, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', state: {} }) });
await page.goto(`${BASE}/ec2?sid=${SID}`, { waitUntil: 'networkidle0' });

await step('Actions trigger stays enabled with nothing selected', async () => {
  const disabled = await page.evaluate(() =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Actions')).disabled);
  if (disabled) throw new Error('trigger is disabled; the console leaves it enabled');
  await openMenu('Actions');
  const items = await menuState();
  const enabled = items.filter((i) => !i.disabled);
  if (enabled.length) throw new Error(`enabled with no selection: ${enabled.map((i) => i.label).join(', ')}`);
  if (!items.every((i) => i.reason)) throw new Error('some disabled items carry no reason');
  await page.keyboard.press('Escape');
  return `${items.length} top-level items, all disabled and all carrying a reason`;
});

let target;
await step('select a running instance', async () => {
  target = await page.evaluate(() => {
    const row = [...document.querySelectorAll('table tbody tr')].find((r) => /running/i.test(r.innerText));
    if (!row) return null;
    row.querySelector('input[type=checkbox]').click();
    return row.innerText.match(/i-[0-9a-z]+/)[0];
  });
  if (!target) throw new Error('no running instance in seed data');
  await sleep(300);
  return target;
});

await step('Change instance type is refused while running', async () => {
  await openMenu('Actions');
  await openSub('Instance settings');
  const items = await menuState();
  const it = items.find((i) => i.label === 'Change instance type');
  if (!it) throw new Error('Change instance type missing from Instance settings');
  if (!it.disabled) throw new Error('enabled while running — the console requires a stop first');
  if (!/stopped/.test(it.reason || '')) throw new Error(`reason does not name the requirement: ${it.reason}`);
  const stop = items.find((i) => i.label === 'Stop instance');
  if (stop && stop.disabled) throw new Error('Stop instance disabled while running');
  await page.keyboard.press('Escape');
  return `disabled, reason: "${it.reason}"`;
});

await step('stop the instance', async () => {
  await openMenu('Instance state');
  await clickItem('Stop instance');
  await sleep(3000);
  const s = await state();
  const inst = s.current_state.ec2.find((i) => i.id === target);
  if (inst.state !== 'stopped') throw new Error(`state is ${inst.state}, expected stopped`);
  return `${target} -> stopped`;
});

await step('Change instance type becomes available once stopped', async () => {
  await page.evaluate((id) => {
    const row = [...document.querySelectorAll('table tbody tr')].find((r) => r.innerText.includes(id));
    const cb = row.querySelector('input[type=checkbox]');
    if (!cb.checked) cb.click();
  }, target);
  await sleep(300);
  await openMenu('Actions');
  await openSub('Instance settings');
  const it = (await menuState()).find((i) => i.label === 'Change instance type');
  if (it.disabled) throw new Error(`still disabled once stopped: ${it.reason}`);
  return 'enabled';
});

await step('changing the type actually changes it', async () => {
  await clickItem('Change instance type');
  await page.waitForFunction(() => /Change instance type/.test(document.body.innerText));
  const before = (await state()).current_state.ec2.find((i) => i.id === target).type;
  await page.select('select', 'm5.xlarge');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Save').click();
  });
  await sleep(600);
  const after = (await state()).current_state.ec2.find((i) => i.id === target).type;
  if (after !== 'm5.xlarge') throw new Error(`type is ${after}, expected m5.xlarge`);
  const s = await state();
  if (!('ec2' in (s.state_diff || {}))) throw new Error('change absent from state_diff');
  return `${before} -> ${after}, recorded in state_diff`;
});

await step('Instance diagnostics computes from real state', async () => {
  await openMenu('Actions');
  await clickItem('Instance diagnostics');
  await page.waitForFunction(() => /Instance diagnostics/.test(document.body.innerText));
  const rows = await page.$$eval('table tbody tr', (rs) => rs.map((r) => r.innerText.replace(/\s+/g, ' ')));
  const stateRow = rows.find((r) => /Instance state/.test(r));
  if (!stateRow) throw new Error('no Instance state check rendered');
  if (!/stopped/.test(stateRow)) throw new Error(`diagnostics did not read live state: ${stateRow}`);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Close').click();
  });
  return `${rows.length} checks, state check reflects the stopped instance`;
});

await browser.close();
const bad = steps.filter((s) => !s.ok);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(52)} ${s.detail}`);
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].slice(0, 3).join(' | ')}`);
console.log(`\n  ${steps.length - bad.length}/${steps.length} steps passed${bad.length || errors.length ? ', BLOCKING' : ''}\n`);
process.exit(bad.length || errors.length ? 1 : 0);
