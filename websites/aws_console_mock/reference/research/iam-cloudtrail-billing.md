# AWS Management Console — IAM / CloudTrail / Billing UI Reference Spec

Frozen precision reference for scoring a mock console against the real AWS Management
Console. Compiled 2026-08-18 from AWS's own documentation (`docs.aws.amazon.com`) plus a
small number of screenshot-bearing third-party walkthroughs, fetched directly — not
reconstructed from model memory. Every concrete claim below is either a verbatim/near-
verbatim quote from a fetched source, or explicitly marked **unconfirmed**. Where AWS's
own wording has visibly drifted over time, both the current and legacy terms are given,
with the more recent one flagged as authoritative.

**Cross-cutting version-drift flags (apply throughout):**

- The tab that appears in current IAM docs as **"Last Accessed"** is the same feature
  long known as **"Access Advisor"**; older docs, blog posts, and most walkthroughs still
  call it Access Advisor. Treat "Last Accessed" as current.
- The IAM console's **Create user** wizard no longer has an inline "Programmatic access"
  checkbox. Current docs (`id_users_create.html`, `getting-started-workloads.html`) move
  access-key creation to a separate, post-creation step on the user's **Security
  credentials** tab. Any mock/walkthrough showing an inline access-key checkbox in the
  create-user wizard reflects an older console generation.
- Whether a policy detail page's tab is called **"Policy usage"** or **"Entities
  attached"** could not be resolved with certainty — AWS's current docs describe
  "Entities attached" (housing permissions-boundary controls); "Policy usage" is the
  term used in most third-party walkthroughs and may be a legacy/alternate name for the
  same tab, or a distinct tab. Flagged unconfirmed below.
- AWS's Bills page exists in two generations: a **new console** (Charges by service /
  Charges by account / Invoices / Savings / Taxes by service tabs) and an **"old
  console"** (`#/bill`, Summary-section based, "Charges by account" as its own legacy
  view). The new-console names are used below as authoritative for a current mock.
