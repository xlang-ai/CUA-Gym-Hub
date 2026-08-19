# AWS Console research — raw findings

Six parallel research passes against AWS documentation (WebSearch + WebFetch), one per
service family. Each returned a per-page specification: default columns, Preferences-only
columns, tabs, primary buttons, Actions-menu contents, filters, bulk operations, row
affordances, empty states, and create-flow fields.

## The finding that matters most

All passes independently hit the same wall: **AWS's documentation is procedural, not a UI
reference.** It says "choose Actions, then choose Change instance type" — it never
publishes "the Instances table shows these eleven columns in this order." So exact column
inventories are largely *unconfirmed by primary source*, and every pass said so rather than
inventing them.

Consequences for scoring:

- Reference entries carry a `confidence` marker. `sourced` means an AWS doc names the label
  verbatim. `inferred` means it follows from the API/domain model but no doc confirms it as
  a rendered UI label.
- The Console Fidelity Index is reported **twice**: over all requirements, and over
  `sourced` requirements only. The second number is the defensible one; the first is
  directional.
- Closing the `inferred` entries needs real console screenshots. The repo's image-search
  skill returns unrelated content and is unusable, so those entries stay marked rather than
  being quietly promoted.

Treating an inferred column list as a hard requirement would mean scoring the mock against
our own guesses, which is worse than scoring it against less.

## What each pass confirmed with sources

Highest-value confirmed material, i.e. things we can implement and check honestly:

- **EC2 Instances** — the Alarm status column carries a "View alarms" control and a "+"
  control; Instance state cells carry +/− one-click filter icons; the search bar separates
  API filters (server-side, `=` and `:`) from client filters (adds ranges and `!=`);
  Preferences holds "Use regular expression matching" and "Use case sensitive matching";
  saved filter sets exist **only** on the Volumes page.
- **EC2 launch wizard** — eight sections in exact order, with their fields and defaults.
- **EC2 instance detail** — a "Status and alarms" tab whose Metrics panel holds four
  status-check graphs (system / instance / attached EBS / application).
- **S3 create bucket** — nine field groups in order, including the three Object Ownership
  radio values and the three encryption types.
- **S3 bucket Properties** — ten panels in documented order.
- **S3 bucket Permissions** — five sections including CORS and the policy editor's
  Policy generator and Preview external access controls.
- **S3 folders** — folders are synthesized from key prefixes; "Create folder" writes a real
  zero-byte object keyed `name/`; delete requires typing `delete` to confirm.
- **RDS create database** — twelve field groups in order, Easy create vs Standard create.
- **RDS instance detail** — six tabs: Connectivity & security, Monitoring, Logs & events,
  Configuration, Maintenance & backups, Tags.
- **RDS status vocabulary** — the full 34-value status list.
- **DynamoDB table detail** — seven tabs.
- **Route 53** — the exact record-type dropdown contents and the alias/non-alias split.
- **CloudFront** — the full origin, cache-behavior and distribution settings field lists.

## Currency warnings the research surfaced

- **RDS Performance Insights is end-of-life 2026-07-31**, redirecting to CloudWatch Database
  Insights. Our `/rds/performance-insights` page models a surface that is being retired.
- The documented query editor with exact field labels is the **Aurora** one (Data API
  backed), reached via Actions → Query. A generic RDS query editor for non-Aurora engines
  is not clearly a current feature.

Both are recorded in the reference rather than silently modelled as evergreen.
