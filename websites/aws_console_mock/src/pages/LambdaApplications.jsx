import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import LastUpdated from '../components/LastUpdated';
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import {X, LayoutGrid, Rocket, Trash2} from 'lucide-react';
import { format } from 'date-fns';

const TEMPLATE_SOURCES = ['XWS Serverless Application Repository', 'XWS SAM', 'XWS CDK'];

const STATUS_STYLE = {
  CREATE_COMPLETE: 'aws-badge-success',
  UPDATE_COMPLETE: 'aws-badge-success',
  CREATE_IN_PROGRESS: 'aws-badge-info',
  UPDATE_IN_PROGRESS: 'aws-badge-info',
  ROLLBACK_COMPLETE: 'aws-badge-warning',
  DELETE_FAILED: 'aws-badge-error',
};

export default function LambdaApplications() {
  const { state, dispatch, addFlash } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateSource, setTemplateSource] = useState(TEMPLATE_SOURCES[0]);
  const [functions, setFunctions] = useState([]);

  const apps = state.lambdaApplications || [];
  const paged = usePaged(apps);
  const availableFunctions = (state.lambda || []).map(f => f.name);

  const toggleFn = (fn) => setFunctions(prev => prev.includes(fn) ? prev.filter(x => x !== fn) : [...prev, fn]);

  const resetForm = () => { setName(''); setDescription(''); setTemplateSource(TEMPLATE_SOURCES[0]); setFunctions([]); };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const app = {
      name: name.trim(), description: description.trim(), status: 'CREATE_IN_PROGRESS',
      templateSource,
      stackId: `arn:aws:cloudformation:${state.user?.region || 'us-east-1'}:123456789012:stack/serverlessrepo-${name.trim()}/${Math.random().toString(16).slice(2, 10)}-1234-1234-1234-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
      functions, created: now, lastUpdated: now,
    };
    dispatch({ type: 'CREATE_LAMBDA_APPLICATION', payload: app });
    addFlash('success', `Application "${name.trim()}" is being deployed.`);
    resetForm();
    setShowCreate(false);
  };

  const handleDeploy = (app) => {
    dispatch({ type: 'DEPLOY_LAMBDA_APPLICATION', payload: { name: app.name, status: 'UPDATE_COMPLETE', lastUpdated: new Date().toISOString() } });
    addFlash('success', `Application "${app.name}" deployed successfully.`);
  };

  const handleDelete = (app) => {
    dispatch({ type: 'DELETE_LAMBDA_APPLICATION', payload: app.name });
    addFlash('success', `Application "${app.name}" deleted.`);
  };

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Applications</h1>
          <p className="aws-page-header-description">Applications group related Lambda functions, deployed and managed together as a single unit via CloudFormation.</p>
        </div>
      </div>

      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg flex items-center gap-2"><LayoutGrid size={18} /> Applications ({apps.length})</h2>
          <div className="flex items-center gap-2">
            <LastUpdated />
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>Create application</button>
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th>Name</th><th>Description</th><th>Template source</th><th>Status</th><th>Functions</th><th>Last updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paged.rows.map(a => (
              <tr key={a.name}>
                <td className="text-aws-blue font-medium">{a.name}</td>
                <td className="text-xs text-aws-text-secondary max-w-xs truncate">{a.description || '-'}</td>
                <td className="text-xs">{a.templateSource}</td>
                <td><span className={`aws-badge ${STATUS_STYLE[a.status] || 'aws-badge-neutral'}`}>{a.status}</span></td>
                <td className="text-xs font-mono">{(a.functions || []).join(', ') || '-'}</td>
                <td>{format(new Date(a.lastUpdated), 'MMM d, yyyy h:mm a')}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <button className="text-aws-blue text-xs hover:underline flex items-center gap-1" onClick={() => handleDeploy(a)}><Rocket size={12} /> Deploy</button>
                    <button className="text-aws-error text-xs hover:underline flex items-center gap-1" onClick={() => handleDelete(a)}><Trash2 size={12} /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {apps.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-aws-text-secondary">No applications found.</td></tr>}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-lg">
            <div className="aws-modal-header">
              <h3>Create application</h3>
              <button onClick={() => { setShowCreate(false); resetForm(); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="aws-modal-body space-y-4">
                <div className="aws-form-group">
                  <label className="aws-form-label">Application name *</label>
                  <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="my-application" required />
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Description</label>
                  <input className="aws-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this application do?" />
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Template source</label>
                  <select className="aws-input" value={templateSource} onChange={e => setTemplateSource(e.target.value)}>
                    {TEMPLATE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Functions to include</label>
                  <div className="border border-aws-border rounded-aws-input p-2 space-y-1 max-h-32 overflow-y-auto">
                    {availableFunctions.length === 0 && <div className="text-xs text-aws-text-secondary">No functions available.</div>}
                    {availableFunctions.map(fn => (
                      <label key={fn} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={functions.includes(fn)} onChange={() => toggleFn(fn)} />
                        <span className="font-mono text-xs">{fn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="aws-modal-footer">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary" disabled={!name.trim()}>Create application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
