/**
 * App-agnostic runtime audit.
 *
 *     node fleet/audit-runtime.mjs --base http://127.0.0.1:5173
 *     node fleet/audit-runtime.mjs --base http://127.0.0.1:5173 --json out.json
 *
 * Layer 2 of the fleet program covered exactly one app, because the harness that does this well
 * lives inside `websites/aws_console_mock` and knows that app's route table, gates and reference.
 * This is the portable subset: everything that can be judged from the DOM alone, with no
 * reference and no knowledge of the app.
 *
 * Routes are DISCOVERED by following in-app links from the entry page rather than parsed out of
 * source, so it works on any framework and cannot go blind to a route that stops being a literal
 * string — a failure that has already happened three times in this project to source-reading
 * instruments, each time while still reporting success.
 *
 * What it measures, all of it straight from SANDBOX_COMPLETENESS_GUIDE.md:
 *   crashes          a route that renders an error boundary or throws
 *   missing_title    a route with no <h1> — no page title in its default state
 *   dead_end_list    a populated table whose rows link nowhere
 *   inert_control    an enabled control that, when clicked, changes nothing —
 *                    and a toast is NOT a change, since a success message for work that never
 *                    happened is the defect, not the response
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const BASE = arg('--base', 'http://127.0.0.1:5173').replace(/\/$/, '');
const JSON_OUT = arg('--json', null);
const MAX_ROUTES = Number(arg('--max-routes', 40));
const PROBE_CAP = Number(arg('--probe-cap', 10));
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

// puppeteer-core lives in whichever site installed it, not at the hub root. Resolving it from
// there keeps this tool zero-install: adding a second copy for the tooling would be one more
// thing to keep in step with the sites.
async function loadPuppeteer() {
  try { return (await import('puppeteer-core')).default; } catch { /* not at hub root */ }
  const sites = fs.readdirSync(path.join(ROOT, 'websites'));
  for (const s of sites) {
    const dir = path.join(ROOT, 'websites', s, 'node_modules/puppeteer-core');
    if (!fs.existsSync(dir)) continue;
    // Read the package's own entry point rather than guessing a layout that varies by version.
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const entry = pkg.exports?.['.']?.import || pkg.module || pkg.main;
    if (!entry) continue;
    const full = path.join(dir, entry);
    if (fs.existsSync(full)) return (await import(`file://${full}`)).default;
  }
  console.error('puppeteer-core not found in any websites/*/node_modules. Install it in one site.');
  process.exit(2);
}
const puppeteer = await loadPuppeteer();
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

/** Same-origin, non-asset links found on the page, as pathnames. */
const linksOn = () => page.evaluate(() => {
  const here = location.origin;
  return [...new Set([...document.querySelectorAll('a[href]')]
    .map((a) => a.href)
    .filter((h) => h.startsWith(here))
    .map((h) => new URL(h).pathname + new URL(h).hash)
    .filter((p) => !/\.(png|jpe?g|svg|css|js|ico|woff2?)$/i.test(p)))];
});

