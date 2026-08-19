/**
 * The EC2 instance table's column set, as the live console offers it.
 *
 * Captured 2026-08-18 by opening the console's Preferences panel and reading its attribute-column
 * list: 51 columns, 16 on by default (plus the pinned Name column) and 35 behind Preferences.
 * The mock shipped 7. See reference/capture/extracted/ec2.2026-08-18.json.
 *
 * Every column resolves through `get(instance)`, derived from the record rather than stored on
 * it. Two reasons: task harnesses inject partial instances and must not crash on a missing
 * field, and derivation keeps the seed literal untouched.
 *
 * Derived values are DETERMINISTIC — keyed off the instance id, never random — because a column
 * an agent reads has to be the same on every run or a check over it cannot be written.
 *
 * `get(instance, state)` receives the whole store so cross-resource columns (Elastic IP) can
 * resolve. Columns that stay blank for every seeded instance — Kernel ID, RAM disk ID, Placement
 * group, Outpost ARN — are blank in the real console too for ordinary HVM instances, so an
 * em-dash there is the faithful answer rather than a gap.
 */

const dash = '–';
const hex = (id, n, len) => {
  // Stable pseudo-identifier from the instance id: same instance, same value, every run.
  const raw = String(id).replace(/[^0-9a-f]/gi, '');
  const start = (n * 3) % Math.max(1, raw.length - len);
  return (raw.slice(start, start + len) + raw).slice(0, len);
};
const isGraviton = (t) => /^\w*g\d?[.a-z]*\./.test(String(t)) && /g\./.test(String(t));
const arch = (i) => (/^(a1|t4g|m6g|m7g|c6g|c7g|r6g|r7g|m8g)/.test(i.type || '') ? 'arm64' : 'x86_64');

