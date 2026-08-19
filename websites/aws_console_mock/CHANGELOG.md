# Changelog — XWS Console Mock

All notable changes to this mock. Versions follow SemVer at the app level:
PATCH = bugfix/visual/compat fix, MINOR = additive features, MAJOR = a change that
cannot be made backward compatible for previously authored tasks.

## 1.6.1

Reweight the fidelity index toward interaction, and build the console's missing second layer.

### Why the index changed

Two of the previous five dimensions scored columns, so the index rewarded cataloguing columns
and the work followed it. Six dimensions now, three of them about whether the console can be
*operated*:

| dimension | what it asks |
|---|---|
| `column_depth` | are the default columns there |
| `control_coverage` | filter, bulk-select, pagination, preferences |
| `action_coverage` | is the action **vocabulary** present |
| `interaction_coverage` | do those actions **do** anything — measured by clicking every one |
| `flow_depth` | does a row lead anywhere, and does that page have tabs |
| `state_gating` | does the mock refuse what the console refuses |

`interaction_coverage` clicks. That is the only way to catch this codebase's recurring defect —
a control wired to a dialog that was never rendered — which passes the build and every static
gate.

### Added

- `src/lib/resourceRegistry.js` + `ResourceDetailPage`: the second layer, generated from data
  rather than written fifty times. Eight resources so far (VPC, subnet, route table, security
  group, volume, snapshot, IAM user, CloudWatch alarm), 27 tabs, every tab panel verified
  non-empty in a browser.
- Six list pages now reach their detail page through a real `<Link>`, not a `<td onClick>`. A
  click handler on a cell is not a link: no href, no middle-click, and nothing in the
  accessibility tree.
- `role="tab"` / `aria-selected` on the 20 genuine tab-strip buttons across 17 pages.
- `reference/capture/extracted/ebs-volume-interactions.json` — the volume Actions menu. Every
  volume in the sampled account was In-use, so only half the state matrix is observed; the
  other half is marked inferred and the fidelity score refuses to grade it.

### Honest accounting of the score

CFI moved 25.2% → **58.5%**, and most of that is the instrument, not the product:

- `interaction_coverage` 3.1% → 87.8%. The first probe only clicked menu items, and most
  actions here are toolbar buttons — it was measuring almost nothing. It then reported six
  working `Create ...` buttons as inert because it required the page to grow, and every create
  form *shrinks* the page by replacing the table. Both are fixed; 87.8% is the first honest
  reading, not an improvement over 3.1%.
- `flow_depth` 4.7% → 26.6% is genuine: eight detail pages and six linked lists, plus tab
  strips that were always there but carried no `role="tab"` to be counted by.
- `state_gating` reads 100% over a capture covering **one** resource type. The report now says
  so on the same line, because a bare 100% invites the opposite conclusion.

### Still inert — 8 controls that are enabled and do nothing

`/ec2/amis` "Owned by me"; `/ec2/instance-types` "Instance type finder", "Actions", "Select an
instance type"; `/s3` "All Regions", "Directory buckets"; `/cloudtrail/events` "Refresh";
`/billing/bills` "Download CSV". These are the real blank endpoints, and they are now listed by
name on every run instead of having to be found by hand.

### Reverted during this release

A first attempt to tag tab buttons matched every `onClick={() => setX(y)}` and labelled 53
files' pagination, sorting and selection controls as tabs — worse than the gap it closed, since
it corrupts the accessibility tree and inflates the very measurement it feeds. Reverted, then
redone structurally against `border-b-2`: 20 buttons, 17 files.

## 1.6.0

The EC2 Actions menu, rebuilt from the live console — and state gating, which is the part
that was actually missing.

### The reframe

Earlier releases chased what the fidelity index could measure, and two of its five dimensions
score columns. So the work drifted toward column inventories. Reading the real console showed
that was never the gap. The console's EC2 instance Actions menu holds **71 entries across six
nested submenus**, and enablement is **state-dependent**: `Change instance type`, `Change CPU
options` and `Modify instance placement` are offered only while the instance is **stopped**;
`Connect`, `Stop`, `Reboot` and `Replace root volume` only while it **runs**.

That is what makes resizing an instance a task at all — stop, wait for the transition, change,
start. A mock that accepts the change at any moment collapses it to one click and removes the
signal along with the difficulty.

### Added

