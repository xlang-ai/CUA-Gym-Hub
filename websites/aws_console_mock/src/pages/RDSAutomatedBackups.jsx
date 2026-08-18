import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { RefreshCw, X, Archive, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function RDSAutomatedBackups() {
  const { state, dispatch, addFlash } = useStore();
  const backups = state.rdsAutomatedBackups || [];
  const [modifyId, setModifyId] = useState(null);
  const [retention, setRetention] = useState(7);

  const active = backups.filter(b => !b.retained);
  const retained = backups.filter(b => b.retained);

  const openModify = (b) => { setModifyId(b.id); setRetention(b.retentionPeriod); };

  const handleModify = (e) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_BACKUP_RETENTION', payload: { id: modifyId, retentionPeriod: Number(retention) } });
    addFlash('success', `Backup retention updated for "${modifyId}".`);
    setModifyId(null);
  };

  const handleDeleteRetained = (b) => {
    dispatch({ type: 'DELETE_RETAINED_BACKUP', payload: b.id });
    addFlash('success', `Retained backup for "${b.dbInstanceId}" deleted.`);
  };

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Automated backups</h1>
          <p className="aws-page-header-description">RDS automatically backs up your database instances during the daily backup window and retains them for the configured retention period.</p>
        </div>
      </div>

      <div className="aws-card p-0 mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg flex items-center gap-2"><Archive size={18} /> Active instance backups ({active.length})</h2>
          <button className="aws-btn-icon" onClick={() => addFlash('success', 'Refreshed')}><RefreshCw size={16} /></button>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th>DB instance</th><th>Engine</th><th>Status</th><th>Retention</th><th>Earliest restorable</th><th>Latest restorable</th><th>Storage</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {active.map(b => (
              <tr key={b.id}>
                <td className="text-aws-blue font-medium">{b.dbInstanceId}</td>
                <td>{b.engine}</td>
                <td><span className={`aws-badge ${b.backupRetentionEnabled ? 'aws-badge-success' : 'aws-badge-warning'}`}>{b.backupRetentionEnabled ? 'available' : 'backups disabled'}</span></td>
                <td>{b.retentionPeriod} day{b.retentionPeriod === 1 ? '' : 's'}</td>
                <td>{b.earliestRestorableTime ? format(new Date(b.earliestRestorableTime), 'MMM d, yyyy h:mm a') : '-'}</td>
                <td>{b.latestRestorableTime ? format(new Date(b.latestRestorableTime), 'MMM d, yyyy h:mm a') : '-'}</td>
                <td>{b.allocatedStorage} GiB</td>
                <td><button className="text-aws-blue text-xs hover:underline" onClick={() => openModify(b)}>Modify</button></td>
              </tr>
            ))}
            {active.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-aws-text-secondary">No active instance backups.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg">Retained backups ({retained.length})</h2>
        </div>
        <p className="px-4 pt-3 text-xs text-aws-text-secondary">Backups retained after their source DB instance was deleted. These are kept until manually deleted or their retention period expires.</p>
        <table className="aws-table">
          <thead>
            <tr><th>Backup ID</th><th>Original DB instance</th><th>Engine</th><th>Earliest restorable</th><th>Latest restorable</th><th>Storage</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {retained.map(b => (
              <tr key={b.id}>
                <td className="text-aws-blue font-mono text-xs">{b.id}</td>
                <td>{b.dbInstanceId}</td>
                <td>{b.engine}</td>
                <td>{b.earliestRestorableTime ? format(new Date(b.earliestRestorableTime), 'MMM d, yyyy h:mm a') : '-'}</td>
                <td>{b.latestRestorableTime ? format(new Date(b.latestRestorableTime), 'MMM d, yyyy h:mm a') : '-'}</td>
                <td>{b.allocatedStorage} GiB</td>
                <td><button className="text-aws-error text-xs hover:underline flex items-center gap-1" onClick={() => handleDeleteRetained(b)}><Trash2 size={12} /> Delete</button></td>
              </tr>
            ))}
            {retained.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-aws-text-secondary">No retained backups.</td></tr>}
          </tbody>
        </table>
      </div>

      {modifyId && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-sm">
            <div className="aws-modal-header">
              <h3>Modify backup retention</h3>
              <button onClick={() => setModifyId(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleModify}>
              <div className="aws-modal-body">
                <div className="aws-form-group">
                  <label className="aws-form-label">Backup retention period (days)</label>
                  <input type="number" className="aws-input" min={0} max={35} value={retention} onChange={e => setRetention(e.target.value)} />
                  <p className="aws-form-description mt-1">Set to 0 to disable automated backups for this instance.</p>
                </div>
              </div>
              <div className="aws-modal-footer">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setModifyId(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
