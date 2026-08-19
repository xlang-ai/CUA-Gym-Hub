# AWS Management Console — EC2 Storage & Networking Surface Reference Spec

Scope: Volumes, Snapshots, Security Groups, Key Pairs, Elastic IPs, Load Balancers, Target Groups, Auto Scaling Groups.

Methodology note: This spec is built from AWS's official User Guide procedural documentation (fetched directly, cited per page) plus targeted web search. AWS's User Guides describe *procedures* (what field to fill, in what order, with what default) far more reliably than they enumerate *exact default table column sets*, which AWS's docs rarely inventory exhaustively and which can drift release to release. Every item below is either (a) directly sourced from a fetched AWS doc page (with citation), (b) inferred from an API field / CLI output that the console is documented to expose 1:1 in a named column (e.g. "State" column ← `describe-volumes` `State` field, per the volume-states doc), or (c) marked **unconfirmed** where no primary source was found. Do not treat "unconfirmed" items as ground truth.

---

## Volumes

### 1. Default table columns
Confirmed from docs: **Name**, **Volume ID**, **Type**, **Size**, **IOPS**, **Throughput**, **Snapshot** (source snapshot ID), **Created** (create time), **Availability Zone**, **State**, **Encryption type** — these correspond 1:1 to fields the console is documented to expose (`VolumeId`, `VolumeType`, `Size`, `Iops`, `Throughput`, `SnapshotId`, `CreateTime`, `AvailabilityZone`, `State`, `Encrypted`) per the `describe-volumes` output shown in the AWS EBS user guide, and the doc explicitly states: "You can view the volume state in the **State** column on the **Volumes** page in the console." Exact left-to-right order across all ~10-12 columns: **unconfirmed** (AWS does not publish an ordered column list).

### 2. Additional columns via Preferences/gear
Not enumerated in any fetched doc. Likely candidates by analogy with the exposed API fields not in the default set (Volume type-specific: Multi-Attach enabled, KMS key ID, Fast snapshot restore, Tags columns) — **unconfirmed**.

### 3. Tabs
Volume detail view: no tab strip documented explicitly in the fetched pages; volume detail is described as a single info panel/split-pane (see item 9). **Unconfirmed** whether a Tags / Monitoring tab exists on the volume detail split pane.

### 4. Primary buttons
**Create volume** (confirmed — "In the navigation pane, choose Volumes and then choose Create volume.", EBS user guide, ebs-creating-volume.html).

### 5. Actions menu contents
Confirmed via cross-references in the EBS user guide table of contents: Create volume, Attach volume, Detach volume, Modify volume, Delete volume, Create snapshot, Manage tags. Exact nesting/labels beyond this: **unconfirmed**.

### 6. Filters / search
Confirmed: "you can filter your volumes using tags and volume attributes. Choose the filter field, select a tag or volume attribute, and then select the filter value." (ebs-describing-volumes.html). Exact list of filterable attributes: **unconfirmed** (general EC2 filtering guide exists at Using_Filtering.html but specific volume attribute list was not retrieved).

### 7. Bulk operations
Not documented explicitly for multi-select on the Volumes page. Amazon EC2 Global View (separate console) aggregates volume counts across Regions but is a read-only summary tool, not a bulk-action surface (ebs-describing-volumes.html, "Amazon EC2 Global View" section).

### 8. Row-level affordances
Confirmed: "To view more information about a volume, choose its ID." — clicking the Volume ID navigates to/opens volume detail (ebs-describing-volumes.html).

### 9. Empty state
Not documented. **Unconfirmed.**

### 10. Create/edit flow — Create Volume
Confirmed exact field order and behavior (ebs-creating-volume.html, "To create a volume" console procedure):
1. **Outpost ARN** — Outpost customers only.
2. **Volume type** — dropdown of available EBS volume types.
3. **Size** (GiB).
4. **IOPS** — shown only for `io1`, `io2`, `gp3`.
5. **Throughput** (MiB/s) — shown only for `gp3`.
6. **Availability Zone**.
7. **Snapshot ID** — default "Don't create volume from a snapshot"; otherwise select a snapshot.
8. **Volume initialization rate** (MiB/s) — optional, appears only if a snapshot is selected.
9. **Enable Multi-Attach** — checkbox, `io1`/`io2` only.
10. **Encryption** — checkbox/state, auto-forced on if account has encryption-by-default enabled or an encrypted snapshot is selected; otherwise optional. KMS key selectable when encryption is on.
11. **Tags** — optional, "Add tag" repeatable key/value pairs.
12. **Create volume** button.

Defaults confirmed: **`gp3` is the default volume type in the console** (CLI/API default is `gp2` — console differs from CLI default). Volume only reaches usable state after entering `available`.

Validation/business rules confirmed:
- Volume must be created in the same Availability Zone as any instance it will attach to.
- Encryption state table (6 cases) governs whether the Encryption toggle is forced-on, forced-off, or optional, depending on (a) account's "encryption by default" setting and (b) whether the source snapshot is unencrypted/encrypted/absent.
- Windows volumes > 2048 GiB should use GPT partition tables (advisory, not enforced by the form).

