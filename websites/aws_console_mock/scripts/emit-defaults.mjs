/**
 * Emits mock.defaults.json — the app's default state, for the hardened server to fill partial
 * injections against.
 *
 * In hardened mode the shared plugin owns /post and /go, and it cannot know this app's defaults.
 * Without them a verifier that reads /go without first loading the page sees only the fragment
 * the task injected, so a check like "the account has three VPCs" fails for want of a `vpc` key
 * rather than for being wrong.
 *
 * Generated rather than hand-maintained: a second copy of the defaults that can drift from
 * getDefaultData() is worse than none, because it drifts silently.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const { getDefaultData } = await import(path.join(ROOT, '../src/store/dataManager.js'));
const out = path.join(ROOT, '..', 'mock.defaults.json');
const data = getDefaultData();
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`mock.defaults.json written — ${Object.keys(data).length} top-level keys, ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
