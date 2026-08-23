/**
 * Build health across the fleet.
 *
 *     node fleet/audit-build.mjs              # toolchain survey, no builds (fast)
 *     node fleet/audit-build.mjs --build      # also build every site that has node_modules
 *
 * The program had a hole in the middle: the source screen reads files, the runtime audit needs a
 * SERVED app, and nothing asked whether an app builds at all. `azure_mock` turned out not to
 * build on this machine and no check noticed.
 *
 * It also distinguishes the two reasons a build fails, because conflating them sends people to
 * debug code that is fine:
 *   toolchain — the site's pinned Vite needs a newer Node than the one running
 *   code      — anything else
 *
 * Toolchain drift is itself a fleet finding: 98 sites pin Vite versions ranging across five
 * major releases, so "does the fleet build" depends on which Node the operator happens to have.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DO_BUILD = process.argv.includes('--build');
const nodeMajor = Number(process.versions.node.split('.')[0]);

/**
 * Node version each Vite major ASKS FOR. A hint, not a verdict.
 *
 * The first version of this tool treated the table as authoritative and announced that eleven
 * sites "cannot build on Node 18" — including ServiceNow_mock, which builds fine. Vite 7 prints
 * a warning and proceeds; only Vite 8 actually fails here, because its CLI calls `CustomEvent`,
 * which Node 18 does not have. A prediction that contradicts an observed build is just wrong,
 * so nothing is asserted to fail unless a real build failed.
 */
const VITE_NODE_WANTS = { 4: 14, 5: 18, 6: 18, 7: 20, 8: 20 };

const sites = fs.readdirSync(path.join(ROOT, 'websites'))
  .filter((n) => fs.existsSync(path.join(ROOT, 'websites', n, 'package.json')))
  .sort();

const rows = [];
for (const site of sites) {
  const dir = path.join(ROOT, 'websites', site);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const dep = { ...pkg.devDependencies, ...pkg.dependencies };
  const spec = dep.vite || null;
  const major = spec ? Number((spec.match(/(\d+)/) || [])[1]) : null;
  const needs = major ? (VITE_NODE_WANTS[major] ?? null) : null;
  const mayWarn = needs !== null && nodeMajor < needs;
  const installed = fs.existsSync(path.join(dir, 'node_modules'));
  // The installed version is what runs; the spec is only what was asked for.
  let installedVite = null;
  const vp = path.join(dir, 'node_modules/vite/package.json');
  if (fs.existsSync(vp)) installedVite = JSON.parse(fs.readFileSync(vp, 'utf8')).version;

  const row = { site, viteSpec: spec, viteMajor: major, installedVite, wantsNode: needs, mayWarn, installed };
  if (DO_BUILD && installed) {
    // Retried once. This tree is shared with workers that edit and build concurrently, and a
    // build started mid-write fails for reasons that have nothing to do with the code —
    // openreview_mock was reported as a CODE failure this way and builds fine. A one-shot build
    // in a shared tree measures timing as much as correctness.
    const attempt = () => {
      try { execSync('npm run build', { cwd: dir, stdio: 'pipe', timeout: 180000 }); return null; }
      catch (e) { return `${e.stdout || ''}${e.stderr || ''}`; }
    };
    let out = attempt();
    if (out) {
      const toolchain = /requires Node\.js version|CustomEvent is not defined|Unsupported engine/i.test(out);
      if (toolchain) { row.build = 'toolchain'; }
      else {
        const second = attempt();
        if (!second) { row.build = 'pass'; row.note = 'failed once, passed on retry — transient, likely a concurrent write'; }
        else { row.build = 'code'; out = second; }
      }
      if (row.build !== 'pass') row.reason = (out.match(/(?:error|Error)[^\n]{0,110}/) || [''])[0].trim().slice(0, 110);
    } else row.build = 'pass';
  }
  rows.push(row);
}

const byMajor = {};
for (const r of rows) if (r.viteMajor) (byMajor[r.viteMajor] ??= []).push(r.site);
const mayWarn = rows.filter((r) => r.mayWarn);

