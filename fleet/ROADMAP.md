# Fleet fidelity program — vision, values, and what to do next

This is the handoff document. If you are a worker picking this up on another machine, read this
and `fleet/README.md`, then `SANDBOX_COMPLETENESS_GUIDE.md`.

---

## Why this exists

These 98 mocks are training and evaluation infrastructure for computer-use and universal digital
agents. Their value is not that they look like the real products. It is that an agent's actions
inside them are **verifiable** — that a reward function reading `/go` `state_diff` learns
something true about what the agent did.

That makes two kinds of defect fatal, and they are not the ones a human reviewer notices:

1. **A control that reports success without doing anything.** A human shrugs and clicks elsewhere.
   An agent learns that the action worked. Every subsequent trajectory is poisoned by it.
2. **An environment that behaves differently than it reports.** A `state_diff` that lists changes
   the agent never made, a page that renders differently on a deep link than on a click, a server
   reachable from one address family and not the other. These produce reward noise that looks
   like model variance and is not.

`SANDBOX_COMPLETENESS_GUIDE.md` already said what a finished mock looks like. Its acceptance
criteria were precise and had **never been measured** — they were checked by reading, per app, by
whoever happened to be working on it. This program measures them.

---

## Values, in the order they matter

### 1. Build success is not evidence

Every defect class that reached a release here compiled cleanly:

- a `const` referenced above its declaration — a temporal dead zone that throws on first render
- `<Link>` used without importing it
- a menu item dispatching an action no reducer handled, falling through to `default: return prev`
- a dialog placed in the wrong branch, so its button lived on a page that never rendered it
- a success toast for a mutation that discarded its input

Only clicking found any of them. **Run the app and click the thing.**

### 2. A toast is not a response

A handler whose entire effect is `addFlash('success', …)` is the defect, not the reaction to it.
This is worth stating twice because the first version of the interaction probe counted any DOM
text change as a response — it was *rewarding the exact defect it existed to catch*.

One honest exception: a control correctly reporting "there is nothing to do here" (a reset with
nothing to reset). Toast-only results are therefore labelled, not silently counted, and a human
decides. Making the control lie to satisfy the probe would be the wrong fix.

### 3. Triage before remediation

The source screen is a **screen, not a verdict**. Measured precision so far: 26 of 42 triaged
findings real (62%), and every error traced to a detector matching a legitimate React idiom
rather than to a judgement call.

- `<EmptyState>` inside `{items.length === 0 ? … }` — good UI, 8 of 8 false positives
- `onChange={() => {}}` on a checkbox whose row carries the real `onClick` — correct code;
  wiring a real handler there double-toggles. 5 of 5 false positives
- `<a href="#" onClick={real work}>` — the hash is styling, 9 of 35 false positives

**A detector with an unknown false-positive rate sends people to rewrite correct code.** Every
detector narrowing in this repo came from a triage pass, and each is documented in the detector's
own comment with the evidence that justified it.

### 4. An instrument that stops covering improved code is worse than a missing one

Because its output still looks complete. This has happened four separate times here:

- three checks grepped `App.jsx` for literal `path="…"` and went blind to every page that
  migrated to a generated route — the crawl silently fell from 68 routes to 57 while reporting
  success
- an anchor filter used a tag-bounded regex that truncated at the `>` inside `e =>`, so it never
  saw any handler and flagged working anchors as dead. It failed three times in the same
  direction before brace-balancing worked

Each failure returned a plausible number. **A filter that cannot distinguish "no handler" from
"I could not parse the handler" reports the same numbers whether or not it works.** So: check a
detector change against a triage table, never against the count going down.

### 5. Confidence marks are the point, not decoration

Every requirement in a product reference carries `sourced` / `partially_sourced` / `inferred`,
and the fidelity index reports two numbers — over all requirements, and over sourced ones only.

Work that has not been checked against the real product does not raise the defensible figure.
This has already caught doc-derived guesses wrong in both directions: AWS's own documentation
implied 11 default columns on the EC2 instance list where the console shows 17, and listed three
of those 17 as optional.

**A mostly-`inferred` reference is a good result.** It records where to look next. A fabricated
requirement is worse than a missing one, because the mock gets built to match it and drifts from
the product.

### 6. Report what the number means, not just the number

The fleet finding count fell from 116 to 59. Most of that was **false positives leaving**, not
defects being fixed, and saying so was more useful than the graph.

Nine sites score clean on every runtime measure — and all nine were crawled at a single route,
so "clean" means "barely measured". The report says that on the same line as the number.

---

## Working agreement for concurrent workers

