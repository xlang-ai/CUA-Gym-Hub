/**
 * The EC2 instance Actions menu, as the live console defines it.
 *
 * Captured 2026-08-18 by reading the real console with a stopped instance and a running
 * instance selected and diffing every item's `aria-disabled`. See
 * reference/capture/extracted/ec2-instance-interactions.2026-08-18.json.
 *
 * The point of this file is that enablement is DATA, not scattered `if` statements. The page
 * renders it, and a test can assert the mock gates the same items the console gates. When it
 * lived inside the page as `if (action === 'start' && inst.state === 'stopped')`, a Start
 * click on a running instance fell through to nothing at all — menu closes, no flash, no
 * change — which reads to an agent as success.
 *
 * `requires` is the instance state an item needs. The console does not hide these items; it
 * shows them disabled, so the vocabulary stays discoverable and the reason stays legible.
 */

export const INSTANCE_TYPES = [
  't2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium', 't3.large',
  't3.xlarge', 'm5.large', 'm5.xlarge', 'm5.2xlarge', 'c5.large', 'c5.xlarge', 'r5.large',
  'r5.xlarge',
];

/**
 * Settings dialogs reachable from Instance settings. Each is a real form over a real field,
 * so "implemented" means the value round-trips through the store — not that a modal appears.
 */
export const INSTANCE_SETTINGS = [
  { label: 'Attach to Auto Scaling Group', field: 'autoScalingGroup', kind: 'text', requires: 'running',
    help: 'Attach this instance to an existing Auto Scaling group.' },
  { label: 'Change stop protection', field: 'stopProtection', kind: 'toggle',
    help: 'Prevents the instance from being stopped through the console, CLI, or API.' },
  { label: 'Change termination protection', field: 'terminationProtection', kind: 'toggle',
    help: 'Prevents the instance from being terminated through the console, CLI, or API.' },
  { label: 'Change shutdown behavior', field: 'shutdownBehavior', kind: 'select',
    options: ['Stop', 'Terminate'],
    help: 'What happens when the instance is shut down from the guest operating system.' },
  { label: 'Change auto-recovery behavior', field: 'autoRecovery', kind: 'select',
    options: ['Default', 'Disabled'],
    help: 'Whether the instance is automatically recovered after an underlying hardware failure.' },
  { label: 'Change instance migration on reboot', field: 'migrateOnReboot', kind: 'toggle',
    help: 'Migrate the instance to new hardware on its next reboot.' },
  { label: 'Protect with Elastic Disaster Recovery', field: 'drsProtected', kind: 'toggle', requires: 'running',
    help: 'Replicate this instance with Elastic Disaster Recovery.' },
  { label: 'Change instance type', field: 'type', kind: 'select', options: INSTANCE_TYPES, requires: 'stopped',
    help: 'The instance must be stopped before its type can be changed.' },
  { label: 'Change CPU options', field: 'cpuCores', kind: 'number', requires: 'stopped',
    help: 'Core count and threads per core. The instance must be stopped.' },
  { label: 'Modify instance placement', field: 'placementGroup', kind: 'text', requires: 'stopped',
    help: 'Placement group, tenancy and affinity. The instance must be stopped.' },
  { label: 'Modify Capacity Reservation settings', field: 'capacityReservation', kind: 'select',
    options: ['open', 'none'], requires: 'stopped',
    help: 'How this instance consumes Capacity Reservations. The instance must be stopped.' },
  { label: 'Change Nitro Enclaves', field: 'nitroEnclaves', kind: 'toggle', requires: 'stopped',
    help: 'Enable AWS Nitro Enclaves. The instance must be stopped.' },
  { label: 'Connect RDS database', field: 'connectedDatabase', kind: 'text', requires: 'running',
    help: 'Set up a connection between this instance and an RDS database.' },
  { label: 'Change credit specification', field: 'creditSpecification', kind: 'select',
    options: ['standard', 'unlimited'], requires: 'running',
    help: 'Burstable performance credit mode. Applies to T-family instances.' },
  { label: 'Change resource based naming options', field: 'hostnameType', kind: 'select',
    options: ['ip-name', 'resource-name'],
    help: 'Whether guest OS hostnames are derived from the IP address or the resource id.' },
  { label: 'Edit user data', field: 'userData', kind: 'textarea', requires: 'stopped',
    help: 'Script run at launch. The instance must be stopped to edit it.' },
  { label: 'Modify SQL High Availability settings', field: 'sqlHa', kind: 'toggle', capability: 'windows',
    help: 'Available only on SQL Server instances.' },
  { label: 'Allow tags in instance metadata', field: 'tagsInMetadata', kind: 'toggle',
    help: 'Expose instance tags through the instance metadata service.' },
  { label: 'Modify instance metadata options', field: 'imdsv2', kind: 'select',
    options: ['required', 'optional'],
    help: 'Whether IMDSv2 session tokens are required.' },
  { label: 'Manage tags', field: 'tags', kind: 'tags',
    help: 'Add, edit or remove tags on this instance.' },
];

