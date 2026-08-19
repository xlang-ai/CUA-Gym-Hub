/**
 * Console Fidelity Index — how far this mock is from the real AWS Management Console.
 *
 *     node fidelity-score.mjs --base http://127.0.0.1:5273
 *     node fidelity-score.mjs --base http://127.0.0.1:5273 --json out.json
 *
 * The quality contract answers "is anything broken?" with pass/fail gates. That cannot
 * answer "how much shallower than the real console is this?", which is the question that
 * actually drives the next release. This does.
 *
 * Scored against reference/page-depth.<version>.json, a frozen per-page specification of
 * the real console: the columns it shows by default, the columns behind Preferences, the
 * tab strip, the primary buttons, the Actions-menu contents, and the table controls.
 *
 * Five dimensions, combined with a GEOMETRIC mean so that one strong dimension cannot
 * paper over a weak one — a console with perfect colours and no columns is not 50% real.
 *
 *   column_depth      default columns present / default columns the real console shows
 *   control_coverage  filter, bulk-select, pagination, preferences, tab strip
 *   action_coverage   primary buttons and Actions-menu items present
 *   tab_coverage      detail/section tabs present
 *   optional_depth    Preferences-only columns present (real consoles expose many)
 *
 * Reference ownership: reference/*.json is supervisor-owned. A repair agent that could
 * edit it would raise its score by deleting requirements instead of implementing them.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const BASE = arg('--base', 'http://127.0.0.1:5273').replace(/\/$/, '');
const JSON_OUT = arg('--json', null);
const CHROME = arg(
  '--chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
);

const specFile = fs
  .readdirSync(path.join(ROOT, 'reference'))
  .filter((f) => f.startsWith('page-depth') && f.endsWith('.json'))
  .sort()
  .pop();
if (!specFile) {
  console.error('No reference/page-depth*.json found.');
  process.exit(2);
}
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'reference', specFile), 'utf8'));

/** Normalise a label so "Instance state" and "instance  state" compare equal. */
const norm = (s) => String(s || '').toLowerCase().replace(/[\s ]+/g, ' ').replace(/[^a-z0-9 /()+.-]/g, '').trim();

/** Fraction of `required` present in `found`, by normalised label. 1 when nothing required. */
function coverage(required, found) {
  if (!required || required.length === 0) return { score: 1, missing: [], matched: [] };
  const have = new Set(found.map(norm));
  const matched = [];
  const missing = [];
  for (const r of required) {
    // A label counts as present if any measured label contains it or vice versa —
    // the real console and a mock legitimately differ on decoration like counts.
    const n = norm(r);
    const hit = [...have].some((h) => h === n || h.includes(n) || n.includes(h));
    (hit ? matched : missing).push(r);
  }
  return { score: matched.length / required.length, missing, matched };
}

/**
 * In-page measurement. Runs inside the browser; must stay dependency-free.
 *
 * Opens every dropdown trigger before collecting buttons. The real console keeps its
 * per-resource actions behind an "Actions" menu, and the reference spec lists them under
 * `actions_menu` — so a scorer that only reads *visible* buttons can never credit a
 * correctly-implemented dropdown. Measured before this fix, five working VPC menu items
 * moved action_coverage by 0.5pt. Worse than under-reporting, that gradient pushes toward
 * hoisting actions into always-visible toolbar buttons, which is *less* faithful. The
 * menu is opened, not the spec relaxed.
 */
async function measurePage() {
  const txt = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim();
  for (const trigger of document.querySelectorAll('[aria-haspopup="menu"]')) {
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
  }
  await new Promise((r) => setTimeout(r, 60));
  const table = document.querySelector('table.aws-table') || document.querySelector('table');
  const columns = table
    ? Array.from(table.querySelectorAll('thead th')).map(txt).filter(Boolean)
    : [];
  const allButtons = Array.from(document.querySelectorAll('button, [role=menuitem]'));
  const chromeLabels = new Set(['services', 'admin user', 'n. virginia', 'info']);
  const buttons = allButtons
    .map(txt)
    .filter(Boolean)
    .filter((t) => !chromeLabels.has(t.toLowerCase()) && !/^\d+$/.test(t));
  const tabs = allButtons
    .filter((b) => /border-b-2/.test(b.className || ''))
    .map(txt)
    .filter(Boolean);
  const placeholders = Array.from(document.querySelectorAll('input')).map(
    (i) => i.placeholder || ''
  );
  return {
    h1: txt(document.querySelector('h1')),
    columns,
    buttons,
    tabs,
    rows: table ? table.querySelectorAll('tbody tr').length : 0,
    hasFilter: placeholders.some((p) => /filter|search|find/i.test(p)),
    hasBulkSelect: !!table?.querySelector('thead input[type=checkbox]'),
    hasPagination: /\bPrevious\b|\bNext\b/.test(document.body.innerText),
    hasPreferences: buttons.some((b) => /preference/i.test(b)) ||
      !!document.querySelector('[aria-label*="reference" i], [title*="reference" i]'),
    crashed: /Something went wrong/i.test(document.body.innerText),
  };
}

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const results = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const [route, spec] of Object.entries(SPEC.pages)) {
    let measured;
    try {
      await page.goto(`${BASE}${route}?sid=fidelity-probe`, {
        waitUntil: 'networkidle0',
        timeout: 20000,
      });
      measured = await page.evaluate(measurePage);
    } catch (e) {
      results.push({ route, error: e.message, scores: null });
      continue;
    }

    const cols = coverage(spec.columns_default, measured.columns);
    const opt = coverage(spec.columns_optional, measured.columns);
    const acts = coverage(
      [...(spec.primary_actions || []), ...(spec.actions_menu || [])],
      measured.buttons
    );
    const tabs = coverage(spec.tabs, measured.tabs.concat(measured.buttons));

    const wantControls = spec.controls || [];
    const haveControls = [
      measured.hasFilter && 'filter',
      measured.hasBulkSelect && 'bulk_select',
      measured.hasPagination && 'pagination',
      measured.hasPreferences && 'preferences',
      measured.tabs.length > 0 && 'tabs',
    ].filter(Boolean);
    const ctrl = coverage(wantControls, haveControls);

    results.push({
      route,
      title: spec.title,
      crashed: measured.crashed,
      measured: {
        columns: measured.columns.length,
        tabs: measured.tabs.length,
        buttons: measured.buttons.length,
        rows: measured.rows,
        controls: haveControls,
      },
      required: {
        columns_default: (spec.columns_default || []).length,
        columns_optional: (spec.columns_optional || []).length,
        tabs: (spec.tabs || []).length,
        actions: ((spec.primary_actions || []).length + (spec.actions_menu || []).length),
        controls: wantControls.length,
      },
      scores: {
        column_depth: cols.score,
        optional_depth: opt.score,
        control_coverage: ctrl.score,
        action_coverage: acts.score,
        tab_coverage: tabs.score,
      },
      gaps: {
        missing_columns: cols.missing,
        missing_optional_columns: opt.missing,
        missing_controls: ctrl.missing,
        missing_actions: acts.missing,
        missing_tabs: tabs.missing,
      },
    });
  }
} finally {
  await browser.close();
}

