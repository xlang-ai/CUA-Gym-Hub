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
 * Six dimensions, combined with a GEOMETRIC mean so that one strong dimension cannot
 * paper over a weak one — a console with perfect colours and no columns is not 50% real.
 *
 *   column_depth         default columns present / default columns the real console shows
 *   control_coverage     filter, bulk-select, pagination, preferences, tab strip
 *   action_coverage      the action VOCABULARY: buttons and Actions-menu items present
 *   interaction_coverage the action GRAMMAR: enabled items that actually do something
 *   flow_depth           does a row lead anywhere, and does that page have tabs
 *   state_gating         does the mock refuse what the console refuses
 *
 * Reweighted in 1.6.1. Until then two of five dimensions scored columns (default and
 * Preferences-only), so the index rewarded cataloguing columns — and the work followed it.
 * Reading the live console showed the real distance was interaction: an Actions menu with 71
 * entries across six nested submenus, gated on instance state, versus four flat items here.
 * Columns now hold one slot; three slots measure whether the console can be *operated*.
 *
 * interaction_coverage is measured by CLICKING. Every enabled menu item is opened and the
 * page is checked for an observable effect — a dialog, a route change, a flash, a state
 * change. That is the only way to catch the defect this codebase keeps producing: a menu item
 * wired to a dialog that was never rendered, which passes the build and every static gate.
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

/**
 * Click every enabled menu item and check the page actually responded.
 *
 * Returns { enabled, effective, inert } — `inert` names the items that closed the menu and
 * changed nothing, which is the signature of an unimplemented action. A cap is applied per
 * page and reported rather than hidden, so a truncated probe never reads as full coverage.
 */