---

## Snapshots

### 1. Default table columns
Not enumerated exhaustively in fetched docs. Confirmed individual fields the console is documented to expose: **Snapshot ID**, **Volume ID**, **Volume size** (size of the volume that would be created from the snapshot), **Description**, **Status** (`pending`/`completed`/`recoverable`/`recovering`/`error`), **Started** (start time), **Encrypted**. Also documented: **Full snapshot size** field (shown on detail, not confirmed as a list column) — "shows the full size of the snapshot, in bytes... not the incremental size." Exact column order: **unconfirmed**.

### 2. Additional columns via Preferences/gear
**Unconfirmed** — no fetched doc enumerates this.

### 3. Tabs
Confirmed top-level view toggle (not a tab strip on a detail page, but a page-level filter): **"Owned by me"** — "in the top-left corner of the screen, choose Owned by me" to restrict to snapshots you own (ebs-describing-snapshots.html). Detail-page tab strip (e.g. Details/Permissions/Tags): **unconfirmed**.

### 4. Primary buttons
**Create snapshot** (implied by ebs-creating-snapshot.html topic structure: "Create snapshot of a volume" / "Create multi-volume snapshots").

### 5. Actions menu contents
Not enumerated exhaustively. Confirmed related capabilities from the broader EBS guide TOC: Create volume (from snapshot), Copy snapshot, Modify permissions, Delete snapshot, Manage tags. Recycle Bin integration confirmed: deleted snapshots matching a Recycle Bin retention rule enter `recoverable` state rather than being purged immediately (ebs-describing-snapshots.html, "Snapshot states").

### 6. Filters / search
Confirmed: filterable via tags and other snapshot attributes through a Filter field; documented example — select **Encryption**, enter `true` to show only encrypted snapshots (ebs-describing-snapshots.html).

### 7. Bulk operations
**Unconfirmed.**

### 8. Row-level affordances
Confirmed: "To view more information about a specific snapshot, choose its ID in the list."

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flow — Create Snapshot
Exact console field list not retrieved verbatim from a fetched page (ebs-creating-snapshot.html is an overview/index page, not the procedure page itself — the procedure lives at ebs-create-snapshot.md which was not successfully fetched). From search-corroborated content plus the overview page:
- **Resource type**: Volume (or Instance, for multi-volume snapshots of all/subset of attached volumes).
- **Volume ID** (or **Instance ID** for the multi-volume flow) — select the source.
- **Description** — optional, up to 255 characters, becomes a property on the resulting snapshot.
- **Copy tags from source** — checkbox (search-indicated; not fetched from primary doc — treat as **unconfirmed** exact wording).
- **Tags** — optional key/value pairs.

Confirmed behavior/business rules:
- Snapshot creation is asynchronous: enters `pending` immediately, transitions to `completed` once all data is transferred to S3; can take hours.
- Encryption is inherited automatically from the source volume — unencrypted volume → unencrypted snapshot; encrypted volume → snapshot encrypted with the same KMS key. (To get an encrypted snapshot from an unencrypted volume, you must snapshot first, then copy the snapshot with encryption enabled.)
- Snapshots must be created in the same Region as the source (or same Local Zone/Outpost/parent Region for Local Zone or Outpost resources).
- Recommended best practice surfaced by the console/docs: pause writes or unmount the volume before snapshotting; stop the instance first if snapshotting a root volume.
- Limits exist on concurrent `pending` snapshots per volume type (quota-based, not a hard form validation).

---

## Security Groups

### 1. Default table columns
Not enumerated exhaustively in fetched docs. **Unconfirmed** exact ordered list. (Commonly cited unverified candidate set: Name, Security group ID, Security group name, VPC ID, Description, Owner — flagged unconfirmed, not to be treated as ground truth.)

### 2. Additional columns via Preferences/gear
**Unconfirmed.**

### 3. Tabs
**Confirmed, high confidence** — the security group detail view has a tab strip including at minimum:
- **Inbound rules**
- **Outbound rules**
- **Tags** (rule-level tags manageable via "select the check box for the rule and then choose Manage tags")

Source: VPC User Guide's `working-with-security-group-rules.html` ("choose Edit inbound rules from Actions or the Inbound rules tab" / "...or the Outbound rules tab") and search-confirmed reference to a Tags tab for rule tag management. A **Details**-style tab (showing group ID/name/description/VPC) likely also exists but was not explicitly documented in fetched pages — **unconfirmed** as a named tab (may instead be shown in a header region above the tab strip, consistent with other EC2 detail pages).

### 4. Primary buttons
**Create security group** (confirmed, `creating-security-group.md`: "Choose Create security group.").

### 5. Actions menu contents
Confirmed items, from `working-with-security-group-rules.html`:
- **Edit inbound rules**
- **Edit outbound rules**
- **Manage tags** (rule-level, from within the Inbound/Outbound rules tab row selection)