export const NETWORKING_SETTINGS = [
  { label: 'Attach network interface', field: 'attachedEni', kind: 'text',
    help: 'Attach an additional elastic network interface.' },
  { label: 'Detach network interface', field: 'attachedEni', kind: 'clear',
    help: 'Detach the secondary network interface.' },
  { label: 'Manage IP addresses', field: 'privateIp', kind: 'text',
    help: 'Assign or unassign private IPv4 addresses.' },
  { label: 'Disassociate Elastic IP address', field: 'publicIp', kind: 'clear',
    help: 'Release the Elastic IP association from this instance.' },
  { label: 'Change source/destination check', field: 'sourceDestCheck', kind: 'toggle',
    help: 'Disable for NAT instances that forward traffic.' },
  { label: 'Manage ENA express', field: 'enaExpress', kind: 'toggle', capability: 'enaExpress',
    help: 'ENA Express requires a supported instance type.' },
  { label: 'Manage ENA queues', field: 'enaQueues', kind: 'number', requires: 'stopped',
    help: 'Queue count per network interface. The instance must be stopped.' },
  { label: 'Manage bandwidth', field: 'bandwidthWeighting', kind: 'select',
    options: ['default', 'vpc-1', 'ebs-1'], capability: 'bandwidthWeighting',
    help: 'Bandwidth weighting requires a supported instance type.' },
];

export const SECURITY_SETTINGS = [
  { label: 'Change security groups', field: 'securityGroups', kind: 'securityGroups',
    help: 'Replace the security groups attached to this instance.' },
  { label: 'Modify IAM role', field: 'iamRole', kind: 'text',
    help: 'Attach or replace the IAM instance profile.' },
  { label: 'Get Windows password', field: null, kind: 'readonly', capability: 'windows',
    help: 'Available only on Windows instances.' },
];

export const STORAGE_SETTINGS = [
  { label: 'Attach volume', field: 'volumes', kind: 'attachVolume',
    help: 'Attach an available EBS volume to this instance.' },
  { label: 'Detach volume', field: 'volumes', kind: 'detachVolume',
    help: 'Detach a non-root EBS volume.' },
  { label: 'Replace root volume', field: 'rootDeviceName', kind: 'readonly', requires: 'running',
    help: 'Restore the root volume from a snapshot or the original AMI.' },
];

export const MONITOR_SETTINGS = [
  { label: 'Manage detailed monitoring', field: 'monitoring', kind: 'select',
    options: ['enabled', 'disabled'], help: 'One-minute metrics instead of five-minute.' },
  { label: 'Manage CloudWatch alarms', field: null, kind: 'link', to: '/cloudwatch/alarms',
    help: 'Alarms for this instance.' },
  { label: 'Configure CloudWatch agent', field: 'cwAgent', kind: 'toggle', requires: 'running',
    help: 'Install and configure the CloudWatch agent.' },
  { label: 'Get system log', field: null, kind: 'systemLog', help: 'Console output from the guest.' },
  { label: 'Get instance screenshot', field: null, kind: 'screenshot', requires: 'running',
    help: 'Capture the instance console screen.' },
  { label: 'Connect to serial port', field: null, kind: 'serialPort', requires: 'running',
    help: 'EC2 Serial Console session.' },
  { label: 'Visit SSM Fleet Manager', field: null, kind: 'link', to: '/ec2',
    help: 'Manage this instance in Systems Manager.' },
];

/**
 * Why an item is unavailable, or null when it is available.
 * Mirrors the live console: state gates first, then capability gates.
 */
export function unavailableReason(item, instance) {
  if (!instance) return 'Select an instance';
  if (item.requires && instance.state !== item.requires) {
    return `The instance must be ${item.requires} (it is ${instance.state})`;
  }
  if (item.capability === 'windows' && !/windows/i.test(instance.platform || '')) {
    return 'Available only on Windows instances';
  }
  if (item.capability === 'enaExpress' && !/^(c5n|m5n|r5n|c6gn)/.test(instance.type || '')) {
    return 'Not supported on this instance type';
  }
  if (item.capability === 'bandwidthWeighting' && !/^(m7i|c7i|r7i)/.test(instance.type || '')) {
    return 'Not supported on this instance type';
  }
  if (item.capability === 'hibernation' && !instance.hibernationConfigured) {
    return 'Hibernation was not enabled when this instance was launched';
  }
  return null;
}

/**
 * Top-level items that sit above the state commands in the console's Actions menu.
 * Connect is gated on the instance running — it was missed on the first pass and gate S6,
 * replaying the captured matrix, caught it.
 */
export const TOP_LEVEL = [
  { label: 'Connect', kind: 'connect', requires: 'running',
    help: 'Connect over EC2 Instance Connect, Session Manager, or SSH.' },
  { label: 'Launch instances', kind: 'link', to: '/ec2?launch=1',
    help: 'Open the launch wizard.' },
  { label: 'Launch instance from template', kind: 'link', to: '/ec2/launch-templates',
    help: 'Launch from an existing launch template.' },
  { label: 'Migrate a server', kind: 'link', to: '/ec2',
    help: 'Application Migration Service.' },
  { label: 'Instance diagnostics', kind: 'diagnostics',
    help: 'Run the automated diagnostic checks.' },
];

/** Top-level state commands, with the same gating the console applies. */
export const STATE_COMMANDS = [
  { label: 'Start instance', to: 'running', requires: 'stopped' },
  { label: 'Stop instance', to: 'stopped', requires: 'running' },
  { label: 'Reboot instance', to: 'running', requires: 'running' },
  { label: 'Hibernate instance', to: 'stopped', requires: 'running', capability: 'hibernation' },
  { label: 'Terminate (delete) instance', to: 'terminated', requires: null, danger: true },
];
