/**
 * Make every site's preview server reachable on both IPv4 and IPv6.
 *
 *     node fleet/fix-preview-host.mjs            # report only
 *     node fleet/fix-preview-host.mjs --apply    # rewrite the configs
 *
 * Measured across the fleet: 69 sites bind `host: '0.0.0.0'` (IPv4 only), 28 leave the default
 * (IPv6-only localhost), and exactly one is dual-stack. So 97 of 98 are reachable from only one
 * address family — and which one varies by site.
 *
 * That breaks task execution, not just convenience. Node's `fetch` resolves `localhost` to `::1`
 * first, while plenty of harness code and tooling connects to `127.0.0.1`. Either way, some
 * clients get ECONNREFUSED against a server that is plainly running. It reads as a flaky
 * environment and is in fact deterministic per client, which is the worst kind of failure to
 * debug — and this project exists to provide environments that are not flaky.
 *
 * `host: true` binds both families. It is Vite's own documented way to say "listen everywhere",
 * and it is what aws_console_mock was moved to after this bit there.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const changes = [];
for (const dir of fs.readdirSync(path.join(ROOT, 'websites')).sort()) {
  const base = path.join(ROOT, 'websites', dir);
  const cfg = ['vite.config.js', 'vite.config.ts'].map((n) => path.join(base, n)).find(fs.existsSync);
  if (!cfg) { changes.push({ site: dir, action: 'skip', why: 'no vite config' }); continue; }

  const src = fs.readFileSync(cfg, 'utf8');
  const preview = src.match(/(\n\s*)preview\s*:\s*\{/);
  let next = src, action;

  if (/preview\s*:\s*\{[^}]*host\s*:\s*true/s.test(src)) {
    action = 'already dual-stack';
  } else if (/preview\s*:\s*\{[^}]*host\s*:\s*'0\.0\.0\.0'/s.test(src)) {
    next = src.replace(/(preview\s*:\s*\{[^}]*?host\s*:\s*)'0\.0\.0\.0'/s, '$1true');
    action = "host '0.0.0.0' -> true";
  } else if (preview) {
    // A preview block with no host at all: insert one as its first key.
    next = src.replace(/(\n\s*preview\s*:\s*\{)/, `$1\n    host: true,`);
    action = 'added host: true to preview block';
  } else {
    // No preview block: add one next to the plugins/server config inside defineConfig.
    const m = src.match(/(export default defineConfig\(\{)/);
    if (!m) { changes.push({ site: dir, action: 'skip', why: 'unrecognised config shape' }); continue; }
    next = src.replace(m[1], `${m[1]}\n  // Bind both address families: a client using 127.0.0.1 and one using ::1 must both reach it.\n  preview: { host: true },`);
    action = 'added preview: { host: true }';
  }

  if (next !== src && APPLY) fs.writeFileSync(cfg, next);
  changes.push({ site: dir, action, changed: next !== src });
}

const byAction = {};
for (const c of changes) (byAction[c.action] ??= []).push(c.site);
console.log(`\nPreview host binding — ${changes.length} sites${APPLY ? '  (APPLIED)' : '  (dry run)'}\n`);
for (const [a, list] of Object.entries(byAction)) console.log(`  ${String(list.length).padStart(3)}  ${a}`);
const skipped = changes.filter((c) => c.action === 'skip');
if (skipped.length) {
  console.log(`\n  skipped, needing a look:`);
  for (const s of skipped) console.log(`    ${s.site.padEnd(26)} ${s.why}`);
}
if (!APPLY) console.log(`\n  Re-run with --apply to write ${changes.filter((c) => c.changed).length} file(s).`);
console.log('');
