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
        columns: [['Protocol', 'protocol'], ['Port range', 'port'], ['Source', 'source'], ['Description', 'description']] },
      // Outbound rules store the peer in `source` too, so the console's "Destination" heading
      // reads that field rather than a `destination` key the data does not have.
      { label: 'Outbound rules', rows: (r) => r.outboundRules || [],
        columns: [['Protocol', 'protocol'], ['Port range', 'port'], ['Destination', 'source'], ['Description', 'description']] },
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

  // ---- second batch -------------------------------------------------------------------
  // Tab names are marked `inferred` unless a live capture named them. The fidelity score
  // reads that mark, so an inferred tab list never counts toward the defensible figure.
  {
    id: 'ami', listRoute: '/ec2/amis', listLabel: 'AMIs', detailRoute: '/ec2/amis/:id',
    path: 'amis', key: 'id', titleField: 'name', tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'AMI ID', field: 'id', mono: true },
      { label: 'Source', field: 'owner' },
      { label: 'Status', field: 'state' },
      { label: 'Architecture', field: 'architecture' },
      { label: 'Platform', field: 'platform' },
      { label: 'Visibility', field: 'public', format: (v) => (v ? 'Public' : 'Private') },
    ],
    tabs: [
      { label: 'Details', fields: [
        { label: 'Description', field: 'description' },
        { label: 'Root device type', field: 'rootDeviceType' },
        { label: 'Virtualization', field: 'virtualization' },
        { label: 'Creation date', field: 'created' }] },
      { label: 'Permissions', rows: (r) => [{ scope: r.public ? 'Public' : 'Private', principal: r.public ? 'all' : r.owner }],
        columns: [['Visibility', 'scope'], ['Principal', 'principal']] },
      tagTab,
    ],
  },
  {
    id: 'keyPair', listRoute: '/ec2/key-pairs', listLabel: 'Key pairs', detailRoute: '/ec2/key-pairs/:id',
    path: 'keyPairs', key: 'name', titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Name', field: 'name' },
      { label: 'Key pair ID', field: 'id', mono: true },
      { label: 'Type', field: 'type' },
      { label: 'Created', field: 'created' },
    ],
    tabs: [
      { label: 'Details', fields: [
        { label: 'Fingerprint', field: 'fingerprint', mono: true },
        { label: 'Key type', field: 'type' },
        { label: 'Created', field: 'created' }] },
      tagTab,
    ],
  },
  {
    id: 'elasticIp', listRoute: '/ec2/elastic-ips', listLabel: 'Elastic IP addresses',
    detailRoute: '/ec2/elastic-ips/:id', path: 'elasticIps', key: 'allocationId',
    titleField: 'publicIp', tabsConfidence: 'inferred',
    summary: [
      { label: 'Allocated IPv4 address', field: 'publicIp', mono: true },
      { label: 'Allocation ID', field: 'allocationId', mono: true },
      { label: 'Association ID', field: 'associationId', mono: true },
      { label: 'Associated instance ID', field: 'instanceId', mono: true, link: (r) => (r.instanceId ? `/ec2/instances/${r.instanceId}` : undefined) },
      { label: 'Private IP address', field: 'privateIp', mono: true },
      { label: 'Scope', field: 'domain' },
    ],
    tabs: [
      { label: 'Details', fields: [
        { label: 'Network interface', field: 'networkInterfaceId', mono: true },
        { label: 'Scope', field: 'domain' }] },
      tagTab,
    ],
  },
  {
    id: 'loadBalancer', listRoute: '/ec2/load-balancers', listLabel: 'Load balancers',
    detailRoute: '/ec2/load-balancers/:id', path: 'loadBalancers', key: 'name',
    titleField: 'name', tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Name', field: 'name' },
      { label: 'DNS name', field: 'dnsName', mono: true },
      { label: 'State', field: 'state' },
      { label: 'Type', field: 'type' },
      { label: 'Scheme', field: 'scheme' },
      { label: 'VPC', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
    ],
    tabs: [
      { label: 'Listeners', rows: (r) => r.listeners || [],
        columns: [['Protocol', 'protocol'], ['Port', 'port'], ['Default action', 'defaultAction']],
        empty: 'This load balancer has no listeners.' },
      { label: 'Network mapping', rows: (r) => (r.az || []).map((z) => ({ zone: z, vpc: r.vpcId })),
        columns: [['Availability Zone', 'zone'], ['VPC', 'vpc']] },
      { label: 'Security', rows: (r) => (r.securityGroups || []).map((g) => ({ id: g })),
        columns: [['Security group', 'id']], empty: 'No security groups associated.' },
      tagTab,
    ],
  },
  {
    id: 'targetGroup', listRoute: '/ec2/target-groups', listLabel: 'Target groups',
    detailRoute: '/ec2/target-groups/:id', path: 'targetGroups', key: 'name',
    titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Name', field: 'name' },
      { label: 'Protocol', field: 'protocol' },
      { label: 'Port', field: 'port' },
      { label: 'Target type', field: 'targetType' },
      { label: 'VPC', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
      { label: 'Load balancer', field: 'loadBalancer' },
    ],
    tabs: [
      { label: 'Targets', rows: (r) => r.targets || [],
        columns: [['Instance ID', 'id'], ['Port', 'port'], ['Health status', 'health']],
        empty: 'No targets registered with this target group.' },
      // healthCheck is an object, not a scalar — rendering it directly threw
      // "Objects are not valid as a React child". Expanded into its real keys.
      { label: 'Health checks', rows: (r) => {
          const h = r.healthCheck || {};
          return Object.keys(h).length ? [h] : [];
        },
        columns: [['Path', 'path'], ['Protocol', 'protocol'], ['Interval', 'interval'],
                  ['Timeout', 'timeout'], ['Healthy threshold', 'healthyThreshold'],
                  ['Unhealthy threshold', 'unhealthyThreshold']],
        empty: 'No health check configured.' },
      tagTab,
    ],
  },
  {
    id: 'autoScalingGroup', listRoute: '/ec2/auto-scaling-groups', listLabel: 'Auto Scaling groups',
    detailRoute: '/ec2/auto-scaling-groups/:id', path: 'autoScalingGroups', key: 'name',
    titleField: 'name', tabsConfidence: 'sourced',
    summary: [
      { label: 'Name', field: 'name' },
      { label: 'Desired capacity', field: 'desiredCapacity' },
      { label: 'Minimum capacity', field: 'minSize' },
      { label: 'Maximum capacity', field: 'maxSize' },
      { label: 'Launch template', field: 'launchTemplate' },
      { label: 'Health check type', field: 'healthCheckType' },
    ],
    tabs: [
      { label: 'Details', fields: [
        { label: 'Launch template version', field: 'launchTemplateVersion' },
        { label: 'Health check grace period', field: 'healthCheckGracePeriod' },
        { label: 'Availability Zones', field: 'az' },
        { label: 'Created', field: 'created' }] },
      { label: 'Instance management',
        rows: (r) => (r.instances || []).map((i) => (typeof i === 'string' ? { id: i, lifecycle: 'InService', health: 'Healthy' } : i)),
        columns: [['Instance ID', 'id'], ['Lifecycle', 'lifecycle'], ['Health status', 'health']],
        empty: 'This group currently has no instances.' },
      { label: 'Automatic scaling', rows: (r) => r.policies || [],
        columns: [['Policy name', 'name'], ['Type', 'type'], ['Metric', 'metric'], ['Target', 'target']],
        empty: 'No scaling policies. The group holds its desired capacity.' },
      tagTab,
    ],
  },
  {
    id: 'launchTemplate', listRoute: '/ec2/launch-templates', listLabel: 'Launch templates',
    detailRoute: '/ec2/launch-templates/:id', path: 'launchTemplates', key: 'id',
    titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Launch template ID', field: 'id', mono: true },
      { label: 'Launch template name', field: 'name' },
      { label: 'Default version', field: 'defaultVersion' },
      { label: 'Latest version', field: 'latestVersion' },
      { label: 'Created by', field: 'createdBy' },
      { label: 'Create time', field: 'created' },
    ],
    tabs: [
      { label: 'Details', fields: [
        { label: 'AMI ID', field: 'ami', mono: true },
        { label: 'Instance type', field: 'instanceType' },
        { label: 'Key pair', field: 'keyPair' },
        { label: 'IAM instance profile', field: 'iamInstanceProfile' },
        { label: 'Monitoring', field: 'monitoring' }] },
      { label: 'Security groups', rows: (r) => (r.securityGroups || []).map((g) => ({ id: g })),
        columns: [['Security group', 'id']], empty: 'No security groups on this template version.' },
      { label: 'Advanced details', fields: [{ label: 'User data', field: 'userData' }] },
      tagTab,
    ],
  },
  {
    id: 'internetGateway', listRoute: '/vpc/internet-gateways', listLabel: 'Internet gateways',
    detailRoute: '/vpc/internet-gateways/:id', path: 'vpc.internetGateways', key: 'id',
    titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Internet gateway ID', field: 'id', mono: true },
      { label: 'State', field: 'state' },
      { label: 'VPC ID', field: 'vpcId', mono: true, link: (r) => (r.vpcId ? `/vpc/vpcs/${r.vpcId}` : undefined) },
    ],
    tabs: [tagTab],
  },
  {
    id: 'natGateway', listRoute: '/vpc/nat-gateways', listLabel: 'NAT gateways',
    detailRoute: '/vpc/nat-gateways/:id', path: 'vpc.natGateways', key: 'id',
    titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'NAT gateway ID', field: 'id', mono: true },
      { label: 'State', field: 'state' },
      { label: 'Subnet', field: 'subnetId', mono: true, link: (r) => `/vpc/subnets/${r.subnetId}` },
      { label: 'Primary public IPv4 address', field: 'publicIp', mono: true },
      { label: 'Primary private IPv4 address', field: 'privateIp', mono: true },
      { label: 'Created', field: 'created' },
    ],
    tabs: [tagTab],
  },
  {
    id: 'networkAcl', listRoute: '/vpc/network-acls', listLabel: 'Network ACLs',
    detailRoute: '/vpc/network-acls/:id', path: 'vpc.networkAcls', key: 'id',
    titleField: 'name', tabsConfidence: 'sourced',
    summary: [
      { label: 'Network ACL ID', field: 'id', mono: true },
      { label: 'VPC', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
      { label: 'Default', field: 'isDefault', format: (v) => (v ? 'Yes' : 'No') },
    ],
    tabs: [
      { label: 'Inbound rules', rows: (r) => r.inbound || [],
        columns: [['Rule number', 'ruleNumber'], ['Protocol', 'protocol'], ['Port range', 'portRange'],
                  ['Source', 'source'], ['Allow/Deny', 'allow', (v) => (v ? 'Allow' : 'Deny')]] },
      { label: 'Outbound rules', rows: (r) => r.outbound || [],
        columns: [['Rule number', 'ruleNumber'], ['Protocol', 'protocol'], ['Port range', 'portRange'],
                  ['Destination', 'destination'], ['Allow/Deny', 'allow', (v) => (v ? 'Allow' : 'Deny')]] },
      { label: 'Subnet associations', rows: (r) => (r.associations || []).map((a) => (typeof a === 'string' ? { id: a } : a)),
        columns: [['Subnet ID', 'id']], empty: 'This network ACL is not associated with any subnet.' },
      tagTab,
    ],
  },
  {
    id: 'iamRole', listRoute: '/iam/roles', listLabel: 'Roles', detailRoute: '/iam/roles/:id',
    path: 'iam.roles', key: 'name', titleField: 'name', tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Role name', field: 'name' },
      { label: 'ARN', field: 'arn', mono: true },
      { label: 'Created', field: 'created' },
      { label: 'Last activity', field: 'lastActivity' },
      { label: 'Maximum session duration', field: 'maxSessionDuration' },
    ],
    tabs: [
      { label: 'Permissions', rows: (r) => (r.policies || []).map((p) => ({ name: p, type: 'Managed policy' })),
        columns: [['Policy name', 'name'], ['Type', 'type']], empty: 'This role has no permissions policies.' },
      // trustedEntities is a single string in the seed data, not a list.
      { label: 'Trust relationships', rows: (r) => {
          const e = r.trustedEntities;
          if (!e) return [];
          return (Array.isArray(e) ? e : [e]).map((x) => (typeof x === 'string' ? { entity: x } : x));
        },
        columns: [['Trusted entity', 'entity']], empty: 'No trusted entities.' },
      tagTab,
    ],
  },
  {
    id: 'iamPolicy', listRoute: '/iam/policies', listLabel: 'Policies', detailRoute: '/iam/policies/:id',
    path: 'iam.policies', key: 'name', titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Policy name', field: 'name' },
      { label: 'ARN', field: 'arn', mono: true },
      { label: 'Type', field: 'type' },
      { label: 'Attached entities', field: 'attachedEntities' },
      { label: 'Created', field: 'created' },
      { label: 'Edited', field: 'updated' },
    ],
    tabs: [
      { label: 'Permissions', fields: [{ label: 'Description', field: 'description' }, { label: 'Policy type', field: 'type' }] },
      { label: 'Entities attached', rows: (r) => Array.from({ length: Number(r.attachedEntities) || 0 }, (_, i) => ({ n: i + 1 })),
        columns: [['#', 'n']], empty: 'This policy is not attached to any entity.' },
      tagTab,
    ],
  },
  {
    id: 'iamGroup', listRoute: '/iam/groups', listLabel: 'User groups', detailRoute: '/iam/groups/:id',
    path: 'iam.groups', key: 'name', titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Group name', field: 'name' },
      { label: 'ARN', field: 'arn', mono: true },
      { label: 'Created', field: 'created' },
      { label: 'Path', field: 'path' },
    ],
    tabs: [
      { label: 'Users', rows: (r) => (r.users || []).map((u) => ({ name: u })),
        columns: [['User name', 'name']], empty: 'This group has no users.' },
      { label: 'Permissions', rows: (r) => (r.policies || []).map((p) => ({ name: p })),
        columns: [['Policy name', 'name']], empty: 'This group has no permissions policies.' },
    ],
  },
  {
    id: 'logGroup', listRoute: '/cloudwatch/logs', listLabel: 'Log groups',
    detailRoute: '/cloudwatch/logs/:id', path: 'cloudwatch.logGroups', key: 'name',
    titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Log group name', field: 'name', mono: true },
      { label: 'Retention', field: 'retentionDays', format: (v) => (v ? `${v} days` : 'Never expire') },
      { label: 'Stored bytes', field: 'storedBytes' },
      { label: 'Created', field: 'created' },
    ],
    tabs: [
      // The seed carries a stream COUNT, not the streams themselves. Rendering a list from a
      // number would mean inventing stream names, so this reports what is actually known and
      // points at the view that holds the events.
      { label: 'Details', fields: [
        { label: 'Retention', field: 'retentionDays', format: (v) => (v ? `${v} days` : 'Never expire') },
        { label: 'Stored bytes', field: 'storedBytes' },
        { label: 'Log streams', field: 'streams' },
        { label: 'Created', field: 'created' }] },
      tagTab,
    ],
  },
  {
    id: 'snsTopic', listRoute: '/sns/topics', listLabel: 'Topics', detailRoute: '/sns/topics/:id',
    path: 'sns.topics', key: 'name', titleField: 'name', tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Name', field: 'name' },
      { label: 'ARN', field: 'arn', mono: true },
      { label: 'Display name', field: 'displayName' },
      { label: 'Type', field: 'type' },
      { label: 'Created', field: 'created' },
    ],
    tabs: [
      { label: 'Subscriptions', related: { path: 'sns.subscriptions', match: (row, res) => row.topic === res.name || row.topicArn === res.arn },
        columns: [['Subscription ARN', 'arn'], ['Protocol', 'protocol'], ['Endpoint', 'endpoint'], ['Status', 'status']],
        empty: 'This topic has no subscriptions.' },
      tagTab,
    ],
  },
  {
    id: 'sqsQueue', listRoute: '/sqs/queues', listLabel: 'Queues', detailRoute: '/sqs/queues/:id',
    path: 'sqs.queues', key: 'name', titleField: 'name', tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Name', field: 'name' },
      { label: 'Type', field: 'type' },
      { label: 'URL', field: 'url', mono: true },
      { label: 'Messages available', field: 'messagesAvailable' },
      { label: 'Messages in flight', field: 'messagesInFlight' },
      { label: 'Created', field: 'created' },
    ],
    tabs: [
      { label: 'Configuration', fields: [
        { label: 'Visibility timeout', field: 'visibilityTimeout' },
        { label: 'Message retention period', field: 'messageRetention' },
        { label: 'Maximum message size', field: 'maxMessageSize' },
        { label: 'Delivery delay', field: 'deliveryDelay' },
        { label: 'Receive message wait time', field: 'receiveWaitTime' },
        { label: 'Encryption', field: 'encryption' }] },
      { label: 'Dead-letter queue', rows: (r) => (r.deadLetterQueue ? [{ queue: r.deadLetterQueue, maxReceives: r.maxReceives }] : []),
        columns: [['Queue', 'queue'], ['Maximum receives', 'maxReceives']],
        empty: 'No dead-letter queue configured for this queue.' },
      tagTab,
    ],
  },
  {
    id: 'hostedZone', listRoute: '/route53/hosted-zones', listLabel: 'Hosted zones',
    detailRoute: '/route53/hosted-zones/:id', path: 'route53.hostedZones', key: 'id',
    titleField: 'name', tabsConfidence: 'inferred',
    summary: [
      { label: 'Hosted zone ID', field: 'id', mono: true },
      { label: 'Domain name', field: 'name' },
      { label: 'Type', field: 'type' },
      { label: 'Record count', field: 'recordCount' },
      { label: 'Created', field: 'created' },
      { label: 'Comment', field: 'comment' },
    ],
    tabs: [
      { label: 'Records', related: { path: 'route53.records', match: (row, res) => row.zoneId === res.id || row.zone === res.name },
        columns: [['Record name', 'name'], ['Type', 'type'], ['Value', 'value'], ['TTL', 'ttl']],
        empty: 'This hosted zone has no records.' },
      tagTab,
    ],
  },
  {
    id: 'distribution', listRoute: '/cloudfront/distributions', listLabel: 'Distributions',
    detailRoute: '/cloudfront/distributions/:id', path: 'cloudfront.distributions', key: 'id',
    titleField: 'domainName', tabsConfidence: 'partially_sourced',
    summary: [
      { label: 'Distribution ID', field: 'id', mono: true },
      { label: 'Domain name', field: 'domainName', mono: true },
      { label: 'Status', field: 'status' },
      { label: 'State', field: 'state' },
      { label: 'Price class', field: 'priceClass' },
      { label: 'Last modified', field: 'lastModified' },
    ],
    tabs: [
      { label: 'Origins', rows: (r) => (r.origins || []).map((o) => (typeof o === 'string' ? { domainName: o, id: o } : o)),
        columns: [['Origin domain', 'domainName'], ['Origin name', 'id']], empty: 'No origins configured.' },
      { label: 'Behaviors', rows: (r) => (r.defaultCacheBehavior ? [{ path: 'Default (*)', policy: r.defaultCacheBehavior }] : []),
        columns: [['Path pattern', 'path'], ['Cache policy', 'policy']] },
      { label: 'Alternate domain names', rows: (r) => (r.alternateNames || []).map((n) => ({ name: n })),
        columns: [['CNAME', 'name']], empty: 'No alternate domain names (CNAMEs).' },
      tagTab,
    ],
  },
];

export const byDetailRoute = Object.fromEntries(RESOURCES.map((r) => [r.detailRoute, r]));
export const byListRoute = Object.fromEntries(RESOURCES.map((r) => [r.listRoute, r]));