const PROBE_CAP = 14;
async function probeInteractions(page, base, sid) {
  // Server state is part of the answer. An export that writes a record and shows a message has
  // done real work even though the visible page is unchanged — and that record is exactly what a
  // reward function reads. Judging on the DOM alone called four working exports inert.
  const stateFingerprint = async () => {
    if (!sid) return '';
    try {
      const r = await fetch(`${base}/go?sid=${sid}`);
      if (!r.ok) return '';
      const j = await r.json();
      return JSON.stringify(j.current_state || {}).length + ':' + JSON.stringify(j.state_diff || {}).length;
    } catch { return ''; }
  };

  const openMenu = (i) => page.evaluate((idx) => {
    const t = document.querySelectorAll('[aria-haspopup="menu"]')[idx];
    if (!t) return false;
    if (t.getAttribute('aria-expanded') !== 'true') t.click();
    return true;
  }, i);
  const closeAll = () => page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      const t = (b.innerText || '').trim();
      if (t === 'Cancel' || t === 'Close') { b.click(); return; }
    }
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  // Text length EXCLUDING flash messages, and the flash count kept separately.
  //
  // The first version counted any text change as a response, so a handler whose whole body is
  // `addFlash('success', ...)` scored as working — and that handler is the defect itself, a
  // success message for work never done. The fleet source screen found seven of them in this app
  // while this probe reported none inert. An instrument that rewards the thing it exists to
  // catch is worse than no instrument.
  const snapshot = () => page.evaluate(() => {
    const flashes = [...document.querySelectorAll('[data-testid=flash]')];
    const flashLen = flashes.reduce((a, f) => a + (f.innerText || '').length, 0);
    return {
      len: document.body.innerText.length - flashLen,
      flashes: flashes.length,
      fields: document.querySelectorAll('input, select, textarea').length,
      dialogs: document.querySelectorAll('[role=dialog], .aws-modal, .fixed.inset-0').length,
      href: location.hash + location.pathname,
    };
  });

  const triggerCount = await page.$$eval('[aria-haspopup="menu"]', (e) => e.length);
  const enabledLabels = [];

  // Toolbar buttons count too. Most actions in this mock are plain buttons rather than menu
  // items, and an unwired button is the same defect as an unwired menu item. Chrome and
  // destructive labels are skipped: the probe must not spend the page's state to measure it.
  const SKIP = /^(services|admin user|n\. virginia|info|previous|next|cancel|close|confirm|\d+)$/i;
  const DESTRUCTIVE = /delete|terminate|remove|revoke|detach|purge|empty|deregister/i;
  // An already-selected tab correctly does nothing when clicked again, so it is not a probe
  // subject. Counting it as inert blamed the page for behaving properly.
  const toolbarButtons = await page.$$eval('button', (els, skip, dstr) =>
    els.filter((b) => !b.disabled && !b.closest('table tbody') && !b.closest('[role=menu]')
                   && b.getAttribute('aria-selected') !== 'true')
       .map((b) => (b.innerText || '').trim())
       .filter((t) => t && t.length < 40 && !new RegExp(skip, 'i').test(t) && !new RegExp(dstr, 'i').test(t)),
    SKIP.source, DESTRUCTIVE.source);
  for (const label of [...new Set(toolbarButtons)]) enabledLabels.push({ trigger: -1, label });
  for (let i = 0; i < triggerCount; i++) {
    await openMenu(i);
    await new Promise((r) => setTimeout(r, 120));
    const items = await page.$$eval('[role=menuitem]', (els) =>
      els.map((e) => ({ label: e.innerText.trim(), disabled: e.disabled })));
    for (const it of items) if (!it.disabled && it.label) enabledLabels.push({ trigger: i, label: it.label });
    await closeAll();
    await new Promise((r) => setTimeout(r, 80));
  }

  const capped = enabledLabels.length > PROBE_CAP;
  const probe = enabledLabels.slice(0, PROBE_CAP);
  const inert = [];
  const inertToastOnly = [];
  let effective = 0;
  for (const { trigger, label } of probe) {
    // Baseline BEFORE the menu opens. Taken after opening, the menu's own text inflates the
    // baseline and every click then looks like a shrink.
    const before = await snapshot();
    const beforeState = await stateFingerprint();
    if (trigger >= 0) { await openMenu(trigger); await new Promise((r) => setTimeout(r, 120)); }
    const clicked = await page.evaluate(({ l, inMenu }) => {
      const pool = inMenu
        ? [...document.querySelectorAll('[role=menuitem]')]
        : [...document.querySelectorAll('button')].filter((b) => !b.closest('[role=menu]'));
      const b = pool.find((x) => (x.innerText || '').trim() === l);
      if (!b || b.disabled) return false;
      b.click();
      return true;
    }, { l: label, inMenu: trigger >= 0 });
    if (!clicked) { await closeAll(); continue; }
    await new Promise((r) => setTimeout(r, 320));
    const after = await snapshot();
    // A response is any real change: a dialog, a navigation, a different set of form fields,
    // or a substantially different page. Requiring the text to GROW was wrong — every
    // "Create ..." button swaps the table for a form, which makes the page shorter, and the
    // probe reported six working buttons as inert.
    // A new flash alone is NOT a response — that handler is the defect this probe exists to
    // catch. But a change to server state IS one, even with the page unchanged.
    const afterState = await stateFingerprint();
    const domMoved = after.dialogs > before.dialogs
      || after.href !== before.href
      || after.fields !== before.fields
      || Math.abs(after.len - before.len) > 40;
    const stateMoved = beforeState !== '' && afterState !== beforeState;
    const responded = domMoved || stateMoved;
    if (!responded && after.flashes > before.flashes) inertToastOnly.push(label);
    if (responded) effective++; else inert.push(label);
    await closeAll();
    await new Promise((r) => setTimeout(r, 120));
  }
  return { enabled: enabledLabels.length, probed: probe.length, effective, inert, inertToastOnly, capped };
}

