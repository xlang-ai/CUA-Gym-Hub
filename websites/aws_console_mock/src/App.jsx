import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useParams } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

// EC2
import EC2 from './pages/EC2';
import EC2Dashboard from './pages/EC2Dashboard';
import EC2InstanceDetail from './pages/EC2InstanceDetail';
import EC2InstanceTypes from './pages/EC2InstanceTypes';
import EC2LaunchTemplates from './pages/EC2LaunchTemplates';
import EC2AMIs from './pages/EC2AMIs';
import EC2Volumes from './pages/EC2Volumes';
import EC2Snapshots from './pages/EC2Snapshots';
import EC2SecurityGroups from './pages/EC2SecurityGroups';
import EC2KeyPairs from './pages/EC2KeyPairs';
import EC2ElasticIPs from './pages/EC2ElasticIPs';
import EC2LoadBalancers from './pages/EC2LoadBalancers';
import EC2TargetGroups from './pages/EC2TargetGroups';
import EC2AutoScaling from './pages/EC2AutoScaling';

// S3
import S3Buckets from './pages/S3Buckets';
import S3BucketDetail from './pages/S3BucketDetail';
import S3AccessPoints from './pages/S3AccessPoints';
import S3BatchOperations from './pages/S3BatchOperations';
import S3StorageLens from './pages/S3StorageLens';

// Lambda
import LambdaDashboard from './pages/LambdaDashboard';
import LambdaFunctions from './pages/LambdaFunctions';
import LambdaFunctionDetail from './pages/LambdaFunctionDetail';
import LambdaLayers from './pages/LambdaLayers';
import LambdaApplications from './pages/LambdaApplications';

// RDS
import RDSDashboard from './pages/RDSDashboard';
import RDS from './pages/RDS';
import RDSDetail from './pages/RDSDetail';
import RDSSnapshots from './pages/RDSSnapshots';
import RDSSubnetGroups from './pages/RDSSubnetGroups';
import RDSParameterGroups from './pages/RDSParameterGroups';
import RDSQueryEditor from './pages/RDSQueryEditor';
import RDSPerformanceInsights from './pages/RDSPerformanceInsights';
import RDSAutomatedBackups from './pages/RDSAutomatedBackups';

// IAM
import IAMDashboard from './pages/IAMDashboard';
import IAMUsers from './pages/IAMUsers';
import IAMGroups from './pages/IAMGroups';
import IAMRoles from './pages/IAMRoles';
import IAMPolicies from './pages/IAMPolicies';
import IAMIdentityProviders from './pages/IAMIdentityProviders';
import IAMAccountSettings from './pages/IAMAccountSettings';

// Billing
import BillingDashboard from './pages/BillingDashboard';
import CostExplorer from './pages/CostExplorer';
import BillingBills from './pages/BillingBills';
import BillingBudgets from './pages/BillingBudgets';
import BillingPaymentMethods from './pages/BillingPaymentMethods';
import BillingTaxSettings from './pages/BillingTaxSettings';

// CloudWatch
import CloudWatchDashboard from './pages/CloudWatchDashboard';
import CloudWatchAlarms from './pages/CloudWatchAlarms';
import CloudWatchLogs from './pages/CloudWatchLogs';
import CloudWatchDashboards from './pages/CloudWatchDashboards';

// VPC
import VPCDashboard from './pages/VPCDashboard';
import VPCList from './pages/VPCList';
import VPCEncryptionControls from './pages/VPCEncryptionControls';
import VPCNetworkAcls from './pages/VPCNetworkAcls';
import ResourceDetailPage from './pages/ResourceDetailPage';
import { RESOURCES } from './lib/resourceRegistry';
import VPCSubnets from './pages/VPCSubnets';
import VPCRouteTables from './pages/VPCRouteTables';
import VPCInternetGateways from './pages/VPCInternetGateways';
import VPCNATGateways from './pages/VPCNATGateways';

// DynamoDB
import DynamoDBTables from './pages/DynamoDBTables';
import DynamoDBTableDetail from './pages/DynamoDBTableDetail';

// Messaging / networking / audit
import SNSTopics from './pages/SNSTopics';
import SQSQueues from './pages/SQSQueues';
import Route53HostedZones from './pages/Route53HostedZones';
import CloudFrontDistributions from './pages/CloudFrontDistributions';
import CloudTrailEventHistory from './pages/CloudTrailEventHistory';

import StateInspector from './pages/StateInspector';

