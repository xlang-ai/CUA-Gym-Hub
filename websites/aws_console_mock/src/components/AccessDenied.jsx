import React from 'react';
import { ShieldOff } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function AccessDenied({ service = 'this service', region, action = 'DescribeResources' }) {
  const { state } = useStore();
  const userName = state.user?.name || 'current user';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{service}</h1>
      <div className="aws-card border-aws-error/40 bg-aws-status-error-bg">
        <div className="flex items-start gap-3 p-2">
          <ShieldOff size={24} className="text-aws-error flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-aws-error text-sm">Access Denied</h3>
            <p className="text-sm text-aws-error mt-1">
              User <span className="font-mono font-bold">{userName}</span> is not authorized to perform <span className="font-mono">{action}</span>
              {region && <> in region <span className="font-mono font-bold">{region}</span></>}.
            </p>
            <p className="text-sm text-aws-error mt-2">
              You need to assume a role with appropriate permissions. Use <strong>Switch Role</strong> from the account menu (top-right) to assume an administrator role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