const measure = () => page.evaluate(() => {
  const table = document.querySelector('table');
  const rows = table ? [...table.querySelectorAll('tbody tr')] : [];
  const flashSel = '[data-testid=flash], [role=status], [role=alert], .toast, .notification';
  return {
    h1: (document.querySelector('h1')?.innerText || '').trim(),
    crashed: /something went wrong|application error|unexpected error|cannot read propert/i
      .test(document.body.innerText),
    rowCount: rows.length,
    linkedRows: rows.filter((r) => r.querySelector('a[href]')).length,
    textLen: document.body.innerText.length,
    flashCount: document.querySelectorAll(flashSel).length,
    fieldCount: document.querySelectorAll('input, select, textarea').length,
    dialogCount: document.querySelectorAll('[role=dialog], .modal, .fixed.inset-0').length,
    menuCount: document.querySelectorAll('[role=menu], [role=listbox]').length,
    expanded: document.querySelectorAll('[aria-expanded=true]').length,
    // The most portable signal there is. Many apps open a dropdown with no ARIA role and little
    // text; judging only on roles and text length called their working buttons inert. If nodes
    // appeared or vanished, something happened.
    nodeCount: document.querySelectorAll('*').length,
    // Tab-like groups that never say which tab is selected. Three or more sibling buttons whose
    // classes differ only by a state suffix is the shape; if none of them carries
    // aria-selected or aria-current, the active one is invisible to the accessibility tree.
    unmarkedTabGroups: (() => {
      let groups = 0;
      for (const parent of document.querySelectorAll('div, nav, ul, header, section')) {
        const kids = [...parent.children].filter((c) => c.tagName === 'BUTTON' || c.tagName === 'A');
        if (kids.length < 3) continue;
        const marked = kids.some((k) => k.hasAttribute('aria-selected') || k.hasAttribute('aria-current')
          || k.getAttribute('role') === 'tab');
        const styled = new Set(kids.map((k) => (k.className || '').toString())).size > 1;
        if (!marked && styled) groups++;
      }
      return groups;
    })(),
  };
});

const CHROME_LABELS = /^(ok|cancel|close|next|previous|back|submit|save|search|menu|\d+|)$/i;
const DESTRUCTIVE = /delete|remove|terminate|revoke|destroy|empty|purge|deregister|sign out|log ?out/i;

/** Click enabled controls and require something other than a toast to move. */
async function probeControls(pageRef) {
  // Lessons carried over from the per-app scorer rather than rediscovered here:
  // an already-selected tab correctly does nothing when re-clicked, so it is not a probe
  // subject — counting it as inert blames the page for behaving properly.
  const labels = await pageRef.$$eval('button, [role=menuitem]', (els, dstr) =>
    [...new Set(els
      .filter((b) => !b.disabled && b.offsetParent !== null && b.getAttribute('aria-selected') !== 'true')
      .map((b) => (b.innerText || '').trim())
      .filter((t) => t && t.length < 40 && !new RegExp(dstr, 'i').test(t)))],
    DESTRUCTIVE.source);

  const candidates = labels.filter((l) => !CHROME_LABELS.test(l)).slice(0, PROBE_CAP);
  const inert = [];
  let probed = 0;
  for (const label of candidates) {
    const before = await measure();
    const clicked = await pageRef.evaluate((l) => {
      const b = [...document.querySelectorAll('button, [role=menuitem]')]
        .find((x) => (x.innerText || '').trim() === l && !x.disabled && x.offsetParent !== null);
      if (!b) return false; b.click(); return true;
    }, label);
    if (!clicked) continue;
    probed++;
    await new Promise((r) => setTimeout(r, 260));
    const after = await measure();
    // Opening a menu or expanding a disclosure is a response even when the text barely moves.
    const moved = after.dialogCount > before.dialogCount
      || after.menuCount > before.menuCount
      || after.expanded !== before.expanded
      || after.fieldCount !== before.fieldCount
      || after.nodeCount !== before.nodeCount
      || Math.abs(after.textLen - before.textLen) > 60
      || after.rowCount !== before.rowCount;
    // A toast-only response is reported separately, not merged into the count, because one
    // legitimate case exists: a control whose honest answer is "there is nothing to do here"
    // (a reset with nothing to reset). Making such a control lie to satisfy the probe would be
    // the wrong fix, so the distinction stays visible and a human decides.
    if (!moved) inert.push(label + (after.flashCount > before.flashCount ? ' (toast only — may be an honest no-op)' : ''));
    // dismiss whatever opened, so the next probe starts from a comparable state
    await pageRef.evaluate(() => {
      const c = [...document.querySelectorAll('button')].find((b) => /^(cancel|close)$/i.test((b.innerText || '').trim()));
      if (c) c.click();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 140));
  }
  return { probed, inert };
}

// ------------------------------------------------------------------ crawl
const seen = new Set();
const queue = ['/'];
const results = [];
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 120)));