function RedirectWithQuery({ to }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={query ? `${to}?${query}` : to} replace />;
}

/**
 * Backward compatibility: every nav target used to resolve to `/local/:service/:item`
 * (a placeholder page). Tasks authored against those URLs must keep working, so the
 * legacy path now redirects to the real implementation instead of 404-ing.
 */
const LEGACY_LOCAL_ROUTES = {
  'ec2/dashboard': '/ec2/dashboard',
  'ec2/instance-types': '/ec2/instance-types',
  'ec2/launch-templates': '/ec2/launch-templates',
  'ec2/amis': '/ec2/amis',
  'ec2/volumes': '/ec2/volumes',
  'ec2/snapshots': '/ec2/snapshots',
  'ec2/elastic-ips': '/ec2/elastic-ips',
  'ec2/load-balancers': '/ec2/load-balancers',
  'ec2/target-groups': '/ec2/target-groups',
  'ec2/auto-scaling-groups': '/ec2/auto-scaling-groups',
  'lambda/dashboard': '/lambda/dashboard',
  'lambda/layers': '/lambda/layers',
  'rds/dashboard': '/rds/dashboard',
  'rds/snapshots': '/rds/snapshots',
  'rds/subnet-groups': '/rds/subnet-groups',
  'rds/parameter-groups': '/rds/parameter-groups',
  'iam/identity-providers': '/iam/identity-providers',
  'iam/account-settings': '/iam/account-settings',
  'billing/bills': '/billing/bills',
  'billing/budgets': '/billing/budgets',
  'billing/payment-methods': '/billing/payment-methods',
  'billing/tax-settings': '/billing/tax-settings',
  's3/access-points': '/s3/access-points',
  's3/batch-operations': '/s3/batch-operations',
  's3/storage-lens': '/s3/storage-lens',
  'lambda/applications': '/lambda/applications',
  'rds/query-editor': '/rds/query-editor',
  'rds/performance-insights': '/rds/performance-insights',
  'rds/automated-backups': '/rds/automated-backups',
};

