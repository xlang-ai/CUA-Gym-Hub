# Fleet fidelity program — changelog

Versions cover `fleet/` and fleet-wide changes. Individual apps keep their own changelogs;
`websites/aws_console_mock/CHANGELOG.md` is the fullest.

## 0.1.0 — first measured baseline

The program's starting point: `SANDBOX_COMPLETENESS_GUIDE.md` states what a finished mock looks
like, and none of it had ever been measured across the fleet.

### Instruments

- **`audit-static.mjs`** — source screen over all 98 sites in seconds. Nine detectors, each
  mapped to an acceptance criterion in the completeness guide. Four are calibrated against triage
  passes, with the evidence recorded in each detector's comment.
- **`audit-runtime.mjs`** — app-agnostic browser audit needing nothing but a URL. Discovers
  routes by following links rather than parsing source, so it cannot go blind to a page that
  stops being a literal string. Reports crashes, untitled routes, dead-end lists, unmarked tab
  groups, and inert controls — where a toast does not count as a response, and a server-state
  change does.
- **`sweep-runtime.mjs`** / **`sweep-all.sh`** — the same across every site that can be built,
  end to end on a build host.
- **`audit-build.mjs`** — build health and preview reachability. Separates a toolchain mismatch
  from a code error, and retries once, because a build started while another process is writing
  fails for reasons unrelated to the code.
- **`validate-reference.mjs`** — rejects a product reference whose every field claims to be
  `sourced`, or whose `gaps` is empty while anything is inferred. Written because an agent's
  summary of its own output is not evidence.
- **`fix-preview-host.mjs`** — the one fleet-wide repair this version makes.

### Fleet-wide repair

**97 of 98 preview servers bound to a single address family** — 69 to `'0.0.0.0'` (IPv4 only),
28 to the default (IPv6-only localhost). Node's `fetch` resolves `localhost` to `::1` while much
tooling connects to `127.0.0.1`, so some clients got `ECONNREFUSED` from a server plainly
running. It read as a flaky environment and was deterministic per client. Now 98 of 98 are
dual-stack, verified by serving four of the changed sites on both families.

### Baselines

- **Source**: 98 sites, 18 flagged. `BASELINE.md`.
- **Runtime**: 88 of 98 audited in a browser, 396 routes, **0 crashes**. 127 untitled routes,
  517 unmarked tab groups, 76 dead-end lists, 472 of 1951 clicked controls inert. `RUNTIME.md`.
- **References**: 15 of 98, 8%–86% sourced, median 40%.

Both reports are generated from their runs. A hand-kept number drifts from the run that produced
it, silently.

### App fixes, all triaged first

`youtube_mock` 7 · `meta_ads_mock` 8 · `openreview_mock` 17 · `bamboohr_mock` 8 · `feishu_mock` 2
· `amplitude_mock` 1 · `ServiceNow_mock`, `cloudflare_mock`, `Canvas-LMS_mock`. Each verified in a
browser against `/go` state rather than a success toast.

Deliberately **not** changed after triage: `dingtalk_mock` (5 of 5 findings were correct code),
`klaviyo_mock` (6 of 6), `gitlab_mock`, `azure_mock`.

`miro_mock` is **incomplete** — two workers died mid-task on it. It builds and its static screen
is clean, but its presentation-mode and cursor-chat surfaces were never browser-verified.

### Instrument corrections made during this version

Recorded because each was a wrong number that looked right:

- The interaction probe counted any DOM text change as a response, so a handler whose whole body
  was `addFlash('success', …)` scored as working — it was rewarding the defect it existed to
  catch. It now ignores flash-only changes and consults `/go`.
- Three route checks grepped for literal `path="…"` and went blind to generated routes; the crawl
  fell from 68 routes to 57 while reporting success.
- The anchor filter failed three times in the same direction — a tag-bounded regex truncating at
  the `>` inside `e =>`, then a too-short window — each time returning "no handler" and flagging
  working anchors as dead.
- The build audit predicted failures from a Vite version table and announced eleven sites could
  not build, including one that builds fine. Predictions are now hints; only a real build asserts
  a failure.
- `audit-runtime.mjs` hardcoded a macOS Chrome path, which made it useless on the Linux host
  where the full sweep had to run.
