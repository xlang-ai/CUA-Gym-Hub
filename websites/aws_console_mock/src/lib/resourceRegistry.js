/**
 * The console's second layer, as data.
 *
 * Measured before this existed: 58 routes carried a populated table and 5 had rows that led
 * anywhere. The console was one layer deep because the fidelity reference modelled it flat —
 * it described list pages and had no notion of a detail page, so nothing built one.
 *
 * Each entry says where a resource lives in the store, how to identify it, and what its
 * detail page shows. Tabs are data too: a tab is either a field list, a related-resource
 * table, or the tag editor. That keeps the promise that no tab is blank — a tab exists only
 * because there is something real to put in it.
 *
 * Tab names, where captured, come from the live console (see reference/capture/extracted/).
 * Where they are not captured they are marked `inferred` so the fidelity score can tell the
 * difference.
 */

const tagTab = { label: 'Tags', tags: true };

export const RESOURCES = [
  {
    id: 'vpc',
    listRoute: '/vpc/vpcs', listLabel: 'Your VPCs', detailRoute: '/vpc/vpcs/:id',
    path: 'vpc.vpcs', key: 'id', titleField: 'name',
    tabsConfidence: 'sourced',
    summary: [
      { label: 'VPC ID', field: 'id', mono: true },
      { label: 'State', field: 'state' },
      { label: 'IPv4 CIDR', field: 'cidr', mono: true },
      { label: 'Tenancy', field: 'tenancy' },
      { label: 'Default VPC', field: 'isDefault', format: (v) => (v ? 'Yes' : 'No') },
      { label: 'DNS hostnames', field: 'dnsHostnames', format: (v) => (v ? 'Enabled' : 'Disabled') },
    ],
    tabs: [
      { label: 'CIDRs', rows: (r) => [{ family: 'IPv4', cidr: r.cidr, status: 'Associated' },
          ...((r.secondaryCidrs || []).map((c) => ({ family: 'IPv4', cidr: c, status: 'Associated' })))],
        columns: [['Address family', 'family'], ['CIDR', 'cidr'], ['Status', 'status']] },
      { label: 'Flow logs', related: { path: 'vpc.flowLogs', match: (row, res) => row.resourceId === res.id },
        columns: [['Name', 'name'], ['Flow log ID', 'id'], ['Traffic type', 'filter'],
                  ['Destination type', 'destinationType'], ['Destination name', 'destination'],
                  ['Maximum aggregation interval', 'maxAggregationInterval'], ['Status', 'status']] },
      tagTab,
      { label: 'Related resources', related: { path: 'vpc.subnets', match: (row, res) => row.vpcId === res.id },
        columns: [['Subnet ID', 'id'], ['Name', 'name'], ['IPv4 CIDR', 'cidr'], ['Availability Zone', 'az']] },
    ],
  },
  {
    id: 'subnet',
    listRoute: '/vpc/subnets', listLabel: 'Subnets', detailRoute: '/vpc/subnets/:id',
    path: 'vpc.subnets', key: 'id', titleField: 'name',
    tabsConfidence: 'inferred',
    summary: [
      { label: 'Subnet ID', field: 'id', mono: true },
      { label: 'VPC', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
      { label: 'State', field: 'state' },
      { label: 'IPv4 CIDR', field: 'cidr', mono: true },
      { label: 'Availability Zone', field: 'az' },
      { label: 'Available IPv4 addresses', field: 'availableIps' },
    ],
    tabs: [
      { label: 'Route table', related: { path: 'vpc.routeTables', match: (row, res) => (row.subnets || []).includes(res.id) || row.main },
        columns: [['Route table ID', 'id'], ['Name', 'name'], ['Main', 'main', (v) => (v ? 'Yes' : 'No')]] },
      { label: 'Network ACL', related: { path: 'vpc.networkAcls', match: (row, res) => row.vpcId === res.vpcId },
        columns: [['Network ACL ID', 'id'], ['Name', 'name'], ['Default', 'isDefault', (v) => (v ? 'Yes' : 'No')]] },
      tagTab,
    ],
  },
  {
    id: 'routeTable',
    listRoute: '/vpc/route-tables', listLabel: 'Route tables', detailRoute: '/vpc/route-tables/:id',
    path: 'vpc.routeTables', key: 'id', titleField: 'name',
    tabsConfidence: 'sourced',
    summary: [
      { label: 'Route table ID', field: 'id', mono: true },
      { label: 'VPC', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
      { label: 'Main', field: 'main', format: (v) => (v ? 'Yes' : 'No') },
    ],
    tabs: [
      { label: 'Routes', rows: (r) => r.routes || [],
        columns: [['Destination', 'destination'], ['Target', 'target'], ['Status', 'status']] },
      { label: 'Subnet associations', related: { path: 'vpc.subnets', match: (row, res) => (res.subnets || []).includes(row.id) },
        columns: [['Subnet ID', 'id'], ['Name', 'name'], ['IPv4 CIDR', 'cidr']] },
      { label: 'Edge associations', rows: () => [],
        columns: [['Gateway ID', 'id'], ['Type', 'type']],
        empty: 'No edge associations. Edge associations route traffic from a gateway into the VPC.' },
      tagTab,
    ],
  },
  {
    id: 'securityGroup',
    listRoute: '/ec2/security-groups', listLabel: 'Security Groups', detailRoute: '/ec2/security-groups/:id',
    path: 'securityGroups', key: 'id', titleField: 'name',
    tabsConfidence: 'sourced',
    summary: [
      { label: 'Security group ID', field: 'id', mono: true },
      { label: 'Security group name', field: 'name' },
      { label: 'Description', field: 'description' },
      { label: 'VPC ID', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
    ],
    tabs: [
      { label: 'Inbound rules', rows: (r) => r.inboundRules || [],
        columns: [['Security group rule ID', 'ruleId'], ['Port range', 'portRange'], ['Protocol', 'protocol'],
                  ['Source', 'source'], ['Description', 'description']] },
      { label: 'Outbound rules', rows: (r) => r.outboundRules || [],
        columns: [['Security group rule ID', 'ruleId'], ['Port range', 'portRange'], ['Protocol', 'protocol'],
                  ['Destination', 'destination'], ['Description', 'description']] },
      tagTab,
    ],
  },
  {
    id: 'volume',
    listRoute: '/ec2/volumes', listLabel: 'Volumes', detailRoute: '/ec2/volumes/:id',
    path: 'volumes', key: 'id', titleField: 'name',
    tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Volume ID', field: 'id', mono: true },
      { label: 'Type', field: 'volumeType' },
      { label: 'Size', field: 'size', format: (v) => `${v} GiB` },
      { label: 'IOPS', field: 'iops' },
      { label: 'Volume state', field: 'state' },
      { label: 'Availability Zone', field: 'az' },
    ],
    tabs: [
      { label: 'Details', fields: [
          { label: 'Encryption', field: 'encrypted', format: (v) => (v ? 'Encrypted' : 'Not encrypted') },
          { label: 'Snapshot ID', field: 'snapshotId', mono: true },
          { label: 'Throughput', field: 'throughput' },
          { label: 'Created', field: 'created' }] },
      { label: 'Status checks', rows: (r) => [
          { name: 'Volume status', state: r.state === 'in-use' || r.state === 'available' ? 'OK' : 'Impaired',
            description: `Volume is ${r.state}` }],
        columns: [['Name', 'name'], ['State', 'state'], ['Description', 'description']] },
      tagTab,
    ],
  },
  {
    id: 'snapshot',
    listRoute: '/ec2/snapshots', listLabel: 'Snapshots', detailRoute: '/ec2/snapshots/:id',
    path: 'snapshots', key: 'id', titleField: 'name',
    tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Snapshot ID', field: 'id', mono: true },
      { label: 'Volume ID', field: 'volumeId', mono: true, link: (r) => `/ec2/volumes/${r.volumeId}` },
      { label: 'Volume size', field: 'volumeSize', format: (v) => `${v} GiB` },
      { label: 'Snapshot status', field: 'status' },
      { label: 'Description', field: 'description' },
    ],
    tabs: [
      { label: 'Details', fields: [
          { label: 'Encryption', field: 'encrypted', format: (v) => (v ? 'Encrypted' : 'Not encrypted') },
          { label: 'Started', field: 'started' },
          { label: 'Progress', field: 'progress' }] },
      { label: 'Storage tier', rows: (r) => [{ tier: r.storageTier || 'standard', status: 'Active' }],
        columns: [['Storage tier', 'tier'], ['Status', 'status']] },
      tagTab,
    ],
  },
  {
    id: 'iamUser',
    listRoute: '/iam/users', listLabel: 'IAM users', detailRoute: '/iam/users/:id',
    path: 'iam.users', key: 'name', titleField: 'name',
    tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'User name', field: 'name' },
      { label: 'ARN', field: 'arn', mono: true },
      { label: 'Created', field: 'created' },
      { label: 'Last activity', field: 'lastActivity' },
    ],
    tabs: [
      { label: 'Permissions', rows: (r) => (r.policies || []).map((p) => ({ name: p, type: 'AWS managed' })),
        columns: [['Policy name', 'name'], ['Type', 'type']],
        empty: 'This user has no permissions policies attached.' },
      { label: 'Groups', rows: (r) => (r.groups || []).map((g) => ({ name: g })),
        columns: [['Group name', 'name']], empty: 'This user is not a member of any group.' },
      tagTab,
      { label: 'Security credentials', fields: [
          { label: 'Console access', field: 'consoleAccess', format: (v) => (v ? 'Enabled' : 'Disabled') },
          { label: 'MFA', field: 'mfa', format: (v) => (v ? 'Enabled' : 'Not enabled') },
          { label: 'Access key ID', field: 'accessKeyId', mono: true }] },
    ],
  },
  {
    id: 'cloudwatchAlarm',
    listRoute: '/cloudwatch/alarms', listLabel: 'Alarms', detailRoute: '/cloudwatch/alarms/:id',
    path: 'cloudwatch.alarms', key: 'name', titleField: 'name',
    tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Alarm name', field: 'name' },
      { label: 'State', field: 'state' },
      { label: 'Metric', field: 'metric' },
      { label: 'Threshold', field: 'threshold' },
      { label: 'Namespace', field: 'namespace' },
    ],
    tabs: [
      { label: 'Details', fields: [
          { label: 'Statistic', field: 'statistic' },
          { label: 'Period', field: 'period' },
          { label: 'Datapoints to alarm', field: 'datapointsToAlarm' },
          { label: 'Comparison', field: 'comparisonOperator' }] },
      { label: 'History', rows: (r) => (r.history || [{ date: r.updated || '-', type: 'StateUpdate',
          description: `Alarm moved to ${r.state}` }]),
        columns: [['Date', 'date'], ['Type', 'type'], ['Description', 'description']] },
      tagTab,
    ],
  },
];

export const byDetailRoute = Object.fromEntries(RESOURCES.map((r) => [r.detailRoute, r]));
export const byListRoute = Object.fromEntries(RESOURCES.map((r) => [r.listRoute, r]));