From the completeness guide: one worker per app folder, no edits to shared files without
coordination, schema changes additive only, build and browser-verify before committing.

Three additions earned the hard way:

1. **Never `git add -A` while workers are running.** Commit explicit paths. A sweep at the repo
   root once took six workers' in-flight, unverified edits — including one that had died
   mid-edit — into a commit whose message described something else entirely. The tree built; the
   record was wrong, and a commit message that misdescribes its contents cannot be trusted later
   by anyone, including whoever wrote it.
2. **Triage before you fix.** Run the audit, read the flagged code, classify each finding, and
   report the false-positive rate. That number is often worth more than the fixes.
3. **Verify against `/go`, not against the UI's own success message.** A mutation that does not
   appear in `current_state` did not happen, whatever the page said.

### Suggested worker prompt

> You own `websites/<app>_mock` only. Read `SANDBOX_COMPLETENESS_GUIDE.md` and
> `fleet/ROADMAP.md`. Run `node fleet/audit-static.mjs --site <app>` and **triage** every finding
> before changing anything — the audit is a screen, not a verdict, and roughly a third of its
> findings are legitimate code. Fix only what is real, with real local behavior rather than a
> toast. Then `npm install && npm run build`, serve it, click every control you changed in a real
> browser, and confirm mutations appear in `/go?sid=`. Do not run git commands. Report: the
> triage table, what you implemented, audit before and after, what you verified, what you could
> not verify, residual risks.

---

## Where things stand

| layer | tool | coverage |
|---|---|---|
| 1. Source screen | `audit-static.mjs` | **98 / 98** — 18 sites flagged |
| 2. Runtime audit | `audit-runtime.mjs`, `sweep-runtime.mjs` | **88 / 98** audited in a browser |
| 3. Product reference | `validate-reference.mjs` | **15 / 98** |
| Build & reachability | `audit-build.mjs` | 98 / 98; preview dual-stack 98 / 98 |
| Per-app harness | `websites/aws_console_mock/` | **1 / 98** |

Regenerate everything with `./fleet/sweep-all.sh` on a host with Node 20.19+, Chrome or
Chromium, and ~40 GB free.

---

## What to do next, in priority order

### P0 — defects the runtime baseline confirmed

These are measured, not suspected. `fleet/RUNTIME.md` names the sites.

1. **517 unmarked tab groups across 61 sites.** No site marks its active tab with
   `aria-selected` or `role="tab"`. An agent reading the accessibility tree cannot tell which tab
   is current — and neither could this audit, which is why re-clicking a selected tab was briefly
   miscounted as a dead control. This is the single most systematic UDA-relevant defect in the
   fleet, and it is a one-attribute fix per tab strip.
2. **27 sites expose no in-app links.** Navigation is entirely click handlers. An agent cannot
   discover routes, deep-link, or open in a new tab, and any crawl sees only the entry page.
3. **127 of 396 routes render no `<h1>`.** Forty-six sites have at least one untitled route.
   Several declare a heading only inside a detail branch, so the list view — the default state —
   has none; a source-level check cannot see that.
4. **472 inert controls (24% of those clicked).** Triage first; expect roughly a third to be
   legitimate.
5. **76 dead-end lists.** A populated table whose rows link nowhere rules out every task that
   starts "open X and check its Y".

### P1 — coverage

6. **10 sites unmeasured at runtime**: 1 build failure (`TradingView_mock`) and 9 audit failures.
   Diagnose individually; the sweep records the reason for each.
7. **83 sites have no product reference.** Documentation-only research tops out near 40% sourced.
   Reading the live product goes higher and corrects the docs, but needs an account.
8. **The per-app harness exists for one site.** Its gates, walkthroughs and fidelity index are
   portable in shape; only the reference content is app-specific.

### P2 — instrument work

9. **Two known residual false-positive classes**, both documented in the detectors: an anchor
   calling only `preventDefault` inside a clickable row, and a `<Placeholder>` on a 404 route.
   Both need DOM ancestry or route context that line-based matching cannot see.
10. **Vite spans five major versions** across the fleet, so whether it builds depends on the
    operator's Node. Eleven sites need Node 20.19+.

---

## A caution about scale

Most of the effort in this program went into **fixing the instruments**, not the apps — and that
was the right allocation, because a wrong instrument at fleet scale sends 98 workers in a wrong
direction at once.

Before running a large concurrent job against a detector, check its calibration entry in
`fleet/README.md`. If it has none, triage a sample first and add one. That single pass has
prevented more damage in this repo than any fix has repaired.
