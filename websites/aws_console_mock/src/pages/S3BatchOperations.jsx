import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { RefreshCw, X, ListChecks, Play, Ban, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const OPERATIONS = ['PUT_OBJECT_COPY', 'PUT_OBJECT_TAGGING', 'PUT_OBJECT_ACL', 'S3_INITIATE_RESTORE_OBJECT', 'S3_REPLICATE_OBJECT'];

const STATUS_STYLE = {
  Complete: 'aws-badge-success',
  Active: 'aws-badge-info',
  Failed: 'aws-badge-error',
  New: 'aws-badge-neutral',
  Cancelled: 'aws-badge-warning',
};

export default function S3BatchOperations() {
  const { state, dispatch, addFlash } = useStore();
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [description, setDescription] = useState('');
  const [operation, setOperation] = useState(OPERATIONS[0]);
  const [manifestBucket, setManifestBucket] = useState('');
  const [priority, setPriority] = useState(5);

  const buckets = state.s3 || [];
  const jobs = state.s3BatchOperations || [];

  const handleCreate = (e) => {
    e.preventDefault();
    if (!description.trim() || !manifestBucket) return;
    const id = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}-4c1e-9f3a-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;
    const job = {
      id, description: description.trim(), operation, status: 'New', priority: Number(priority),
      manifestBucket, roleArn: 'arn:aws:iam::123456789012:role/S3BatchOperationsRole',
      totalObjects: 0, succeededObjects: 0, failedObjects: 0,
      created: new Date().toISOString(), completed: '',
    };
    dispatch({ type: 'CREATE_S3_BATCH_JOB', payload: job });
    addFlash('success', `Batch job "${description.trim()}" created in New status.`);
    setDescription(''); setManifestBucket(''); setOperation(OPERATIONS[0]); setPriority(5);
    setShowCreate(false);
  };

  const handleRun = (job) => {
    dispatch({ type: 'UPDATE_S3_BATCH_JOB_STATUS', payload: { id: job.id, status: 'Active' } });
    addFlash('info', `Job "${job.description}" is now running.`);
  };

  const handleComplete = (job) => {
    dispatch({ type: 'UPDATE_S3_BATCH_JOB_STATUS', payload: { id: job.id, status: 'Complete', succeededObjects: job.totalObjects || 0, completed: new Date().toISOString() } });
    addFlash('success', `Job "${job.description}" marked Complete.`);
  };

  const handleCancel = (job) => {
    dispatch({ type: 'UPDATE_S3_BATCH_JOB_STATUS', payload: { id: job.id, status: 'Cancelled' } });
    addFlash('success', `Job "${job.description}" cancelled.`);
  };

  const handleDelete = (job) => {
    dispatch({ type: 'DELETE_S3_BATCH_JOB', payload: job.id });
    addFlash('success', `Job "${job.description}" deleted.`);
    if (selected === job.id) setSelected(null);
  };

  const selectedJob = jobs.find(j => j.id === selected);

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Batch Operations</h1>
          <p className="aws-page-header-description">S3 Batch Operations performs large-scale actions on billions of objects, such as copying or tagging, with a single request.</p>
        </div>
      </div>

      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg flex items-center gap-2"><ListChecks size={18} /> Jobs ({jobs.length})</h2>
          <div className="flex items-center gap-2">
            <button className="aws-btn-icon" onClick={() => addFlash('success', 'Refreshed')}><RefreshCw size={16} /></button>
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>Create job</button>
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th>Job ID</th><th>Description</th><th>Operation</th><th>Status</th><th>Priority</th><th>Progress</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className={selected === j.id ? 'bg-aws-blue-light' : ''} onClick={() => setSelected(j.id)}>
                <td className="text-aws-blue font-mono text-xs cursor-pointer">{j.id.slice(0, 8)}...</td>
                <td className="font-medium">{j.description}</td>
                <td><span className="text-xs font-mono">{j.operation}</span></td>
                <td><span className={`aws-badge ${STATUS_STYLE[j.status] || 'aws-badge-neutral'}`}>{j.status}</span></td>
                <td>{j.priority}</td>
                <td className="text-xs">{j.totalObjects > 0 ? `${j.succeededObjects}/${j.totalObjects} (${j.failedObjects} failed)` : '-'}</td>
                <td>{format(new Date(j.created), 'MMM d, yyyy h:mm a')}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {j.status === 'New' && <button className="text-aws-blue hover:underline" title="Run job" onClick={() => handleRun(j)}><Play size={14} /></button>}
                    {j.status === 'Active' && <button className="text-aws-success hover:underline" title="Mark complete" onClick={() => handleComplete(j)}><ListChecks size={14} /></button>}
                    {(j.status === 'New' || j.status === 'Active') && <button className="text-aws-warning hover:underline" title="Cancel job" onClick={() => handleCancel(j)}><Ban size={14} /></button>}
                    {(j.status === 'Complete' || j.status === 'Cancelled' || j.status === 'Failed') && <button className="text-aws-error hover:underline" title="Delete job" onClick={() => handleDelete(j)}><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-aws-text-secondary">No batch jobs found.</td></tr>}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-aws-border-secondary text-xs text-aws-text-secondary">Showing 1-{jobs.length} of {jobs.length} items</div>
      </div>

      {selectedJob && (
        <div className="aws-card mt-4">
          <h2 className="font-bold text-sm mb-3">Job details: {selectedJob.description}</h2>
          <div className="aws-kv-grid">
            <div><div className="aws-kv-label">Job ID</div><div className="aws-kv-value font-mono text-xs">{selectedJob.id}</div></div>
            <div><div className="aws-kv-label">IAM role ARN</div><div className="aws-kv-value font-mono text-xs">{selectedJob.roleArn}</div></div>
            <div><div className="aws-kv-label">Manifest bucket</div><div className="aws-kv-value">{selectedJob.manifestBucket}</div></div>
            <div><div className="aws-kv-label">Completed</div><div className="aws-kv-value">{selectedJob.completed ? format(new Date(selectedJob.completed), 'MMM d, yyyy h:mm a') : '-'}</div></div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-lg">
            <div className="aws-modal-header">
              <h3>Create job</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="aws-modal-body space-y-4">
                <div className="aws-form-group">
                  <label className="aws-form-label">Description *</label>
                  <input className="aws-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Copy objects to backup bucket" required />
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Operation</label>
                  <select className="aws-input" value={operation} onChange={e => setOperation(e.target.value)}>
                    {OPERATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Manifest bucket *</label>
                  <select className="aws-input" value={manifestBucket} onChange={e => setManifestBucket(e.target.value)} required>
                    <option value="">Select a bucket</option>
                    {buckets.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Priority</label>
                  <input type="number" className="aws-input" value={priority} onChange={e => setPriority(e.target.value)} min={1} max={2147483647} />
                </div>
              </div>
              <div className="aws-modal-footer">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary" disabled={!description.trim() || !manifestBucket}>Create job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
