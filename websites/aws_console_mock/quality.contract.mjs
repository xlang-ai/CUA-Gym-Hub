/**
 * XWS Console Mock — executable quality contract.
 *
 * Every check here is a release gate, not a score. Run against a live dev/preview
 * server:
 *
 *     node quality.contract.mjs --base http://localhost:5273
 *
 * Exit code 0 = all gates pass. Non-zero = release blocked.
 *
 * The gates encode four product commitments:
 *   G1  reward signal is clean       — an untouched episode produces an empty state_diff
 *   G2  every mutation is observable — no dispatched action is silently dropped
 *   G3  no blank endpoints           — no route resolves to a placeholder, no page is orphaned
 *   G4  old tasks keep working       — legacy URLs resolve, injected state is never clobbered
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const BASE = (() => {
  const i = args.indexOf('--base');
  return i >= 0 && args[i + 1] ? args[i + 1].replace(/\/$/, '') : 'http://localhost:5273';
})();

const results = [];
function check(id, title, fn) {
  return Promise.resolve()
    .then(fn)
    .then((detail) => results.push({ id, title, ok: true, detail: detail ?? '' }))
    .catch((e) => results.push({ id, title, ok: false, detail: e.message }));
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const sh = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: '/bin/bash' }).trim();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sid = (tag) => `contract-${tag}-${process.pid}`;

async function api(pathname) {
  const r = await fetch(`${BASE}${pathname}`);
  assert(r.ok, `${pathname} returned HTTP ${r.status}`);
  return r.json();
}
async function post(pathname, body) {
  const r = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert(r.ok, `POST ${pathname} returned HTTP ${r.status}`);
  return r.json();
}

// ---------------------------------------------------------------- G1
await check('G1.1', 'partial state injection yields an empty state_diff', async () => {
  const s = sid('g1');
  await post(`/post?sid=${s}`, { action: 'set', state: { user: { name: 'Contract' }, ec2: [] } });
  const go = await api(`/go?sid=${s}`);
  const keys = Object.keys(go.state_diff || {});
  assert(keys.length === 0, `expected empty state_diff, got ${keys.length} keys: ${keys.join(', ')}`);
  return 'state_diff = {}';
});

await check('G1.2', 'initial_state and current_state share one baseline', async () => {
  const s = sid('g1b');
  await post(`/post?sid=${s}`, { action: 'set', state: { user: { name: 'Contract' } } });
  const go = await api(`/go?sid=${s}`);
  const i = Object.keys(go.initial_state || {}).length;
  const c = Object.keys(go.current_state || {}).length;
  assert(i === c, `initial_state has ${i} keys but current_state has ${c}`);
  assert(i > 20, `baseline looks unfilled (${i} keys) — defaults were not applied`);
  return `${i} keys on both sides`;
});


await check('G1.3', 'transient UI state is excluded from state_diff', async () => {
  const s = sid('g1c');
  await post(`/post?sid=${s}`, { action: 'set', state: { user: { name: 'Contract' } } });
  const base = await api(`/go?sid=${s}`);
  const cur = JSON.parse(JSON.stringify(base.current_state));
  cur.flash = [{ id: 'f1', type: 'success', message: 'toast' }];
  await post(`/post?sid=${s}`, { action: 'set_current', state: cur });
  const after = await api(`/go?sid=${s}`);
  const keys = Object.keys(after.state_diff || {});
  assert(!keys.includes('flash'), 'auto-dismissing toast state leaks into state_diff');
  assert(Array.isArray(after.current_state.flash), 'flash was removed from current_state — shape changed');
  return 'flash excluded from diff, retained in current_state';
});

// ---------------------------------------------------------------- G2
await check('G2.1', 'every dispatched action has a reducer case', () => {
  const dispatched = new Set(
    sh(`grep -rhoE "type: '[A-Z_]+'" src/pages src/components | sed "s/type: '//; s/'//" | sort -u`).split('\n').filter(Boolean)
  );
  const handled = new Set(
    sh(`grep -oE "case '[A-Z_]+':" src/store/StoreContext.jsx | sed "s/case '//; s/'://" | sort -u`).split('\n').filter(Boolean)
  );
  const missing = [...dispatched].filter((t) => !handled.has(t));
  assert(missing.length === 0, `${missing.length} silently dropped: ${missing.slice(0, 8).join(', ')}`);
  return `${dispatched.size} dispatched / ${handled.size} handled / 0 dropped`;
});

// ---------------------------------------------------------------- G3
await check('G3.1', 'no sidebar entry points at a placeholder route', () => {
  const n = Number(sh(`grep -c "/local/" src/components/Layout.jsx || true`));
  assert(n === 0, `${n} sidebar entries still resolve to the placeholder page`);
  return '0 placeholder targets';
});

await check('G3.2', 'no page component is orphaned from the route table', () => {
  const pages = fs.readdirSync(path.join(ROOT, 'src/pages'))
    .filter((f) => f.endsWith('.jsx')).map((f) => f.replace(/\.jsx$/, ''));
  const app = read('src/App.jsx');
  const orphans = pages.filter((p) => p !== 'Placeholder' && !new RegExp(`from '\\./pages/${p}'`).test(app));
  assert(orphans.length === 0, `${orphans.length} unrouted: ${orphans.slice(0, 10).join(', ')}`);
  return `${pages.length} pages, 0 orphaned`;
});

// ---------------------------------------------------------------- G4
await check('G4.1', 'injected values are never overwritten by defaults', async () => {
  const s = sid('g4a');
  await post(`/post?sid=${s}`, {
    action: 'set',
    state: { user: { name: 'TASK OWNED', region: 'eu-west-1' }, ec2: [], volumes: [] },
  });
  const { initial_state: i } = await api(`/go?sid=${s}`);
  assert(i.user.name === 'TASK OWNED', 'user.name was overwritten');
  assert(i.user.region === 'eu-west-1', 'user.region was overwritten');
  assert(Array.isArray(i.ec2) && i.ec2.length === 0, 'empty ec2 array was backfilled');
  assert(Array.isArray(i.volumes) && i.volumes.length === 0, 'empty volumes array was backfilled');
  assert(i.user.accountId !== undefined, 'omitted sibling field lost its default');
  return 'task values win, omissions get defaults';
});

await check('G4.2', 'unknown fields injected by a task survive round-trip', async () => {
  const s = sid('g4b');
  await post(`/post?sid=${s}`, {
    action: 'set',
    state: { customTaskField: { reward_key: 42 }, user: { legacyFlag: true } },
  });
  const { initial_state: i } = await api(`/go?sid=${s}`);
  assert(i.customTaskField?.reward_key === 42, 'top-level unknown field dropped');
  assert(i.user?.legacyFlag === true, 'nested unknown field dropped');
  return 'unknown fields preserved at both levels';
});

await check('G4.3', 'legacy /local/* URLs still resolve', () => {
  const app = read('src/App.jsx');
  assert(/LEGACY_LOCAL_ROUTES/.test(app), 'legacy redirect map is gone');
  const mapped = (app.match(/^\s+'[a-z0-9-]+\/[a-z0-9-]+':/gm) || []).length;
  assert(mapped >= 20, `only ${mapped} legacy URLs mapped; previously authored tasks would 404`);
  return `${mapped} legacy URLs redirect to real routes`;
});

await check('G4.4', 'ARNs and service DNS in seed data are untouched', () => {
  const dm = read('src/store/dataManager.js');
  const arns = (dm.match(/arn:aws:/g) || []).length;
  const dns = (dm.match(/amazonaws\.com/g) || []).length;
  assert(arns > 0 && dns > 0, 'technical identifiers were rewritten — reward functions matching on ARNs would break');
  return `${arns} ARNs, ${dns} DNS names intact`;
});

// ---------------------------------------------------- determinism & hygiene
await check('H1', 'default state is deterministic', async () => {
  const mod = await import(path.join(ROOT, 'src/store/dataManager.js'));
  const a = JSON.stringify(mod.getDefaultData());
  const b = JSON.stringify(mod.getDefaultData());
  assert(a === b, 'getDefaultData() is not deterministic across calls');
  return `${a.length} bytes, stable`;
});

await check('H2', 'no external network requests at runtime', () => {
  // Only things the browser would actually fetch count. Strings that merely *look*
  // like URLs (e.g. the SQS queue URL a real console displays, or an SVG xmlns)
  // are display data, not network calls.
  const markup = sh(`grep -rhoE "<(link|script|img|iframe|source)[^>]+(href|src)=\\"https?://[^\\"]+\\"" index.html src --include='*.jsx' --include='*.html' || true`)
    .split('\n').filter(Boolean);
  const cssRemote = sh(`grep -rhoE "url\\(['\\"]?https?://[^)]+\\)" src --include='*.css' || true`)
    .split('\n').filter(Boolean);
  const fetches = sh(`grep -rhoE "(fetch|import)\\(['\\"\\\`]https?://[^'\\"\\\`]+" src --include='*.jsx' --include='*.js' || true`)
    .split('\n').filter(Boolean);
  const all = [...markup, ...cssRemote, ...fetches];
  assert(all.length === 0, `${all.length} runtime external reference(s): ${all.slice(0, 3).join(' | ')}`);
  return '0 external requests (markup, css, fetch)';
});

await check('H3', 'no un-desensitized trademark strings in user-visible prose', () => {
  const out = sh(`grep -rhoE "\\b(AWS|Amazon)\\b" src/pages src/components --include='*.jsx' | grep -v amazonaws | sort -u || true`);
  assert(out === '', `found: ${out.split('\n').join(', ')}`);
  return '0 occurrences';
});

await check('H4', 'design tokens are used instead of raw palette values', () => {
  const hex = Number(sh(`grep -rhoE "#[0-9a-fA-F]{6}" src/index.css | sort -u | wc -l`));
  const palette = Number(sh(`grep -rhoE "\\b(bg|text|border)-(green|red|yellow|orange|blue|slate|emerald|amber)-[0-9]{2,3}" src/index.css | wc -l`));
  assert(palette <= 2, `${palette} raw Tailwind palette classes remain in index.css`);
  return `${hex} literal hex, ${palette} palette classes in index.css`;
});


await check('H5', 'derived IAM counts match actual references', async () => {
  const mod = await import(path.join(ROOT, 'src/store/dataManager.js'));
  const iam = mod.getDefaultData().iam;
  const refs = {};
  for (const coll of ['users', 'roles', 'groups']) {
    for (const e of iam[coll] || []) for (const p of e.policies || []) refs[p] = (refs[p] || 0) + 1;
  }
  const bad = (iam.policies || [])
    .filter((p) => p.attachedEntities !== (refs[p.name] || 0))
    .map((p) => `${p.name}: declared ${p.attachedEntities}, actual ${refs[p.name] || 0}`);
  assert(bad.length === 0, `${bad.length} policies with wrong attachedEntities: ${bad.join('; ')}`);
  return `${(iam.policies || []).length} policies, all counts consistent`;
});

// ---------------------------------------------------------------- report
const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
console.log(`\nXWS Console Mock — quality contract   (${BASE})\n`);
for (const r of results) {
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(5)} ${r.title}`);
  if (r.detail) console.log(`        ${r.detail}`);
}
console.log(`\n  ${pass}/${results.length} gates passed${fail ? `, ${fail} BLOCKING` : ''}\n`);
process.exit(fail ? 1 : 0);
