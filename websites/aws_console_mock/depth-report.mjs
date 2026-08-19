/**
 * Navigational depth — how far past the landing page this console actually goes.
 *
 *     node depth-report.mjs --base http://127.0.0.1:5273
 *
 * The Console Fidelity Index scores five dimensions, and every one of them is measured on
 * the route you navigate to: columns, controls, actions, tabs, optional columns. None of
 * them can see the *second* layer. Measured on 2026-08-18, that blind spot had produced a
 * console where 58 routes carried a populated table and only 12 had rows that led anywhere.
 *
 * A list whose rows go nowhere is a dead end: an agent can read it but cannot drill into a
 * resource, which rules out the entire class of tasks that start "open instance i-… and
 * check its …". This reports the gap so it can be closed and kept closed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const BASE = arg('--base', 'http://127.0.0.1:5273').replace(/\/$/, '');
const JSON_OUT = arg('--json', null);
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

const app = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1])
  .filter((r) => !r.includes(':') && r !== '*');

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const out = [];
for (const r of routes) {
  try {
    await page.goto(`${BASE}${r}?sid=depth-probe`, { waitUntil: 'networkidle0', timeout: 20000 });
    out.push({ route: r, ...(await page.evaluate(() => {
      const t = document.querySelector('table');
      const trs = t ? [...t.querySelectorAll('tbody tr')] : [];
      // A row leads somewhere if it holds a real link. A cell styled to look clickable but
      // wired to nothing is exactly the defect this report exists to surface, so hover
      // affordances alone do not count.
      const linked = trs.filter((tr) => tr.querySelector('a[href]')).length;
      return {
        rows: trs.length,
        linked,
        tabs: document.querySelectorAll('[role=tab]').length,
        chars: document.body.innerText.length,
        h1: (document.querySelector('h1')?.innerText || '').trim(),
      };
    })) });
  } catch (e) { out.push({ route: r, error: e.message }); }
}
await browser.close();

const tables = out.filter((o) => o.rows > 0);
const dead = tables.filter((o) => !o.linked);
const pct = (n, d) => `${((n / (d || 1)) * 100).toFixed(1)}%`;

console.log(`\nNavigational depth   (${BASE})\n`);
console.log(`  routes crawled                 ${out.length}`);
console.log(`  with a populated table         ${tables.length}`);
console.log(`  whose rows link to a detail    ${tables.length - dead.length}  (${pct(tables.length - dead.length, tables.length)})`);
console.log(`  with a tab strip               ${out.filter((o) => o.tabs > 0).length}`);
if (dead.length) {
  console.log(`\n  dead-end list pages (${dead.length}) — rows go nowhere`);
  for (const o of dead.sort((a, b) => b.rows - a.rows)) {
    console.log(`    ${o.route.padEnd(32)} ${String(o.rows).padStart(3)} rows`);
  }
}
// A route that renders no <h1> has no page title, whatever the source says. The source-level
// gate cannot see that an h1 lives only inside a detail branch.
// /go is the state-inspection surface the harness reads, not a console page.
const TITLE_EXEMPT = new Set(['/go']);
const noTitle = out.filter((o) => !o.error && !o.h1 && !TITLE_EXEMPT.has(o.route));
if (noTitle.length) {
  console.log(`\n  routes rendering no <h1> (${noTitle.length}) — source-level gate S1 cannot see this`);
  for (const o of noTitle) console.log(`    ${o.route}`);
}
const errs = out.filter((o) => o.error);
if (errs.length) console.log(`\n  ${errs.length} route(s) failed: ${errs.map((e) => e.route).join(', ')}`);
console.log('');

if (JSON_OUT) {
  fs.writeFileSync(path.join(ROOT, JSON_OUT), JSON.stringify({ base: BASE, routes: out }, null, 2));
  console.log(`  detail written to ${JSON_OUT}\n`);
}