Additional items referenced elsewhere in the EC2 Security Groups guide TOC (`ec2-security-groups.html` topic list) though not individually fetched in full: **Change security groups** (associate/disassociate from an instance), **Delete security group**. Exact Actions-menu nesting/order beyond these: **unconfirmed**.

### 6. Filters / search
**Unconfirmed** for the Security Groups list specifically (Volumes/Snapshots pages document a Filter field; Security Groups very likely has an analogous one, but no fetch confirmed its exact attribute list).

### 7. Bulk operations
**Unconfirmed.**

### 8. Row-level affordances
**Unconfirmed** explicitly, but by strong analogy with Volumes/Snapshots (click ID to open detail) this is near-certain; not independently confirmed via a fetched security-group-specific doc.

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flows

**Create security group** — confirmed exact field/step order (`creating-security-group.md`):
1. **Security group name** — free text; cannot be changed after creation.
2. **Description** — free text; cannot be changed after creation.
3. **VPC** — dropdown, select the VPC to associate.
4. **Inbound rules** section — optional at creation; "For each rule, choose Add rule and specify the protocol, port, and source." Worked example given: choose **SSH** for Type, set Source to your IP.
5. **Outbound rules** section — optional; can keep the default rule (allow all outbound) or add specific rules.
6. **Tags** — optional, "Add new tag" repeatable key/value.
7. **Create security group** button.

Confirmed default/business rule: **new security groups start with zero inbound rules** (no inbound traffic allowed until rules are added) and **exactly one default outbound rule allowing all outbound traffic (0.0.0.0/0)**, which can be removed/replaced. (`security-group-rules.html`, "Security group rule basics.")

**Edit inbound / outbound rules (the rule editor)** — confirmed exact mechanics (`working-with-security-group-rules.html`, `security-group-rules.html`):

- Reached via **Actions → Edit inbound rules** (or **Edit outbound rules**), or via the **Inbound rules** / **Outbound rules** tab directly.
- **Add rule** button adds a blank rule row; each row has: **Type**, **Protocol**, **Port range**, **Source** (inbound) / **Destination** (outbound), **Description** (optional, ≤255 chars, allowed charset `a-z A-Z 0-9 space . _ - : / ( ) # , @ [ ] + = ; { } ! $ * `).
- **Type dropdown**: selecting a predefined type auto-fills Protocol and Port range (read-only once selected). To manually enter a port/range you must choose one of the **custom** types: **Custom TCP**, **Custom UDP**, or (for ICMP) **Custom ICMP**, where you additionally choose the ICMP type name from a Protocol-like field and, if applicable, a code name. Exact enumerated list of *all* predefined Type entries (SSH, RDP, HTTP, HTTPS, All traffic, All TCP, All UDP, MySQL/Aurora, PostgreSQL, DNS (UDP/TCP), SMTP, etc.): **not exhaustively enumerated in fetched docs — treat the full menu list as unconfirmed**, though SSH, RDP, HTTP, Custom TCP, Custom UDP, Custom ICMP, Custom Protocol are explicitly named across the fetched/search sources.
- **Source/Destination dropdown options** (confirmed, exact labels, `working-with-security-group-rules.html`):
  - **Custom** — an IPv4 CIDR block, an IPv6 CIDR block, a security group, or a prefix list.
  - **Anywhere-IPv4** — the `0.0.0.0/0` IPv4 CIDR block.
  - **Anywhere-IPv6** — the `::/0` IPv6 CIDR block.
  - **My IP** — the public IPv4 address of your local computer.
  - Console warning shown when Anywhere-IPv4/IPv6 is chosen: *"If you choose Anywhere-IPv4, you allow traffic from all IPv4 addresses. If you choose Anywhere-IPv6, you allow traffic from all IPv6 addresses. It is a best practice to authorize only the specific IP address ranges that need access to your resources."*