export const EC2_COLUMNS = [
  // ---- pinned ----------------------------------------------------------------------------
  { key: 'name', label: 'Name', pinned: true, default: true, get: (i) => i.name || dash },

  // ---- default on (captured) -------------------------------------------------------------
  { key: 'id', label: 'Instance ID', default: true, get: (i) => i.id },
  { key: 'state', label: 'Instance state', default: true, get: (i) => i.state },
  { key: 'type', label: 'Instance type', default: true, get: (i) => i.type },
  { key: 'statusCheck', label: 'Status check', default: true,
    get: (i) => (i.state === 'running' ? '3/3 checks passed' : dash) },
  { key: 'az', label: 'Availability Zone', default: true, get: (i) => i.az },
  { key: 'publicDns', label: 'Public IPv4 DNS', default: true,
    get: (i) => (i.publicIp && i.publicIp !== '-'
      ? `ec2-${String(i.publicIp).replace(/\./g, '-')}.compute-1.amazonaws.com` : dash) },
  { key: 'publicIp', label: 'Public IPv4 address', default: true,
    get: (i) => (i.publicIp && i.publicIp !== '-' ? i.publicIp : dash) },
  // Resolved against the account's Elastic IPs rather than left blank: the mock has the
  // association, so the column should show it the way the console does.
  { key: 'elasticIp', label: 'Elastic IP', default: true,
    get: (i, state) => (state?.elasticIps || []).find((e) => e.instanceId === i.id)?.publicIp || dash },
  { key: 'ipv6', label: 'IPv6 IPs', default: true, get: () => dash },
  { key: 'monitoring', label: 'Monitoring', default: true, get: (i) => i.monitoring || 'disabled' },
  { key: 'sgName', label: 'Security group name', default: true,
    get: (i) => (i.securityGroups || []).join(', ') || dash },
  { key: 'keyName', label: 'Key name', default: true, get: (i) => i.keyPair || dash },
  { key: 'launchTime', label: 'Launch time', default: true, get: (i) => i.launchTime || dash },
  { key: 'platformDetails', label: 'Platform details', default: true, get: (i) => i.platform || 'Linux/UNIX' },
  { key: 'managed', label: 'Managed', default: true, get: () => 'No' },
  { key: 'operator', label: 'Operator', default: true, get: () => 'Self' },

  // ---- behind Preferences (captured) -----------------------------------------------------
  { key: 'alarmStatus', label: 'Alarm status', get: () => 'No alarms' },
  { key: 'privateDns', label: 'Private DNS name',
    get: (i) => (i.privateIp ? `ip-${String(i.privateIp).replace(/\./g, '-')}.ec2.internal` : dash) },
  { key: 'privateIp', label: 'Private IP address', get: (i) => i.privateIp || dash },
  { key: 'sgIds', label: 'Security group IDs', get: (i) => (i.securityGroups || []).join(', ') || dash },
  { key: 'ownerId', label: 'Owner ID', get: () => '123456789012' },
  { key: 'volumeId', label: 'Volume ID', get: (i) => (i.volumes || []).join(', ') || dash },
  { key: 'rootDeviceName', label: 'Root device name', get: (i) => i.rootDeviceName || '/dev/xvda' },
  { key: 'rootDeviceType', label: 'Root device type', get: (i) => i.rootDeviceType || 'ebs' },
  { key: 'ebsOptimized', label: 'EBS optimized', get: (i) => (/^t2\./.test(i.type || '') ? 'No' : 'Yes') },
  { key: 'imageId', label: 'Image ID', get: (i) => i.ami || dash },
  { key: 'kernelId', label: 'Kernel ID', get: () => dash },
  { key: 'ramdiskId', label: 'RAM disk ID', get: () => dash },
  { key: 'amiLaunchIndex', label: 'AMI launch index', get: () => '0' },
  { key: 'reservationId', label: 'Reservation ID', get: (i) => `r-${hex(i.id, 1, 17)}` },
  { key: 'vpcId', label: 'VPC ID', get: (i) => i.vpcId || dash },
  { key: 'subnetId', label: 'Subnet IDs', get: (i) => i.subnetId || dash },
  { key: 'lifecycle', label: 'Instance lifecycle', get: () => 'normal' },
  { key: 'architecture', label: 'Architecture', get: arch },
  { key: 'virtualization', label: 'Virtualization type', get: () => 'hvm' },
  { key: 'platform', label: 'Platform', get: (i) => (/windows/i.test(i.platform || '') ? 'windows' : dash) },
  { key: 'iamProfile', label: 'IAM instance profile ARN',
    get: (i) => (i.iamRole ? `arn:aws:iam::123456789012:instance-profile/${i.iamRole}` : dash) },
  { key: 'tenancy', label: 'Tenancy', get: () => 'default' },
  { key: 'affinity', label: 'Affinity', get: () => dash },
  { key: 'hostId', label: 'Host ID', get: () => dash },
  { key: 'placementGroup', label: 'Placement group', get: () => dash },
  { key: 'partitionNumber', label: 'Partition number', get: () => dash },
  { key: 'capacityReservationId', label: 'Capacity Reservation ID', get: () => dash },
  { key: 'stateReasonCode', label: 'State transition reason code',
    get: (i) => (i.state === 'stopped' ? 'Client.UserInitiatedShutdown' : dash) },
  { key: 'stateReasonMessage', label: 'State transition reason message',
    get: (i) => (i.state === 'stopped' ? 'User initiated shutdown' : dash) },
  { key: 'hibernationBehavior', label: 'Stop-hibernation behavior', get: () => 'stop' },
  { key: 'outpostArn', label: 'Outpost ARN', get: () => dash },
  { key: 'productCodes', label: 'Product codes', get: () => dash },
  { key: 'azId', label: 'Availability Zone ID',
    get: (i) => (i.az ? `use1-az${(String(i.az).charCodeAt(String(i.az).length - 1) % 6) + 1}` : dash) },
  { key: 'imdsv2', label: 'IMDSv2', get: () => 'Required' },
  { key: 'usageOperation', label: 'Usage operation', get: () => 'RunInstances' },
];

export const DEFAULT_COLUMN_KEYS = EC2_COLUMNS.filter((c) => c.default).map((c) => c.key);
export const columnByKey = Object.fromEntries(EC2_COLUMNS.map((c) => [c.key, c]));
