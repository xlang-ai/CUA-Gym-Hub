/**
 * Fleet-wide fake-affordance screen.
 *
 * SANDBOX_COMPLETENESS_GUIDE.md lays out what a finished mock looks like, and its required
 * workflow step 3 is literally a source search for fake affordances. That step has been run by
 * hand, per app, by whoever happened to be working on it — so the guide's acceptance criteria
 * exist as prose and have never been measured across the fleet. This measures them.
 *
 *     node fleet/audit-static.mjs                 # all sites
 *     node fleet/audit-static.mjs --json out.json
 *     node fleet/audit-static.mjs --site aws_console_mock
 *
 * WHAT THIS IS NOT: a verdict. It reads source, so it cannot see whether a handler does anything
 * real, and it will flag honest code that merely looks suspect. Its precision is calibrated
 * against aws_console_mock, the one site with runtime ground truth — see fleet/README.md. Treat
 * a finding as a place to look, and the per-site runtime harness as the thing that decides.
 *
 * Detectors map onto the guide's own language, one per acceptance criterion where possible.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ONLY = arg('--site', null);
const JSON_OUT = arg('--json', null);

/** Source files a user's clicks can reach. Tests and configs are not user surface. */
function sourceFiles(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
    }
  };
  walk(path.join(dir, 'src'));
  return out;
}

/** Strip comments and import lines: a TODO in a comment is not a fake affordance. */
function userFacing(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*import .*$/gm, '');
}