- **Editing an existing rule**: you may change protocol, description, and the *value* of the source/destination, but **you cannot change the source/destination type** once set (e.g. a CIDR-block source cannot be switched to a security-group reference — must delete and re-add instead).
- **Delete** — each rule row has its own Delete control.
- **Save rules** — commits changes for the whole edit session (applies to both inbound and outbound editors).
- Rule table components/columns confirmed conceptually (component list, not necessarily 1:1 literal column headers): **Security group rule ID** (system-assigned unique ID, usable via API/CLI to target the rule for modify/delete), **Type**, **Protocol**, **Port range**, **Source**/**Destination**, **Description**.
- Security-group-reference rule mechanics: referencing another SG as source/destination allows traffic between all instances associated with each SG (via private IPs), requires same-VPC or VPC-peering/transit-gateway relationship; referenced SG's own rules are *not* inherited/copied in.
- Rule sizing/quota rule: a CIDR rule = 1 rule toward the per-SG quota; a security-group-reference rule = 1 rule regardless of referenced group size; a customer-managed prefix-list rule counts as the prefix list's max size; an AWS-managed prefix-list rule counts as that list's "weight."
- **Stale rules**: a rule referencing a security group in a peered/shared VPC becomes "stale" if the referenced SG or the peering connection is deleted; stale rules can be deleted like any other rule.

---

## Key Pairs

### 1. Default table columns
**Unconfirmed** exhaustive list. Documented individual fields the console is known to persist/display for a key pair: Name, Key pair ID (implied — CloudFormation flow references `key_pair_id` explicitly), Fingerprint (implied by general key-pair concept, not directly fetched), Type (RSA/ED25519), Created (not directly fetched).

### 2. Additional columns via Preferences/gear
**Unconfirmed.**

### 3. Tabs
**Unconfirmed** — no evidence a Key Pairs detail page has a tab strip; key pairs are largely metadata-only (the private key itself is never stored by AWS).

### 4. Primary buttons
Confirmed: **Create key pair**, **Import key pair** (`create-key-pairs.html`).

### 5. Actions menu contents
Not exhaustively enumerated. Confirmed adjacent capability: **Delete** (implied by general lifecycle, not directly fetched verbatim for the Key Pairs list Actions menu).

### 6. Filters / search
**Unconfirmed.**

### 7. Bulk operations
**Unconfirmed.**

### 8. Row-level affordances
**Unconfirmed** explicitly for Key Pairs (likely click Name to view detail metadata, by analogy).

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flows

**Create key pair** — confirmed exact field order (`create-key-pairs.html`, "To create a key pair using Amazon EC2"):
1. **Name** — up to 255 ASCII characters; no leading/trailing spaces; used as the base filename for the downloaded private key.
2. **Key pair type** — **RSA** or **ED25519** for Linux instances; **RSA only** for Windows instances (ED25519 not supported for Windows).
3. **Private key file format** — **pem** (OpenSSH-compatible) or **ppk** (PuTTY-compatible).
4. **Tags** (on the public key) — optional, "Add tag" repeatable key/value.
5. **Create key pair** button.

Confirmed post-creation behavior: the private key file is **automatically downloaded by the browser** immediately upon creation; base filename = key pair Name, extension per chosen format; **this is documented as the only chance to save the private key** (AWS does not retain it). macOS/Linux users are told to `chmod 400 <name>.pem` or SSH connection will fail.

Quota confirmed: up to 5,000 key pairs per Region (support-case increase available).

**Import key pair** — confirmed exact field order (`create-key-pairs.html`, "To import the public key to Amazon EC2"):
1. **Name** — up to 255 ASCII characters, no leading/trailing spaces; the console will later suggest this same name as the private-key filename when you connect via the console.
2. Public key source — either **Browse** to select a local public-key file, or paste directly into a **Public key contents** text field.
3. **Import key pair** button.

Supported import formats/lengths (confirmed): RSA or ED25519 (Linux); RSA only (Windows); DSA not accepted; OpenSSH public-key format; SSH2 format (only via EC2 Instance Connect API); private key must be PEM or PPK; RSA additionally accepts Base64-encoded DER and RFC 4716 SSH public-key format; supported key lengths 1024/2048/4096 bits (2048/4096 only when connecting via EC2 Instance Connect API).

---

## Elastic IPs

### 1. Default table columns
**Unconfirmed** exhaustive list. Individually confirmed as tracked/relevant attributes: allocation state (associated vs. idle — both are billed, per the pricing note), Public IPv4 address pool source, Network Border Group.

### 2. Additional columns via Preferences/gear
**Unconfirmed.**

### 3. Tabs
**Unconfirmed** — no evidence of a tab strip on the Elastic IPs list/detail.

### 4. Primary buttons
Confirmed: **Allocate Elastic IP address** (`working-with-eips.md` / `elastic-ip-addresses-eip.html`).

### 5. Actions menu contents
Confirmed, exact labels from the fetched procedures:
- **Associate Elastic IP address**
- **Disassociate Elastic IP address**
- (Implied lifecycle action, consistent with the topic list on `elastic-ip-addresses-eip.html`) **Release** — not verbatim-fetched from an Actions-menu context but is a named top-level topic ("Release an Elastic IP address").
- (Implied) **Update reverse DNS** — named as a top-level topic ("Create a reverse DNS record for email on Amazon EC2") but exact Actions-menu wording unconfirmed.
- **Manage tags** — unconfirmed verbatim for this specific page, but consistent with the pattern used elsewhere in the EC2 console.

### 6. Filters / search
**Unconfirmed.**

### 7. Bulk operations
**Unconfirmed.**

### 8. Row-level affordances
**Unconfirmed** explicitly.

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flows

**Allocate Elastic IP address** — confirmed exact field order (`working-with-eips.md`, "To allocate an Elastic IP address"):
1. **Network border group** — optional; predefined/locked to the Region's default border group unless the account has Local Zones/Wavelength Zones enabled, in which case a specific border group can be chosen. Must match the border group of the resource the EIP will later associate with.
2. **Public IPv4 address pool** — choose one of exactly four documented options:
   - **Amazon's pool of IPv4 addresses**
   - **Public IPv4 address that you bring to your AWS account** — disabled if the account has no BYOIP pools.
   - **Customer owned pool of IPv4 addresses** — disabled if the account has no AWS Outpost.
   - **Allocate using an IPAM IPv4 pool** — for sequential/contiguous addresses from an IPAM pool.
3. **Tags** — optional, "Add new tag" repeatable key/value.
4. **Allocate** button (implied — not verbatim in the fetched excerpt but consistent with the rest of the flow).

Confirmed billing/behavior notes: EIPs are billed whether associated or idle; an EIP is Region-specific and cannot move Regions; default quota is 5 EIPs per Region (Service Quotas console request to raise); IPAM-pool and BYOIP-pool allocations do **not** count toward this quota.

**Associate Elastic IP address** — confirmed exact field order, and that it is **two parallel flows depending on Resource type** (`working-with-eips.md`, "To associate an Elastic IP address with an instance" / "...with a network interface"):
1. Select the EIP row, then **Actions → Associate Elastic IP address**.
2. **Resource type** — **Instance** or **Network interface**.
3. If Instance: **Instance** field — searchable instance picker.
   If Network interface: **Network interface** field — searchable ENI picker.
4. **Private IP address** — optional, specify which private IP on the target resource to bind the EIP to.
5. **Associate** button.

Confirmed side-effect: if the target instance already has a (non-Elastic) public IPv4 address, that address is released back to Amazon's pool and cannot be recovered or converted to an EIP.

**Disassociate** — confirmed minimal flow: select EIP → **Actions → Disassociate Elastic IP address** → confirm **Disassociate**. A disassociated EIP remains allocated (and billed) until explicitly released.

---

## Load Balancers

### 1. Default table columns
**Unconfirmed** exhaustive ordered list — not found in any fetched primary doc. (DNS name, State, VPC ID, Type, and Availability Zones are near-certain candidates based on general ELB console familiarity, but none were confirmed via a fetched source in this research pass — flag as unconfirmed.)

### 2. Additional columns via Preferences/gear
**Unconfirmed.**

### 3. Tabs
**Confirmed as existing, exact set unconfirmed.** The Application Load Balancer user guide's topic list (`application-load-balancers.html`) references distinct detail-page surfaces including **Load balancer attributes** (edit-load-balancer-attributes.md), **Tags** (load-balancer-tags.md), and a dedicated **Resource map** view (view-resource-map.md) — consistent with these being separate tabs, but the literal tab-strip labels/order (candidates: Listeners and rules, Monitoring, Integrated services, Attributes, Tags, Resource map) were **not confirmed verbatim** from a fetched page. One fetched testing procedure explicitly names a **Description** tab used to copy the DNS name (older/alternate naming — "Choose Description and copy the DNS name..." per `create-application-load-balancer.html` test section) — this suggests either a legacy tab name or that "Description" is a section within a tab rather than a top-level tab; treat as **unconfirmed** which is current.

### 4. Primary buttons
Confirmed: **Create load balancer** (`create-application-load-balancer.html`) — leads to a type-selection screen with at least an **Application Load Balancer** card offering its own **Create** button (also Network/Gateway/Classic types per search, not independently fetched in detail).

### 5. Actions menu contents
**Unconfirmed** exhaustive list for the Load Balancers list page specifically.

### 6. Filters / search
**Unconfirmed.**

### 7. Bulk operations
**Unconfirmed.**

### 8. Row-level affordances
Confirmed via the test-the-load-balancer procedure: selecting a load balancer opens a detail context where you can copy its **DNS name**.

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flow — Create Application Load Balancer
Confirmed exact wizard section order and fields (`create-application-load-balancer.html`, "To create an Application Load Balancer"):

0. Choose **Load Balancers** in nav → **Create load balancer** → under **Application Load Balancer**, choose **Create**.

1. **Basic configuration**
   - **Load balancer name** — max 32 chars, alphanumeric + hyphens only, cannot start/end with a hyphen or with `internal-`, unique per Region per account, **immutable after creation**.
   - **Scheme** — **Internet-facing** or **Internal**.
   - **Load balancer IP address type** — **IPv4**, **Dualstack**, or **Dualstack without public IPv4**.

2. **Network mapping**
   - **VPC** — internet-facing LBs only list VPCs that have an internet gateway.
   - **IP pools** (optional) — "Use IPAM pool for public IPv4 addresses" checkbox.
   - **Availability Zones and subnets** — must select subnets from ≥2 AZs (or ≥1 Local Zone subnet, or exactly 1 Outpost subnet); Dualstack requires subnets with both IPv4 and IPv6 CIDRs.

3. **Security groups** — pre-populated with the VPC's default security group; additional groups selectable; inline **"create a new security group"** link if none fit.

4. **Listeners and routing**
   - Default listener: **HTTP** on port **80** (Protocol/Port editable).
   - **Default action** — select a target group to forward to, or inline **Create target group**.
   - Optional **Add listener tag** (key/value).
   - Optional **Add listener** to add further listeners (e.g. HTTPS).

5. **Secure listener settings** — appears only if an HTTPS listener was added:
   - **Security policy** dropdown.
   - **Default SSL/TLS certificate** — **From ACM**, **From IAM**, **Import certificate**, or **Request new ACM certificate**.
   - Optional **Mutual authentication (mTLS)** checkbox + ALPN policy choice.

6. **Optimize with service integrations** (optional) — integrate other AWS services.

7. **Load balancer tags** (optional, expandable section) — **Add new tag** repeatable key/value.

8. **Summary** → **Create load balancer** button.

Confirmed post-create note: "A few default attributes are applied... during creation. You can view and edit them after creating" — i.e., attributes are not set during the wizard, only after, via the Attributes surface.

**Load balancer attributes** (confirmed exhaustive list with exact keys/defaults, `application-load-balancers.html` → "Load balancer attributes"):
| Attribute key | Default |
|---|---|
| `access_logs.s3.enabled` | `false` |
| `access_logs.s3.bucket` | (required if enabled) |
| `access_logs.s3.prefix` | — |
| `client_keep_alive.seconds` | `3600` |
| `deletion_protection.enabled` | `false` |
| `idle_timeout.timeout_seconds` | `60` |
| `ipv6.deny_all_igw_traffic` | `false` (internet-facing) / `true` (internal) |
| `routing.http.desync_mitigation_mode` | `defensive` (options: `monitor`, `defensive`, `strictest`) |
| `routing.http.drop_invalid_header_fields.enabled` | `false` |
| `routing.http.preserve_host_header.enabled` | `false` |
| `routing.http.x_amzn_tls_version_and_cipher_suite.enabled` | `false` |
| `routing.http.xff_client_port.enabled` | `false` |
| `routing.http.xff_header_processing.mode` | `append` (options: `append`, `preserve`, `remove`) |
| `routing.http2.enabled` | `true` |
| `waf.fail_open.enabled` | `false` |

Confirmed load-balancer states: `provisioning`, `active`, `active_impaired`, `failed`.

Confirmed: cross-zone load balancing is **on by default and cannot be disabled at the ALB level** (only per-target-group).

---

## Target Groups

### 1. Default table columns
**Unconfirmed** exhaustive list.

### 2. Additional columns via Preferences/gear
**Unconfirmed.**

### 3. Tabs
Confirmed to include at least a **Targets** tab (test-the-load-balancer procedure: "Choose Targets and verify that your instances are ready"). Full tab set (candidates: Targets, Monitoring, Health checks, Attributes, Tags): **not exhaustively confirmed**.

### 4. Primary buttons
Confirmed: **Create target group** (`create-target-group.html`).

### 5. Actions menu contents
**Unconfirmed** exhaustive list.

### 6. Filters / search
**Unconfirmed.**

### 7. Bulk operations
**Unconfirmed.**

### 8. Row-level affordances
**Unconfirmed** explicitly (by analogy, click name to open detail).

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flow — Create Target Group
Confirmed exact wizard field order across two pages ("Create target group" page, then "Register targets" page) — (`create-target-group.html`):

**Page 1 — target group configuration:**
1. **Choose a target type** — **Instances** (register by instance ID), **IP addresses** (register by IP), or **Lambda function**.
2. **Target group name** — unique per Region per account, max 32 chars, alphanumeric/hyphens only, cannot start/end with a hyphen.
3. **Protocol** and **Port** (optional to change from defaults).
4. **IP address type** — **IPv4** or **IPv6** — only shown for Instances/IP addresses target types; **immutable after creation**.
5. **VPC** — for IP-addresses target type, only VPCs supporting the chosen IP address type are selectable.
6. **Protocol version** (optional).
7. **Health checks** section (optional to modify defaults — see health-check table below). If target type is **Lambda function**, health checks are **disabled by default** but can be turned on via an **Enable** control; for **Instances**/**IP addresses**, health checks are **always enabled and cannot be disabled**.
8. **Target optimizer** (optional) — enable + specify a target control port; port immutable after creation; requires an agent installed on targets.
9. **Tags** (optional, expandable) — **Add tag** repeatable key/value.
10. **Next** button.