function LegacyLocalRedirect() {
  const { service, item } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const target = LEGACY_LOCAL_ROUTES[`${service}/${item}`];
  if (!target) return <Navigate to="/" replace />;
  return <Navigate to={query ? `${target}?${query}` : target} replace />;
}

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* EC2 */}
            <Route path="/ec2" element={<EC2 />} />
            <Route path="/ec2/dashboard" element={<EC2Dashboard />} />
            <Route path="/ec2/instances/:instanceId" element={<EC2InstanceDetail />} />
            <Route path="/ec2/instance-types" element={<EC2InstanceTypes />} />
            <Route path="/ec2/launch-templates" element={<EC2LaunchTemplates />} />
            <Route path="/ec2/amis" element={<EC2AMIs />} />
            <Route path="/ec2/volumes" element={<EC2Volumes />} />
            <Route path="/ec2/snapshots" element={<EC2Snapshots />} />
            <Route path="/ec2/security-groups" element={<EC2SecurityGroups />} />
            <Route path="/ec2/key-pairs" element={<EC2KeyPairs />} />
            <Route path="/ec2/elastic-ips" element={<EC2ElasticIPs />} />
            <Route path="/ec2/load-balancers" element={<EC2LoadBalancers />} />
            <Route path="/ec2/target-groups" element={<EC2TargetGroups />} />
            <Route path="/ec2/auto-scaling-groups" element={<EC2AutoScaling />} />

            {/* S3 */}
            <Route path="/s3" element={<S3Buckets />} />
            <Route path="/s3/access-points" element={<S3AccessPoints />} />
            <Route path="/s3/batch-operations" element={<S3BatchOperations />} />
            <Route path="/s3/storage-lens" element={<S3StorageLens />} />
            <Route path="/s3/:bucketName" element={<S3BucketDetail />} />

            {/* Lambda */}
            <Route path="/lambda" element={<LambdaFunctions />} />
            <Route path="/lambda/dashboard" element={<LambdaDashboard />} />
            <Route path="/lambda/layers" element={<LambdaLayers />} />
            <Route path="/lambda/applications" element={<LambdaApplications />} />
            <Route path="/lambda/:functionName" element={<LambdaFunctionDetail />} />

            {/* RDS */}
            <Route path="/rds" element={<RDS />} />
            <Route path="/rds/dashboard" element={<RDSDashboard />} />
            <Route path="/rds/snapshots" element={<RDSSnapshots />} />
            <Route path="/rds/subnet-groups" element={<RDSSubnetGroups />} />
            <Route path="/rds/parameter-groups" element={<RDSParameterGroups />} />
            <Route path="/rds/query-editor" element={<RDSQueryEditor />} />
            <Route path="/rds/performance-insights" element={<RDSPerformanceInsights />} />
            <Route path="/rds/automated-backups" element={<RDSAutomatedBackups />} />
            <Route path="/rds/:dbId" element={<RDSDetail />} />

            {/* IAM */}
            <Route path="/iam" element={<IAMDashboard />} />
            <Route path="/iam/users" element={<IAMUsers />} />
            <Route path="/iam/groups" element={<IAMGroups />} />
            <Route path="/iam/roles" element={<IAMRoles />} />
            <Route path="/iam/policies" element={<IAMPolicies />} />
            <Route path="/iam/identity-providers" element={<IAMIdentityProviders />} />
            <Route path="/iam/account-settings" element={<IAMAccountSettings />} />

            {/* Billing */}
            <Route path="/billing" element={<BillingDashboard />} />
            <Route path="/billing/cost-explorer" element={<CostExplorer />} />
            <Route path="/billing/bills" element={<BillingBills />} />
            <Route path="/billing/budgets" element={<BillingBudgets />} />
            <Route path="/billing/payment-methods" element={<BillingPaymentMethods />} />
            <Route path="/billing/tax-settings" element={<BillingTaxSettings />} />

            {/* CloudWatch */}
            <Route path="/cloudwatch" element={<CloudWatchDashboard />} />
            <Route path="/cloudwatch/alarms" element={<CloudWatchAlarms />} />
            <Route path="/cloudwatch/logs" element={<CloudWatchLogs />} />
            <Route path="/cloudwatch/dashboards" element={<CloudWatchDashboards />} />

            {/* VPC */}
            <Route path="/vpc" element={<VPCDashboard />} />
            <Route path="/vpc/vpcs" element={<VPCList />} />
            <Route path="/vpc/encryption-controls" element={<VPCEncryptionControls />} />
            <Route path="/vpc/network-acls" element={<VPCNetworkAcls />} />
            <Route path="/vpc/subnets" element={<VPCSubnets />} />
            <Route path="/vpc/route-tables" element={<VPCRouteTables />} />
            <Route path="/vpc/internet-gateways" element={<VPCInternetGateways />} />
            <Route path="/vpc/nat-gateways" element={<VPCNATGateways />} />

            {/* DynamoDB */}
            <Route path="/dynamodb" element={<RedirectWithQuery to="/dynamodb/tables" />} />
            <Route path="/dynamodb/tables" element={<DynamoDBTables />} />
            <Route path="/dynamodb/tables/:tableName" element={<DynamoDBTableDetail />} />

            {/* SNS / SQS / Route 53 / CloudFront / CloudTrail */}
            <Route path="/sns" element={<RedirectWithQuery to="/sns/topics" />} />
            <Route path="/sns/topics" element={<SNSTopics />} />
            <Route path="/sqs" element={<RedirectWithQuery to="/sqs/queues" />} />
            <Route path="/sqs/queues" element={<SQSQueues />} />
            <Route path="/route53" element={<RedirectWithQuery to="/route53/hosted-zones" />} />
            <Route path="/route53/hosted-zones" element={<Route53HostedZones />} />
            <Route path="/cloudfront" element={<RedirectWithQuery to="/cloudfront/distributions" />} />
            <Route path="/cloudfront/distributions" element={<CloudFrontDistributions />} />
            <Route path="/cloudtrail" element={<RedirectWithQuery to="/cloudtrail/events" />} />
            <Route path="/cloudtrail/events" element={<CloudTrailEventHistory />} />

            {/* Legacy placeholder URLs kept alive for previously authored tasks */}
            {/* The console's second layer, generated from src/lib/resourceRegistry.js.
                Measured before these existed: 58 routes had a populated table and 5 had rows
                that led anywhere. */}
            {RESOURCES.map((r) => (
              <Route key={r.id} path={r.detailRoute} element={<ResourceDetailPage resourceId={r.id} />} />
            ))}
            <Route path="/local/:service/:item" element={<LegacyLocalRedirect />} />

            <Route path="/go" element={<StateInspector />} />
            <Route path="*" element={<RedirectWithQuery to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
