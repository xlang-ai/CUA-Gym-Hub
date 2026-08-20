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
      { label: 'Route table', related: { path: 'vpc.routeTables', match: (row, res) => (row.associations || []).includes(res.id) || row.main },
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
      { label: 'Subnet associations', related: { path: 'vpc.subnets', match: (row, res) => (res.associations || []).includes(row.id) },
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
    // Menu captured from the live console against an in-use volume on 2026-08-18
    // (reference/capture/extracted/ebs-volume-interactions.2026-08-18.json). Delete and Attach
    // were disabled there because the volume was attached, and that gating is reproduced.
    // Items whose feature this mock does not model are shown disabled with the reason rather
    // than dropped — the console offers them, and an agent should be able to see why they are
    // out of reach here.
    list: {
      title: 'Volumes', singular: 'volume', filterPlaceholder: 'Filter volumes',
      searchFields: ['id', 'name', 'volumeType', 'state', 'az'],
      actionsConfidence: 'partially_sourced',
      columns: [
        { label: 'Name', field: 'name' },
        { label: 'Volume ID', field: 'id', mono: true, linkToDetail: true },
        { label: 'Type', field: 'volumeType' },
        { label: 'Size', field: 'size', format: (v) => `${v} GiB` },
        { label: 'IOPS', field: 'iops' },
        { label: 'Throughput', field: 'throughput' },
        { label: 'Snapshot', field: 'snapshotId', mono: true },
        { label: 'Created', field: 'created' },
        { label: 'Availability Zone', field: 'az' },
        { label: 'Volume state', field: 'state' },
        { label: 'Encryption', field: 'encrypted', format: (v) => (v ? 'Encrypted' : 'Not encrypted') },
      ],
      actions: [
        { kind: 'create', label: 'Create volume' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'custom', label: 'Attach volume',
          disabledWhenSelected: (r) => r.state !== 'available',
          disabledReason: 'A volume must be in the available state before it can be attached',
          onSelect: ({ resource, dispatch, addFlash }) => {
            dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'volumes', key: 'id', id: resource.id, fields: { state: 'in-use' } } });
            addFlash('success', `Attached ${resource.id}`);
          } },
        { kind: 'custom', label: 'Detach volume',
          disabledWhenSelected: (r) => r.state !== 'in-use',
          disabledReason: 'Only an in-use volume can be detached',
          onSelect: ({ resource, dispatch, addFlash }) => {
            dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'volumes', key: 'id', id: resource.id, fields: { state: 'available' } } });
            addFlash('success', `Detached ${resource.id}`);
          } },
        { kind: 'unavailable', label: 'Force detach volume',
          reason: 'Force detach bypasses the guest filesystem, which this mock does not simulate' },
        { separator: true },
        { kind: 'unavailable', label: 'Modify volume',
          reason: 'Volume modification runs asynchronously in the real service; not modelled' },
        { kind: 'unavailable', label: 'Create snapshot lifecycle policy',
          reason: 'Data Lifecycle Manager is a separate service and is not modelled' },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete volume' },
      ],
      deleteGuard: {
        blocked: (r) => r.state === 'in-use',
        message: (rs) => `Detach ${rs.map((r) => r.id).join(', ')} before deleting it`,
      },
      create: {
        label: 'Create volume',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'my-volume', optional: true },
          { name: 'volumeType', label: 'Volume type', options: () => ['gp3', 'gp2', 'io2', 'st1', 'sc1'].map((v) => ({ value: v, label: v })) },
          { name: 'size', label: 'Size (GiB)', placeholder: '8' },
          { name: 'az', label: 'Availability Zone', options: (s) => [...new Set(s.vpc.subnets.map((x) => x.az))].map((v) => ({ value: v, label: v })) },
        ],
        build: (f) => ({
          id: `vol-${Math.random().toString(16).substr(2, 17)}`,
          name: f.name || 'unnamed-volume', size: Number(f.size) || 8, volumeType: f.volumeType || 'gp3',
          state: 'available', iops: 3000, throughput: '125 MiB/s', snapshotId: '', az: f.az,
          encrypted: true, created: new Date().toISOString().slice(0, 19).replace('T', ' '), tags: [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'Snapshots', singular: 'snapshot', filterPlaceholder: 'Filter snapshots',
      searchFields: ['id', 'name', 'description', 'volumeId'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Name', field: 'name' },
        { label: 'Snapshot ID', field: 'id', mono: true, linkToDetail: true },
        { label: 'Volume size', field: 'volumeSize', format: (v) => `${v} GiB` },
        { label: 'Description', field: 'description' },
        { label: 'Snapshot status', field: 'status' },
        { label: 'Started', field: 'started' },
        { label: 'Progress', field: 'progress' },
        { label: 'Volume ID', field: 'volumeId', mono: true, link: (r) => `/ec2/volumes/${r.volumeId}` },
      ],
      actions: [
        { kind: 'create', label: 'Create snapshot' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete snapshot' },
      ],
      create: {
        label: 'Create snapshot',
        fields: [
          { name: 'volumeId', label: 'Volume', options: (s) => s.volumes.map((v) => ({ value: v.id, label: `${v.id} (${v.name})` })) },
          { name: 'description', label: 'Description', placeholder: 'my snapshot', optional: true },
        ],
        build: (f, s) => ({
          id: `snap-${Math.random().toString(16).substr(2, 17)}`,
          name: f.description || 'unnamed-snapshot', description: f.description || '',
          volumeId: f.volumeId, volumeSize: s.volumes.find((v) => v.id === f.volumeId)?.size ?? 8,
          status: 'pending', progress: '0%', started: new Date().toISOString().slice(0, 19).replace('T', ' '),
          encrypted: true, storageTier: 'standard', tags: [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'AMIs', singular: 'AMI', filterPlaceholder: 'Filter amis',
      searchFields: ['id', 'name', 'owner', 'platform'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Name', field: 'name', linkToDetail: true },
        { label: 'AMI ID', field: 'id', mono: true },
        { label: 'Source', field: 'owner' },
        { label: 'Owner', field: 'owner' },
        { label: 'Visibility', field: 'public', format: (v) => (v ? 'Public' : 'Private') },
        { label: 'Status', field: 'state' },
        { label: 'Creation date', field: 'created' },
        { label: 'Platform', field: 'platform' },
        { label: 'Root device type', field: 'rootDeviceType' },
        { label: 'Virtualization', field: 'virtualization' },
        { label: 'Architecture', field: 'architecture' },
      ],
      actions: [
        { kind: 'create', label: 'Create AMI' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete AMI' },
      ],
      create: {
        label: 'Create AMI',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'my-ami' },
          { name: 'description', label: 'Description', placeholder: 'built from instance', optional: true },
        ],
        build: (f) => ({
          id: `ami-${Math.random().toString(16).substr(2, 17)}`,
          name: f.name, description: f.description || '', owner: '123456789012', state: 'pending',
          architecture: 'x86_64', platform: 'Linux/UNIX', rootDeviceType: 'ebs', virtualization: 'hvm',
          created: new Date().toISOString().slice(0, 19).replace('T', ' '), public: false, tags: [],
        }),
      },
    },
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
    list: {
      title: 'Key pairs', singular: 'key pair',
      filterPlaceholder: 'Filter key pairs',
      searchFields: ['name', 'id', 'type'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Name', field: 'name', linkToDetail: true },
        { label: 'Key pair ID', field: 'id', mono: true },
        { label: 'Type', field: 'type' },
        { label: 'Fingerprint', field: 'fingerprint', mono: true },
        { label: 'Created', field: 'created' },
      ],
      actions: [
        { kind: 'create', label: 'Create key pair' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { kind: 'unavailable', label: 'Import key pair',
          reason: 'Importing needs a public-key file upload, which this mock does not model' },
        { separator: true },
        { kind: 'delete', label: 'Delete key pair' },
      ],
      create: {
        label: 'Create key pair',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'my-key-pair' },
          { name: 'type', label: 'Key pair type', options: () => [
            { value: 'rsa', label: 'RSA' }, { value: 'ed25519', label: 'ED25519' }] },
        ],
        build: (f) => ({
          name: f.name, id: `key-${Math.random().toString(16).substr(2, 17)}`,
          type: f.type || 'rsa',
          // Deterministic from the name so a task that reads a fingerprint stays reproducible.
          fingerprint: Array.from(f.name).reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381)
            .toString(16).padStart(8, '0').match(/../g).join(':'),
          created: new Date().toISOString().slice(0, 19).replace('T', ' '),
          tags: [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'Elastic IP addresses', singular: 'Elastic IP address', filterPlaceholder: 'Filter elastic ip addresses',
      searchFields: ['allocationId', 'publicIp', 'instanceId'],
      actionsConfidence: 'inferred',
      columns: [
        // Elastic IPs carry no name field; the console's Name column is the Name TAG, which is
        // how AWS surfaces names for resources that have no name attribute of their own.
        { label: 'Name', get: (r) => (r.tags || []).find((t) => t.Key === 'Name')?.Value || '–' },
        { label: 'Allocated IPv4 address', field: 'publicIp', mono: true, linkToDetail: true },
        { label: 'Type', field: 'domain' },
        { label: 'Allocation ID', field: 'allocationId', mono: true },
        { label: 'Associated instance ID', field: 'instanceId', mono: true },
        { label: 'Private IP address', field: 'privateIp', mono: true },
        { label: 'Association ID', field: 'associationId', mono: true },
      ],
      actions: [
        { kind: 'create', label: 'Create Elastic IP address' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete Elastic IP address' },
      ],
      create: {
        label: 'Create Elastic IP address',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'my-eip', optional: true },
        ],
        build: (f) => ({
          allocationId: `eipalloc-${Math.random().toString(16).substr(2, 17)}`,
          publicIp: `52.${Math.floor(Math.random() * 200) + 10}.0.1`,
          associationId: '', instanceId: '', privateIp: '', networkInterfaceId: '',
          domain: 'vpc', tags: f.name ? [{ Key: 'Name', Value: f.name }] : [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'Load balancers', singular: 'load balancer', filterPlaceholder: 'Filter load balancers',
      searchFields: ['name', 'dnsName', 'state', 'type'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Name', field: 'name', linkToDetail: true },
        { label: 'DNS name', field: 'dnsName', mono: true },
        { label: 'State', field: 'state' },
        { label: 'VPC ID', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
        { label: 'Availability Zones', field: 'az' },
        { label: 'Type', field: 'type' },
        { label: 'Date created', field: 'created' },
      ],
      actions: [
        { kind: 'create', label: 'Create load balancer' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete load balancer' },
      ],
      create: {
        label: 'Create load balancer',
        fields: [
          { name: 'name', label: 'Load balancer name', placeholder: 'my-alb' },
          { name: 'type', label: 'Type', options: () => [{ value: 'application', label: 'Application Load Balancer' }, { value: 'network', label: 'Network Load Balancer' }] },
          { name: 'scheme', label: 'Scheme', options: () => [{ value: 'internet-facing', label: 'Internet-facing' }, { value: 'internal', label: 'Internal' }] },
        ],
        build: (f, s) => ({
          name: f.name, arn: `arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/${f.name}`,
          type: f.type || 'application', scheme: f.scheme || 'internet-facing', state: 'provisioning',
          dnsName: `${f.name}-${Math.floor(Math.random() * 900000) + 100000}.us-east-1.elb.amazonaws.com`,
          vpcId: s.vpc.vpcs[0]?.id || '', az: [...new Set(s.vpc.subnets.map((x) => x.az))].slice(0, 2),
          securityGroups: [], listeners: [],
          created: new Date().toISOString().slice(0, 19).replace('T', ' '), tags: [],
        }),
      },
    },
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
    // Menu NOT captured — the 2026-08-18 VPC run mislabelled its igw entry and actually read the
    // network-ACL menu, so these items are inferred from the sibling VPC-family menus.
    list: {
      title: 'Internet gateways', singular: 'internet gateway',
      filterPlaceholder: 'Filter internet gateways',
      searchFields: ['id', 'name', 'vpcId', 'state'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Internet gateway ID', field: 'id', mono: true, linkToDetail: true },
        { label: 'Name', field: 'name' },
        { label: 'State', field: 'state' },
        { label: 'VPC ID', field: 'vpcId', mono: true, link: (r) => `/vpc/vpcs/${r.vpcId}` },
      ],
      actions: [
        { kind: 'create', label: 'Create internet gateway' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete internet gateway' },
      ],
      deleteGuard: {
        blocked: (r) => !!r.vpcId,
        message: (rs) => `Detach ${rs.map((r) => r.id).join(', ')} from its VPC before deleting it`,
      },
      create: {
        label: 'Create internet gateway',
        fields: [{ name: 'name', label: 'Name', placeholder: 'my-igw', optional: true }],
        build: (f) => ({
          id: `igw-${Math.random().toString(16).substr(2, 8)}`,
          name: f.name || 'unnamed-igw', state: 'detached', vpcId: '',
          tags: f.name ? [{ Key: 'Name', Value: f.name }] : [],
        }),
      },
    },
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
    list: {
      title: 'NAT gateways', singular: 'NAT gateway',
      filterPlaceholder: 'Filter NAT gateways',
      searchFields: ['id', 'name', 'subnetId', 'state'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'NAT gateway ID', field: 'id', mono: true, linkToDetail: true },
        { label: 'Name', field: 'name' },
        { label: 'State', field: 'state' },
        { label: 'Subnet', field: 'subnetId', mono: true, link: (r) => `/vpc/subnets/${r.subnetId}` },
        { label: 'Primary public IPv4 address', field: 'publicIp', mono: true },
        { label: 'Primary private IPv4 address', field: 'privateIp', mono: true },
        { label: 'Created', field: 'created' },
      ],
      actions: [
        { kind: 'create', label: 'Create NAT gateway' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete NAT gateway' },
      ],
      create: {
        label: 'Create NAT gateway',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'my-nat-gateway', optional: true },
          { name: 'subnetId', label: 'Subnet',
            options: (state) => state.vpc.subnets.map((sn) => ({ value: sn.id, label: `${sn.id} (${sn.name})` })) },
        ],
        build: (f) => ({
          id: `nat-${Math.random().toString(16).substr(2, 17)}`,
          name: f.name || 'unnamed-nat', state: 'pending', subnetId: f.subnetId,
          publicIp: '', privateIp: '', created: new Date().toISOString().slice(0, 19).replace('T', ' '),
          tags: f.name ? [{ Key: 'Name', Value: f.name }] : [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'Log groups', singular: 'log group', filterPlaceholder: 'Filter log groups',
      searchFields: ['name'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Log group', field: 'name', mono: true, linkToDetail: true },
        { label: 'Retention', field: 'retentionDays', format: (v) => (v ? `${v} days` : 'Never expire') },
        { label: 'Stored bytes', field: 'storedBytes' },
        { label: 'Log streams', field: 'streams' },
        { label: 'Created', field: 'created' },
      ],
      actions: [
        { kind: 'create', label: 'Create log group' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete log group' },
      ],
      create: {
        label: 'Create log group',
        fields: [
          { name: 'name', label: 'Log group name', placeholder: '/aws/lambda/my-function' },
          { name: 'retentionDays', label: 'Retention setting', options: () => [1, 3, 7, 14, 30, 60, 90, 365].map((d) => ({ value: String(d), label: `${d} days` })) },
        ],
        build: (f) => ({
          name: f.name, retentionDays: Number(f.retentionDays) || 30, storedBytes: 0, streams: 0,
          created: new Date().toISOString().slice(0, 19).replace('T', ' '), tags: [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'Topics', singular: 'topic', filterPlaceholder: 'Filter topics',
      searchFields: ['name', 'arn', 'displayName'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Name', field: 'name', linkToDetail: true },
        { label: 'ARN', field: 'arn', mono: true },
        { label: 'Display name', field: 'displayName' },
        { label: 'Type', field: 'type' },
        { label: 'Subscriptions', field: 'subscriptions' },
        { label: 'Created', field: 'created' },
      ],
      actions: [
        { kind: 'create', label: 'Create topic' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete topic' },
      ],
      create: {
        label: 'Create topic',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'my-topic' },
          { name: 'type', label: 'Type', options: () => [{ value: 'Standard', label: 'Standard' }, { value: 'FIFO', label: 'FIFO' }] },
          { name: 'displayName', label: 'Display name', placeholder: 'My topic', optional: true },
        ],
        build: (f) => ({
          name: f.name, arn: `arn:aws:sns:us-east-1:123456789012:${f.name}`,
          displayName: f.displayName || '', type: f.type || 'Standard', subscriptions: 0,
          created: new Date().toISOString().slice(0, 19).replace('T', ' '), tags: [],
        }),
      },
    },
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
    // Menu not captured for this resource; the standard list verbs are inferred from the
    // sibling menus that were captured on 2026-08-18.
    list: {
      title: 'Hosted zones', singular: 'hosted zone', filterPlaceholder: 'Filter hosted zones',
      searchFields: ['id', 'name', 'comment'],
      actionsConfidence: 'inferred',
      columns: [
        { label: 'Hosted zone name', field: 'name', linkToDetail: true },
        { label: 'Type', field: 'type' },
        { label: 'Created by', field: 'createdBy', format: (v) => v || 'Route 53 console' },
        { label: 'Record count', field: 'recordCount' },
        { label: 'Description', field: 'comment' },
        { label: 'Hosted zone ID', field: 'id', mono: true },
      ],
      actions: [
        { kind: 'create', label: 'Create hosted zone' },
        { kind: 'view-details', label: 'View details' },
        { separator: true },
        { kind: 'manage-tags', label: 'Manage tags' },
        { separator: true },
        { kind: 'delete', label: 'Delete hosted zone' },
      ],
      create: {
        label: 'Create hosted zone',
        fields: [
          { name: 'name', label: 'Domain name', placeholder: 'example.com' },
          { name: 'type', label: 'Type', options: () => [{ value: 'Public hosted zone', label: 'Public hosted zone' }, { value: 'Private hosted zone', label: 'Private hosted zone' }] },
          { name: 'comment', label: 'Description', placeholder: 'optional', optional: true },
        ],
        build: (f) => ({
          id: `Z${Math.random().toString(36).substr(2, 13).toUpperCase()}`,
          name: f.name.endsWith('.') ? f.name : `${f.name}.`, type: f.type || 'Public hosted zone',
          recordCount: 2, comment: f.comment || '',
          created: new Date().toISOString().slice(0, 19).replace('T', ' '), tags: [],
        }),
      },
    },
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
