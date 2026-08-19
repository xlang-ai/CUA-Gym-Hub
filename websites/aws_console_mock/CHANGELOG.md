# Changelog — XWS Console Mock

All notable changes to this mock. Versions follow SemVer at the app level:
PATCH = bugfix/visual/compat fix, MINOR = additive features, MAJOR = a change that
cannot be made backward compatible for previously authored tasks.

## 1.4.2

Fixes an environment defect that only appears against the server tasks actually run on.

### Fixed

- **The preview server was unreachable from Node clients.** `vite.config.js` set
  `preview: { host: '0.0.0.0' }`, which binds IPv4 only. Node's `fetch` resolves
  `localhost` to IPv6 `::1`, so any harness using it got `ECONNREFUSED` against the
  preview server while `curl` silently succeeded by falling back to IPv4 — a failure that
  looks intermittent but is deterministic per client. Bound dual-stack with `host: true`.

  This was invisible for four releases because every check ran against the *dev* server.
  The contract is now run against both: dev 24/24, preview 24/24.

- Gate `R1` fails the release if the preview host is ever narrowed to IPv4 again.

### Quality gates

24/24 on dev and on preview.

## 1.4.1

Walks every declared workflow end to end, which found two defects no static gate could see.

### Fixed

- **The "Add permissions" feature shipped in 1.2.0 never rendered.** Its modal was placed
  in the user-*list* return branch, while the button that opens it lives in the user-*detail*
  branch, so clicking it did nothing. Build passed, the reducer gate passed, the trademark
  gate passed — none of them clicked the control. Moved into the detail branch and verified
  by completing the workflow.
- **The S3 create-bucket dialog threw on every render.** `pattern="[a-z0-9.-]+"` is not a
  valid regular expression under the browser's `v` flag: a bare `-` inside a character
  class is a syntax error. Escaped.

### Added

- `reference/workflow-evidence.json` — recorded end-to-end walkthroughs for all six declared
  workflows, each asserting completion from `/go` `current_state` rather than from the UI's
  own success toast. All six completed at exactly the declared step count.

  | workflow | declared | measured | completed |
  |---|---|---|---|
  | create_vpc | 4 | 4 | yes |
  | create_s3_bucket | 4 | 4 | yes |
  | create_cloudwatch_alarm | 5 | 5 | yes |
  | attach_iam_policy_to_user | 5 | 5 | yes |
  | launch_ec2_instance | 5 | 5 | yes |
  | create_security_group_rule | 6 | 6 | yes |

- Gate `S4` requires that evidence to exist, to show completion, and to match the declared
  step count — so a control that renders in the wrong branch cannot pass again.

### Quality gates

23/23 pass. Workflow step parity moves from one verified workflow to all six.

## 1.4.0

Closes the last two authenticity gaps by measuring them, rather than leaving them blocked.

### Fixed

- **38 of 66 pages had no `<h1>` page title at all** — they used an 18px `<h2>` as the
  heading, so the Cloudscape page-header structure the real console always has was simply
  absent. The 1.1.0 pass only resized headings that already were `<h1>`; it never noticed
  the ones that weren't. Ten more were missed on a second pass because those files
  contained an `<h1>` inside a modal branch, which made a source-level "has h1" check pass
  while the list view still rendered an `<h2>`. Found by measuring the rendered DOM.
  All 64 console pages now render a 24px/700 `<h1>`; `EC2AMIs` had no title element
  whatsoever and `S3BucketDetail` showed the bucket name only as a link.

### Added

- **Structural conformance measurement.** The reference now pins measurable layout values
  (top-nav height and surface, page-title tag/size/weight, breadcrumb requirement, body
  size) and three gates enforce them: `S1` every console page declares a Cloudscape H1,
  `S2` the global chrome carries all seven required elements, `S3` core workflow step
  counts are declared and plausible.
- **Workflow step parity.** The reference declares the interaction count for six core
  workflows. `create_vpc` was walked end to end with real coordinate clicks: declared 4,
  measured 4, completed. The method is recorded so the remaining five can be walked the
  same way.

### On pixel diffing

Screenshot comparison against the live console stays unimplemented, and that is now a
decision rather than a blocker. There is no compliant capture corpus — the repo's
image-search skill returns unrelated content — and pixel diffing against a product that
changes underneath us is neither deterministic nor reviewable. Measuring the rendered DOM
against a frozen specification gives the same signal with none of those properties.

### Quality gates

22/22 pass. Authenticity status: `MEASURED_STRUCTURALLY_AND_BEHAVIOURALLY`.

## 1.3.0

Completes trademark desensitization and closes the gate blind spot that hid it.

### Fixed

- **38 real trademark strings were still rendering on 4 routes.** The 1.1.0 sweep and its
  `H3` gate only inspected `src/pages` and `src/components`, but the strings live in
  `src/store/dataManager.js` seed data and only become visible once rendered — IAM role
  trust policies (`AWS service: ec2.amazonaws.com`), policy type labels and descriptions
  (`AWS managed`, `Provides full access to AWS services`), the billing cost breakdown
  (`Amazon EC2`, `Amazon RDS`, `Amazon S3`, `AWS Lambda`) and CloudWatch alarm rows.
  Found by sweeping rendered `innerText` across 27 routes in a live browser rather than
  grepping source. Now 0.