**Page 2 — register targets** (optional at creation time):
- Instances type: select instances, enter port(s), **Include as pending below**. (Note: instances must have an assigned primary IPv6 address to join an IPv6 target group.)
- IP addresses type: choose a **VPC** or **Other private IP addresses**; enter up to 5 IPs manually or via instance-detail lookup; enter port(s); **Include as pending below**.
- Lambda function type: specify a single function, or skip and add later.
- **Create target group** button (final commit).

**Health check settings** — confirmed exact field names, ranges, and defaults (`target-group-health-checks.html`, API-name-to-console-name mapping noted):
| Console setting | API name | Range | Default (instance/ip) | Default (lambda) |
|---|---|---|---|---|
| Health check protocol | `HealthCheckProtocol` | HTTP / HTTPS | HTTP | HTTP |
| Health check port | `HealthCheckPort` | — | traffic port | traffic port |
| Health check path | `HealthCheckPath` | URI | `/` (HTTP/1.1, HTTP/2) or `/AWS.ALB/healthcheck` (gRPC) | same |
| Health check timeout | `HealthCheckTimeoutSeconds` | 2–120 s | 5 s | 30 s |
| Health check interval | `HealthCheckIntervalSeconds` | 5–300 s | 30 s | 35 s |
| Healthy threshold | `HealthyThresholdCount` | 2–10 | 5 | 5 |
| Unhealthy threshold | `UnhealthyThresholdCount` | 2–10 | 2 | 2 |
| Success codes | `Matcher` | 200–499 (HTTP) or 0–99 (gRPC); ranges/lists allowed | `200` | `200` (gRPC default `12`) |