- Cost Explorer had an **October 2022** UI redesign ("Announcing a new Cost Explorer
  console experience") that produced the chart/report-list layout described below; this
  is the current baseline, not a later 2023-2024 change.
- Starting **November 1, 2025**, AWS removed the **"Download all to CSV"** button from
  the Bills page, superseded by the separate Data Exports console page. A current mock
  should not have this button on Bills.

---

## IAM Dashboard

### 3. Tabs
Not tab-structured — a panel-based landing page, referred to in AWS's own procedural
docs as **"IAM Console Home."**

### Left navigation (confirmed structure)
A **Search IAM** text box, followed by nav items **Users**, **User groups**, **Roles**,
**Policies**, **Identity providers**, **Account settings**, **Credential report**, and
**Access Analyzer**.

### Panels (partially confirmed)
- A security-checklist-style feature — AWS's "Introducing the Redesigned IAM Console"
  security blog post confirms the dashboard "displays which recommended security
  measures are complete and how to take action on those that aren't," plus a rotating
  feature spotlight in the upper-right corner. Exact panel title (e.g. "Security
  recommendations" vs. "Security status") is **unconfirmed** — no fetched source gives
  the current verbatim panel heading.
- **unconfirmed**: exact layout/titles of any "IAM resources" count panel (Users/Groups/
  Roles/Policies tallies) or sign-in-URL display panel.

### Credential report entry point (confirmed)
Nav → **"Credential report"** → button **"Download Report"**. Regeneration throttled to
once per 4 hours (a report <4h old is served instead of regenerating). CSV columns, in
order: `user, arn, user_creation_time, password_enabled, password_last_used,
password_last_changed, password_next_rotation, mfa_active, access_key_1_active,
access_key_1_last_rotated, access_key_1_last_used_date, access_key_1_last_used_region,
access_key_1_last_used_service, access_key_2_active, access_key_2_last_rotated,
access_key_2_last_used_date, access_key_2_last_used_region,
access_key_2_last_used_service, cert_1_active, cert_1_last_rotated, cert_2_active,
cert_2_last_rotated, additional_credentials_info`. Filename pattern:
`status_reports_{date}T{time}.csv`.

### Access Analyzer entry point (confirmed)
Nav → **"Access Analyzer"** → opens a **"Summary"** view with two analyzer families:
- **Resource access analyzers** — choose **"Select analyzers"** → **Zone of trust**
  (**Organization** or **Account**) → choose analyzers → **"Update"**. Results grouped
  under **"Resource access findings"**: **Active findings**, **Resource types**, **Key
  resources**, each with a **"View all active findings"** link.
- **Unused access analyzers** — same **Select analyzers** flow with an **"Unused access
  analyzers"** dropdown, confirm button **"Update summary"**. Results grouped under
  **"Unused access findings"**: **Active findings**, **Findings overview**, **Finding
  status** (Active / Archived / Resolved, with a **"Filter displayed data"** dropdown),
  and — organization scope only — **"Accounts with the most findings for unused
  access."**

---

## Users list page

### 1. Default table columns
**Unconfirmed** as an exact ordered list — no fetched source enumerated the full default
column order. Confirmed present: **User name** (identifying column) and **Groups**.

### 2. Additional columns available via Preferences/gear
Gear/settings icon sits above the table, top-right; opens a panel AWS's current
UserGuide page (`id_credentials_finding-unused.html`) calls **"Select visible
columns"** (an AWS Security Blog post independently calls the same feature **"Manage
columns"** — flagged as a wording inconsistency across AWS's own material; treat
"Select visible columns" as more likely current). Confirm button: **"Confirm."**
Confirmed addable columns:
- **Console last sign-in** — date, or **"Never"** (password never used) / **"None"**
  (no password set).
- **Access key last used** — days since last programmatic use, or **"–"** if no keys.
- **Last activity**, **Access key age**, **Password age**, **Access key ID** (with
  Active/Inactive status), **Group count**, **MFA** (enabled + device type: hardware /
  virtual / SMS).

### 5. Actions menu contents / primary buttons
No dropdown "Actions" menu — deletion is a direct top-of-page button. Select the row
checkbox(es) → **"Delete"** at the top of the page → confirmation dialog requires typing
the exact username → **"Delete"** again. Precondition: active access keys must be
deactivated before a user can be deleted. (An older third-party source described a "User
Actions" dropdown with "Delete User" — this conflicts with the current, more recent
official doc and should be treated as outdated.)

### 6. Filters / search
A filter/search box exists (confirmed by analogy with the User groups list, which
explicitly documents filtering "by type, permissions, and group name"); exact
Users-list-specific filter facets are **unconfirmed**.

### 9. Empty state
**Unconfirmed** exact wording. An unverified third-party snippet suggested "There are no
IAM users" — not independently confirmed.

### 10. Create user flow (full step-by-step)
1. Nav → **Users** → **"Create user."**
2. **"Specify user details"** page — field **"User name."** Checkbox (third-party
   corroborated, not found verbatim in an official page): **"Provide user access to the
   AWS Management Console."** If checked:
   - **"Autogenerated password"** or **"Custom password"** radio.
   - Checkbox **"Require password change at the next sign-in."**
   - Button **"Next."**
3. **"Set Permissions"** page — three permission-setting options:
   - **"Add user to group"** (recommended) — inline **"Create group"** opens a
     **"Create user group"** dialog: field **"User group name,"** a searchable
     **Permissions policies** checklist, button **"Create user group."**
   - **"Copy permissions from existing user."**
   - **"Attach policies directly."**
   - Optional: attach a **permissions boundary** policy.
   - Button **"Next."**
4. **Tags** section (optional key-value pairs) — appears to live inside the review page
   rather than as its own numbered step; not independently confirmed as a separate
   wizard page.
5. **"Review and create"** — verify username/groups/permissions/tags → **"Create
   user."**
6. Post-create: success notification with **"View user"** link. If console access was
   granted, a password-reveal dialog offers **"Show"** and **"Download .csv file"**; the
   password cannot be retrieved again after this step.

**No inline "Programmatic access" checkbox** exists in the current wizard (see
cross-cutting note above) — access keys are created afterward from the user's Security
credentials tab via **"Create access key."**

---

## User detail page

Referred to in official docs as the user's **"Summary"** page.

### 3. Tabs
Tab strip order across the page is **not independently confirmed** from a fetched
source; the tabs themselves are confirmed to exist:
- **Permissions** — button **"Add permissions"** → **"Create inline policy"** (confirmed
  choice; whether an inline "Attach policies" choice also appears directly in this menu
  vs. only via the Policies list page's Attach flow is unconfirmed). Removal: select
  policy checkbox(es) → **"Remove"** → confirm **"Remove"** in dialog.
- **Groups** — read-only list of groups the user belongs to.
- **Tags** — buttons **"Add new tag"** (no tags yet) or **"Manage tags"** (tags exist),
  then **"Save changes."**
- **Security credentials** (sentence case in more-recent docs; one older doc uses title
  case "Security Credentials" — treat sentence case as current):
  - **Console sign-in**: **"Enable console access"** / **"Manage console access"** dialog
    with radio **"Reset password,"** **"Autogenerated password"** / **"Custom
    password,"** checkboxes **"Require password change at the next sign-in"** and
    **"Revoke active console sessions,"** confirm button **"Reset password"** (or
    **"Disable access"** to remove entirely).
  - **MFA**: **"Assign MFA device"** wizard — field **"Device name,"** radio
    **"Authenticator app,"** **"Next"** → **"Show QR code"**/**"Show secret key"** →
    fields **"MFA code 1"** / **"MFA code 2"** → **"Add MFA."**
  - **Access keys** (**"Create access key"**), **SSH public keys for AWS CodeCommit**
    (**"Upload SSH public key"**), **HTTPS Git credentials for AWS CodeCommit**
    (**"Generate credentials"** / **"Download credentials"**), **Credentials for Amazon
    Keyspaces** (**"Generate credentials"** / **"Download credentials"**), **X.509
    Signing certificates** (**"Create X.509 Certificate"**).
- **Last Accessed** (a.k.a. legacy "Access Advisor") — table columns **Service**, **Last
  accessed** (values: **"<N> days ago"** or **"Not accessed in the tracking period"**).
  Drilling into a service shows Region + timestamp of management actions.

---

## User groups

### List page
Nav → **"User groups."**
- **1/2. Table columns**: **unconfirmed** — no fetched source gives an ordered column
  list.
- **4. Primary button**: **"Create group."**
- **6. Filters/search**: confirmed — search box filters "by type, permissions, and
  group name."
- **7. Bulk operations**: multi-select delete, with a distinctive confirmation pattern —
  single-group delete requires typing the group name; multi-group delete requires typing
  the *count* followed by the literal words "user groups" (e.g. "3 user groups").

### Group detail page
- **Users** tab — **"Add users"** → select checkboxes → **"Add users."** Removal:
  select checkboxes → **"Remove users."**
- **Permissions** tab — same **"Add permissions"** → **"Create inline policy"** pattern
  as user detail pages.
- **Last Accessed** tab — confirmed present for groups; shows which member last accessed
  a service plus total member attempt count.
- **No Tags tab** — confirmed negative: AWS's own tagging doc states IAM groups cannot
  be tagged ("You can tag most IAM resources, but not groups, assumed roles, access
  reports, or hardware-based MFA devices").

### 10. Create group flow
Single page, no multi-step wizard or review step: nav → **User groups** → **"Create
group"** → field **"User group name"** → inline checklist to add users → inline
checklist to attach policies (with its own search box) → **"Create group."**

---

## Account settings page

Nav → **"Account settings."**

1. **Password policy** section — **"Edit"** button. Radio **"Custom"** vs **"IAM
   default."** Field **"Password minimum length"** (6–128). Checkboxes: "Require at
   least one uppercase letter from the Latin alphabet (A–Z)," "...lowercase letter...
   (a–z)," "Require at least one number," "Require at least one nonalphanumeric
   character ! @ # $ % ^ & * ( ) _ + - = [ ] { } | '." Checkbox + numeric field **"Turn
   on password expiration"** (1–1095 days). Checkbox **"Password expiration requires
   administrator reset."** Checkbox **"Allow users to change their own password."**
   Checkbox + numeric field **"Prevent password reuse"** (1–24). Buttons **"Save
   changes"**, then **"Set custom"** / **"Set default."** IAM default policy (when no
   custom policy set): min length 8, max 128, ≥3 of the 4 character classes, cannot
   match account name/email, never expires.
2. **Security Token Service (STS)** section:
   - **Endpoints** — per-Region table, **STS status** column toggled **Active** /
     **Inactive**, confirm dialog buttons **"Activate"** / **"Deactivate."**
   - **Session Tokens from the STS endpoints** — **Global endpoint** row with
     **"Change"** button → **"Change region compatibility"** dialog, option **"All AWS
     Regions,"** button **"Save changes."**
3. **Unconfirmed**: any other sections (root-user MFA status, account ID display, etc.).

---

## Roles list page

### 1. Default table columns
Confirmed present (order and completeness unconfirmed): **role name** (link column),
**Trusted entities** (service-linked roles show literal **"(Service-linked role)"** in
this column), **Last activity** (days since last use, or **"None"** if unused within the
tracking period).

### 2. Additional columns via Preferences/gear
A 2017 AWS "What's New" post confirms the console "remembers your preferences for table
column selections" on roles/users/policies lists, implying a gear-driven column picker
exists; the specific optional columns are **unconfirmed**.

### 5. Actions menu
No standalone Actions dropdown documented; deletion uses direct top-of-page **Delete**
(see Bulk operations).

### 6. Filters / search
A search field narrows the roles list. Separately, IAM's console-wide **Search** page
(distinct from per-list search) accepts partial names, ARNs, and task phrases like
`create role`, `delete {role_name}`, `edit trust policy for role {role_name}`, `attach
policy to {role_name}`; results carry type icons (user = portrait outline, group =
multiple portraits, role = magic wand, policy = document, task = star, delete = red X).

### 7. Bulk operations
Select checkbox(es) → **"Delete"** at top of page → confirmation dialog shows
last-accessed info per selected role → type the role name into a text field → **"Delete"**
again.

### 9. Empty state
**Unconfirmed** exact wording.

---

## Role detail page

### Summary header (above the tabs)
Role name, ARN, **Maximum session duration** (1–12 hours, or **"Custom duration"** in
seconds), **Description** — each editable via **"Edit"**, saved via **"Save changes."**

### 3. Tabs
| Tab | Contents |
|---|---|
| **Permissions** | Attached managed + inline policies. **"Add permissions"** → **"Attach policies"** or **"Create inline policy."** Removal via row checkbox → **"Remove."** |
| **Trust relationships** | The role's assume-role trust policy; editable. |
| **Last Accessed** (a.k.a. legacy "Access Advisor") | Per-service table: **Service** / **Last accessed** (**"<N> days ago"** or **"Not accessed in the tracking period"**); drill-down to per-action detail. ~400-day trailing window. |
| **Revoke sessions** | Button **"Revoke active sessions."** Confirm checkbox: **"I acknowledge that I am revoking all active sessions for this role"** → **"Revoke active sessions"** again. Attaches inline policy `AWSRevokeOlderSessions`. Not available for service-linked roles. |
| **Tags** | **"Add new tag"** / **"Manage tags"** → **"Save changes."** |

---

## Policies list page

### 1. Default table columns
**Unconfirmed** full ordered list; confirmed a **Type** dimension distinguishes **AWS
managed** vs **Customer managed** (API `Scope`: `AWS` vs `Local`).

### 6. Filters / search
Search box filters by policy name. A policy-type filter (AWS managed / Customer
managed) exists; exact control shape (dropdown vs. tabs vs. checkboxes) is
**unconfirmed** — third-party sources disagree.

### 5. Actions menu contents
Confirmed items: **Attach**, **Detach** (both act on the single **radio-button**-selected
policy — note this is single-select via radio button, unlike the Roles list's
checkbox multi-select). **Generate CloudFormation template** and **Import policy** live
in the policy *editor's* Actions menu (create/edit context), not the list page. Whether
the list page's Actions menu has further items (Delete, Clone) is **unconfirmed**.

### 7. Bulk operations
Single-select only (radio button) for Attach/Detach — no multi-policy bulk action
confirmed.

---

## Policy detail page

### 3. Tabs
- **Permissions** — toggle **Summary** / **JSON**. Summary table columns: **Service**,
  **Access level** (Full access / Full / Limited, sub-categorized List/Read/
  Write/Permission management/Tagging), **Resource** (Multiple / All resources /
  specific ARN), **Request condition** (None / a condition string / Multiple). Search
  box to filter the summarized service list. **"Show remaining services"** toggle
  reveals implicitly-denied services. Inline warnings for edge cases: "No resources are
  defined.", "One or more actions do not have an applicable resource.", "One or more
  resources do not have an applicable action.", "One or more actions do not have an
  applicable condition.", "One or more conditions do not have an applicable action."
- **Policy versions** — checkbox-select a version → **"Set as default."** Up to 5
  versions retained for customer-managed policies; a 6th save prompts deletion of an old
  non-default version.
- **Entities attached** — houses **"Attached as a permissions boundaries"** section:
  **"Set this policy as a permissions boundary,"** **"Change,"** **"Remove boundary."**
  *(Whether this is the same tab colloquially called "Policy usage," or a separate tab
  alongside it, is **unconfirmed**.)*
- **Tags** — **unconfirmed** exact confirmation for policy detail pages specifically
  (pattern matches Users/Roles Tags tabs elsewhere in IAM).

---

## Create policy flow

Entry: Nav → **Policies** → **"Create policy."** Editor choice: **JSON** or **Visual**
(default tab unconfirmed) — or **Import** via **Actions → Import policy** from either.

1. **Visual editor path**:
   - **Select a service** (searchable, one service per permission block; **"Add more
     permissions"** for additional blocks).
   - **Actions allowed** — checkbox for all actions; add specific action names
     (wildcards `*` allowed); select an **Access level** group (Read/Write/List/etc.) or
     expand for individual actions. Toggle **"Switch to deny permissions."**
   - **Resources** — locked to "all resources" if the action doesn't support
     resource-level perms; otherwise **"Add ARNs,"** **"Any in this account,"** or
     **"All."**
   - **Request conditions - *optional*** — checkboxes for common conditions, or
     **"Add another condition"** (**Condition Key**, **Qualifier**, **Operator**,
     **Value**, multi-value via **"Add,"** commit via **"Add condition"**). Conditions
     within a block AND together; values within a condition OR together.
2. **JSON editor path** — direct text editing with live syntax + IAM Access Analyzer
   advisory validation.
3. Note (verbatim): *"You can switch between the Visual and JSON editor options
   anytime. However, if you make changes or choose Next in the Visual editor, IAM might
   restructure your policy to optimize it for the visual editor."*
4. **"Next"** → **"Review and create"** page — fields **Policy Name**, **Description**
   (optional), read-only permissions summary; optional tags. → **"Create policy."**

---

## Create role flow

Entry: Nav → **Roles** → **"Create role."** Wizard's jump-back points are literally
labeled **"Step 1: Select trusted entities"** and **"Step 2: Add permissions"**; a third
"Step 3: Name, review, and create" label appears in third-party tutorials but was not
found verbatim in official docs (functionally accurate, label **unconfirmed**).

### Trusted entity type (5 confirmed options, exact labels)
1. **AWS service** → **Service or use case** dropdown.
2. **AWS account** → **This account** / **Another AWS account** (+ **Account ID**
   field); checkboxes **"Require external ID"**, **"Require MFA."**
3. **Web identity** → **Identity provider** dropdown (**Login with Amazon**,
   **Facebook**, **Google**, **Amazon Cognito**, or a registered custom OIDC provider,
   e.g. GitHub Actions / HCP Terraform); field labels vary by provider (**Application
   ID**, **Audience**, **Identity Pool ID**, plus provider-specific fields like **GitHub
   organization**/**GitHub repository**/**GitHub branch**). Optional **"Condition
   (optional)"** → **"Add Condition."**
4. **SAML 2.0 federation** → **Select a SAML provider** dropdown; access-level radio
   **"Allow programmatic access only"** vs **"Allow programmatic and AWS Management
   Console access"**; console-access path adds **Sign-in endpoints** (**Regional
   endpoints** / **Non-regional endpoint**, **Regions** multi-select, **"Sign-in URLs to
   include unique identifiers"** toggle).
5. **Custom trust policy** → raw JSON text box, live-validated.

### Common steps (all paths converge)
6. **"Next"** → **Permissions policies** — searchable checklist of managed/customer
   policies, or **"Create policy"** (opens in new tab). Optional **Permissions
   boundary** section (checkbox **"Use a permissions boundary to control the maximum
   role permissions"** + policy picker).
7. **"Next"** → **Role name** field (editability varies by trusted-entity path — fully
   AWS-defined, prefix-only, or free text). Case-insensitive for uniqueness. Cannot be
   edited after creation. Optional **Description**. **"Edit"** links back to Step 1/Step
   2. Optional tags.
8. Review → **"Create role."**

---

## Identity providers

### List page / entry point
Nav → **"Identity providers."** Button: **"Add provider."** Default table columns
**unconfirmed** (a **Valid until** date is confirmed to render for SAML providers
specifically).

**Configure provider** step: radio choice **SAML** vs **OpenID Connect.**

### SAML path
1. Provider name field (exact literal label **unconfirmed**, likely **Provider name**).
2. **Metadata document** → **"Choose file"** (upload IdP SAML metadata XML).
3. Optional **SAML encryption** → **"Choose file"** (`.pem` private key) + checkbox
   **"Require encryption."**
4. Optional **"Add tags"** section, **"Add tag"** button.
5. Review → **"Add provider."** **Valid until** date auto-set by IAM at creation time.
6. Detail page's **SAML encryption** tab supports key rotation: **"Add new key,"**
   **"Choose file,"** **"Add key"**; old keys removed via **"Remove"** under **"Private
   keys for SAML decryption."**
7. Delete: select provider's **radio button** on list page → **"Delete"** → type the
   literal word `delete` to confirm → **"Delete."**

### OIDC path
1. **Provider URL** (must start with `https://`, no port, case-sensitive, unique per
   account).
2. **Audience** (app's client ID; uses `azp` claim value if present in the IdP's JWT
   instead of `aud`).
3. Optional **"Add tags"** / **"Add tag."**
4. Review → **"Add provider."** IAM auto-derives the intermediate CA thumbprint from the
   IdP's TLS cert (manual thumbprint only as a fallback).
5. Detail page's **Endpoint verification** tab → **Thumbprints** section, **"Manage"** →
   **"Add thumbprint"** / **"Remove"** (min 1, max 5) → **"Save changes."**
6. **Audiences** section: **Actions → Add audience** (min 1, max 100) / **Actions →
   Remove audience** (type literal word `remove` to confirm).
7. Delete: select provider's **checkbox** on list page (note: OIDC uses a checkbox,
   SAML uses a radio button — confirmed asymmetry) → type `delete` → **"Delete."**

---

## CloudTrail — Event History list page

### 1. Default table columns
Per AWS's doc bullet order (exact pixel order not screenshot-verified, but this is the
order AWS's own reference gives): **Event name**, **Event time**, **User name**, **Event
source**, **Resource type**, **Resource name**. Column order **cannot be changed** by
the user; events cannot be manually deleted from Event history.

### 2. Additional columns available via Preferences/gear
Gear icon opens a **Preferences** panel with a **"Select visible columns"** toggle
(confirming more columns exist beyond the 6 defaults), plus: **Page size** (10/25/50),
**Wrap lines**, **Striped rows**, **Event time display** (UTC vs. local time zone — UTC
is default). Confirm button: **"Confirm."** The exact set of additional toggleable
columns is **unconfirmed**.

### 3. Tabs
None on this page. **Insights** events live on a separate sibling nav item
("Insights"), not a tab within Event history.

### 4. Primary buttons
**"Create Athena table"** and **"Download events"** (opens a choice of **"Download as
CSV"** / **"Download as JSON"**).

### 5. Actions menu contents
No Actions/"..." dropdown documented anywhere on this page (confirmed absence, not
merely unconfirmed presence).

### 6. Filters / search
See "CloudTrail Filters" section below. Default page-load state has a pre-applied
attribute filter (label inconsistently "Read only"/"Read-only" in AWS's own docs) set to
**false**; removable via the **X** on the filter chip. Hard constraint (verbatim): *"You
can only apply one attribute filter and a time range filter. You cannot apply multiple
attribute filters."*

### 7. Bulk operations
Row checkboxes allow selecting **up to five events** for a **"Compare event details"**
side-by-side table. Exact trigger control (auto-appearing vs. a labeled button) is
**unconfirmed.**

### 8. Row-level affordances
Choosing the **event name** opens the event detail page. Pagination controls are the
literal glyphs **`<`** / **`>`** (not "Previous"/"Next" text).

### 9. Empty state
**Unconfirmed** exact wording; AWS states only that "the results list is empty" with no
matches.

### 10. Create flow
**"Create Athena table"** opens a dialog: **Storage location** (S3 bucket dropdown) →
**"Create table."** Default table name derives from the bucket name.

---

## CloudTrail — Event detail page

### 3. Tabs
None documented for a standard management event (unlike Insights events, which do have
**Attributions** / **CloudTrail events** / **Insights event record** tabs — Insights-only).
A standard event's detail page is a single scrolling page with, in order: **"Resources
referenced"** (table) then **"Event record"** (raw JSON, further down the page).
**Unconfirmed** whether a Summary/JSON toggle exists distinct from the Event record
block for standard events.

### 8. Row-level affordances
In **Resources referenced**: some entries link out to that resource's own console page.
An **AWS Config resource timeline** icon jumps to AWS Config for that resource (grayed
out if Config isn't recording that resource type). Unlinkable resources show the literal
text **"Link not available."** Breadcrumb **"Event history"** returns to the list.

### Event record — confirmed top-level JSON fields
`eventVersion, eventTime, userIdentity, eventSource, eventName, awsRegion,
sourceIPAddress, userAgent, errorCode, errorMessage, requestParameters,
responseElements, additionalEventData, requestID, eventID, eventType, apiVersion,
managementEvent, readOnly, resources, recipientAccountId, serviceEventDetails,
sharedEventID, vpcEndpointId, vpcEndpointAccountId, eventCategory, addendum,
sessionCredentialFromConsole, eventContext, edgeDeviceDetails, tlsDetails`.

---

## CloudTrail — Filters (lookup attributes + time range)

### 6. Lookup attributes dropdown — full confirmed set
AWS's docs state exhaustively: *"Lookup supports the following attributes for
management events: Amazon Web Services access key, Event ID, Event name, Event source,
Read only, Resource name, Resource type, and User name."* That's **8 options**:

1. **AWS access key**
2. **Event ID**
3. **Event name**
4. **Event source** — offers a scrollable value picker of event sources, not free text.
5. **Read only**
6. **Resource name**
7. **Resource type**
8. **User name**

This list is confirmed as AWS's alphabetical reference ordering, not necessarily the
literal on-screen dropdown order (screen order **unconfirmed**). **Time range is a
separate control, not a 9th lookup-attribute option.**

Interaction: choose an attribute → type/choose an exact value (partial-value filtering
is not supported: *"CloudTrail can't filter on a partial value"*). Remove via the **X**
on the filter chip.

### Time range picker — full confirmed detail
- **Relative range** — presets **30 minutes, 1 hour, 12 hours, 1 day**, plus
  **Custom**.
- **Absolute range** — specific start/end date-time, toggle **local time zone** vs
  **UTC**.
- Remove: **"Clear and dismiss."**
- Data ceiling: Event history only retains the **last 90 days**.

---

## Billing home (Billing and Cost Management dashboard)

Widget dashboard, not tab-structured. Widgets resettable via **"Reset layout"** →
confirm **"Reset."** Confirmed widgets:
- **Cost summary** — Month-to-date cost, last month's cost for the same period, total
  forecasted cost for the current month, last month's total cost; **"View bill"** link.
  Excludes credits/refunds.
- **Cost monitor** — **Budgets status** (**OK** / **Over budget** / **Setup required**)
  and **Cost anomalies** status (**OK** / **Anomalies detected** / **Setup required**).
- **Cost breakdown** — dropdown to break down last-6-months cost by **Service**, **AWS
  Region**, **Member account** (management accounts only), **Cost allocation tag**,
  **Cost category**; link **"Analyze your costs in Cost Explorer."**
- **Recommended actions** — ranked critical → advisory → informational, default up to 4
  shown, **"Load more actions,"** dismiss via **X** (non-critical dismissals reappear
  after 7 days).
- **Cost allocation coverage** — unallocated cost % vs. cost categories/allocation tags
  (up to 5 each).
- **Savings opportunities** — sourced from Cost Optimization Hub.
- **Top trends** — top 10 month-over-month cost variations by absolute dollar
  difference; link **"View your cost trends in Cost Explorer."**

Empty state: not documented; Cost Explorer auto-enables on first visit and can take up
to 24 hours to populate data.

---

## Bills page

*(New-console tab names — see cross-cutting note on the "old console" variant above.)*

### 3. Tabs
- **Charges by service** — sortable by service name or amount (USD); filterable by
  service name and Region; row **`+`** expands to per-Region charges.
- **Charges by account** *(AWS Organizations management account only)* — sortable by
  account ID/name or amount; filterable by account ID/name; **`+`** expands to
  service-provider then service/Region charges.
- **Invoices** — per service provider for the selected billing period: charge type,
  invoice date, total (USD). **Invoice ID** link opens/downloads a PDF. Per-row
  vertical-ellipsis menu (see Actions below).
- **Savings** — savings from Savings Plans, credits, other discounts, by savings type →
  per-service detail.
- **Taxes by service** — pre-tax, tax, post-tax charge per taxed service; sortable by
  service name, post-tax, pre-tax, or tax (USD); filterable by service name.

### Non-tab sections
**AWS bill summary** (**Bill status**: **Issued** or **Pending**), **Payment
information** (service provider, charge types, document types, invoice IDs, payment
status, payment date, total USD), **Highest cost by service provider**, **Tax Invoices
and Supplemental Documents** (**Invoice ID** links the associated commercial invoice,
**Document ID** downloads PDF).

### 4. Primary buttons
**Billing period** selector; gear/settings icon to customize visible sections
(preferences persist). **"Download all to CSV"** — REMOVED as of **November 1, 2025**;
do not include in a current-generation mock.

### 5. Actions menu (per-invoice, Invoices tab, vertical-ellipsis icon)
**"Download invoice,"** **"Update company and address for account,"** **"Update
purchase order"** → confirm **"Update and reprocess"**; tracked via an **Update status**
column.

---

## Cost Explorer

### Chart controls
- **Chart style**: **Bar**, **Stack**, **Line.**
- **Granularity**: **Daily**, **Monthly**, **Hourly** (Hourly is opt-in via Preferences,
  management account only, shows previous 14 days) → **"Apply."**
- **Time range**: calendar **From**/**To**, or **Auto-select** presets — historical:
  **Custom, 1D, 7D, Current Month, 3M, 6M, 1Y, MTD, YTD**; forecasted: **Custom, +1M**
  (Daily only), **+3M** (Daily or Monthly), **+18M** (Monthly only).
- **Group by** — no default grouping; disables forecasting once applied; also drives the
  data table grouping below the chart.
- **Filters panel** — confirmed dimension list (shared with Group by per AWS's "Filter
  and group options" doc structure): `API operation, Availability Zone (AZ), Billing
  entity, Charge type, Include all, Instance type, Legal entity, Linked account,
  Platform, Purchase option, Region, Resources, Service, Tag, Tenancy, Usage type, Usage
  type group`. Workflow: choose a filter → searchable value list → **"Apply filters."**
  AND across dimensions, OR within a dimension.
  - `Charge type` values: Credit, Other out-of-cycle charges, Recurring reservation fee,
    Refund, Reservation applied usage, Savings Plan covered usage, Savings Plan
    negation, Savings Plan recurring fee, Savings Plan upfront fee, Support fee, Tax,
    Upfront reservation fee, Usage.
  - `Billing entity`: AWS, AWS Marketplace. `Platform`: Linux, Windows. `Tenancy`
    (example): Shared (Default), Dedicated, Host.
- **Forecast** — no separate toggle; activates by selecting a forecast time range;
  unavailable once Group by is applied. Fixed 80% prediction interval (hidden if
  insufficient history). Shown as two flanking lines (line chart) or two lines above the
  bar top (bar chart). Under **Advanced options → Additional data settings**: checkbox
  **"Show forecasted values."**
- **Advanced options**:
  - **Aggregate costs by**: Unblended costs, Amortized costs, Blended costs, Net
    unblended costs, Net amortized costs.
  - **Additional data settings**: Show forecasted values, Show only untagged resources,
    Show only uncategorized resources.
- **Amazon Q integration**: **"Ask question"** button (auto-suggested prompts for
  forecast ranges); **"Analyze with Amazon Q"** button on cost reports.

### Default reports
Cost/usage: **AWS Marketplace, Daily costs, Monthly costs by linked account, Monthly
costs by service, Monthly EC2 running hours costs and usage.** Reserved Instance:
**RI utilization reports, RI coverage reports** (Daily/Monthly views; filters
Availability Zone, Instance Type, Linked Account, Platform, Region, Scope (EC2),
Tenancy (EC2); **Display Options** toggle **"Show target line on chart"**).

### 3. Navigation / 4. Primary buttons
Left nav (exact icon labels unconfirmed): dashboard, default reports, saved reports,
reservations info, reservation recommendations. Dashboard top: **Month-to-date costs**,
**Forecasted month end costs**, **"{{month}} trends"** with **"View all trends"** link,
**"Explore costs"** button (from the daily-cost graph → full report page). Report page:
**"Analyze with Amazon Q,"** **"Ask question,"** save/download-CSV controls (exact
save-dialog label unconfirmed).

---

## Budgets page (list) + Create budget flow

### 1. Default table columns
Content confirmed (order/verbatim header row unconfirmed): current costs/usage
incurred, budgeted costs/usage, forecasted costs/usage, % of costs/usage vs. budgeted,
% of forecasted vs. budgeted, billing-view health status (**HEALTHY** / **UNHEALTHY**,
sub-reasons `BILLING_VIEW_NO_ACCESS`, `INVALID_FILTER`).

### 4. Primary buttons
**"Create budget."**

### 7. Bulk operations
Multi-select checkboxes open a split-view side panel for cross-budget comparison;
selecting exactly one enables prev/next navigation buttons (hidden for multi-select).

### 8. Row-level affordances
Budget **name** link opens budget details: **Current vs. budgeted**, **Forecasted vs.
budgeted**, **Alerts**, **Details** (amount/type/period/params), **Budget history** tab
(chart + table — QUARTERLY shows last 4 quarters, MONTHLY last 12 months, not available
for ANNUAL; **"Download as CSV"**), **Alerts** tab (**Definition** field describing
threshold conditions).

### 10. Create budget flow
Two entry paths under **Budget setup**: **"Use a template (simplified)"** (1 page) or
**"Customize (advanced)"** (5 steps).

**Template path** — exact template names: **Zero spend budget** (notifies past AWS Free
Tier limits), **Monthly cost budget**, **Daily Savings Plans coverage budget**, **Daily
reservation utilization budget**. **Template settings** → **Custom** to edit further, or
**JSON** to download for CLI/CloudFormation.

**Customize (advanced) — Budget types** (4 top-level, 2 with sub-types):
- **Cost budget**
- **Usage budget**
- **Savings Plans budget** → **Savings Plans utilization** / **Savings Plans coverage**
- **Reservation budget** → **Reservation utilization** / **Reservation coverage**

**Full steps (Cost budget; Usage budget near-identical, differs only at step 3):**
1. **Budgets** → **"Create budget"** → **Budget setup**: **Customize (advanced)** →
   **Budget types** → select type → **"Next."**
2. **Details** — field **Budget name** (unique; allowed chars `A-Z a-z space _.:/=+-%@`).
3. *(Usage budget only)* **Choose what you're budgeting against** → **Usage type
   groups** or **Usage types.**
4. **Set budget amount**:
   - **Period**: Daily, Monthly, Quarterly, Annually, Custom.
   - **Budget renewal type**: Recurring budget or Expiring budget.
   - Start/end date or period (UTC).
   - **Budgeting method**: Fixed, Planned, Auto-adjusting.
   - Budgeted amount field.
5. **Budget scope** (optional) — **Filters** → **"Add filter"** (dimension list depends
   on budget type; **Linked account** filter unavailable from within a linked account).
   **Advanced options** (Cost budget only) — cost-aggregation radio: Use blended costs,
   Use unblended costs, Use net unblended costs, Use amortized costs, Use net amortized
   costs.
6. **"Next"** → **Add an alert threshold** — **Threshold** field + toggle
   **Absolute value** / **% of budgeted amount**; toggle **Actual** / **Forecasted.**
7. **Notification preferences** (optional) — **Email recipients** (comma-separated, max
   10), **Amazon SNS Alerts** (ARN field; triggers a confirmation email subject-lined
   "AWS Notification - Subscription Confirmation," requiring **"Confirm subscription"**),
   **AWS Chatbot Alerts** (configured externally).
8. **"Next"** → optional **Attach actions** (automated AWS Budgets action).
9. **"Next"** — at least one of {email recipient, SNS topic, budget action} is required.
10. Review → **"Create budget."**

---

## Payment methods page

Nav-pane label: **"Payment preferences"** (`#/paymentpreferences`).

### 4. Primary buttons
**"Add payment method."**

### 5. Row-level actions
Per method: **"Set as default,"** **"Edit,"** **"Verify"** (unverified cards),
**"Delete"** (blocked while default — must set another default first; confirm dialog
**"Delete payment method?"** → **"Delete"**).

### 6. Other controls
**Default payment preferences** → **"Edit"** to change **Payment currency** and
**Billing contact email**, saved via **"Save changes."**

### 1. Table columns
**Unconfirmed** exact header row — AWS's docs describe data shown (default status,
expiration, verification status) in prose, not a confirmed header list.

### 10. Add payment method flow
**"Add payment method"** → card info → optional **"Set as default payment method"** →
billing address → optional tags (up to 50 key-value pairs) → review → **"Add payment
method."**

---

## Tax settings page

Nav-pane label: **"Tax settings"** (under Preferences and Settings).

### 3. Tabs
- **Tax registrations** — table of TRNs; row-select → **"Manage tax registration"** →
  **"Edit"** or **"Delete TRN"** (confirm dialog **"Delete tax registration"** →
  **"Delete"**); **"Enable tax settings inheritance"** control (confirm → **"Enable"**).
- **Tax exemptions** — table of exemptions (requires specific IAM permission to view);
  row-select → **"Manage tax exemption"** → **"Add tax exemption"** (choose accounts →
  exemption type + jurisdiction → upload certificate documents → review → **"Submit"**).
  Approved exemptions show an **Active** validity period.

Fields referenced: Business legal name, Tax address, Tax registration number, Special
exemptions. Table columns beyond these are **unconfirmed**.

---

## Free tier page

Nav-pane label: **"Free Tier."**

Shows current-month activity by service, usage type, and Region. Home-page
**Recommended actions** widget surfaces Free Tier items past 85% of a service's limit.
Auto-email alert to the root account holder at 85% of any Free Tier limit; recipient
changeable via **Preferences → Billing preferences → Alert preferences → "Edit"** →
enter email → **"Update"**; opt toggle: checkbox **"Receive AWS Free Tier alerts."**
Auto-enabled for individual accounts; Organization management accounts must opt in.
Additional 100%-limit tracking layerable via a **zero spend budget** usage-budget
template. Offering types: **Short-term trial** and **Always Free.**

### 1. Table columns
**Unconfirmed against an AWS-first-party source.** Third-party/community material
(not independently verified) describes **Service / Usage / Limit / Forecasted** plus a
status/alert icon — treat as best-effort, not authoritative.

---

## Cost allocation tags page

Nav-pane label: **"Cost allocation tags."**

### 3. Sections
- **AWS-generated cost allocation tags** — currently just `createdBy` (auto-populated
  only in specific Regions); select → **"Activate"** (up to 24h to apply); management
  account only. Also covers AWS Marketplace ISV vendor tags (`aws:marketplace:isv:`
  prefix).
- **User-defined cost allocation tags** — select tag key(s) → **"Activate."**
  Deactivating a key affects all its values. Bulk activation also via the
  `UpdateCostAllocationTagsStatus` API.
- Special case: **`awsApplication`** tag (AppRegistry) is auto-activated; can be
  manually deactivated/reactivated; doesn't count against the cost-allocation-tag quota.

### 2. Confirmed metadata columns
**Last updated date** (last activation/deactivation date; blank if never activated) and
**Last used month** (last month associated with any resource; **"-"** if never used).
A **Tag key** column and an active/inactive **Status** indicator almost certainly exist
given the workflow, but exact header text is **unconfirmed.**

### 7. Bulk operations
Confirmed: multi-select tag keys → **"Activate"** applies to all at once.

### Access constraint
Only the organization's management account, or a standalone (non-member) account, can
access this page.

---

## Sources

### IAM
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-started-workloads.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_list.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_list.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_create.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_delete.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_add-remove-users.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_remove.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_admin-change-user.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage-attach-detach.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_last-accessed-view-data.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_finding-unused.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_users.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/console_controlling-access.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-dashboard.html
- https://aws.amazon.com/blogs/security/introducing-the-redesigned-iam-console/
- https://aws.amazon.com/blogs/security/newly-updated-features-in-the-aws-iam-console-help-you-adhere-to-iam-best-practices/
- https://docs.netgate.com/pfsense/en/latest/solutions/aws-vpn-appliance/creating-an-iam-user.html
- https://oneuptime.com/blog/post/2026-02-12-create-an-iam-user-in-aws/view
- https://oneuptime.com/blog/post/2026-02-12-create-iam-groups-and-add-users/view
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-console.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_saml.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-custom.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_understand-policy-summary.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-versioning.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-settings.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_roles.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_delete.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage.html
- https://docs.aws.amazon.com/IAM/latest/UserGuide/console_search.html
- https://aws.amazon.com/blogs/security/new-tabbed-organization-of-your-resources-in-the-iam-console/

### CloudTrail
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/tutorial-event-history.html
- https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-ct.html
- https://github.com/awsdocs/aws-cloudtrail-user-guide/blob/master/doc_source/view-cloudtrail-events-console.md
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-insights-events-console.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-events.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html
- https://aws.amazon.com/about-aws/whats-new/2017/12/aws-cloudtrail-enhances-event-history-view-and-search

### Billing / Cost Management
- https://docs.aws.amazon.com/cost-management/latest/userguide/view-billing-dashboard.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-modify.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/create-usage-budget.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-payment-method.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-account-payment.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-view.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-forecast.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-advanced.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-reports.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-default-reports.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/custom-budgets.html
- https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cc.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activate-built-in-tags.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-tags-timeline.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/aws-tags.html

### Notably unresolved (flagged in-line above, not resolved by any fetched source)
- Exact default column order for: Users list, Roles list, Policies list, Payment
  methods, Free tier usage table, Cost allocation tags, Budgets list header row.
- Exact literal empty-state copy across all list pages in scope.
- Whether IAM policy detail pages have a distinct "Policy usage" tab separate from
  "Entities attached."
- Exact on-screen visual order of CloudTrail's 8 lookup-attribute dropdown options
  (member set of 8 is confirmed; order is not).
- Whether a "Compare event details" trigger is an auto-appearing panel or a discrete
  button, on the CloudTrail Event history page.
