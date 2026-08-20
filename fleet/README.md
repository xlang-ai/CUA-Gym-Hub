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
| **2. Runtime harness** — per-app `quality.contract.mjs`, `walkthroughs/`, `depth-report.mjs` | install + build | apps that have one | minutes/app |
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

Known precision so far: 21 of 29 triaged findings were real (72%), and the errors clustered
entirely in one detector, which has since been narrowed.

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

## Working agreement

Unchanged from the completeness guide: one worker per app folder, no edits to shared files
without coordination, schema changes additive only, build and browser-verify before committing.

Two additions from this program:

1. **Build success is not evidence.** Every defect class that reached a release here — a
   temporal dead zone, a missing import, a control wired to a dialog that was never rendered,
   a menu item dispatching an action no reducer handled — compiled cleanly. Only clicking found
   them.
2. **An instrument that stops covering improved code is worse than a missing one**, because its
   output still looks complete. Three separate checks here went blind to pages the moment those
   pages migrated to generated routes, and reported success while covering less.

## Current state

```
node fleet/audit-static.mjs --json fleet/baseline.json && node fleet/report-baseline.mjs
node fleet/validate-reference.mjs
```

- **Source screen**: 98 sites measured, 29 flagged. `fleet/BASELINE.md`.
- **Runtime harness**: 1 of 98 (`aws_console_mock`). Everything in its `quality.contract.mjs`,
  `walkthroughs/` and `fidelity-score.mjs` is portable in shape; only the reference content is
  app-specific.
- **Product references**: 4 of 98 — `aws_console_mock` (from the live console),
  `slack_mock`, `jira_mock`, `google_drive_mock` (from official documentation). Conformance is
  checked by `fleet/validate-reference.mjs`, which exists because an agent's summary of its own
  output is not evidence: it rejects a file whose every field is marked `sourced`, or whose
  `gaps` is empty while anything is inferred.

The three documentation-derived references sit at 60–86% `sourced` with 9–11 recorded gaps each.
That is the expected shape from docs alone. The AWS reference reached higher only because the
live product was read directly — and doing that overturned several doc-derived claims that had
looked solid, in both directions.