Confirmed target health states: `initial`, `healthy`, `unhealthy`, `unused`, `draining`, `unavailable` — each with associated reason codes (`Elb.*` = load-balancer-side cause, `Target.*` = target-side cause). Fail-open behavior confirmed: if *all* targets in a target group are unhealthy simultaneously across all enabled AZs, the load balancer "fails open" and routes to all targets regardless of health.

---

## Auto Scaling Groups

### 1. Default table columns
**Unconfirmed** exhaustive ordered list for the top-level ASG table. Confirmed sub-panel columns (see tabs below): **Status** (Activity tab), **Lifecycle** and **Health status** (Instance management tab), **Desired/Min/Max** (shown above the Details pane per search, and confirmed to display `0` for all three once a group finishes deleting).

### 2. Additional columns via Preferences/gear
Confirmed the preferences/gear mechanism exists and is used the same way as elsewhere in the console: "choose the gear icon on the top right corner of each section to open the preferences modal, update the settings as needed, and choose Confirm" (`create-your-first-auto-scaling-group.html`) — applies to the **Activity history** and **Instances** sections at minimum. Exact additional column names: **unconfirmed**.

### 3. Tabs
**Confirmed exact tab set and order**: **Details**, **Activity**, **Automatic scaling**, **Instance management**, **Monitoring**, **Instance refresh**.
- **Details** — "general settings for your Auto Scaling group that you can edit and manage in the same way as during Auto Scaling group creation," edited via **Group details → Edit**.
- **Activity** — **Activity history** list; **Status** column shows `Not yet in service` while launching, `Successful` once launched; has a manual refresh control.
- **Automatic scaling** — contains **Dynamic scaling policies** section with a **Create dynamic scaling policy** button; policy types include **Target tracking scaling** (default policy type in the create-policy form) and **Step scaling**; Scheduled actions are also configured from this tab (exact sub-section layout for scheduled actions not independently confirmed).
- **Instance management** — **Instances** section; **Lifecycle** column (`Pending` → `InService`, etc.) and **Health status** column (result of EC2 Auto Scaling health checks); instance IDs link out to the EC2 Instances console page.
- **Monitoring** — confirmed (search) to contain essentially one control: enable/disable CloudWatch group-metrics collection.
- **Instance refresh** — **Instance refresh history**; **Status** column shows refresh request state.

