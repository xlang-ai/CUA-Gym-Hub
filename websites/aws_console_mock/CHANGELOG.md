# Changelog — XWS Console Mock

All notable changes to this mock. Versions follow SemVer at the app level:
PATCH = bugfix/visual/compat fix, MINOR = additive features, MAJOR = a change that
cannot be made backward compatible for previously authored tasks.

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