/** Does a row lead to a second layer, and does that layer have tabs? */
async function measureFlow(page, base, route) {
  const link = await page.evaluate(() => {
    const t = document.querySelector('table');
    if (!t) return null;
    const a = t.querySelector('tbody tr a[href]');
    return a ? a.getAttribute('href') : null;
  });
  if (!link) return { linked: false, detailTabs: 0 };
  try {
    await page.goto(`${base}${link.startsWith('/') ? link : '/' + link}?sid=fidelity-detail`,
      { waitUntil: 'networkidle0', timeout: 15000 });
    const detailTabs = await page.$$eval('[role=tab]', (e) => e.length);
    return { linked: true, detailTabs };
  } catch { return { linked: true, detailTabs: 0 }; }
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
      await page.goto(`${BASE}${route}?sid=fidelity-${route.replace(/\W+/g, '-')}`, {
        waitUntil: 'networkidle0',
        timeout: 20000,
      });
      measured = await page.evaluate(measurePage);
    } catch (e) {
      results.push({ route, error: e.message, scores: null });
      continue;
    }

    // Runtime probes. These click, so they run after the static read of the page.
    let interaction = { enabled: 0, probed: 0, effective: 0, inert: [], capped: false };
    let flow = { linked: false, detailTabs: 0 };
    try { interaction = await probeInteractions(page, BASE, `fidelity-${route.replace(/\W+/g, '-')}`); } catch (e) { interaction.error = e.message; }
    try { flow = await measureFlow(page, BASE, route); } catch (e) { flow.error = e.message; }

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
      interaction: {
        enabled: interaction.enabled,
        effective: interaction.effective,
        inert: interaction.inert,
        capped: interaction.capped,
      },
      flow,
      scores: {
        column_depth: cols.score,
        control_coverage: ctrl.score,
        action_coverage: acts.score,
        // An action the console offers but this mock leaves inert scores zero here even
        // though action_coverage counted its label. Vocabulary and grammar are separate.
        interaction_coverage: interaction.probed === 0
          ? (acts.matched.length === 0 ? 1 : 0)
          : interaction.effective / interaction.probed,
        // Half for a row that leads anywhere, half for that page carrying a tab strip.
        flow_depth: measured.rows === 0 ? 1
          : (flow.linked ? 0.5 : 0) + (flow.detailTabs > 0 ? 0.5 : 0),
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
const dims = ['column_depth', 'control_coverage', 'action_coverage',
              'interaction_coverage', 'flow_depth', 'state_gating'];

// state_gating is a property of the mock's rules, not of any one page: the fraction of the
// live console's captured stopped-vs-running enablement matrix that the mock reproduces.
async function stateGatingScore() {
  const dir = path.join(ROOT, 'reference/capture/extracted');
  if (!fs.existsSync(dir)) return { score: null, total: 0, wrong: [], resources: 0 };
  const files = fs.readdirSync(dir).filter((f) => f.includes('interactions'));
  if (!files.length) return { score: null, total: 0, wrong: [], resources: 0 };
  const m = await import('./src/lib/instanceActions.js');
  const items = [...m.TOP_LEVEL, ...m.INSTANCE_SETTINGS, ...m.NETWORKING_SETTINGS,
                 ...m.SECURITY_SETTINGS, ...m.STORAGE_SETTINGS, ...m.MONITOR_SETTINGS, ...m.STATE_COMMANDS];
  const find = (l) => items.find((i) => i.label === l)
    || items.find((i) => i.label.split(' ').slice(0, 4).join(' ') === l);
  const stopped = { state: 'stopped', type: 't2.micro', platform: 'Linux/UNIX' };
  const running = { ...stopped, state: 'running' };
  const ok = (it, inst) => m.unavailableReason(it, inst) === null;
  let total = 0, right = 0, scorable = 0; const wrong = [];
  for (const f of files) {
    const g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).state_dependent_enablement;
    // Only the two-state, fully-observed shape is scorable. A capture that saw one state —
    // every volume in the account was In-use — carries an inferred half, and scoring an
    // inference as if it were evidence is how the reference drifted from the console before.
    if (!g || !Array.isArray(g.enabled_only_when_running)) continue;
    scorable++;
    const cases = [
      ...g.enabled_only_when_running.map((l) => [l, true, false]),
      ...g.enabled_only_when_stopped.map((l) => [l, false, true]),
      ...(g.disabled_in_both_states?.items || []).map((l) => [l, false, false]),
    ];
    for (const [label, wantRunning, wantStopped] of cases) {
      total++;
      const it = find(label);
      if (it && ok(it, running) === wantRunning && ok(it, stopped) === wantStopped) right++;
      else wrong.push(label);
    }
  }
  return { score: total ? right / total : null, total, wrong, resources: scorable, captured: files.length };
}
const gating = await stateGatingScore();
const dimAvg = Object.fromEntries(
  dims.map((d) => [d, d === 'state_gating'
    ? (gating.score ?? 0)
    : scored.reduce((a, r) => a + (r.scores[d] ?? 0), 0) / (scored.length || 1)])
);