const DETECTORS = [
  {
    id: 'coming_soon',
    guide: 'No obvious clickable placeholder remains',
    severity: 'high',
    // Text the user reads that admits the feature is absent.
    test: (s) => [...s.matchAll(/["'`][^"'`]{0,60}(coming soon|not implemented|not available yet|under construction|feature unavailable)[^"'`]{0,60}["'`]/gi)].map((m) => m[0].slice(0, 80)),
  },
  {
    id: 'empty_handler',
    guide: 'No obvious clickable placeholder remains',
    severity: 'high',
    // onClick={() => {}} and friends: the control is live and does nothing at all.
    test: (s) => [...s.matchAll(/on[A-Z]\w+=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g)].map((m) => m[0]),
  },
  {
    id: 'href_hash_only',
    guide: 'No obvious clickable placeholder remains',
    severity: 'medium',
    test: (s) => [...s.matchAll(/<a\s[^>]*href=["']#["'][^>]*>/g)].map((m) => m[0].slice(0, 70)),
  },
  {
    id: 'toast_only_handler',
    guide: 'Prefer real, minimal local behavior over fake feedback',
    severity: 'high',
    // A handler whose entire body is a notification: a success message for work never done.
    test: (s) => [...s.matchAll(/on[A-Z]\w+=\{\s*\(\s*\)\s*=>\s*(?:addFlash|toast|alert|showToast|notify|message\.\w+)\s*\([^)]*\)\s*\}/g)].map((m) => m[0].slice(0, 90)),
  },
  {
    id: 'toast_without_write',
    guide: 'Mutations persist and appear in /go state/diff',
    severity: 'high',
    // A named handler that announces success and never writes anything. Found in
    // aws_console_mock's RDS parameter editor, which flashed "Parameter updated to X" and threw
    // the value away — the inline-arrow detector could not see it because the body is a block.
    test: (s) => {
      const hits = [];
      const re = /const\s+(handle\w+|on\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]{0,600}?)\n\s*\};/g;
      for (const m of s.matchAll(re)) {
        const body = m[2];
        const announces = /(addFlash|toast|notify|showToast|message\.\w+)\s*\(\s*['"`]?(success|info)/.test(body);
        const writes = /\bdispatch\s*\(|\bset[A-Z]\w*\s*\(|localStorage\.|fetch\s*\(|navigator\.clipboard|URL\.createObjectURL/.test(body);
        // setEditing(null)-style teardown is not a write; require a write that is not just a reset
        const onlyTeardown = writes && !/\bdispatch\s*\(|localStorage\.|fetch\s*\(|navigator\.clipboard|URL\.createObjectURL/.test(body)
          && /set\w+\(\s*(null|''|""|\[\]|false)\s*\)/.test(body);
        if (announces && (!writes || onlyTeardown)) hits.push(`${m[1]}() announces success without writing`);
      }
      return hits;
    },
  },
  {
    id: 'permanently_disabled',
    guide: 'Menus do not contain gray disabled items except state-dependent controls',
    severity: 'medium',
    // disabled with a literal true, rather than an expression over state.
    test: (s) => [...s.matchAll(/\bdisabled=\{?\s*(?:true)\s*\}?[\s/>]/g)].map((m) => m[0].trim()),
  },
  {
    id: 'todo_marker',
    guide: 'Inventory fake affordances',
    severity: 'low',
    test: (s) => [...s.matchAll(/\b(TODO|FIXME|XXX|HACK)\b[^\n]{0,60}/g)].map((m) => m[0].slice(0, 70)),
  },
  {
    id: 'placeholder_component',
    guide: 'No gray placeholder graveyards',
    severity: 'high',
    test: (s) => [...s.matchAll(/<(Placeholder|ComingSoon|NotImplemented|EmptyState)\b/g)].map((m) => m[0]),
  },
  {
    id: 'alert_dialog',
    guide: 'Prefer real, minimal local behavior over fake feedback',
    severity: 'medium',
    // window.alert as a stand-in for a dialog the product actually has.
    test: (s) => [...s.matchAll(/(?:window\.)?alert\s*\(/g)].map((m) => m[0]),
  },
];

const sites = fs.readdirSync(path.join(ROOT, 'websites'))
  .filter((n) => fs.statSync(path.join(ROOT, 'websites', n)).isDirectory())
  .filter((n) => !ONLY || n === ONLY)
  .sort();

const report = [];
for (const site of sites) {
  const dir = path.join(ROOT, 'websites', site);
  const files = sourceFiles(dir);
  if (!files.length) { report.push({ site, files: 0, error: 'no src/ files' }); continue; }

  const findings = {};
  let lines = 0;
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    lines += raw.split('\n').length;
    const s = userFacing(raw);
    for (const d of DETECTORS) {
      const hits = d.test(s);
      if (!hits.length) continue;
      findings[d.id] = findings[d.id] || { severity: d.severity, guide: d.guide, count: 0, examples: [], files: new Set() };
      findings[d.id].count += hits.length;
      findings[d.id].files.add(path.relative(dir, f));
      for (const h of hits.slice(0, 2)) {
        if (findings[d.id].examples.length < 3) findings[d.id].examples.push(h.replace(/\s+/g, ' '));
      }
    }
  }
  const flat = Object.entries(findings).map(([id, v]) => ({
    id, severity: v.severity, guide: v.guide, count: v.count,
    files: v.files.size, examples: v.examples,
  }));
  const weight = { high: 3, medium: 1, low: 0.25 };
  const score = flat.reduce((a, f) => a + weight[f.severity] * f.count, 0);
  report.push({ site, files: files.length, lines, findings: flat, score });
}

// ------------------------------------------------------------------ output
const scored = report.filter((r) => r.findings);
scored.sort((a, b) => b.score - a.score);
const totals = {};
for (const r of scored) for (const f of r.findings) totals[f.id] = (totals[f.id] || 0) + f.count;

console.log(`\nFleet fake-affordance screen — ${scored.length} sites, ${scored.reduce((a, r) => a + r.lines, 0).toLocaleString()} lines\n`);
console.log('  by detector (guide criterion in parentheses)');
for (const d of DETECTORS) {
  const n = totals[d.id] || 0;
  const sitesWith = scored.filter((r) => r.findings.some((f) => f.id === d.id)).length;
  console.log(`    ${d.id.padEnd(24)} ${String(n).padStart(5)} hits across ${String(sitesWith).padStart(3)} sites   [${d.severity}]`);
}
console.log(`\n  worst 20 sites by weighted score (high=3, medium=1, low=0.25)`);
for (const r of scored.slice(0, 20)) {
  const top = r.findings.sort((a, b) => b.count - a.count).slice(0, 3).map((f) => `${f.id}:${f.count}`).join(' ');
  console.log(`    ${r.site.padEnd(30)} ${String(Math.round(r.score)).padStart(5)}  ${top}`);
}
const clean = scored.filter((r) => r.score === 0);
console.log(`\n  ${clean.length} site(s) with no findings: ${clean.map((r) => r.site).join(', ') || '—'}\n`);

if (JSON_OUT) {
  fs.writeFileSync(path.join(ROOT, JSON_OUT), JSON.stringify({ generated_by: 'fleet/audit-static.mjs', sites: scored }, null, 2));
  console.log(`  detail written to ${JSON_OUT}\n`);
}