while (queue.length && results.length < MAX_ROUTES) {
  const route = queue.shift();
  if (seen.has(route)) continue;
  seen.add(route);
  const errsBefore = pageErrors.length;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
  } catch (e) {
    results.push({ route, error: e.message.slice(0, 80) });
    continue;
  }
  const m = await measure();
  const probe = await probeControls(page);
  const found = await linksOn();
  for (const l of found) if (!seen.has(l) && queue.length + results.length < MAX_ROUTES * 2) queue.push(l);
  results.push({
    route,
    h1: m.h1,
    crashed: m.crashed,
    rows: m.rowCount,
    deadEndList: m.rowCount > 0 && m.linkedRows === 0,
    unmarkedTabGroups: m.unmarkedTabGroups,
    probed: probe.probed,
    inert: probe.inert,
    threw: pageErrors.length - errsBefore,
  });
}
await browser.close();

// ------------------------------------------------------------------ report
const ok = results.filter((r) => !r.error);
const crashed = ok.filter((r) => r.crashed || r.threw > 0);
const untitled = ok.filter((r) => !r.h1);
const deadEnds = ok.filter((r) => r.deadEndList);
const unmarkedTabs = ok.filter((r) => r.unmarkedTabGroups > 0);
const inertTotal = ok.reduce((a, r) => a + (r.inert?.length || 0), 0);
const probedTotal = ok.reduce((a, r) => a + (r.probed || 0), 0);

console.log(`\nRuntime audit — ${BASE}`);
console.log(`  routes reached          ${results.length}${results.length >= MAX_ROUTES ? `  (capped at --max-routes ${MAX_ROUTES})` : ''}`);
console.log(`  crashed or threw        ${crashed.length}`);
console.log(`  no <h1> page title      ${untitled.length}`);
console.log(`  dead-end lists          ${deadEnds.length}`);
console.log(`  tab groups with no aria-selected  ${unmarkedTabs.reduce((a, r) => a + r.unmarkedTabGroups, 0)} across ${unmarkedTabs.length} route(s)`);
console.log(`  inert controls          ${inertTotal} of ${probedTotal} clicked${probedTotal ? ` (${Math.round((1 - inertTotal / probedTotal) * 100)}% responded)` : ''}`);
if (probedTotal && ok.some((r) => r.probed >= PROBE_CAP)) {
  console.log(`  note: ${ok.filter((r) => r.probed >= PROBE_CAP).length} route(s) hit the per-page probe cap of ${PROBE_CAP}; not every control was clicked`);
}
for (const [title, rows, fmt] of [
  ['crashed or threw', crashed, (r) => `${r.route}${r.threw ? `  (${r.threw} uncaught)` : ''}`],
  ['no page title', untitled, (r) => r.route],
  ['dead-end lists', deadEnds, (r) => `${r.route}  (${r.rows} rows, none linked)`],
  ['tab groups with no aria-selected — the active tab is invisible to the accessibility tree, so an agent reading it cannot tell which is current, and this audit cannot tell a selected tab from a dead control',
   unmarkedTabs, (r) => `${r.route}  (${r.unmarkedTabGroups} group${r.unmarkedTabGroups === 1 ? '' : 's'})`],
]) {
  if (!rows.length) continue;
  console.log(`\n  ${title}`);
  for (const r of rows.slice(0, 15)) console.log(`    ${fmt(r)}`);
}
const withInert = ok.filter((r) => r.inert?.length);
if (withInert.length) {
  console.log(`\n  inert controls`);
  for (const r of withInert.slice(0, 15)) console.log(`    ${r.route.padEnd(28)} ${r.inert.join(', ')}`);
}
console.log('');

if (JSON_OUT) {
  fs.writeFileSync(path.resolve(ROOT, JSON_OUT), JSON.stringify({ base: BASE, results }, null, 2));
  console.log(`  detail written to ${JSON_OUT}\n`);
}
process.exit(crashed.length ? 1 : 0);
