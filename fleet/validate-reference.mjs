/**
 * Checks a product reference against fleet/reference-schema.md.
 *
 * Written because agent self-reports are not evidence. A worker that says "mostly sourced, all
 * major surfaces covered" may have produced a file where every confidence is `sourced` and
 * `gaps` is empty — which the schema explicitly forbids, and which is exactly the failure the
 * confidence mark exists to prevent: an unchecked guess raising the defensible score.
 *
 *     node fleet/validate-reference.mjs              # every reference in the fleet
 *     node fleet/validate-reference.mjs slack_mock
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2] || null;
const LEVELS = ['sourced', 'partially_sourced', 'inferred'];

function confidences(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => confidences(n, out)); return out; }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'confidence') {
      if (typeof v === 'string') out.push(v);
      else if (v && typeof v === 'object') out.push(...Object.values(v).filter((x) => typeof x === 'string'));
    } else confidences(v, out);
  }
  return out;
}

const sites = fs.readdirSync(path.join(ROOT, 'websites'))
  .filter((n) => !only || n === only)
  .filter((n) => fs.existsSync(path.join(ROOT, 'websites', n, 'reference/product-reference.json')));

if (!sites.length) { console.log('no product references found'); process.exit(0); }

let bad = 0;
for (const site of sites) {
  const file = path.join(ROOT, 'websites', site, 'reference/product-reference.json');
  const problems = [];
  let d;
  try { d = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log(`  FAIL  ${site.padEnd(26)} unparseable: ${e.message}`); bad++; continue; }

  for (const k of ['product', 'captured', 'method', 'surfaces', 'gaps']) {
    if (d[k] === undefined) problems.push(`missing "${k}"`);
  }
  if (!Array.isArray(d.surfaces) || !d.surfaces.length) problems.push('no surfaces');

  const marks = confidences(d);
  if (!marks.length) problems.push('no confidence marks anywhere');
  const unknown = [...new Set(marks.filter((m) => !LEVELS.includes(m)))];
  if (unknown.length) problems.push(`unknown confidence values: ${unknown.join(', ')}`);

  const counts = Object.fromEntries(LEVELS.map((l) => [l, marks.filter((m) => m === l).length]));
  // The schema requires gaps unless everything is sourced — and "everything sourced" from a
  // documentation-only pass is itself the thing to distrust.
  const allSourced = counts.sourced === marks.length && marks.length > 0;
  const gaps = Array.isArray(d.gaps) ? d.gaps : [];
  if (!gaps.length && !allSourced) problems.push('gaps is empty while not everything is sourced');
  if (allSourced) problems.push('every field marked sourced — verify this was read from the product, not remembered');

  // A reference that describes the mock rather than the product is the other failure mode.
  const blob = JSON.stringify(d).toLowerCase();
  if (/\bmock\b/.test(blob.replace(new RegExp(site.toLowerCase(), 'g'), ''))) {
    problems.push('mentions "mock" — this file must describe the real product');
  }

  const surfaceIds = (d.surfaces || []).map((s) => s.id);
  if (new Set(surfaceIds).size !== surfaceIds.length) problems.push('duplicate surface ids');

  const ok = problems.length === 0;
  if (!ok) bad++;
  const pct = marks.length ? Math.round((counts.sourced / marks.length) * 100) : 0;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${site.padEnd(26)} ${String(d.surfaces?.length ?? 0).padStart(2)} surfaces, ${marks.length} marks (${pct}% sourced, ${counts.inferred} inferred), ${gaps.length} gaps`);
  for (const p of problems) console.log(`        - ${p}`);
}
console.log(`\n  ${sites.length - bad}/${sites.length} references conform\n`);
process.exit(bad ? 1 : 0);
