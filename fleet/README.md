# Fleet fidelity program

Measuring all 98 mocks against `SANDBOX_COMPLETENESS_GUIDE.md`, and against the real products
they imitate.

## Why this exists

The completeness guide already says what a finished mock looks like. Its acceptance criteria —
"No obvious clickable placeholder remains", "Menus do not contain gray disabled items except
state-dependent controls", "Mutations persist and appear in `/go` state/diff" — are precise
enough to act on and have **never been measured**. They were checked by whoever happened to be
working on an app, by reading. So quality is unknown across the fleet, uneven between apps, and
silently reversible.

Nothing here replaces that guide. This measures it.

## The three layers

| layer | needs | covers | cost |
|---|---|---|---|
| **1. Source screen** — `fleet/audit-static.mjs` | nothing | all 98 today | seconds |
| **2a. Portable runtime audit** — `fleet/audit-runtime.mjs` | a served app | any app that can be served | ~1 min/app |
| **2b. Per-app harness** — `quality.contract.mjs`, `walkthroughs/`, `depth-report.mjs` | install + build + authoring | apps that have one | days/app |
| **3. Real-product reference** — `reference/` + capture | a live account or public docs | apps with a reference | hours/app |

They answer different questions and none subsumes the others. Layer 1 reads source and cannot
tell whether a handler does anything real. Layer 2 clicks and can, but only reaches what it can
find. Layer 3 is the only one that knows what the real product actually looks like.

## Layer 1: the source screen

```
node fleet/audit-static.mjs                       # all sites, ranked
node fleet/audit-static.mjs --site slack_mock     # one site
node fleet/audit-static.mjs --json fleet/baseline.json
```

Each detector maps to a line in the completeness guide. It is a **screen, not a verdict**:
it flags places to look. Its calibration is recorded below, because a screen whose error rate
is unknown is a rumour.

### Calibration against ground truth

`aws_console_mock` is the one app with a runtime harness, so it is the only place the screen's
findings can be checked against what actually happens in a browser.

On 2026-08-18 the screen reported **7 `toast_only_handler` hits** there while the runtime probe
reported **0 inert controls**. Investigating that disagreement found faults on both sides:

- All 7 source findings were **real**. Two announced downloads that never happened; two said
  "simulated in mock mode"; one claimed a dashboard reset that reset nothing.
- The **runtime probe was wrong**: it counted any DOM text change as a response, so a handler
  whose entire body is `addFlash('success', …)` scored as working. It was rewarding the exact
  defect it existed to catch. It now ignores flash-only changes, and separately consults `/go`
  so a real state write with no visible change still counts.

Two more defects surfaced from the same thread, neither visible to either instrument at the
time: an RDS parameter editor that flashed "Parameter updated to X" and discarded the value, and
a detail view holding a frozen copy of a store object so that writes rendered as no-ops. The
first became a new detector (`toast_without_write`).

**The lesson worth keeping:** the two layers disagreeing is the signal. When they agree, both may
be wrong in the same direction.

### Calibration by triage

A second pass had a worker read the flagged code in the three worst-scoring apps and judge each
finding without fixing anything. Results:

| app | findings | real | false positive |
|---|---:|---:|---:|
| `miro_mock` | 13 | 13 | 0 |
| `meta_ads_mock` | 8 | 8 | 0 |
| `hubspot_marketing_mock` | 8 | **0** | **8** |

Every `hubspot_marketing_mock` hit was `<EmptyState>` inside
`{items.length === 0 ? <EmptyState/> : <Table/>}` — a legitimate empty state, which is good UI
and not a fake affordance. `EmptyState` has been removed from the `placeholder_component`
pattern, dropping it fleet-wide from 21 hits to 3.

Two things this is worth recording for:

1. **A detector with an unknown false-positive rate sends people to rewrite correct code.** The
   triage cost one pass and prevented eight such rewrites.
2. **Triage before remediation.** The screen decides where to look; a human or worker reading the
   code decides what is true; only then does anything get changed. Skipping the middle step is
   how a screen becomes a source of damage rather than of leads.

A third triage pass, on `dingtalk_mock`, found **5 of 5 `empty_handler` hits to be correct
code**: `onChange={() => {}}` on a checkbox whose enclosing row carries the real `onClick`.
React requires an `onChange` alongside a `checked` prop, and wiring a real one there
double-toggles — the row handler and the change handler both fire and cancel. `onChange` is now
excluded from that detector.

