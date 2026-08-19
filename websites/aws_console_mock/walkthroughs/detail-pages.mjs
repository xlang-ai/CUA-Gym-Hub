// Every registry-generated detail page, rendered and clicked through tab by tab.
//
// Two failure modes matter. A tab panel that renders nothing is a blank endpoint. And a tab
// whose every field resolves to the em-dash placeholder is worse than blank: it looks
// populated while meaning the registry named fields the resource does not have.
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://127.0.0.1:5273';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const { RESOURCES } = await import(path.join(ROOT, '../src/lib/resourceRegistry.js'));
const dm = await import(path.join(ROOT, '../src/store/dataManager.js'));
const data = dm.getDefaultData();
const at = (s, p) => p.split('.').reduce((n, k) => (n ? n[k] : undefined), s) || [];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 110)));

let pass = 0, fail = 0, skip = 0;
const problems = [];

for (const r of RESOURCES) {
  const coll = at(data, r.path);
  if (!coll.length) { console.log(`  SKIP  ${r.detailRoute.padEnd(32)} no seed rows in ${r.path}`); skip++; continue; }
  const id = coll[0][r.key];
  if (id === undefined) { console.log(`  FAIL  ${r.detailRoute.padEnd(32)} key "${r.key}" missing from ${r.path}[0]`); fail++; continue; }
  try {
    await page.goto(`${BASE}${r.detailRoute.replace(':id', encodeURIComponent(id))}?sid=detail-${r.id}`,
      { waitUntil: 'networkidle0', timeout: 15000 });
    const m = await page.evaluate(() => ({
      h1: (document.querySelector('h1')?.innerText || '').trim(),
      tabs: [...document.querySelectorAll('[role=tab]')].map((t) => t.innerText.trim()),
      bad: /Something went wrong|Unknown resource|Resource not found/i.test(document.body.innerText),
    }));
    const empty = [], hollow = [];
    for (const t of m.tabs) {
      await page.evaluate((l) => [...document.querySelectorAll('[role=tab]')].find((x) => x.innerText.trim() === l).click(), t);
      await new Promise((res) => setTimeout(res, 130));
      const panel = await page.evaluate(() => {
        const p = document.querySelector('[role=tabpanel]');
        if (!p) return null;
        const vals = [...p.querySelectorAll('dd')].map((d) => d.innerText.trim());
        return { text: p.innerText.trim(), values: vals };
      });
      if (!panel || !panel.text) { empty.push(t); continue; }
      if (panel.values.length && panel.values.every((v) => v === '–' || v === '')) hollow.push(t);
    }
    const ok = !m.bad && m.tabs.length === r.tabs.length && !empty.length && !hollow.length;
    const notes = [
      m.bad && 'CRASHED',
      m.tabs.length !== r.tabs.length && `tabs ${m.tabs.length}/${r.tabs.length}`,
      empty.length && `EMPTY:${empty.join(',')}`,
      hollow.length && `ALL-PLACEHOLDER:${hollow.join(',')}`,
    ].filter(Boolean).join(' ');
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.detailRoute.padEnd(32)} "${m.h1.slice(0, 24)}" ${m.tabs.length} tabs ${notes}`);
    if (ok) pass++; else { fail++; problems.push(`${r.detailRoute}: ${notes}`); }
  } catch (e) {
    console.log(`  FAIL  ${r.detailRoute.padEnd(32)} ${e.message.slice(0, 60)}`);
    fail++; problems.push(`${r.detailRoute}: ${e.message.slice(0, 60)}`);
  }
}
await browser.close();
if (errors.length) console.log(`\n  page errors: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
console.log(`\n  ${pass} pass, ${fail} fail, ${skip} skipped (no seed data)${fail || errors.length ? ' — BLOCKING' : ''}\n`);
process.exit(fail || errors.length ? 1 : 0);