// A second score over only the requirements an AWS doc actually names verbatim. The
// overall number divides partly by our own inferences, so it is directional; this one is
// the defensible figure. See reference/research/README.md.
const CONF_KEY = { column_depth: 'columns_default', action_coverage: 'primary_actions',
                   control_coverage: 'controls', interaction_coverage: 'primary_actions',
                   flow_depth: 'tabs' };
const sourcedAvg = Object.fromEntries(dims.map((d) => {
  // state_gating is measured directly against the live capture, so it is sourced by
  // construction rather than by a per-page confidence mark.
  if (d === 'state_gating') return [d, gating.score];
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
    const s = (r) => dims.reduce((x, d) => x + (r.scores[d] ?? 0), 0);
    return s(a) - s(b);
  })
  .slice(0, 12);
console.log('  widest gaps (worst pages first)');
for (const r of worst) {
  const missing = [
    r.interaction?.inert?.length && `${r.interaction.inert.length} inert`,
    r.flow && r.measured.rows > 0 && !r.flow.linked && 'dead end',
    r.gaps.missing_columns.length && `${r.gaps.missing_columns.length} cols`,
    r.gaps.missing_controls.length && `${r.gaps.missing_controls.join('/')}`,
    r.gaps.missing_tabs.length && `${r.gaps.missing_tabs.length} tabs`,
    r.gaps.missing_actions.length && `${r.gaps.missing_actions.length} actions`,
  ].filter(Boolean).join(', ');
  console.log(`    ${r.route.padEnd(30)} ${pct(dims.filter((d)=>r.scores[d]!==undefined).reduce((a,d)=>a+r.scores[d],0)/dims.filter((d)=>r.scores[d]!==undefined).length).padStart(6)}  ${missing || 'complete'}`);
}
// The actionable output: items the console offers, that this mock renders as enabled, and
// that do nothing when clicked. These are what "no blank endpoints" actually means.
const inert = scored.flatMap((r) => (r.interaction?.inert || []).map((l) => {
  const toastOnly = (r.interaction.inertToastOnly || []).includes(l);
  return `${r.route} -> ${l}${toastOnly ? '   [showed a toast and changed nothing]' : ''}`;
}));
if (inert.length) {
  console.log(`  inert actions (${inert.length}) — enabled, clicked, nothing happened`);
  for (const line of inert.slice(0, 20)) console.log(`    ${line}`);
  if (inert.length > 20) console.log(`    ... and ${inert.length - 20} more (see --json)`);
  console.log('');
}
const cappedPages = scored.filter((r) => r.interaction?.capped);
if (cappedPages.length) {
  console.log(`  ${cappedPages.length} page(s) had more enabled actions than the probe cap of 14; not all were clicked\n`);
}
if (gating.score !== null) {
  console.log(`  state gating: ${gating.total - gating.wrong.length}/${gating.total} captured rules reproduced` +
    ` — captured for ${gating.resources} resource type(s) of ${scored.length} pages, so this` +
    ` dimension speaks only for what has been captured` +
    (gating.wrong.length ? ` — missing: ${gating.wrong.slice(0, 5).join(', ')}` : ''));
  console.log('');
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