// ------------------------------------------------------------------ aggregate
const scored = results.filter((r) => r.scores);
const dims = ['column_depth', 'optional_depth', 'control_coverage', 'action_coverage', 'tab_coverage'];
const dimAvg = Object.fromEntries(
  dims.map((d) => [d, scored.reduce((a, r) => a + r.scores[d], 0) / (scored.length || 1)])
);

// A second score over only the requirements an AWS doc actually names verbatim. The
// overall number divides partly by our own inferences, so it is directional; this one is
// the defensible figure. See reference/research/README.md.
const CONF_KEY = { column_depth: 'columns_default', optional_depth: 'columns_optional',
                   tab_coverage: 'tabs', action_coverage: 'primary_actions',
                   control_coverage: 'controls' };
const sourcedAvg = Object.fromEntries(dims.map((d) => {
  const rows = scored.filter((r) => {
    const c = SPEC.pages[r.route]?.confidence?.[CONF_KEY[d]];
    return c === 'sourced' || c === 'partially_sourced';
  });
  return [d, rows.length ? rows.reduce((a, r) => a + r.scores[d], 0) / rows.length : null];
}));
const sourcedDims = dims.filter((d) => sourcedAvg[d] !== null);
// Geometric mean, floored so a single zero does not annihilate the index outright.
const EPS = 0.01;
const cfi = Math.exp(
  dims.reduce((a, d) => a + Math.log(Math.max(dimAvg[d], EPS)), 0) / dims.length
);

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const bar = (x) => '█'.repeat(Math.round(x * 24)).padEnd(24, '·');

console.log(`\nConsole Fidelity Index — ${SPEC.reference_version}   (${BASE})`);
console.log(`reference: reference/${specFile}\n`);
console.log('  dimension            score');
for (const d of dims) console.log(`  ${d.padEnd(18)} ${bar(dimAvg[d])} ${pct(dimAvg[d])}`);
const cfiSourced = sourcedDims.length
  ? Math.exp(sourcedDims.reduce((a, d) => a + Math.log(Math.max(sourcedAvg[d], EPS)), 0) / sourcedDims.length)
  : null;
console.log(`\n  CFI (all requirements)   ${bar(cfi)} ${pct(cfi)}   directional`);
if (cfiSourced !== null) {
  console.log(`  CFI (sourced only)       ${bar(cfiSourced)} ${pct(cfiSourced)}   defensible`);
  console.log(`  ${sourcedDims.map((d) => `${d} ${pct(sourcedAvg[d])}`).join('  ')}`);
}
console.log('');

const worst = [...scored]
  .sort((a, b) => {
    const s = (r) => dims.reduce((x, d) => x + r.scores[d], 0);
    return s(a) - s(b);
  })
  .slice(0, 12);
console.log('  widest gaps (worst pages first)');
for (const r of worst) {
  const missing = [
    r.gaps.missing_columns.length && `${r.gaps.missing_columns.length} cols`,
    r.gaps.missing_controls.length && `${r.gaps.missing_controls.join('/')}`,
    r.gaps.missing_tabs.length && `${r.gaps.missing_tabs.length} tabs`,
    r.gaps.missing_actions.length && `${r.gaps.missing_actions.length} actions`,
  ].filter(Boolean).join(', ');
  console.log(`    ${r.route.padEnd(30)} ${pct(dims.reduce((a,d)=>a+r.scores[d],0)/dims.length).padStart(6)}  ${missing || 'complete'}`);
}
const crashed = results.filter((r) => r.crashed || r.error);
if (crashed.length) {
  console.log(`\n  ${crashed.length} page(s) failed to measure: ${crashed.map((c) => c.route).join(', ')}`);
}
console.log('');

if (JSON_OUT) {
  fs.writeFileSync(
    path.join(ROOT, JSON_OUT),
    JSON.stringify({ reference_version: SPEC.reference_version, base: BASE, cfi, dimensions: dimAvg, pages: results }, null, 2)
  );
  console.log(`  detail written to ${JSON_OUT}\n`);
}