- **`H3` hardened** to inspect seed data as well, plus a meta-gate `H3b` that fails if the
  gate ever narrows back to pages/components only.

### Compatibility note — read this before writing tasks against seed strings

This release **changes seed display values**, which no previous release did. Object shapes,
field names and types are unchanged, and no key was renamed or removed, but a task whose
reward function matched on the literal string `"Amazon EC2"` in the billing breakdown will
need updating. This was judged the correct trade: desensitization is a compliance
commitment the hub README makes explicitly, including a takedown policy.

Deliberately **preserved** because they are API-shaped identifiers rather than branding,
and reward functions do match on them:

- `arn:aws:*` resource ARNs (58 lines)
- `*.amazonaws.com` service DNS (19 lines)
- `AWS/<Namespace>` CloudWatch metric namespaces (`AWS/EC2`, `AWS/RDS`, `AWS/Lambda`,
  `AWS/ApplicationELB`, `AWS/Billing`)
- `aws-sdk` / `AWS.S3()` in the Lambda sample code shown in the code editor — rewriting
  these would make the sample code wrong

### Quality gates

19/19 pass.

## 1.2.1

Makes visual/structural authenticity measurable. No change to app behaviour.

### Added

- `reference/console-reference.2026-08.yaml` — a frozen structural and capability
  specification of the real AWS Management Console. Authenticity cannot be scored without
  a reference, and the reference cannot be the live product: it moves underneath us,
  scraping it raises compliance questions, and image search returns unusable results. A
  version-frozen spec is stable, reviewable, and machine-checkable.
  The file is **supervisor-owned — repair agents must not edit it**, because capability
  recall divides by it and an agent able to edit the denominator could raise its score by
  deleting requirements rather than implementing them.
- Three authenticity gates: `A1` every reference route is implemented (62/62), `A2` every
  required service is reachable from navigation (14/14), `A3` design tokens match the
  pinned Cloudscape values (11 tokens, 0 mismatches).
- The reference records which real-console services are deliberately **out of scope** (ECS,
  Step Functions, SageMaker, Secrets Manager, Athena, Cognito, …) so the omission is a
  recorded decision rather than an unnoticed gap.

### Quality gates

18/18 pass. Authenticity status moves from `NOT_MEASURED` to `MEASURED_STRUCTURALLY`.
Still unmeasured, and now explicitly recorded as blocked: pixel-level comparison against
captured screenshots of the live console, and workflow step-count parity.

## 1.2.0

Closes the functional gaps that survived 1.1.0, plus two more reward-signal defects
found while exercising the newly-reachable pages.

### Added

- **Security group rule editing.** Inbound and outbound rules were read-only tables with
  no way to add, edit, or remove a rule — the single most common real EC2 task ("open
  port 22 to a CIDR") had no affordance at all. There is now an "Edit inbound/outbound
  rules" editor with AWS's named rule types (SSH, HTTP, HTTPS, MySQL/Aurora, PostgreSQL,
  RDP, Custom TCP/UDP) that pin protocol and port, plus per-rule source and description.
- **Direct IAM policy attach/detach.** Permissions could previously only be granted through
  group membership; attaching a policy straight to a user was impossible. The user
  Permissions tab now has "Add permissions" (multi-select over available policies,
  excluding ones already attached) and per-policy "Remove". `attachedEntities` is kept in
  sync by the reducer.

### Fixed

- **Toast state polluted every reward signal.** `flash` holds auto-dismissing toasts on a
  5s timer, so `state_diff` contained a `flash` entry after every single action *and*
  varied with when the reward function happened to poll `/go`. Ephemeral keys are now
  excluded from the derived diff while remaining in `current_state`, so the stored shape
  is unchanged.
- **Clicking any security group crashed the page** with `ruleTab is not defined` — the tab
  state was referenced but never declared. Latent because the detail pane only renders
  after a row is clicked.
- **Security group rules displayed "Custom / All" for every rule.** Seed data stores
  `port`; the UI read `portRange`, so HTTP/443/SSH rules all rendered as unrestricted
  custom rules. The UI now accepts either field and the editor writes both, so no seed
  rename was needed and tasks reading `inboundRules[].port` keep working.
- **`iam.policies[].attachedEntities` disagreed with reality** for 4 of 10 policies
  (AdministratorAccess 1→2, AmazonS3FullAccess 1→2, AmazonS3ReadOnlyAccess 2→4,
  DataAnalystPolicy 1→0). A reward function trusting the denormalized count — as the real
  console's UI does — got wrong answers from episode one.
- **"Recently visited" was frozen to seed data.** `ADD_RECENT_SERVICE` was fully
  implemented in the reducer but never dispatched; navigation now updates it, and the
  change is observable in `state_diff`.

