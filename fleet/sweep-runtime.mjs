/**
 * Run the portable runtime audit across every site that can be served, and record the result.
 *
 *     node fleet/sweep-runtime.mjs                    # sites that already have node_modules
 *     node fleet/sweep-runtime.mjs --install          # install deps first (slow)
 *     node fleet/sweep-runtime.mjs --sites a,b,c
 *
 * Layer 2 measured one app for most of this program's life, not because the checks were
 * app-specific — `fleet/audit-runtime.mjs` needs nothing but a URL — but because nobody had
 * built and served the other 97. This does the serving.
 *
 * Each site gets its own port and its own browser run, and the server is killed afterwards.
 * Results land in fleet/runtime-baseline.json for `fleet/report-runtime.mjs` to render.
 */
import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const INSTALL = argv.includes('--install');
const ONLY = arg('--sites', null)?.split(',').map((s) => s.trim());
const MAX_ROUTES = arg('--max-routes', '8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reachable = async (url) => {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; }
};

const all = fs.readdirSync(path.join(ROOT, 'websites'))
  .filter((n) => fs.existsSync(path.join(ROOT, 'websites', n, 'package.json')))
  .filter((n) => !ONLY || ONLY.includes(n))
  .sort();

const results = [];
let port = 5700;

for (const site of all) {
  const dir = path.join(ROOT, 'websites', site);
  const hasDeps = fs.existsSync(path.join(dir, 'node_modules'));
  if (!hasDeps && !INSTALL) { results.push({ site, status: 'skipped', why: 'no node_modules' }); continue; }

  try {
    if (!hasDeps) execSync('npm install --silent', { cwd: dir, stdio: 'pipe', timeout: 420000 });
    execSync('npm run build', { cwd: dir, stdio: 'pipe', timeout: 240000 });
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    const toolchain = /requires Node\.js version|CustomEvent is not defined|Unsupported engine/i.test(out);
    results.push({ site, status: toolchain ? 'toolchain' : 'build-failed',
      why: (out.match(/(?:error|Error)[^\n]{0,90}/) || [''])[0].trim() });
    continue;
  }

  const p = port++;
  const server = spawn('npx', ['vite', 'preview', '--port', String(p), '--strictPort'],
    { cwd: dir, stdio: 'ignore', detached: true });
  let up = false;
  for (let i = 0; i < 20 && !up; i++) { await sleep(1000); up = await reachable(`http://127.0.0.1:${p}/`); }
  if (!up) {
    try { process.kill(-server.pid); } catch {}
    results.push({ site, status: 'unreachable', why: `no response on 127.0.0.1:${p} after 20s` });
    continue;
  }

  try {
    const out = execSync(
      `node fleet/audit-runtime.mjs --base http://127.0.0.1:${p} --max-routes ${MAX_ROUTES}`,
      { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
    results.push({
      site, status: 'audited',
      routes: num(/routes reached\s+(\d+)/),
      crashed: num(/crashed or threw\s+(\d+)/),
      untitled: num(/no <h1> page title\s+(\d+)/),
      deadEnds: num(/dead-end lists\s+(\d+)/),
      unmarkedTabs: num(/no aria-selected\s+(\d+)/),
      inert: num(/inert controls\s+(\d+) of/),
      probed: num(/inert controls\s+\d+ of (\d+)/),
    });
  } catch (e) {
    results.push({ site, status: 'audit-failed', why: String(e.message).slice(0, 90) });
  } finally {
    try { process.kill(-server.pid); } catch {}
  }
  console.log(`  ${site.padEnd(26)} ${results[results.length - 1].status}`);
}

fs.writeFileSync(path.join(ROOT, 'fleet/runtime-baseline.json'),
  JSON.stringify({ node: process.versions.node, results }, null, 2));
const audited = results.filter((r) => r.status === 'audited');
console.log(`\n  ${audited.length} audited, ${results.length - audited.length} not — see fleet/runtime-baseline.json\n`);