- `src/lib/instanceActions.js` — the menu as **data**: 51 descriptors across six submenus, each
  with the state it requires and the capability it needs. Enablement stops being `if`
  statements scattered through a page, so it can be asserted.
- Nested submenus in `ActionsMenu`, and `InstanceActionDialog`, a descriptor-driven dialog.
  Every kind renders something real: `Connect` prints the SSH and Session Manager commands
  built from this instance's key pair and address, `Get system log` is derived deterministically
  from the instance so the same instance always shows the same boot log, and `Instance
  diagnostics` genuinely inspects the store — including whether a security group actually opens
  port 22.
- Gate **S6**: replays the captured console matrix through the mock's own rules. 23 state-gated
  actions must agree with what the real console did against a stopped and a running instance.
- `walkthroughs/ec2-actions.mjs` (`npm run walk:ec2`) — walks the refusal, the stop, the
  now-permitted change, and asserts the type really changed and reached `state_diff`. 7/7 on dev
  and preview.
- `reference/capture/` — structure read from the live console, read-only. Screenshots and page
  dumps are gitignored; they carry the account id and real resource names. Only structure is
  committed, and each file is leak-checked.

### Fixed

- **`Start` on a running instance silently did nothing.** The handler read
  `if (action === 'start' && inst.state === 'stopped')` and returned quietly otherwise: the menu
  closed, no flash appeared, nothing changed. To an agent that is indistinguishable from
  success. Mismatched commands are now disabled with the reason, and the fall-through raises an
  error instead of returning.
- The `Instance state` trigger was disabled whenever nothing was selected. The real console
  leaves it enabled and disables the items, which keeps the vocabulary discoverable.

### Caught while building this

`Change instance type` and its dialog shipped in the first pass with the dialog state added but
**never rendered** — the same shape as the IAM "Add permissions" modal in 1.2.0. `npm run build`
passed, and so did all 25 static gates. Only clicking it found it, which is why the walkthrough
exists.

### Where the reference was wrong

Doc-derived research had EC2 at 11 default columns; the console shows 17. `Alarm status` was
specified as a default column and is optional and off. VPC detail pages were recorded as having
no tabs; they have six.

## 1.5.2

The Actions menu, starting with VPC — and a fix to the instrument that was hiding it.

### Added

- `ActionsMenu`, the dropdown every console list page carries. Every item must do something
  observable: `onSelect` is required, and an item that cannot apply right now renders **disabled
  with a reason** rather than silently closing the menu. A menu item that opens nothing teaches an
  agent that the action worked.