### 4. Primary buttons
Confirmed: **Create Auto Scaling group**, **Delete** (top-level, requires typing `delete` to confirm — see item 10).

### 5. Actions menu contents
**Unconfirmed** exhaustive list at the top level beyond **Delete**. Instance-level Actions (reached by navigating to the underlying EC2 Instances page from the Instance management tab) confirmed to include **Actions → Instance State → Terminate** (with a "Yes, Terminate" confirmation) — but this is the general EC2 Instances console, not ASG-specific.

### 6. Filters / search
**Unconfirmed.**

### 7. Bulk operations
**Unconfirmed** beyond the single-group delete-with-typed-confirmation flow.

### 8. Row-level affordances
Confirmed: selecting the checkbox next to an ASG row opens a **split pane at the bottom of the page** showing the tab strip (Details/Activity/.../Instance refresh) for that group — this is the primary way ASG detail is surfaced (not a full page navigation). Instance IDs inside the Instance management tab link to the EC2 Instances page.

### 9. Empty state
**Unconfirmed.**

### 10. Create/edit flow — Create Auto Scaling group
Confirmed step names and fields from the official tutorial (`create-your-first-auto-scaling-group.html`), which walks the exact console wizard:

1. **Choose launch template or configuration** page
   - **Auto Scaling group name**.
   - Select an existing **Launch template** (or launch configuration), or create one inline. A launch template itself (separate resource) captures AMI, instance type, key pair, security groups, network interface settings including **Auto-assign public IP** (Enable/Disable) and **Delete on termination**.
   - **Next**.

