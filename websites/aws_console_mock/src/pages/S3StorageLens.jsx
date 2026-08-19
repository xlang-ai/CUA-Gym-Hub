import React, { useState } from 'react';
import LastUpdated from '../components/LastUpdated';
import { useStore } from '../store/StoreContext';
import {X, BarChart3, Database, HardDrive, Layers} from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
};

export default function S3StorageLens() {
  const { state, dispatch, addFlash } = useStore();
  const lens = state.s3StorageLens || {};
  const bucketMetrics = lens.bucketMetrics || [];
  const [showConfig, setShowConfig] = useState(false);
  const [dashboardName, setDashboardName] = useState(lens.dashboardName || '');
  const [status, setStatus] = useState(lens.status || 'Enabled');
  const [metricsSelection, setMetricsSelection] = useState(lens.metricsSelection || 'Free metrics');

  const totalIncompleteUploads = bucketMetrics.reduce((s, b) => s + (b.incompleteMultipartUploads || 0), 0);
  const totalNoncurrentBytes = bucketMetrics.reduce((s, b) => s + (b.noncurrentVersionBytes || 0), 0);

  const openConfig = () => {
    setDashboardName(lens.dashboardName || '');
    setStatus(lens.status || 'Enabled');
    setMetricsSelection(lens.metricsSelection || 'Free metrics');
    setShowConfig(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!dashboardName.trim()) return;
    dispatch({ type: 'UPDATE_STORAGE_LENS_CONFIG', payload: { dashboardName: dashboardName.trim(), status, metricsSelection } });
    addFlash('success', `Dashboard "${dashboardName.trim()}" configuration updated.`);
    setShowConfig(false);
  };

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Storage Lens</h1>
          <p className="aws-page-header-description">XWS S3 Storage Lens delivers organization-wide visibility into object storage usage and activity trends.</p>
        </div>
        <div className="flex items-center gap-2">
          <LastUpdated />
          <button className="aws-btn aws-btn-call-to-action text-xs" onClick={openConfig}>Configure dashboard</button>
        </div>
      </div>

      <div className="aws-card mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">{lens.dashboardName}</div>
          <div className="text-xs text-aws-text-secondary">Home Region: {lens.homeRegion} &middot; Metrics: {lens.metricsSelection}</div>
        </div>
        <span className={`aws-badge ${lens.status === 'Enabled' ? 'aws-badge-success' : 'aws-badge-neutral'}`}>{lens.status}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="aws-card">
          <div className="flex items-center gap-2 text-aws-text-secondary text-xs mb-1"><Database size={14} /> Total storage</div>
          <div className="text-2xl font-bold">{formatBytes(lens.totalStorageBytes)}</div>
        </div>
        <div className="aws-card">
          <div className="flex items-center gap-2 text-aws-text-secondary text-xs mb-1"><Layers size={14} /> Total objects</div>
          <div className="text-2xl font-bold">{(lens.totalObjectCount || 0).toLocaleString()}</div>
        </div>
        <div className="aws-card">
          <div className="flex items-center gap-2 text-aws-text-secondary text-xs mb-1"><HardDrive size={14} /> Buckets tracked</div>
          <div className="text-2xl font-bold">{bucketMetrics.length}</div>
        </div>
        <div className="aws-card">
          <div className="flex items-center gap-2 text-aws-text-secondary text-xs mb-1"><BarChart3 size={14} /> Incomplete multipart uploads</div>
          <div className="text-2xl font-bold">{totalIncompleteUploads}</div>
        </div>
      </div>

      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg">Bucket breakdown</h2>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th>Bucket</th><th>Region</th><th>Storage</th><th>Object count</th><th>Avg object size</th><th>Incomplete uploads</th><th>Noncurrent version storage</th></tr>
          </thead>
          <tbody>
            {bucketMetrics.map(b => (
              <tr key={b.bucketName}>
                <td className="text-aws-blue font-medium">{b.bucketName}</td>
                <td>{b.region}</td>
                <td>{formatBytes(b.storageBytes)}</td>
                <td>{b.objectCount.toLocaleString()}</td>
                <td>{formatBytes(b.avgObjectSize)}</td>
                <td>{b.incompleteMultipartUploads}</td>
                <td>{formatBytes(b.noncurrentVersionBytes)}</td>
              </tr>
            ))}
            {bucketMetrics.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-aws-text-secondary">No bucket metrics available.</td></tr>}
          </tbody>
          {bucketMetrics.length > 0 && (
            <tfoot>
              <tr className="bg-aws-status-info-bg/30 font-bold border-t-2 border-aws-border">
                <td colSpan={6}>Total noncurrent version storage</td>
                <td>{formatBytes(totalNoncurrentBytes)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showConfig && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-lg">
            <div className="aws-modal-header">
              <h3>Configure dashboard</h3>
              <button onClick={() => setShowConfig(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="aws-modal-body space-y-4">
                <div className="aws-form-group">
                  <label className="aws-form-label">Dashboard name *</label>
                  <input className="aws-input" value={dashboardName} onChange={e => setDashboardName(e.target.value)} required />
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Status</label>
                  <select className="aws-input" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Metrics selection</label>
                  <select className="aws-input" value={metricsSelection} onChange={e => setMetricsSelection(e.target.value)}>
                    <option value="Free metrics">Free metrics</option>
                    <option value="Advanced metrics and recommendations">Advanced metrics and recommendations</option>
                  </select>
                </div>
              </div>
              <div className="aws-modal-footer">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowConfig(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary" disabled={!dashboardName.trim()}>Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
