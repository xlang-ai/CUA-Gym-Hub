import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import ActionsMenu from '../components/ActionsMenu';
import { Plus, X } from 'lucide-react';

/**
 * VPC encryption controls.
 *
 * The live VPC console carries a "VPC encryption controls" view alongside "Your VPCs" — the
 * sub-navigation was captured on 2026-08-18 — and the VPC Actions menu offers "Create
 * encryption control". The mock had the menu item nowhere to go, which is the blank-endpoint
 * defect this release is clearing.
 *
 * Only the navigation was captured, not this page's own column set, so the columns here are
 * inferred from what the feature controls: a mode, the VPC it applies to, and its state.
 * Marked inferred in the reference rather than presented as observed.
 */
export default function VPCEncryptionControls() {
  const { state, dispatch, addFlash } = useStore();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [vpcId, setVpcId] = useState(params.get('vpcId') || '');
  const [mode, setMode] = useState('monitor');

  const controls = state.vpc.encryptionControls || [];
  const paged = usePaged(controls);
  const one = controls.filter((c) => selected.includes(c.id));

  const handleCreate = (e) => {
    e.preventDefault();
    const id = `vpc-enc-${Math.random().toString(16).substr(2, 12)}`;
    dispatch({ type: 'CREATE_VPC_ENCRYPTION_CONTROL', payload: {
      id, vpcId, mode, state: 'enforcing', created: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }});
    addFlash('success', `Created encryption control ${id} for ${vpcId}`);
    setShowCreate(false);
  };

  const handleDelete = () => {
    one.forEach((c) => dispatch({ type: 'RESOURCE_DELETE', payload: { path: 'vpc.encryptionControls', key: 'id', id: c.id } }));
    addFlash('success', `Deleted ${one.length} encryption control(s)`);
    setSelected([]);
  };

  const actions = [
    { label: 'Create encryption control', onSelect: () => setShowCreate(true) },
    { label: 'Delete encryption control', danger: true,
      disabled: one.length === 0, reason: 'Select at least one encryption control',
      onSelect: handleDelete },
  ];

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">VPC encryption controls ({controls.length})</h1>
          <div className="flex items-center gap-2">
            <TableToolbar p={paged} />
            <ActionsMenu items={actions} />
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>
              <Plus size={14} className="inline mr-1" />Create encryption control
            </button>
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th className="w-8"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? paged.rows.map((c) => c.id) : [])} /></th>
              <th>Encryption control ID</th><th>VPC ID</th><th>Mode</th><th>State</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((c) => (
              <tr key={c.id} className={selected.includes(c.id) ? 'bg-aws-status-info-bg/50' : ''}>
                <td><input type="checkbox" checked={selected.includes(c.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((x) => x !== c.id))} /></td>
                <td className="font-mono text-sm text-aws-blue">{c.id}</td>
                <td className="font-mono text-sm">{c.vpcId}</td>
                <td>{c.mode}</td>
                <td><span className="aws-badge bg-aws-status-success-bg text-aws-success">{c.state}</span></td>
                <td>{c.created}</td>
              </tr>
            ))}
            {controls.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-aws-text-secondary">
                No encryption controls. Create one to require encryption in transit for traffic in a VPC.
              </td></tr>
            )}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create encryption control</h3>
              <button onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4 text-sm">
              <div>
                <label className="block font-bold mb-1" htmlFor="enc-vpc">VPC</label>
                <select id="enc-vpc" className="aws-input" value={vpcId} required onChange={(e) => setVpcId(e.target.value)}>
                  <option value="">Choose a VPC</option>
                  {state.vpc.vpcs.map((v) => <option key={v.id} value={v.id}>{v.id} ({v.name})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1" htmlFor="enc-mode">Mode</label>
                <select id="enc-mode" className="aws-input" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="monitor">Monitor — report unencrypted traffic without blocking it</option>
                  <option value="enforce">Enforce — block traffic that is not encrypted in transit</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create encryption control</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