2. **Choose instance launch options** page
   - **Network** section: **VPC** (defaults to account's default VPC), **Availability Zones and subnets** — choose one subnet per AZ to include (multi-AZ recommended for HA).
   - **Instance type requirements** section: default is to use the launch template's instance type as-is ("do not override the launch template"); this section is also where instance-type override rules for mixed-instances/Spot policies live (not elaborated further in the fetched tutorial).
   - Additional unlisted defaults can be accepted via **Skip to review**, or proceed stepwise via **Next**.

3–4. (Confirmed to exist via search, not verbatim-fetched in the same tutorial) **Configure network** and **Configure advanced options** pages — advanced options page contains:
   - **Load balancing** — choose none, **Attach to an existing load balancer**, or **Attach to a new load balancer** (Application or Network type).
   - **Health checks** — **Turn on Elastic Load Balancing health checks** (additional health check type toggle) and **Health check grace period** (seconds) — **console default confirmed as 300 seconds**.
   - **Additional settings** — unconfirmed exact contents beyond load balancing/health checks.

5. **Configure group size and scaling policies** page (confirmed field names via search, values illustrative):
   - **Desired capacity** — default **1** (tutorial-confirmed: "The initial size of the group is determined by its desired capacity. The default value is 1 instance.").
   - **Minimum capacity** / **Maximum capacity**.
   - **Instance maintenance policy** section (named, contents not independently confirmed).
   - **Scaling policies** — **Policy type** defaults to **Target tracking scaling**; **Metric type** selectable; Step scaling also available as an alternate policy type, configured from the same or the Automatic scaling tab post-creation.
   - "Skip to review" shortcut available to bypass remaining optional steps.

6–7. **Add notifications** and **Add tags** pages — existence confirmed by general ASG wizard structure; exact fields not independently fetched in this pass (**unconfirmed** in detail; SNS-notification configuration is documented as a distinct post-creation topic — "Amazon SNS notification options").

8. **Review** page → **Create Auto Scaling group** button.

Confirmed advanced/edit-only settings (available on **Details tab → Edit**, but *not* exposed during initial creation): **termination policies**, **default cooldown**, **suspended processes**, **maximum instance lifetime** — "The Advanced configurations section has some options that are not available when creating the group such as termination policies, cooldown, suspended processes, and maximum instance lifetime."

**Delete Auto Scaling group** flow confirmed exactly:
1. Select the group's checkbox.
2. Choose **Delete**.
3. Confirmation dialog requires **typing the literal word `delete`** to confirm, then choose **Delete**.
4. While deleting, a loading icon appears in the **Name** column; once complete, the **Desired**, **Min**, and **Max** columns for the group show `0`.

---

## Cross-cutting notes (not page-specific)

- **Pagination style**: not confirmed via any fetched doc for any of the 8 pages in this pass — **unconfirmed** across the board (AWS's standard Cloudscape-design-system tables typically use a "Showing X of Y" footer with Prev/Next/page-size controls, but this was not independently verified against current AWS documentation in this research session).
- **Info/help links**: the "?" info-popover pattern is pervasive across the AWS console (Cloudscape design system) but no fetched doc for these 8 pages explicitly documents its presence/wording — **unconfirmed**.
- **Split-panel behavior**: **confirmed specifically for Auto Scaling Groups** (bottom split-pane opens on checkbox selection, described above). Not confirmed for the other 7 pages, though several EC2 console pages (Instances, Volumes) are known industry-wide to use the same split-pane pattern — flagged **unconfirmed** here since not directly sourced.
- **Exact status wording** confirmed per-resource-type:
  - Volume states: `creating`, `available`, `in-use`, `deleting`, `deleted`, `error`.
  - Snapshot states: `pending`, `completed`, `recoverable`, `recovering`, `error`.
  - Load balancer states: `provisioning`, `active`, `active_impaired`, `failed`.
  - Target health states: `initial`, `healthy`, `unhealthy`, `unused`, `draining`, `unavailable`.
  - ASG instance lifecycle states referenced: `Pending`, `InService` (not an exhaustive list — full EC2 Auto Scaling lifecycle has more states such as `Terminating`, `Standby`, etc., not confirmed in this pass).

---

## Sources

- https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-volume.html
- https://docs.aws.amazon.com/ebs/latest/userguide/ebs-describing-volumes.html
- https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html
- https://docs.aws.amazon.com/ebs/latest/userguide/ebs-describing-snapshots.html
- https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- https://docs.aws.amazon.com/vpc/latest/userguide/working-with-security-group-rules.html
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-security-groups.html (fetch returned only page title — no body content retrieved)
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.md
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-eips.md
- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-application-load-balancer.html
- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-target-group.html
- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-your-first-auto-scaling-group.html
- Web search corroboration (no single canonical doc fetched, used only to corroborate multiple independent secondary sources): Auto Scaling group tab set (Details/Activity/Automatic scaling/Instance management/Monitoring/Instance refresh); Auto Scaling "Configure advanced options" (load balancing / health check grace period default 300s) and "Configure group size and scaling policies" steps; Security Group Type-dropdown predefined entries; Elastic IP allocate/associate dialog field names; Load balancer detail tab candidates (unconfirmed status noted inline).