- VPC Actions, all five verified end to end: **Edit CIDRs** (associates and removes secondary
  IPv4 blocks, rendered under the primary), **Edit DNS hostnames**, **Create flow log** (filter,
  aggregation interval, destination, and custom log-record format, per the VPC User Guide "Create
  a flow log" procedure), **Manage tags**, **Delete VPC**. The four screenshot-sourced items come
  from official VPC console screenshots.
- Reducer cases `UPDATE_VPC`, `UPDATE_VPC_CIDR`, `UPDATE_VPC_TAGS`, `CREATE_VPC_FLOW_LOG`, and a
  `vpc.flowLogs` slice.
- `walkthroughs/vpc-actions.mjs` (`npm run walk:vpc`) — a committed, re-runnable browser
  walkthrough asserting each item against `/go` `current_state`, never against the success toast.
  8/8 steps on both dev and preview.
- Gate **S5**: every dispatched action has a matching reducer case.

### Fixed

- **The fidelity scorer could not see any Actions menu.** It measured only visible buttons, so
  five working VPC menu items moved `action_coverage` by 0.5pt. Worse than under-reporting, that
  gradient rewards hoisting actions into always-visible toolbar buttons — *less* faithful to a
  console that deliberately hides them. The scorer now opens every `aria-haspopup="menu"` trigger
  before measuring. The reference spec was not touched.
- `Delete VPC` refuses default VPCs, as the console does, instead of deleting them.

### Caught by S5 during this release

`Edit DNS hostnames` dispatched `UPDATE_VPC`, which no reducer defined — the click would have
fallen through to `default: return prev` and changed nothing while flashing success. `npm run
build` passed: it is a string mismatch, not a type error. S5 exists so this class cannot ship.

### Not a defect, worth recording

The walkthrough first reported VPC mutations missing from `state_diff`. The cause was the
walkthrough, not the app: `/go` computes `initial = readInitialState(sid) || currentState`, so a
session that never pinned an initial state via `set` gets `initial === current` and an empty diff
by construction. Task harnesses always `set` first; the walkthrough now does too.

`action_coverage` 33.4% → **36.0%**; CFI 45.3% → **46.3%** overall, 47.1% → **49.5%** sourced.

## 1.5.1

Real pagination and a Preferences dialog on 16 list pages.

### Added

- `usePaged` + `TableToolbar` + `TablePager`, retrofitted into 16 pages. The hook **slices the
  row array** rather than only rendering pager chrome — a pager that does not paginate is the
  same class of defect as a success toast for a mutation that never happened, and this codebase
  has had enough of those.
- Preferences carries page size (10/25/50/100) and the two sourced search toggles, "Use regular
  expression matching" and "Use case sensitive matching".

`control_coverage` 48.0% → **64.1%**; CFI 42.8% → **45.3%** overall, 43.8% → **47.1%** sourced.

### Five pages deliberately not retrofitted

`CloudWatchLogs`, `DynamoDBTables`, `EC2SecurityGroups`, `IAMGroups`, `IAMUsers` define their row
variable *after* an early return, so the hook cannot be placed above it without restructuring the
component. Skipped rather than forced — a conditionally-called hook is a React rule violation and
would crash the page.

### Correction to 1.5.0's claim about screenshots

1.5.0 reported that AWS News Blog posts embed compliant, pixel-exact console screenshots and
treated that as the general fix for our inferred column lists. **That does not generalise.** A
dedicated pass across 17 list pages downloaded and visually inspected every candidate image and
confirmed none were both current and showed a full default table: blog images are cropped hero
shots of the one feature being announced, and current AWS docs have largely stopped embedding
console captures at all. The VPC result was one post that happened to carry full-table
screenshots. Recorded as a negative result in the manifest rather than left as an open lead.

## 1.5.0

Adds a metric for how far this mock is from the real console, backed by eight research passes.

### Added

- **Console Fidelity Index** (`fidelity-score.mjs`) — drives a headless Chrome over every page
  and scores five dimensions against a frozen per-page specification: default columns,
  Preferences-only columns, table controls, actions, and tabs. Geometric mean, so a strong
  dimension cannot mask a weak one. Baseline: **42.8% overall, 43.8% over sourced requirements
  only**.
- **`reference/page-depth.2026-08.json`** — the per-page specification the index divides by,
  and **`reference/research/`** — eight per-service-family research passes against AWS
  documentation, each with citations and explicit `unconfirmed` markers.
- **`TableControls.jsx`** — the Preferences dialog (page size, column visibility, regex and
  case-sensitivity toggles) and pager that real console tables have and this mock mostly lacked.
- Security-group rule editor now offers the real Source options — **Custom**, **Anywhere-IPv4**,
  **Anywhere-IPv6**, **My IP** — and shows the console's open-to-the-world warning.

### Fixed

- The column-chooser gear had no accessible name, so neither a screen reader nor an agent could
  tell what it was. Labelled **Preferences**.
- The trademark gate flagged an AWS doc title cited in a source comment. It now strips comments:
  the gate is about what a user sees.

### What the research actually found

Eight independent passes hit the same wall: **AWS documents procedures, not table layouts.** It
says "choose Actions, then Change instance type"; it never publishes the column list. So column
inventories are largely *inferred*, and the reference marks them as such rather than pretending
otherwise. The index reports a sourced-only score for exactly this reason.

**One pass broke through**: AWS embeds real console screenshots in its own News Blog and What's
New posts — compliant, citable, pixel-exact. That is the screenshot corpus I had written off as
unobtainable, and it was available the whole time.

The first page corrected from that source proves why it matters. My inferred spec claimed
**11 columns** for Your VPCs; the real table has **5** (`Name`, `VPC ID`, `State`, `IPv4 CIDR`,
`IPv6 CIDR`). The mock was being penalised against a fiction. Correcting that one page moved
sourced `column_depth` from 42.9% to 61.4%.

### Currency warnings the research surfaced

- **RDS Performance Insights is end-of-life 2026-07-31**, redirecting to CloudWatch Database
  Insights — our `/rds/performance-insights` models a surface being retired.
- **IAM "Access Advisor" is now "Last Accessed"**; the Create user wizard no longer has an inline
  programmatic-access checkbox; the **Bills page CSV download was removed 2025-11-01**. A mock
  carrying those reflects a stale console generation.

### Quality gates

24/24 on dev and preview.

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