// ------------------------------------------------------------------ preview reachability
// A server bound to one address family is unreachable from clients that use the other, and this
// fleet had 97 of 98 in that state — 69 IPv4-only, 28 IPv6-only. Node's fetch resolves localhost
// to ::1 while much tooling connects to 127.0.0.1, so some clients get ECONNREFUSED against a
// server that is plainly running. That reads as a flaky environment and is deterministic per
// client, which is the worst kind of failure to chase.
const hostRows = rows.map((r) => {
  const dir = path.join(ROOT, 'websites', r.site);
  const cfg = ['vite.config.js', 'vite.config.ts'].map((n) => path.join(dir, n)).find(fs.existsSync);
  if (!cfg) return { ...r, host: 'no config' };
  const src = fs.readFileSync(cfg, 'utf8');
  const block = src.match(/preview\s*:\s*\{[^}]*\}/s);
  if (!block) return { ...r, host: 'no preview block (IPv6-only localhost)' };
  if (/host\s*:\s*true/.test(block[0])) return { ...r, host: 'dual-stack' };
  if (/host\s*:\s*'0\.0\.0\.0'/.test(block[0])) return { ...r, host: "IPv4 only ('0.0.0.0')" };
  if (/host\s*:/.test(block[0])) return { ...r, host: 'host set to something else' };
  return { ...r, host: 'preview block without host (IPv6-only)' };
});
const singleStack = hostRows.filter((r) => r.host !== 'dual-stack' && r.host !== 'no config');

console.log(`\nBuild health — Node ${process.versions.node}, ${rows.length} sites\n`);
console.log(`  preview reachable on both IPv4 and IPv6: ${hostRows.filter((r) => r.host === 'dual-stack').length} of ${rows.length}`);
if (singleStack.length) {
  console.log(`  NOT dual-stack (${singleStack.length}) — a harness on the other family gets ECONNREFUSED:`);
  const by = {};
  for (const r of singleStack) (by[r.host] ??= []).push(r.site);
  for (const [h, list] of Object.entries(by)) console.log(`    ${String(list.length).padStart(3)}  ${h}  — ${list.slice(0, 4).join(', ')}${list.length > 4 ? ', …' : ''}`);
  console.log(`  Fix with: node fleet/fix-preview-host.mjs --apply`);
}

console.log('  vite major   sites   wants Node');
for (const m of Object.keys(byMajor).sort()) {
  console.log(`    ${String(m).padEnd(9)} ${String(byMajor[m].length).padStart(5)}   ${String(VITE_NODE_WANTS[m] ?? '?').padStart(9)}${nodeMajor < (VITE_NODE_WANTS[m] ?? 0) ? '   (warns on this Node)' : ''}`);
}
if (mayWarn.length) {
  console.log(`\n  ${mayWarn.length} site(s) pin a Vite that asks for a newer Node than ${nodeMajor}:`);
  console.log(`    ${mayWarn.map((r) => r.site).join(', ')}`);
  console.log(`  Whether they actually fail is decided by --build, not by this table: Vite 7 warns`);
  console.log(`  and proceeds, Vite 8 genuinely fails here. Either way it is a TOOLCHAIN question,`);
  console.log(`  not a code defect — and the fleet spanning five Vite majors is the finding.`);
}
if (DO_BUILD) {
  const built = rows.filter((r) => r.build);
  const fails = built.filter((r) => r.build !== 'pass');
  console.log(`\n  built ${built.length} site(s) with dependencies installed: ${built.filter((r) => r.build === 'pass').length} pass, ${fails.length} fail`);
  for (const r of fails) console.log(`    ${r.build.toUpperCase().padEnd(9)} ${r.site.padEnd(26)} ${r.reason || ''}`);
  const transient = built.filter((r) => r.note);
  for (const r of transient) console.log(`    RETRIED   ${r.site.padEnd(26)} ${r.note}`);
  const notInstalled = rows.filter((r) => !r.installed).length;
  if (notInstalled) console.log(`\n  ${notInstalled} site(s) have no node_modules and were not built.`);
} else {
  console.log(`\n  Run with --build to actually build the ${rows.filter((r) => r.installed).length} site(s) that have dependencies installed.`);
}
console.log('');
