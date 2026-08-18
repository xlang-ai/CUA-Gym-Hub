import React from 'react';
import { useStore } from '../store/StoreContext';
import { Link } from 'react-router-dom';
import { Bell, FileText, LayoutDashboard, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CloudWatchDashboard() {
  const { state } = useStore();
  const cw = state.cloudwatch;

  const okCount = cw.alarms.filter(a => a.state === 'OK').length;
  const alarmCount = cw.alarms.filter(a => a.state === 'ALARM').length;
  const insuffCount = cw.alarms.filter(a => a.state === 'INSUFFICIENT_DATA').length;

  const recentAlarms = [...cw.alarms].sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 5);

  const summaryCards = [
    { label: 'Alarms', icon: Bell, path: '/cloudwatch/alarms', count: cw.alarms.length, color: 'text-aws-error' },
    { label: 'Log Groups', icon: FileText, path: '/cloudwatch/logs', count: cw.logGroups.length, color: 'text-aws-blue' },
    { label: 'Dashboards', icon: LayoutDashboard, path: '/cloudwatch/dashboards', count: cw.dashboards.length, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-aws-text">CloudWatch Dashboard</h1>

      <div className="aws-card">
        <h2 className="font-bold text-sm mb-4">Alarm Status Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-aws-border rounded p-4 text-center">
            <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-aws-success">{okCount}</div>
            <div className="text-sm text-aws-text-secondary">OK</div>
          </div>
          <div className="border border-aws-border rounded p-4 text-center">
            <AlertTriangle size={24} className="text-aws-error mx-auto mb-2" />
            <div className="text-2xl font-bold text-aws-error">{alarmCount}</div>
            <div className="text-sm text-aws-text-secondary">In alarm</div>
          </div>
          <div className="border border-aws-border rounded p-4 text-center">
            <HelpCircle size={24} className="text-aws-text-disabled mx-auto mb-2" />
            <div className="text-2xl font-bold text-aws-text-secondary">{insuffCount}</div>
            <div className="text-sm text-aws-text-secondary">Insufficient data</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map(c => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.path} className="aws-card hover:border-aws-blue transition-colors block">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} className={c.color} />
                <span className="text-sm font-medium">{c.label}</span>
              </div>
              <div className="text-2xl font-bold">{c.count}</div>
            </Link>
          );
        })}
      </div>

      <div className="aws-card">
        <h2 className="font-bold text-sm mb-3">Recent Alarms</h2>
        <table className="aws-table">
          <thead><tr><th>Name</th><th>State</th><th>Metric</th><th>Namespace</th><th>Last Updated</th></tr></thead>
          <tbody>
            {recentAlarms.map(a => (
              <tr key={a.name}>
                <td className="font-medium text-aws-blue">{a.name}</td>
                <td>
                  <span className={`aws-badge ${a.state === 'OK' ? 'bg-aws-status-success-bg text-aws-success' : a.state === 'ALARM' ? 'bg-aws-status-error-bg text-aws-error' : 'bg-aws-disabled-bg text-aws-text-secondary'}`}>{a.state}</span>
                </td>
                <td>{a.metric}</td>
                <td>{a.namespace}</td>
                <td>{a.updated ? format(new Date(a.updated), 'MMM d, yyyy h:mm a') : '-'}</td>
              </tr>
            ))}
            {recentAlarms.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-aws-text-secondary">No alarms configured.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
