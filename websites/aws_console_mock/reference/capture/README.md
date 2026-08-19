# Live-console capture

Structure extracted by driving the maintainer's own logged-in AWS console, read-only.

## Why this exists

The reference spec was built from AWS documentation, which does not consolidate console UI
structure — most `tabs` entries came back `inferred` or `partially_sourced`, and the sourced-only
CFI was measuring a small, doc-shaped slice of the console. Reading the live console converts
those to `sourced` against something better than a doc: the thing itself.

## Rules this capture was taken under

Read-only. Navigate, read the accessibility tree, screenshot, and expand pure-UI menus
(Actions, Preferences, column chooser). **Never** Create / Launch / Delete / Terminate /
Modify / Save / Submit — this is a live billed account, and a create wizard may be opened to
read its field structure but is never submitted.

## What is committed, and what is not

Committed: `extracted/*.json` — tab labels, column headers, button and menu-item text, URL
patterns. Structure only.

Not committed (see `.gitignore`): raw screenshots and page dumps. They contain the account ID,
real ARNs and resource names. Structure is what the mock needs; the account data is not.
