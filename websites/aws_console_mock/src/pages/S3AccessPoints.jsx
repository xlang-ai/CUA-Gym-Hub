import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import LastUpdated from '../components/LastUpdated';
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import {Search, X, MapPin} from 'lucide-react';
import { format } from 'date-fns';

export default function S3AccessPoints() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [networkOrigin, setNetworkOrigin] = useState('Internet');
  const [vpcId, setVpcId] = useState('');

  const buckets = state.s3 || [];
  const vpcs = state.vpc?.vpcs || [];
  const accessPoints = (state.s3AccessPoints || []).filter(ap => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ap.name.toLowerCase().includes(q) || ap.bucketName.toLowerCase().includes(q);
  });
  const paged = usePaged(accessPoints);

  const toggleSelect = (n) => setSelected(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  const toggleAll = () => setSelected(selected.length === accessPoints.length ? [] : paged.rows.map(a => a.name));

  const resetForm = () => { setName(''); setBucketName(''); setNetworkOrigin('Internet'); setVpcId(''); };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim() || !bucketName) return;
    if (networkOrigin === 'VPC' && !vpcId) return;
    const region = state.user?.region || 'us-east-1';
    const suffix = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').padEnd(20, '0').slice(0, 20);
    const accessPoint = {
      name: name.trim(),
      bucketName,
      arn: `arn:aws:s3:${region}:123456789012:accesspoint/${name.trim()}`,
      alias: `${name.trim()}-${suffix}.s3-accesspoint.${region}.amazonaws.com`,
      status: 'Active',
      networkOrigin,
      vpcId: networkOrigin === 'VPC' ? vpcId : '',
      created: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_S3_ACCESS_POINT', payload: accessPoint });
    addFlash('success', `Access point "${name.trim()}" created successfully.`);
    resetForm();
    setShowCreate(false);
  };

  const handleDelete = () => {
    selected.forEach(n => dispatch({ type: 'DELETE_S3_ACCESS_POINT', payload: n }));
    addFlash('success', `${selected.length} access point(s) deleted.`);
    setSelected([]);
  };

  return (
    <div>
      <div className="aws-page-header">
        <div>
          <h1>Access Points</h1>
          <p className="aws-page-header-description">Access points are named network endpoints attached to buckets that you can use to perform S3 object operations.</p>
        </div>
      </div>

      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h2 className="font-bold text-lg flex items-center gap-2"><MapPin size={18} /> Access Points ({accessPoints.length})</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled" />
              <input className="aws-input pl-8 text-sm w-56" placeholder="Find access points" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <LastUpdated />
            <button className="aws-btn aws-btn-secondary text-xs" disabled={!selected.length} onClick={handleDelete}>Delete</button>
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>Create access point</button>
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th className="w-8"><input type="checkbox" checked={selected.length === accessPoints.length && accessPoints.length > 0} onChange={toggleAll} /></th>
              <th>Access point name</th><th>Bucket</th><th>Network origin</th><th>Status</th><th>VPC ID</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map(ap => (
              <tr key={ap.name} className={selected.includes(ap.name) ? 'bg-aws-blue-light' : ''}>
                <td><input type="checkbox" checked={selected.includes(ap.name)} onChange={() => toggleSelect(ap.name)} /></td>
                <td>
                  <div className="text-aws-blue font-medium">{ap.name}</div>
                  <div className="text-xs text-aws-text-secondary font-mono truncate max-w-xs">{ap.alias}</div>
                </td>
                <td className="font-mono text-sm">{ap.bucketName}</td>
                <td>{ap.networkOrigin}</td>
                <td><span className="aws-badge aws-badge-success">{ap.status}</span></td>
                <td className="font-mono text-sm">{ap.vpcId || '-'}</td>
                <td>{format(new Date(ap.created), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {accessPoints.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-aws-text-secondary">No access points found.</td></tr>}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-lg">
            <div className="aws-modal-header">
              <h3>Create access point</h3>
              <button onClick={() => { setShowCreate(false); resetForm(); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="aws-modal-body space-y-4">
                <div className="aws-form-group">
                  <label className="aws-form-label">Access point name *</label>
                  <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="my-access-point" required />
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Bucket *</label>
                  <select className="aws-input" value={bucketName} onChange={e => setBucketName(e.target.value)} required>
                    <option value="">Select a bucket</option>
                    {buckets.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="aws-form-group">
                  <label className="aws-form-label">Network origin</label>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" checked={networkOrigin === 'Internet'} onChange={() => setNetworkOrigin('Internet')} /> Internet</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={networkOrigin === 'VPC'} onChange={() => setNetworkOrigin('VPC')} /> VPC</label>
                  </div>
                </div>
                {networkOrigin === 'VPC' && (
                  <div className="aws-form-group">
                    <label className="aws-form-label">VPC ID *</label>
                    <select className="aws-input" value={vpcId} onChange={e => setVpcId(e.target.value)} required>
                      <option value="">Select a VPC</option>
                      {vpcs.map(v => <option key={v.id} value={v.id}>{v.id} ({v.name})</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="aws-modal-footer">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary" disabled={!name.trim() || !bucketName || (networkOrigin === 'VPC' && !vpcId)}>Create access point</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
