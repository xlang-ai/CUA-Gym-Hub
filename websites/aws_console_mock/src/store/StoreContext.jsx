import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { getDefaultData, getSessionId, fetchCustomState, saveState, getInitialState, initializeData, initialKey } from './dataManager';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

function deepDiff(initial, current, prefix = '') {
  const diff = {};
  if (initial === current) return diff;
  if (initial == null || current == null || typeof initial !== typeof current) {
    if (initial !== current) {
      diff[prefix || '_root'] = { old: initial, new: current };
    }
    return diff;
  }
  if (Array.isArray(initial) || Array.isArray(current)) {
    if (JSON.stringify(initial) !== JSON.stringify(current)) {
      diff[prefix || '_root'] = { old: initial, new: current };
    }
    return diff;
  }
  if (typeof initial === 'object') {
    const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);
    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const sub = deepDiff(initial[key], current[key], path);
      Object.assign(diff, sub);
    }
    return diff;
  }
  if (initial !== current) {
    diff[prefix || '_root'] = { old: initial, new: current };
  }
  return diff;
}

function reducer(prev, action) {
  const newState = { ...prev };

  switch (action.type) {
    case 'LAUNCH_INSTANCE':
      newState.ec2 = [...prev.ec2, action.payload];
      break;
    case 'TERMINATE_INSTANCE':
      newState.ec2 = prev.ec2.filter(i => i.id !== action.payload);
      break;
    case 'UPDATE_INSTANCE': {
      // Generic field write for the Instance settings dialogs. Keeping these as one case
      // rather than twenty keeps the reducer honest: every settings dialog either lands here
      // and changes state, or it is not implemented.
      const { id, ...fields } = action.payload;
      newState.ec2 = prev.ec2.map(i => i.id === id ? { ...i, ...fields } : i);
      break;
    }
    case 'UPDATE_INSTANCE_STATE':
      newState.ec2 = prev.ec2.map(i =>
        i.id === action.payload.id
          ? { ...i, state: action.payload.state, ...(action.payload.publicIp !== undefined ? { publicIp: action.payload.publicIp } : {}) }
          : i
      );
      break;
    case 'SET_REGION':
      newState.user = { ...prev.user, region: action.payload };
      break;
    case 'MARK_NOTIFICATION_READ':
      newState.notifications = prev.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      break;
    case 'DISMISS_NOTIFICATION':
      newState.notifications = prev.notifications.filter(n => n.id !== action.payload);
      break;
    case 'ADD_NOTIFICATION': {
      const notif = {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload
      };
      newState.notifications = [notif, ...prev.notifications];
      break;
    }
    case 'CREATE_BUCKET':
      newState.s3 = [...prev.s3, action.payload];
      break;
    case 'DELETE_BUCKET':
      newState.s3 = prev.s3.filter(b => b.name !== action.payload);
      break;
    case 'EMPTY_BUCKET':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload ? { ...b, objects: [] } : b
      );
      break;
    case 'UPLOAD_OBJECT':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, objects: [...b.objects, action.payload.object] }
          : b
      );
      break;
    case 'DELETE_OBJECT':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, objects: b.objects.filter(o => o.key !== action.payload.key) }
          : b
      );
      break;
    case 'CREATE_FOLDER':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, objects: [...b.objects, { key: action.payload.folderKey, size: 0, lastModified: new Date().toISOString(), storageClass: "Standard", type: "folder" }] }
          : b
      );
      break;
    case 'UPDATE_BUCKET_VERSIONING':
      newState.s3 = prev.s3.map(b =>
        b.name === action.payload.bucketName
          ? { ...b, versioning: action.payload.versioning }
          : b
      );
      break;
    case 'CREATE_FUNCTION':
      newState.lambda = [...prev.lambda, action.payload];
      break;
    case 'DELETE_FUNCTION':
      newState.lambda = prev.lambda.filter(f => f.name !== action.payload);
      break;
    case 'UPDATE_FUNCTION_CODE':
      newState.lambda = prev.lambda.map(f =>
        f.name === action.payload.name
          ? { ...f, code: action.payload.code, lastModified: new Date().toISOString() }
          : f
      );
      break;
    case 'UPDATE_FUNCTION_CONFIG':
      newState.lambda = prev.lambda.map(f =>
        f.name === action.payload.name
          ? {
              ...f,
              description: action.payload.description,
              memorySize: action.payload.memorySize,
              timeout: action.payload.timeout,
              lastModified: new Date().toISOString()
            }
          : f
      );
      break;
    case 'UPDATE_FUNCTION_ENVIRONMENT':
      newState.lambda = prev.lambda.map(f =>
        f.name === action.payload.name
          ? { ...f, environment: action.payload.environment, lastModified: new Date().toISOString() }
          : f
      );
      break;
    case 'CREATE_DB':
      newState.rds = [...prev.rds, action.payload];
      break;
    case 'DELETE_DB':
      newState.rds = prev.rds.filter(db => db.id !== action.payload);
      break;
    case 'UPDATE_DB_STATUS':
      newState.rds = prev.rds.map(db =>
        db.id === action.payload.id
          ? { ...db, status: action.payload.status }
          : db
      );
      break;
    case 'CREATE_USER':
      newState.iam = {
        ...prev.iam,
        users: [...prev.iam.users, action.payload]
      };
      break;
    case 'DELETE_USER':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.filter(u => u.name !== action.payload),
        groups: prev.iam.groups.map(g => ({
          ...g,
          users: g.users.filter(u => u !== action.payload)
        }))
      };
      break;
    case 'CREATE_ROLE':
      newState.iam = {
        ...prev.iam,
        roles: [...prev.iam.roles, action.payload]
      };
      break;
    case 'DELETE_ROLE':
      newState.iam = {
        ...prev.iam,
        roles: prev.iam.roles.filter(r => r.name !== action.payload)
      };
      break;
    case 'CREATE_GROUP':
      newState.iam = {
        ...prev.iam,
        groups: [...prev.iam.groups, action.payload]
      };
      break;
    case 'DELETE_GROUP':
      newState.iam = {
        ...prev.iam,
        groups: prev.iam.groups.filter(g => g.name !== action.payload)
      };
      break;
    case 'ADD_USER_TO_GROUP':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName
            ? { ...u, groups: [...new Set([...u.groups, action.payload.groupName])] }
            : u
        ),
        groups: prev.iam.groups.map(g =>
          g.name === action.payload.groupName
            ? { ...g, users: [...new Set([...g.users, action.payload.userName])] }
            : g
        )
      };
      break;
    case 'REMOVE_USER_FROM_GROUP':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName
            ? { ...u, groups: u.groups.filter(g => g !== action.payload.groupName) }
            : u
        ),
        groups: prev.iam.groups.map(g =>
          g.name === action.payload.groupName
            ? { ...g, users: g.users.filter(u => u !== action.payload.userName) }
            : g
        )
      };
      break;
    case 'CREATE_SECURITY_GROUP':
      newState.securityGroups = [...prev.securityGroups, action.payload];
      break;
    case 'DELETE_SECURITY_GROUP':
      newState.securityGroups = prev.securityGroups.filter(sg => sg.id !== action.payload);
      break;
    case 'CREATE_KEY_PAIR':
      newState.keyPairs = [...prev.keyPairs, action.payload];
      break;
    case 'DELETE_KEY_PAIR':
      newState.keyPairs = prev.keyPairs.filter(kp => kp.name !== action.payload);
      break;
    case 'TOGGLE_FAVORITE': {
      const favs = prev.favorites || [];
      const idx = favs.indexOf(action.payload);
      newState.favorites = idx >= 0 ? favs.filter(f => f !== action.payload) : [...favs, action.payload];
      break;
    }
    case 'ADD_RECENT_SERVICE': {
      const existing = prev.recentServices.filter(s => s.id !== action.payload.id);
      newState.recentServices = [{ ...action.payload, lastVisited: new Date().toISOString() }, ...existing].slice(0, 10);
      break;
    }
    case 'ADD_FLASH': {
      const flash = {
        id: `flash-${Date.now()}`,
        timestamp: Date.now(),
        ...action.payload
      };
      newState.flash = [...(prev.flash || []), flash];
      break;
    }
    case 'DISMISS_FLASH':
      newState.flash = (prev.flash || []).filter(f => f.id !== action.payload);
      break;
    case 'ADD_PAYMENT_METHOD':
      newState.billing = {
        ...prev.billing,
        paymentMethods: [...(prev.billing.paymentMethods || []), action.payload]
      };
      break;
    case 'ALLOCATE_EIP':
      newState.elasticIps = [...prev.elasticIps, action.payload];
      break;
    case 'ASSOCIATE_EIP':
      newState.elasticIps = prev.elasticIps.map(e =>
        e.allocationId === action.payload.allocationId
          ? {
              ...e,
              associationId: action.payload.associationId,
              instanceId: action.payload.instanceId,
              privateIp: action.payload.privateIp,
              networkInterfaceId: action.payload.networkInterfaceId
            }
          : e
      );
      break;
    case 'CREATE_ALARM':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        alarms: [...prev.cloudwatch.alarms, action.payload]
      };
      break;
    case 'CREATE_ASG':
      newState.autoScalingGroups = [...(prev.autoScalingGroups || []), action.payload];
      break;
    case 'CREATE_BUDGET':
      newState.billing = {
        ...prev.billing,
        budgets: [...(prev.billing.budgets || []), action.payload]
      };
      break;
    case 'CREATE_DASHBOARD':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        dashboards: [...prev.cloudwatch.dashboards, action.payload]
      };
      break;
    case 'CREATE_DISTRIBUTION':
      newState.cloudfront = {
        ...prev.cloudfront,
        distributions: [...(prev.cloudfront.distributions || []), action.payload]
      };
      break;
    case 'CREATE_DYNAMO_TABLE':
      newState.dynamodb = {
        ...prev.dynamodb,
        tables: [...prev.dynamodb.tables, action.payload]
      };
      break;
    case 'CREATE_HOSTED_ZONE':
      newState.route53 = {
        ...prev.route53,
        hostedZones: [...(prev.route53.hostedZones || []), action.payload]
      };
      break;
    case 'CREATE_IDENTITY_PROVIDER':
      newState.iam = {
        ...prev.iam,
        identityProviders: [...(prev.iam.identityProviders || []), action.payload]
      };
      break;
    case 'CREATE_LAMBDA_APPLICATION':
      newState.lambdaApplications = [...(prev.lambdaApplications || []), action.payload];
      break;
    case 'DEPLOY_LAMBDA_APPLICATION':
      newState.lambdaApplications = (prev.lambdaApplications || []).map(a =>
        a.name === action.payload.name
          ? { ...a, status: action.payload.status, lastUpdated: action.payload.lastUpdated }
          : a
      );
      break;
    case 'DELETE_LAMBDA_APPLICATION':
      newState.lambdaApplications = (prev.lambdaApplications || []).filter(a => a.name !== action.payload);
      break;
    case 'CREATE_S3_ACCESS_POINT':
      newState.s3AccessPoints = [...(prev.s3AccessPoints || []), action.payload];
      break;
    case 'DELETE_S3_ACCESS_POINT':
      newState.s3AccessPoints = (prev.s3AccessPoints || []).filter(ap => ap.name !== action.payload);
      break;
    case 'CREATE_S3_BATCH_JOB':
      newState.s3BatchOperations = [...(prev.s3BatchOperations || []), action.payload];
      break;
    case 'UPDATE_S3_BATCH_JOB_STATUS':
      newState.s3BatchOperations = (prev.s3BatchOperations || []).map(j =>
        j.id === action.payload.id
          ? { ...j, status: action.payload.status, ...(action.payload.succeededObjects !== undefined ? { succeededObjects: action.payload.succeededObjects } : {}), ...(action.payload.completed !== undefined ? { completed: action.payload.completed } : {}) }
          : j
      );
      break;
    case 'DELETE_S3_BATCH_JOB':
      newState.s3BatchOperations = (prev.s3BatchOperations || []).filter(j => j.id !== action.payload);
      break;
    case 'UPDATE_STORAGE_LENS_CONFIG':
      newState.s3StorageLens = { ...(prev.s3StorageLens || {}), ...action.payload };
      break;
    case 'RUN_RDS_QUERY':
      newState.rdsQueryHistory = [action.payload, ...(prev.rdsQueryHistory || [])];
      break;
    case 'SAVE_RDS_QUERY':
      newState.rdsQueryHistory = (prev.rdsQueryHistory || []).map(q =>
        q.id === action.payload.id ? { ...q, saved: true, name: action.payload.name } : q
      );
      break;
    case 'DELETE_RDS_QUERY':
      newState.rdsQueryHistory = (prev.rdsQueryHistory || []).filter(q => q.id !== action.payload);
      break;
    case 'UPDATE_BACKUP_RETENTION':
      newState.rdsAutomatedBackups = (prev.rdsAutomatedBackups || []).map(b =>
        b.id === action.payload.id
          ? { ...b, retentionPeriod: action.payload.retentionPeriod, backupRetentionEnabled: action.payload.retentionPeriod > 0 }
          : b
      );
      break;
    case 'DELETE_RETAINED_BACKUP':
      newState.rdsAutomatedBackups = (prev.rdsAutomatedBackups || []).filter(b => !(b.id === action.payload && b.retained));
      break;
    case 'CREATE_IGW':
      newState.vpc = {
        ...prev.vpc,
        internetGateways: [...prev.vpc.internetGateways, action.payload]
      };
      break;
    case 'CREATE_LAMBDA_LAYER':
      newState.lambdaLayers = [...(prev.lambdaLayers || []), action.payload];
      break;
    case 'CREATE_LAUNCH_TEMPLATE':
      newState.launchTemplates = [...(prev.launchTemplates || []), action.payload];
      break;
    case 'CREATE_LOAD_BALANCER':
      newState.loadBalancers = [...(prev.loadBalancers || []), action.payload];
      break;
    case 'CREATE_LOG_GROUP':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        logGroups: [...prev.cloudwatch.logGroups, action.payload]
      };
      break;
    case 'CREATE_NAT':
      newState.vpc = {
        ...prev.vpc,
        natGateways: [...prev.vpc.natGateways, action.payload]
      };
      break;
    case 'CREATE_POLICY':
      newState.iam = {
        ...prev.iam,
        policies: [...prev.iam.policies, action.payload]
      };
      break;
    case 'CREATE_QUEUE':
      newState.sqs = {
        ...prev.sqs,
        queues: [...prev.sqs.queues, action.payload]
      };
      break;
    case 'CREATE_RDS_PARAMETER_GROUP':
      newState.rdsParameterGroups = [...(prev.rdsParameterGroups || []), action.payload];
      break;
    case 'CREATE_RDS_SNAPSHOT':
      newState.rdsSnapshots = [...(prev.rdsSnapshots || []), action.payload];
      break;
    case 'CREATE_RECORD':
      newState.route53 = {
        ...prev.route53,
        records: [...(prev.route53.records || []), action.payload]
      };
      break;
    case 'CREATE_ROUTE_TABLE':
      newState.vpc = {
        ...prev.vpc,
        routeTables: [...prev.vpc.routeTables, action.payload]
      };
      break;
    case 'CREATE_SNAPSHOT':
      newState.snapshots = [...(prev.snapshots || []), action.payload];
      break;
    case 'CREATE_SUBNET':
      newState.vpc = {
        ...prev.vpc,
        subnets: [...prev.vpc.subnets, action.payload]
      };
      break;
    case 'CREATE_SUBSCRIPTION':
      newState.sns = {
        ...prev.sns,
        subscriptions: [...(prev.sns.subscriptions || []), action.payload]
      };
      break;
    case 'CREATE_TARGET_GROUP':
      newState.targetGroups = [...(prev.targetGroups || []), action.payload];
      break;
    case 'CREATE_TOPIC':
      newState.sns = {
        ...prev.sns,
        topics: [...(prev.sns.topics || []), action.payload]
      };
      break;
    case 'CREATE_VOLUME':
      newState.volumes = [...(prev.volumes || []), action.payload];
      break;
    case 'CREATE_VPC':
      newState.vpc = {
        ...prev.vpc,
        vpcs: [...prev.vpc.vpcs, action.payload]
      };
      break;
    case 'DEACTIVATE_ACCESS_KEY':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName
            ? {
                ...u,
                accessKeys: (u.accessKeys || []).map(k =>
                  k.accessKeyId === action.payload.accessKeyId ? { ...k, status: 'Inactive' } : k
                )
              }
            : u
        )
      };
      break;
    case 'DELETE_ACCESS_KEY':
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === action.payload.userName
            ? { ...u, accessKeys: (u.accessKeys || []).filter(k => k.accessKeyId !== action.payload.accessKeyId) }
            : u
        )
      };
      break;
    case 'DELETE_ALARM':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        alarms: prev.cloudwatch.alarms.filter(a => a.name !== action.payload)
      };
      break;
    case 'DELETE_AMI':
      newState.amis = prev.amis.filter(a => a.id !== action.payload);
      break;
    case 'DELETE_ASG':
      newState.autoScalingGroups = (prev.autoScalingGroups || []).filter(a => a.name !== action.payload);
      break;
    case 'DELETE_DASHBOARD':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        dashboards: prev.cloudwatch.dashboards.filter(d => d.name !== action.payload)
      };
      break;
    case 'DELETE_DISTRIBUTION':
      newState.cloudfront = {
        ...prev.cloudfront,
        distributions: (prev.cloudfront.distributions || []).filter(d => d.id !== action.payload)
      };
      break;
    case 'DELETE_DYNAMO_TABLE':
      newState.dynamodb = {
        ...prev.dynamodb,
        tables: prev.dynamodb.tables.filter(t => t.name !== action.payload)
      };
      break;
    case 'DELETE_HOSTED_ZONE':
      newState.route53 = {
        ...prev.route53,
        hostedZones: (prev.route53.hostedZones || []).filter(z => z.id !== action.payload)
      };
      break;
    case 'DELETE_IGW':
      newState.vpc = {
        ...prev.vpc,
        internetGateways: prev.vpc.internetGateways.filter(ig => ig.id !== action.payload)
      };
      break;
    case 'DELETE_LAMBDA_LAYER':
      newState.lambdaLayers = (prev.lambdaLayers || []).filter(l => l.name !== action.payload);
      break;
    case 'DELETE_LAUNCH_TEMPLATE':
      newState.launchTemplates = (prev.launchTemplates || []).filter(lt => lt.id !== action.payload);
      break;
    case 'DELETE_LOAD_BALANCER':
      newState.loadBalancers = (prev.loadBalancers || []).filter(lb => lb.name !== action.payload);
      break;
    case 'DELETE_LOG_GROUP':
      newState.cloudwatch = {
        ...prev.cloudwatch,
        logGroups: prev.cloudwatch.logGroups.filter(lg => lg.name !== action.payload)
      };
      break;
    case 'DELETE_NAT':
      newState.vpc = {
        ...prev.vpc,
        natGateways: prev.vpc.natGateways.filter(n => n.id !== action.payload)
      };
      break;
    case 'DELETE_POLICY':
      newState.iam = {
        ...prev.iam,
        policies: prev.iam.policies.filter(p => p.arn !== action.payload)
      };
      break;
    case 'DELETE_QUEUE':
      newState.sqs = {
        ...prev.sqs,
        queues: prev.sqs.queues.filter(q => q.name !== action.payload)
      };
      break;
    case 'DELETE_RDS_SNAPSHOT':
      newState.rdsSnapshots = (prev.rdsSnapshots || []).filter(s => s.id !== action.payload);
      break;
    case 'DELETE_RECORD':
      newState.route53 = {
        ...prev.route53,
        records: (prev.route53.records || []).filter(r => r.id !== action.payload)
      };
      break;
    case 'DELETE_ROUTE_TABLE':
      newState.vpc = {
        ...prev.vpc,
        routeTables: prev.vpc.routeTables.filter(rt => rt.id !== action.payload)
      };
      break;
    case 'DELETE_SNAPSHOT':
      newState.snapshots = (prev.snapshots || []).filter(s => s.id !== action.payload);
      break;
    case 'DELETE_SUBNET':
      newState.vpc = {
        ...prev.vpc,
        subnets: prev.vpc.subnets.filter(s => s.id !== action.payload)
      };
      break;
    case 'DELETE_SUBSCRIPTION':
      newState.sns = {
        ...prev.sns,
        subscriptions: (prev.sns.subscriptions || []).filter(s => s.id !== action.payload)
      };
      break;
    case 'DELETE_TARGET_GROUP':
      newState.targetGroups = (prev.targetGroups || []).filter(tg => tg.name !== action.payload);
      break;
    case 'DELETE_TOPIC':
      newState.sns = {
        ...prev.sns,
        topics: (prev.sns.topics || []).filter(t => t.arn !== action.payload)
      };
      break;
    case 'DELETE_VOLUME':
      newState.volumes = (prev.volumes || []).filter(v => v.id !== action.payload);
      break;
    case 'DELETE_VPC':
      newState.vpc = {
        ...prev.vpc,
        vpcs: prev.vpc.vpcs.filter(v => v.id !== action.payload)
      };
      break;
    case 'DEREGISTER_TARGET':
      newState.targetGroups = prev.targetGroups.map(tg =>
        tg.name === action.payload.groupName
          ? { ...tg, targets: tg.targets.filter(t => t.id !== action.payload.targetId) }
          : tg
      );
      break;
    case 'DETACH_VOLUME':
      newState.volumes = prev.volumes.map(v =>
        v.id === action.payload ? { ...v, state: 'available', attachedTo: '', device: '' } : v
      );
      break;
    case 'DISASSOCIATE_EIP':
      newState.elasticIps = prev.elasticIps.map(e =>
        e.allocationId === action.payload
          ? { ...e, associationId: '', instanceId: '', privateIp: '', networkInterfaceId: '' }
          : e
      );
      break;
    case 'PURGE_QUEUE':
      newState.sqs = {
        ...prev.sqs,
        queues: prev.sqs.queues.map(q =>
          q.name === action.payload ? { ...q, messagesAvailable: 0, messagesInFlight: 0 } : q
        )
      };
      break;
    case 'REGISTER_TARGET':
      newState.targetGroups = prev.targetGroups.map(tg =>
        tg.name === action.payload.groupName
          ? { ...tg, targets: [...tg.targets, action.payload.target] }
          : tg
      );
      break;
    case 'RELEASE_EIP':
      newState.elasticIps = prev.elasticIps.filter(e => e.allocationId !== action.payload);
      break;
    case 'SEND_MESSAGE':
      newState.sqs = {
        ...prev.sqs,
        queues: prev.sqs.queues.map(q =>
          q.name === action.payload.queueName ? { ...q, messagesAvailable: q.messagesAvailable + 1 } : q
        )
      };
      break;
    case 'UPDATE_ASG':
      newState.autoScalingGroups = prev.autoScalingGroups.map(a =>
        a.name === action.payload.name
          ? { ...a, minSize: action.payload.minSize, maxSize: action.payload.maxSize, desiredCapacity: action.payload.desiredCapacity }
          : a
      );
      break;
    case 'UPDATE_IAM_ACCOUNT_SETTINGS':
      newState.iam = {
        ...prev.iam,
        accountSettings: {
          ...prev.iam.accountSettings,
          ...action.payload,
          passwordPolicy: {
            ...prev.iam.accountSettings.passwordPolicy,
            ...action.payload.passwordPolicy
          }
        }
      };
      break;
    case 'UPDATE_IGW':
      newState.vpc = {
        ...prev.vpc,
        internetGateways: prev.vpc.internetGateways.map(ig =>
          ig.id === action.payload.id ? { ...ig, state: action.payload.state, vpcId: action.payload.vpcId } : ig
        )
      };
      break;
    case 'UPDATE_INSTANCE_TAGS':
      newState.ec2 = prev.ec2.map(i =>
        i.id === action.payload.id ? { ...i, tags: action.payload.tags } : i
      );
      break;
    case 'UPDATE_RDS_SNAPSHOT_STATUS':
      newState.rdsSnapshots = (prev.rdsSnapshots || []).map(s =>
        s.id === action.payload.id ? { ...s, status: action.payload.status } : s
      );
      break;
    case 'UPDATE_TAX_SETTINGS':
      newState.billing = {
        ...prev.billing,
        taxSettings: {
          ...prev.billing.taxSettings,
          ...action.payload,
          address: {
            ...prev.billing.taxSettings.address,
            ...action.payload.address
          }
        }
      };
      break;
    case 'UPDATE_SECURITY_GROUP_RULES': {
      const { id, direction, rules } = action.payload;
      const key = direction === 'outbound' ? 'outboundRules' : 'inboundRules';
      newState.securityGroups = prev.securityGroups.map(sg =>
        sg.id === id ? { ...sg, [key]: rules.map(r => ({ ...r })) } : sg
      );
      break;
    }
    case 'ATTACH_USER_POLICY': {
      const { userName, policyName } = action.payload;
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === userName && !(u.policies || []).includes(policyName)
            ? { ...u, policies: [...(u.policies || []), policyName] }
            : u
        ),
        policies: prev.iam.policies.map(p =>
          p.name === policyName ? { ...p, attachedEntities: (p.attachedEntities || 0) + 1 } : p
        ),
      };
      break;
    }
    case 'DETACH_USER_POLICY': {
      const { userName, policyName } = action.payload;
      newState.iam = {
        ...prev.iam,
        users: prev.iam.users.map(u =>
          u.name === userName ? { ...u, policies: (u.policies || []).filter(x => x !== policyName) } : u
        ),
        policies: prev.iam.policies.map(p =>
          p.name === policyName ? { ...p, attachedEntities: Math.max(0, (p.attachedEntities || 0) - 1) } : p
        ),
      };
      break;
    }
    // ---- generic resource actions ----------------------------------------------
    // Every list page carries the same three verbs behind its Actions menu (tag, delete,
    // toggle-a-field) over ~30 differently-shaped collections: some top-level arrays
    // ('ec2'), some nested ('vpc.subnets'), keyed by id, name, or arn. Writing those by
    // hand 30 times is how the earlier bulk edits went wrong. `path` addresses the
    // collection, `key` names its identity field.
    //
    // Resource-specific cases (DELETE_VPC and friends) are kept and still preferred where
    // deletion has to cascade — this does not cascade, it only removes the row.
    case 'ADD_BILLING_CONTACT': {
      newState.billing = { ...prev.billing, contacts: [...(prev.billing.contacts || []), action.payload] };
      break;
    }
    case 'CREATE_ANOMALY_MONITOR': {
      newState.billing = { ...prev.billing, anomalyMonitors: [...(prev.billing.anomalyMonitors || []), action.payload] };
      break;
    }
    case 'UPDATE_RDS_PARAMETER': {
      // The page used to flash "Parameter updated" and throw the value away — the parameters
      // were a hardcoded array in the component, so the table re-rendered with the old value
      // while the message claimed otherwise.
      const { groupName, parameter, value } = action.payload;
      newState.rdsParameterGroups = prev.rdsParameterGroups.map((g) => (g.name !== groupName ? g : {
        ...g,
        parameters: (g.parameters || []).map((p) => (p.name === parameter ? { ...p, value } : p)),
      }));
      break;
    }
    case 'RECORD_EXPORT': {
      // A download that only fires a toast cannot be verified: the reward function reads
      // /go state_diff, and a browser download leaves no trace there. Recording the export
      // makes "the agent exported the bill" a checkable fact rather than a claim.
      newState.exports = [...(prev.exports || []), action.payload];
      break;
    }
    case 'RESOURCE_SET_TAGS':
    case 'RESOURCE_UPDATE':
    case 'RESOURCE_CREATE':
    case 'RESOURCE_DELETE': {
      const { path, key = 'id', id, fields, tags, item } = action.payload;
      const segs = path.split('.');
      const apply = (node, i) => {
        if (i === segs.length - 1) {
          const list = node[segs[i]] || [];
          const next =
            action.type === 'RESOURCE_DELETE'
              ? list.filter((r) => r[key] !== id)
              : action.type === 'RESOURCE_CREATE'
                ? [...list, item]
                : list.map((r) => r[key] !== id ? r
                    : action.type === 'RESOURCE_SET_TAGS' ? { ...r, tags } : { ...r, ...fields });
          return { ...node, [segs[i]]: next };
        }
        return { ...node, [segs[i]]: apply(node[segs[i]] || {}, i + 1) };
      };
      Object.assign(newState, apply(prev, 0));
      break;
    }
    case 'UPDATE_VPC': {
      const { id, ...fields } = action.payload;
      newState.vpc = { ...prev.vpc, vpcs: prev.vpc.vpcs.map(v => v.id === id ? { ...v, ...fields } : v) };
      break;
    }
    case 'UPDATE_VPC_CIDR': {
      const { id, cidr, secondaryCidrs } = action.payload;
      newState.vpc = { ...prev.vpc, vpcs: prev.vpc.vpcs.map(v => v.id === id
        ? { ...v, cidr, secondaryCidrs: secondaryCidrs || [] } : v) };
      break;
    }
    case 'UPDATE_VPC_TAGS': {
      const { id, tags } = action.payload;
      newState.vpc = { ...prev.vpc, vpcs: prev.vpc.vpcs.map(v => v.id === id ? { ...v, tags } : v) };
      break;
    }
    case 'CREATE_VPC_ENCRYPTION_CONTROL': {
      newState.vpc = { ...prev.vpc, encryptionControls: [...(prev.vpc.encryptionControls || []), action.payload] };
      break;
    }
    case 'CREATE_VPC_FLOW_LOG': {
      newState.vpc = { ...prev.vpc, flowLogs: [...(prev.vpc.flowLogs || []), action.payload] };
      break;
    }
    default:
      return prev;
  }
  return newState;
}