A fourth pass triaged **all 35 `href_hash_only` hits**, the highest-volume detector:

| app | hits | real | false positive |
|---|---:|---:|---:|
| `openreview_mock` | 17 | 17 | 0 |
| `bamboohr_mock` | 8 | 8 | 0 |
| `klaviyo_mock` | 6 | **0** | **6** |
| `amplitude_mock` | 4 | 1 | 3 |

The errors **clustered rather than spread** — 0% in two apps, 100% in another — and had two
mechanically identifiable causes: an anchor whose `onClick` does real work (the `#` is styling),
and `href="#"` inside an email template's stored HTML, which is content being edited rather than
a control. Both are now excluded, and the detector reproduces the triage exactly: 0, 0, 0, 3.

Getting there took three attempts, each of which **failed silently in the same direction**:

1. A tag-bounded regex `<a ... [^>]*>` truncated at the `>` inside `e =>`, so it never saw any
   handler.
2. A 260-character window ran out before a multi-line handler closed.
3. Only brace-balancing worked.

Each failure returned "no handler found" and so flagged a working anchor as dead. A filter that
cannot tell "no handler" from "I could not parse the handler" reports the same numbers whether it
works or not — which is why the fix was checked against the triage table rather than against the
count going down.

One residual false-positive class is left deliberately, documented in the detector: an anchor
that only calls `preventDefault()` while nested in a row whose own `onClick` does the work, since
the click still bubbles. Line-based matching cannot see DOM ancestry, so the detector says so
instead of guessing.

Running precision: **26 of 42 triaged findings real (62%)**, with every error so far traceable to
a detector matching a legitimate React idiom rather than to a judgement call. Two detectors have
been narrowed as a result, and the fleet total fell from 116 findings to 59 — the drop is almost
entirely false positives leaving, not defects being fixed.

## Working agreement

Unchanged from the completeness guide: one worker per app folder, no edits to shared files
without coordination, schema changes additive only, build and browser-verify before committing.

Three additions from this program:

1. **Build success is not evidence.** Every defect class that reached a release here — a
   temporal dead zone, a missing import, a control wired to a dialog that was never rendered,
   a menu item dispatching an action no reducer handled — compiled cleanly. Only clicking found
   them.
2. **An instrument that stops covering improved code is worse than a missing one**, because its
   output still looks complete. Three separate checks here went blind to pages the moment those
   pages migrated to generated routes, and reported success while covering less.
3. **Never `git add -A` while workers are running.** Commit explicit paths. A sweep at the repo
   root took six workers' in-flight, unverified edits into a commit whose message described
   something else entirely — including one worker that had died mid-edit. The tree built, but the
   record was wrong, which is its own kind of damage: a commit message that misdescribes its
   contents cannot be trusted later by anyone, including whoever wrote it.

## Layer 2: the runtime harness

Built out in `websites/aws_console_mock` and portable in shape, not in content:

- `quality.contract.mjs` — release-blocking boolean gates, run in **both** dev and hardened mode.
  Hardened is what tasks execute on: `CUA_GYM_HARDENED=1` hands `/post` and `/go` to
  `shared/secureMockApiPlugin.mjs` rather than the app's own middleware. Gates that only ever ran
  against dev missed a reward-signal defect living in the production path for all 98 sites.
- `walkthroughs/*.mjs` — end-to-end flows asserted against `/go` `current_state`, never against a
  success toast.
- `fidelity-score.mjs` — a continuous index over six dimensions; three need no reference
  (`interaction_coverage`, `flow_depth`, `control_coverage`) and three do.
- `depth-report.mjs` — navigational depth: does a row lead anywhere, does every route render a
  title.

## Layer 2a: the portable runtime audit

```
node fleet/audit-runtime.mjs --base http://127.0.0.1:5173
```

Everything judgeable from the DOM with no reference and no knowledge of the app: crashes and
uncaught errors, routes with no `<h1>`, populated tables whose rows link nowhere, and enabled
controls that change nothing when clicked.

Two design choices worth stating:

- **Routes are discovered by following links**, not parsed from source. Three separate
  source-reading instruments in this project went blind to pages the moment those pages moved to
  generated routes, and each kept reporting success while covering less. A crawler that follows
  what the app actually renders cannot fail that way.
