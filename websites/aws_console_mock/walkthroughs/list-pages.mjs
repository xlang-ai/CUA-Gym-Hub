// Every registry-driven list page, exercised against server state.
//
// Written to iterate the registry rather than name pages, so each future migration is covered
// the moment its `list` block lands — the check grows with the work instead of lagging it.
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const { RESOURCES } = await import(path.join(ROOT, '../src/lib/resourceRegistry.js'));
const migrated = RESOURCES.filter((r) => r.list);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 110)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const at = (s, p) => p.split('.').reduce((n, k) => (n ? n[k] : undefined), s) || [];
const click = (t, sel = 'button') => page.evaluate((t, sel) => {
  const b = [...document.querySelectorAll(sel)].find((x) => (x.innerText || '').trim() === t);
  if (!b || b.disabled) return false; b.click(); return true;
}, t, sel);
const rowCount = () => page.$$eval('table tbody tr', (r) => r.length);

let pass = 0, fail = 0;
const say = (ok, name, detail) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)} ${detail}`); ok ? pass++ : fail++; };

for (const r of migrated) {
  const sid = `list-${r.id}`;
  const state = async () => (await (await fetch(`${BASE}/go?sid=${sid}`)).json());
  await fetch(`${BASE}/post?sid=${sid}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', state: {} }) });
  await page.goto(`${BASE}${r.listRoute}?sid=${sid}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle0' });

  try {
    const h1 = await page.evaluate(() => (document.querySelector('h1')?.innerText || '').trim());
    if (!h1.startsWith(r.list.title)) throw new Error(`h1 is "${h1}", expected "${r.list.title} (n)"`);

    const heads = await page.$$eval('table thead th', (e) => e.map((x) => x.innerText.trim()).filter(Boolean));
    const wantCols = r.list.columns.map((c) => c.label);
    const missingCols = wantCols.filter((c) => !heads.includes(c));
    if (missingCols.length) throw new Error(`columns missing: ${missingCols.join(', ')}`);

    // every column must resolve for at least one row, or its field name is wrong
    const dead = await page.evaluate(() => {
      const t = document.querySelector('table');
      const heads = [...t.querySelectorAll('thead th')].map((h) => h.innerText.trim());
      const rows = [...t.querySelectorAll('tbody tr')];
      if (!rows.length) return [];
      return heads.map((h, i) => (h && rows.every((row) => ['–', ''].includes((row.cells[i]?.innerText || '').trim())) ? h : null)).filter(Boolean);
    });
    if (dead.length) throw new Error(`columns that never resolve: ${dead.join(', ')}`);

    say(true, `${r.listRoute} renders`, `${heads.length}/${wantCols.length} columns, h1 "${h1}"`);
  } catch (e) { say(false, `${r.listRoute} renders`, e.message); continue; }

  // create through the generic form, then confirm it reaches server state
  try {
    const before = at((await state()).current_state, r.path).length;
    if (!await click(r.list.create.label)) throw new Error('create button not clickable');
    await page.waitForFunction(() => /Cancel/.test(document.body.innerText), { timeout: 4000 });
    for (const f of r.list.create.fields) {
      const sel = `#create-${f.name}`;
      if (f.options) {
        const v = await page.$eval(`${sel} option:nth-child(2)`, (o) => o.value).catch(() => null);
        if (v) await page.select(sel, v);
      } else {
        await page.type(sel, `walk-${r.id}`);
      }
    }
    await click(r.list.create.label, 'button[type=submit]');
    await wait(500);
    const after = at((await state()).current_state, r.path).length;
    if (after !== before + 1) throw new Error(`count ${before} -> ${after}, expected +1`);
    say(true, `${r.listRoute} create writes to server state`, `${before} -> ${after}`);
  } catch (e) { say(false, `${r.listRoute} create writes to server state`, e.message); }

  // selection gating: per-resource items must wait for a selection
  try {
    await click('Actions');
    await wait(200);
    const items = await page.$$eval('[role=menuitem]', (e) => e.map((x) => ({ label: x.innerText.trim(), disabled: x.disabled })));
    const declared = r.list.actions.filter((a) => !a.separator).map((a) => a.label);
    const got = items.map((i) => i.label);
    const missing = declared.filter((d) => !got.includes(d));
    if (missing.length) throw new Error(`menu missing: ${missing.join(', ')}`);
    const shouldWait = r.list.actions.filter((a) => !a.separator && !['create'].includes(a.kind)).map((a) => a.label);
    const wrong = items.filter((i) => shouldWait.includes(i.label) && !i.disabled).map((i) => i.label);
    if (wrong.length) throw new Error(`enabled with no selection: ${wrong.join(', ')}`);
    await page.keyboard.press('Escape');
    say(true, `${r.listRoute} menu matches config and gates on selection`, `${declared.length} items`);
  } catch (e) { say(false, `${r.listRoute} menu matches config and gates on selection`, e.message); }

  // delete the row we just created, honouring any guard
  try {
    const rows = await rowCount();
    await page.click('table tbody tr:last-child input[type=checkbox]');
    await wait(250);
    const del = r.list.actions.find((a) => a.kind === 'delete');
    await click('Actions'); await wait(200);
    if (!await click(del.label, '[role=menuitem]')) throw new Error('delete item not clickable');
    await wait(450);
    const after = await rowCount();
    const guarded = await page.evaluate(() => /before deleting|Cannot delete/.test(document.body.innerText));
    if (!guarded && after >= rows) throw new Error(`row count ${rows} -> ${after}`);
    say(true, `${r.listRoute} delete`, guarded ? 'refused by guard, with a reason' : `${rows} -> ${after} rows`);
  } catch (e) { say(false, `${r.listRoute} delete`, e.message); }
}

await browser.close();
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].join(' | ')}`);
console.log(`\n  ${pass} pass, ${fail} fail across ${migrated.length} migrated list pages${fail || errors.length ? ' — BLOCKING' : ''}\n`);
process.exit(fail || errors.length ? 1 : 0);
