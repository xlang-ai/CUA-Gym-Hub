import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { RefreshCw, Search, X } from 'lucide-react';
import { format } from 'date-fns';

const RECORD_COLORS = {
  A: 'bg-aws-blue-lighter text-aws-blue', AAAA: 'bg-indigo-100 text-indigo-800', CNAME: 'bg-aws-status-success-bg text-aws-success',
  MX: 'bg-aws-status-warning-bg text-aws-warning', TXT: 'bg-aws-status-warning-bg text-aws-warning', NS: 'bg-purple-100 text-purple-800',
  SOA: 'bg-aws-disabled-bg text-aws-text', SRV: 'bg-aws-status-error-bg text-aws-error',
};

export default function Route53HostedZones() {
  const { state, dispatch, addFlash } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [zoneType, setZoneType] = useState('Public');
  const [vpc, setVpc] = useState('');
  const [recName, setRecName] = useState('');
  const [recType, setRecType] = useState('A');
  const [recTTL, setRecTTL] = useState(300);
  const [recValue, setRecValue] = useState('');

  const zones = state.route53?.hostedZones || [];
  const records = (state.route53?.records || []).filter(r => selectedZone && r.zoneId === selectedZone.id);

  const handleCreateZone = () => {
    if (!domainName.trim()) return;
    const zone = {
      id: 'Z' + Math.random().toString(36).substr(2, 12).toUpperCase(),
      name: domainName.trim(),
      type: zoneType,
      recordCount: 2,
      comment: '',
      vpc: zoneType === 'Private' ? vpc : undefined,
      created: new Date().toISOString()
    };
    dispatch({ type: 'CREATE_HOSTED_ZONE', payload: zone });
    addFlash('success', `Hosted zone "${domainName}" created`);
    setShowCreate(false);
    setDomainName(''); setZoneType('Public'); setVpc('');
  };

  const handleCreateRecord = () => {
    if (!recName.trim() || !recValue.trim()) return;
    const record = {
      id: Math.random().toString(36).substr(2, 10),
      zoneId: selectedZone.id,
      name: recName.trim(),
      type: recType,
      ttl: recTTL,
      value: recValue.trim(),
    };
    dispatch({ type: 'CREATE_RECORD', payload: record });
    addFlash('success', `Record ${recName} created`);
    setShowCreateRecord(false);
    setRecName(''); setRecType('A'); setRecTTL(300); setRecValue('');
  };

  if (showCreate) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Create hosted zone</h1>
        <div className="aws-card space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Domain name *</label>
            <input className="aws-input max-w-md" value={domainName} onChange={e => setDomainName(e.target.value)} placeholder="example.com" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={zoneType === 'Public'} onChange={() => setZoneType('Public')} /> Public hosted zone</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={zoneType === 'Private'} onChange={() => setZoneType('Private')} /> Private hosted zone</label>
            </div>
          </div>
          {zoneType === 'Private' && (
            <div>
              <label className="block text-sm font-bold mb-1">VPC ID</label>
              <input className="aws-input max-w-md" value={vpc} onChange={e => setVpc(e.target.value)} placeholder="vpc-0abc1234" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="aws-btn aws-btn-primary" onClick={handleCreateZone} disabled={!domainName.trim()}>Create hosted zone</button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedZone) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="text-aws-blue hover:underline text-sm" onClick={() => setSelectedZone(null)}>Hosted zones</button>
          <span className="text-aws-text-secondary">/</span>
          <h1 className="text-2xl font-bold">{selectedZone.name}</h1>
          <span className={`aws-badge ${selectedZone.type === 'Private' ? 'bg-aws-status-warning-bg text-aws-warning' : 'bg-aws-blue-lighter text-aws-blue'}`}>{selectedZone.type}</span>
        </div>
        <div className="aws-card p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
            <h3 className="font-bold">Records ({records.length})</h3>
            <div className="flex gap-2">
              <button className="aws-btn aws-btn-primary text-xs" onClick={() => setShowCreateRecord(true)}>Create record</button>
              <button className="aws-btn aws-btn-danger text-xs" onClick={() => { dispatch({ type: 'DELETE_HOSTED_ZONE', payload: selectedZone.id }); addFlash('success', 'Hosted zone deleted'); setSelectedZone(null); }}>Delete zone</button>
            </div>
          </div>
          <table className="aws-table">
            <thead><tr><th>Record name</th><th>Type</th><th>TTL</th><th>Value</th><th>Actions</th></tr></thead>
            <tbody>
              {records.length === 0 ? <tr><td colSpan={5} className="text-center text-aws-text-secondary">No records</td></tr> : records.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.name}</td>
                  <td><span className={`aws-badge ${RECORD_COLORS[r.type] || 'bg-aws-disabled-bg text-aws-text'}`}>{r.type}</span></td>
                  <td>{r.ttl}</td>
                  <td className="font-mono text-xs max-w-xs truncate">{r.value}</td>
                  <td><button className="text-aws-error text-xs hover:underline" onClick={() => { dispatch({ type: 'DELETE_RECORD', payload: r.id }); addFlash('success', 'Record deleted'); }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showCreateRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white shadow-xl w-full max-w-md border border-aws-border">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
                <h3 className="font-bold">Create record</h3>
                <button onClick={() => setShowCreateRecord(false)}><X size={18} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Record name *</label>
                  <input className="aws-input" value={recName} onChange={e => setRecName(e.target.value)} placeholder="www" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Record type</label>
                  <select className="aws-input" value={recType} onChange={e => setRecType(e.target.value)}>
                    {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">TTL (seconds)</label>
                  <input type="number" className="aws-input w-32" value={recTTL} onChange={e => setRecTTL(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Value *</label>
                  <input className="aws-input" value={recValue} onChange={e => setRecValue(e.target.value)} placeholder="192.0.2.1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button className="aws-btn aws-btn-secondary" onClick={() => setShowCreateRecord(false)}>Cancel</button>
                  <button className="aws-btn aws-btn-primary" onClick={handleCreateRecord} disabled={!recName.trim() || !recValue.trim()}>Create record</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="aws-card p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
        <h1 className="font-bold text-2xl">Hosted zones ({zones.length})</h1>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-aws-disabled-bg" onClick={() => addFlash('success', 'Refreshed')}><RefreshCw size={16} className="text-aws-text-secondary" /></button>
          <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>Create hosted zone</button>
        </div>
      </div>
      <table className="aws-table">
        <thead><tr><th>Name</th><th>Type</th><th>Record count</th><th>Comment</th><th>Created</th></tr></thead>
        <tbody>
          {zones.map(z => (
            <tr key={z.id}>
              <td><button className="text-aws-blue font-medium hover:underline" onClick={() => setSelectedZone(z)}>{z.name}</button></td>
              <td><span className={`aws-badge ${z.type === 'Private' ? 'bg-aws-status-warning-bg text-aws-warning' : 'bg-aws-blue-lighter text-aws-blue'}`}>{z.type}</span></td>
              <td>{z.recordCount}</td>
              <td className="text-xs text-aws-text-secondary">{z.comment || '-'}</td>
              <td>{format(new Date(z.created), 'MMM d, yyyy')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