- **A toast is not a response.** A handler whose only effect is a success message is the defect,
  not the reaction to it. One honest exception exists — a control correctly reporting "there is
  nothing to do here" — so toast-only results are labelled rather than counted, and a human
  decides. Making the control lie to satisfy the probe would be the wrong fix.

It also inherits two corrections learned the hard way in the per-app scorer: an already-selected
tab is not a probe subject, and opening a menu counts as a response even when the text barely
moves. Carrying those over took minutes; rediscovering them cost a release each.

### What the first fleet-wide runtime sweep found

Thirteen sites, 56 routes, everything measured by loading pages and clicking:

- **0 crashes.** The fleet is stable; nothing renders an error boundary or throws.
- **31 of 56 routes render no `<h1>`** — four sites have no page title on any route.
- **49 unmarked tab groups across 10 of 13 sites.** No site marks its active tab with
  `aria-selected` or `aria-current`, so an agent reading the accessibility tree cannot tell
  which tab is current — and neither can this audit, which is why a re-clicked selected tab
  looked like a dead control until the pattern was recognised.
- **87% of clicked controls responded.**

And the finding with the widest consequences:

- **Six of seven sites checked expose no in-app links at all.** Navigation is entirely click
  handlers on buttons. An agent reading the accessibility tree cannot discover their routes,
  deep-link into one, or open one in a new tab. It also caps this crawl at the entry page, so
  their route counts are a floor rather than a census.

The one site that does expose links is `aws_console_mock`, where list rows were converted from
`<td onClick>` to real `<Link>` elements. That change was made for accessibility and looked
cosmetic at the time. It is the difference between an app an agent can explore and one it cannot.

## Layer 3: real-product references

The half the fleet does not have. `reference/page-depth.*.json` states what the real product
shows, and every requirement carries a confidence mark:

- `sourced` — read from the live product or a doc that names it verbatim
- `partially_sourced` — some of it named, the rest inferred, and the file says which
- `inferred` — reconstructed, and scored separately

The fidelity index reports **two numbers**: one over all requirements, one over sourced ones
only. Work that has not been checked against the real product does not raise the defensible
figure. That is the point of the mark, and it has repeatedly caught doc-derived guesses that were
wrong in both directions — AWS's own docs implied 11 default columns on the EC2 instance list
where the console shows 17, and listed three of those 17 as optional.


## Current state

```
node fleet/audit-static.mjs --json fleet/baseline.json && node fleet/report-baseline.mjs
node fleet/validate-reference.mjs
```

- **Source screen**: 98 sites measured, 29 flagged. `fleet/BASELINE.md`.
- **Runtime audit**: available to any app that can be served, no authoring required.
  **13 of 98 measured** so far (`fleet/RUNTIME.md`); the other 85 have no `node_modules`, and
  installing ~90 Vite apps is the whole reason this layer has been thin. `--install` covers them
  when the disk and time are available.
- **Per-app harness**: 1 of 98 (`aws_console_mock`). Its gates, walkthroughs and fidelity index
  are portable in shape; only the reference content is app-specific.
- **Product references**: 6 of 98 — `aws_console_mock` (from the live console), and
  `slack_mock`, `jira_mock`, `google_drive_mock`, `notion_mock`, `trello_mock` (from official
  documentation, 60–86% sourced with 9–11 recorded gaps each). Conformance is
  checked by `fleet/validate-reference.mjs`, which exists because an agent's summary of its own
  output is not evidence: it rejects a file whose every field is marked `sourced`, or whose
  `gaps` is empty while anything is inferred.

The three documentation-derived references sit at 60–86% `sourced` with 9–11 recorded gaps each.
That is the expected shape from docs alone. The AWS reference reached higher only because the
live product was read directly — and doing that overturned several doc-derived claims that had
looked solid, in both directions.

## What each artefact is for

| file | what it answers |
|---|---|
| `audit-static.mjs` | where to look, across all 98 sites, in seconds |
| `audit-runtime.mjs` | what is actually true on one served app |
| `sweep-runtime.mjs` | the same, across every app that can be built |
| `audit-build.mjs` | does it build, and is its preview reachable from both address families |
| `validate-reference.mjs` | is a product reference honest about what it verified |
| `fix-preview-host.mjs` | the one fleet-wide repair this program has made |
| `BASELINE.md`, `RUNTIME.md` | generated reports; never hand-edit, regenerate |

Everything reported here is generated from a run. A number typed by hand drifts from the run
that produced it, and drifts silently — which is the same failure as an instrument that stops
covering improved code while still looking complete.