### Quality gates

15/15 pass. New gates: `G1.3` (transient UI state never reaches `state_diff`) and `H5`
(derived IAM counts match actual references).

## 1.1.0

Reachability, reward-signal correctness, and Cloudscape visual alignment.
No breaking change to the state contract — every existing task keeps working.

### Fixed — reward signal

- **Injected partial state no longer fabricates a diff.** `/post?action=set` stored the
  task's partial state verbatim as the frozen baseline, while the client filled defaults
  and wrote back a fully-populated object. `/go` then diffed a 2-key baseline against a
  32-key current state and reported **31 spurious `added` entries before the agent had
  done anything**. The server now normalizes injected state against `getDefaultData()`
  using the same merge semantics as the client, so both sides share one baseline.
  Measured: `state_diff` on an untouched episode went from **31 entries to 0**.
- **70 of 105 dispatched actions were silently discarded.** The reducer's `switch` handled
  38 action types; everything else fell to `default: return prev`. Pages still fired a
  success toast, so the UI reported success while the store was byte-identical — an RL
  reward function reading `state_diff` saw nothing. All missing cases are implemented;
  dispatched-vs-handled set difference is now empty.

### Fixed — dead affordances

- **40 page components (5,777 lines) were unreachable.** They existed on disk with full
  CRUD implementations but had no route, while 28 sidebar entries pointed at a generic
  placeholder page showing fabricated stats. All are now routed and reachable.
- Eight services were absent from navigation entirely — **CloudWatch, VPC, DynamoDB, SNS,
  SQS, Route 53, CloudFront, CloudTrail** now appear in the services menu and have their
  own sidebars.
- EC2 instance Name and Instance ID cells were styled as links with no click handler; they
  now open the (previously unreachable) 571-line instance detail page.
- `RDSSubnetGroups` crashed with `subnetGroups is not defined` — a latent bug that was
  invisible while the page was unroutable.
- S3 upload fabricated a `sample-upload.csv` object and reported success when no file was
  selected. Upload is now disabled with an empty selection.

### Added

- Seven pages that previously had no implementation at all: **S3 Access Points, S3 Batch
  Operations, S3 Storage Lens, Lambda Applications, RDS Query Editor, RDS Performance
  Insights, RDS Automated backups**. No route in this app resolves to a placeholder.
- S3 object **Download** using real Blob + object-URL browser APIs.
- `quality.contract.mjs` — 13 executable release gates covering reward-signal cleanliness,
  mutation observability, placeholder-freedom, backward compatibility, determinism, and
  runtime-network/trademark hygiene.

### Changed — visual fidelity

Design tokens are now pinned to a single Cloudscape generation. The palette previously
mixed two: `#0972D3` primary blue and `#000716` body text from an older release alongside
`#0f141a` / `#c6c6cd` from a newer one.

- Primary/call-to-action buttons are **blue (`#006ce0`)**, not orange. Orange is reserved
  for the logo mark, matching the real console.
- Body text `#000716` → `#0f141a`; status, border, and disabled tokens realigned; added the
  status-background, `blue-lighter`, `border-secondary`, and `text-form-secondary` tokens
  the component layer needed but never had.
- Button radius 20px (full capsule) → **8px** rounded rectangle.
- Typography: Open Sans on a Cloudscape h1–h5 scale; all 42 page `<h1>` elements normalized
  to 24px (38 were rendering at 20px).
- **672 raw Tailwind palette classes** across 59 files replaced with `aws.*` tokens;
  `src/index.css` went from 13 palette usages to 1 (an intentional terminal block).
- Flash messages follow the Cloudscape spec: 16px radius, 4px status-coloured left accent,
  neutral body text with a coloured icon.

### Changed — compliance

- **Zero external network requests at runtime.** `index.html` loaded the real Amazon Web
  Services logo from `upload.wikimedia.org` and Google Fonts from `fonts.googleapis.com`.
  The favicon is now an inline self-drawn XWS mark and Open Sans is self-hosted via
  `@fontsource/open-sans`. This also fixes rendering in air-gapped sandboxes.
- Trademark desensitization completed: 83 user-visible "AWS"/"Amazon" strings rewritten to
  "XWS". The logo wordmark no longer reproduces the real mark.

### Compatibility

Verified, not assumed:

- All 29 legacy `/local/:service/:item` URLs redirect to their real routes — previously
  authored tasks that navigate by URL keep working.
- Task-injected values are never overwritten by defaults; omitted keys get defaults;
  unknown fields survive round-trip at both top and nested level; explicitly empty arrays
  are not backfilled.
- `arn:aws:*` identifiers and `*.amazonaws.com` DNS names in seed data are untouched —
  reward functions matching on ARNs are unaffected. Only display prose was rewritten.
- `getDefaultData()` is byte-stable across calls.
- No state key was renamed, retyped, or removed. New slices are additive.

## 1.0.0

Initial mock.