export const StoreProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const [initialStateData, setInitialStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const sidRef = useRef(getSessionId());
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const sid = sidRef.current;

    if (sid) {
      const ik = initialKey(sid);
      const isRefresh = localStorage.getItem(ik) !== null;
      if (isRefresh) {
        const data = initializeData(sid);
        setState(data);
        setInitialStateData(getInitialState(sid) || data);
        setLoading(false);
      } else {
        fetchCustomState(sid).then(customState => {
          const data = initializeData(sid, customState);
          setState(data);
          setInitialStateData(getInitialState(sid) || data);
          setLoading(false);
        });
      }
    } else {
      const data = initializeData();
      setState(data);
      setInitialStateData(getInitialState() || data);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && state) {
      saveState(state, sidRef.current);
    }
  }, [state, loading]);

  const dispatch = useCallback((action) => {
    setState(prev => reducer(prev, action));
  }, []);

  const addFlash = useCallback((type, message) => {
    dispatch({ type: 'ADD_FLASH', payload: { type, message } });
  }, [dispatch]);

  const getDebugState = useCallback(() => {
    const initial = initialStateData || getDefaultData();
    const current = state;
    const stateDiff = deepDiff(initial, current);
    return { initial_state: initial, current_state: current, state_diff: stateDiff };
  }, [state, initialStateData]);

  if (loading || !state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: '"Helvetica Neue", -apple-system, sans-serif', color: '#545B64' }}>
        Loading XWS Console...
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ state, dispatch, getDebugState, addFlash }}>
      {children}
    </StoreContext.Provider>
  );
};
