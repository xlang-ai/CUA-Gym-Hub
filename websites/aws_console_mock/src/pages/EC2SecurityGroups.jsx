import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { RefreshCw, Search, X, ChevronDown, Plus, Copy } from 'lucide-react';


// Real console offers named types that pin protocol + port. "Custom TCP" frees the port.
const RULE_TYPES = [
  { label: 'All traffic', protocol: '-1', portRange: 'All' },
  { label: 'SSH', protocol: 'tcp', portRange: '22' },
  { label: 'HTTP', protocol: 'tcp', portRange: '80' },
  { label: 'HTTPS', protocol: 'tcp', portRange: '443' },
  { label: 'MySQL/Aurora', protocol: 'tcp', portRange: '3306' },
  { label: 'PostgreSQL', protocol: 'tcp', portRange: '5432' },
  { label: 'RDP', protocol: 'tcp', portRange: '3389' },
  { label: 'Custom TCP', protocol: 'tcp', portRange: '' },
  { label: 'Custom UDP', protocol: 'udp', portRange: '' },
];


// Source/Destination options exactly as the real console offers them, per the EC2
// security-group rules documentation. Anywhere-IPv4/IPv6 are fixed CIDRs and carry a
// warning; My IP resolves to the caller's address.
const SOURCE_PRESETS = [
  { label: 'Custom', cidr: null },
  { label: 'Anywhere-IPv4', cidr: '0.0.0.0/0' },
  { label: 'Anywhere-IPv6', cidr: '::/0' },
  { label: 'My IP', cidr: '203.0.113.25/32' },
];
const OPEN_TO_WORLD = new Set(['0.0.0.0/0', '::/0']);

const rulePort = (r) => r.portRange ?? r.port ?? 'All';
const ruleProto = (r) => {
  const p = (r.protocol ?? '').toString();
  if (p === '-1' || p.toLowerCase() === 'all') return 'All';
  return p.toUpperCase() || 'TCP';
};
const ruleTypeLabel = (r) => {
  if (r.type) return r.type;
  const port = String(rulePort(r));
  const proto = ruleProto(r);
  if (proto === 'All') return 'All traffic';
  const known = { '22': 'SSH', '80': 'HTTP', '443': 'HTTPS', '3306': 'MySQL/Aurora', '5432': 'PostgreSQL', '3389': 'RDP' };
  if (proto === 'TCP' && known[port]) return known[port];
  return proto === 'UDP' ? 'Custom UDP' : 'Custom TCP';
};

export default function EC2SecurityGroups() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', vpcId: 'vpc-0abc1234def56789' });
  const [actionsOpen, setActionsOpen] = useState(false);
  const [ruleTab, setRuleTab] = useState('inbound');
  const [editRules, setEditRules] = useState(null); // { direction, rules: [] }

  const sgs = (state.securityGroups || []).filter(sg =>
    !search || sg.name.toLowerCase().includes(search.toLowerCase()) || sg.id.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === sgs.length ? [] : sgs.map(sg => sg.id));


  const openRuleEditor = (direction) => {
    if (!detail) return;
    const src = direction === 'inbound' ? detail.inboundRules : detail.outboundRules;
    setEditRules({ direction, rules: src.map(r => ({ ...r, type: ruleTypeLabel(r), portRange: String(rulePort(r)) })) });
  };

  const updateDraftRule = (idx, patch) => setEditRules(prev => ({
    ...prev,
    rules: prev.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
  }));

  const addDraftRule = () => setEditRules(prev => ({
    ...prev,
    rules: [...prev.rules, { type: 'Custom TCP', protocol: 'tcp', portRange: '', port: '', source: '0.0.0.0/0', description: '' }],
  }));

  const removeDraftRule = (idx) => setEditRules(prev => ({
    ...prev,
    rules: prev.rules.filter((_, i) => i !== idx),
  }));

  const saveRules = () => {
    if (!editRules || !detail) return;
    dispatch({
      type: 'UPDATE_SECURITY_GROUP_RULES',
      payload: { id: detail.id, direction: editRules.direction, rules: editRules.rules },
    });
    addFlash('success', `${editRules.direction === 'inbound' ? 'Inbound' : 'Outbound'} rules updated for ${detail.id}`);
    setEditRules(null);
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const newSg = {
      id: `sg-${Math.random().toString(16).substr(2, 17)}`,
      name: form.name.trim(),
      description: form.description || `Security group for ${form.name.trim()}`,
      vpcId: form.vpcId,
      inboundRules: [],
      outboundRules: [{ protocol: '-1', portRange: 'All', source: '0.0.0.0/0', description: 'Allow all outbound traffic' }],
      ownerId: '123456789012',
    };
    dispatch({ type: 'CREATE_SECURITY_GROUP', payload: newSg });
    addFlash('success', `Security group "${form.name}" created successfully.`);
    setShowCreate(false);
    setForm({ name: '', description: '', vpcId: 'vpc-0abc1234def56789' });
  };

  const handleDelete = () => {
    const deletable = selected.filter(id => {
      const sg = state.securityGroups.find(x => x.id === id);
      return sg && sg.name !== 'default';
    });
    if (!deletable.length) { addFlash('error', 'Cannot delete the default security group.'); return; }
    deletable.forEach(id => dispatch({ type: 'DELETE_SECURITY_GROUP', payload: id }));
    addFlash('success', `${deletable.length} security group(s) deleted.`);
    setSelected([]);
    if (deletable.includes(detailId)) setDetailId(null);
  };

  const detail = detailId ? state.securityGroups.find(sg => sg.id === detailId) : null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    addFlash('info', `Copied: ${text}`);
  };

  return (
    <div className="space-y-0">
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">Security Groups ({state.securityGroups.length})</h1>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-aws-disabled-bg rounded" onClick={() => addFlash('success', 'Refreshed')}><RefreshCw size={16} className="text-aws-text-secondary" /></button>
            <div className="relative">
              <button className="aws-btn aws-btn-secondary text-xs flex items-center gap-1" disabled={!selected.length} onClick={() => setActionsOpen(!actionsOpen)}>
                Actions <ChevronDown size={12} />
              </button>
              {actionsOpen && selected.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-aws-border shadow-lg z-20" style={{ borderRadius: 8 }}>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-aws-status-info-bg/30" onClick={() => { addFlash('info', `Copied ARN for ${selected.length} security group(s)`); setActionsOpen(false); }}>Copy ARN</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-aws-status-info-bg/30" onClick={() => { addFlash('info', `Manage tags for ${selected.length} security group(s) (simulated)`); setActionsOpen(false); }}>Manage tags</button>
                </div>
              )}
            </div>
            <button className="aws-btn aws-btn-secondary text-xs text-aws-error" disabled={!selected.length} onClick={handleDelete}>Delete security group</button>
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>Create security group</button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter security groups" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th className="w-8"><input type="checkbox" checked={selected.length === sgs.length && sgs.length > 0} onChange={toggleAll} /></th>
              <th>Security group name</th>
              <th>Security group ID</th>
              <th>VPC ID</th>
              <th>Description</th>
              <th>Owner</th>
              <th>Inbound rules</th>
              <th>Outbound rules</th>
            </tr>
          </thead>
          <tbody>
            {sgs.map(sg => (
              <tr key={sg.id} className={`cursor-pointer ${selected.includes(sg.id) ? 'bg-aws-status-info-bg/50' : ''}`} onClick={() => setDetailId(sg.id)}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.includes(sg.id)} onChange={() => toggleSelect(sg.id)} />
                </td>
                <td className="text-aws-blue font-medium hover:underline">{sg.name}</td>
                <td>
                  <span className="font-mono text-sm text-aws-blue hover:underline">{sg.id}</span>
                  <button className="ml-1 text-aws-text-disabled hover:text-aws-text-secondary" onClick={e => { e.stopPropagation(); copyToClipboard(sg.id); }}><Copy size={12} /></button>
                </td>
                <td className="font-mono text-sm text-aws-blue">{sg.vpcId}</td>
                <td className="text-aws-text-secondary text-xs max-w-xs truncate">{sg.description}</td>
                <td className="font-mono text-sm">{sg.ownerId || '123456789012'}</td>
                <td>{sg.inboundRules.length}</td>
                <td>{sg.outboundRules.length}</td>
              </tr>
            ))}
            {sgs.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-aws-text-secondary">No security groups found</td></tr>}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-aws-border-secondary text-xs text-aws-text-secondary">
          Showing 1-{sgs.length} of {sgs.length} items
        </div>
      </div>

      {detail && (
        <div className="aws-card mt-0 border-t-0 p-0">
          <div className="px-4 py-3 border-b border-aws-border">
            <h3 className="font-bold text-sm">{detail.name} — {detail.id}</h3>
            <p className="text-xs text-aws-text-secondary mt-0.5">{detail.description}</p>
          </div>
          <div className="flex border-b border-aws-border">
            <button role="tab" aria-selected={ruleTab === 'inbound'} className={`px-4 py-2 text-sm font-medium border-b-2 ${ruleTab === 'inbound' ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`} onClick={() => setRuleTab('inbound')}>Inbound rules ({detail.inboundRules.length})</button>
            <button role="tab" aria-selected={ruleTab === 'outbound'} className={`px-4 py-2 text-sm font-medium border-b-2 ${ruleTab === 'outbound' ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`} onClick={() => setRuleTab('outbound')}>Outbound rules ({detail.outboundRules.length})</button>
            <button role="tab" aria-selected={ruleTab === 'tags'} className={`px-4 py-2 text-sm font-medium border-b-2 ${ruleTab === 'tags' ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`} onClick={() => setRuleTab('tags')}>Tags</button>
          </div>
          <div className="p-4">
            {ruleTab === 'inbound' && (
              <>
              <div className="flex justify-end mb-2">
                <button className="aws-btn aws-btn-secondary text-xs" onClick={() => openRuleEditor('inbound')}>Edit inbound rules</button>
              </div>
              <table className="aws-table">
                <thead><tr><th>IP version</th><th>Type</th><th>Protocol</th><th>Port range</th><th>Source</th><th>Description</th></tr></thead>
                <tbody>
                  {detail.inboundRules.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-aws-text-secondary py-4">No inbound rules</td></tr>
                  ) : detail.inboundRules.map((r, i) => (
                    <tr key={i}>
                      <td>{r.source?.includes(':') ? 'IPv6' : 'IPv4'}</td>
                      <td>{ruleTypeLabel(r)}</td>
                      <td>{ruleProto(r)}</td>
                      <td>{rulePort(r)}</td>
                      <td className="font-mono text-xs">{r.source}</td>
                      <td className="text-xs text-aws-text-secondary">{r.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
            {ruleTab === 'outbound' && (
              <>
              <div className="flex justify-end mb-2">
                <button className="aws-btn aws-btn-secondary text-xs" onClick={() => openRuleEditor('outbound')}>Edit outbound rules</button>
              </div>
              <table className="aws-table">
                <thead><tr><th>IP version</th><th>Type</th><th>Protocol</th><th>Port range</th><th>Destination</th><th>Description</th></tr></thead>
                <tbody>
                  {detail.outboundRules.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-aws-text-secondary py-4">No outbound rules</td></tr>
                  ) : detail.outboundRules.map((r, i) => (
                    <tr key={i}>
                      <td>{r.source?.includes(':') ? 'IPv6' : 'IPv4'}</td>
                      <td>{ruleTypeLabel(r)}</td>
                      <td>{ruleProto(r)}</td>
                      <td>{rulePort(r)}</td>
                      <td className="font-mono text-xs">{r.source || '0.0.0.0/0'}</td>
                      <td className="text-xs text-aws-text-secondary">{r.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
            {ruleTab === 'tags' && (
              <div className="text-sm text-aws-text-secondary">
                <table className="aws-table">
                  <thead><tr><th>Key</th><th>Value</th></tr></thead>
                  <tbody>
                    <tr><td>Name</td><td>{detail.name}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-lg">
            <div className="aws-modal-header">
              <h3 className="font-bold text-lg">Create security group</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="aws-modal-body space-y-4">
              <div className="aws-alert aws-alert-info">
                <Info size={16} className="flex-shrink-0 mt-0.5" />
                <span>A security group acts as a virtual firewall that controls the traffic for one or more instances.</span>
              </div>
              <div>
                <label className="aws-form-label">Security group name <span className="text-aws-error">*</span></label>
                <input className="aws-input mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="my-security-group" />
              </div>
              <div>
                <label className="aws-form-label">Description</label>
                <textarea className="aws-input mt-1" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Security group description" />
              </div>
              <div>
                <label className="aws-form-label">VPC</label>
                <select className="aws-input mt-1" value={form.vpcId} onChange={e => setForm({...form, vpcId: e.target.value})}>
                  {(state.vpc?.vpcs || []).map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="aws-modal-footer">
              <button className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="aws-btn aws-btn-primary" onClick={handleCreate} disabled={!form.name.trim()}>Create security group</button>
            </div>
          </div>
        </div>
      )}

      {editRules && detail && (
        <div className="aws-modal-overlay">
          <div className="aws-modal" style={{ maxWidth: '56rem' }}>
            <div className="aws-modal-header">
              <h3 className="font-bold">
                Edit {editRules.direction} rules — {detail.name} ({detail.id})
              </h3>
              <button onClick={() => setEditRules(null)}><X size={18} /></button>
            </div>
            <div className="aws-modal-body">
              <p className="text-xs text-aws-text-secondary mb-3">
                {editRules.direction === 'inbound'
                  ? 'Inbound rules control the traffic that is allowed to reach resources associated with this security group.'
                  : 'Outbound rules control the traffic that is allowed to leave resources associated with this security group.'}
              </p>
              <table className="aws-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Protocol</th>
                    <th>Port range</th>
                    <th>{editRules.direction === 'inbound' ? 'Source' : 'Destination'}</th>
                    <th>Description</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {editRules.rules.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-aws-text-secondary py-4">No rules. Traffic is denied by default.</td></tr>
                  ) : editRules.rules.map((r, i) => {
                    const preset = RULE_TYPES.find(t => t.label === r.type);
                    const portLocked = !!preset && preset.portRange !== '';
                    return (
                      <tr key={i}>
                        <td>
                          <select
                            className="aws-input text-xs"
                            value={r.type || ruleTypeLabel(r)}
                            onChange={e => {
                              const t = RULE_TYPES.find(x => x.label === e.target.value);
                              const pr = t.portRange || r.portRange || r.port || '';
                              updateDraftRule(i, { type: t.label, protocol: t.protocol, portRange: pr, port: pr });
                            }}
                          >
                            {RULE_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                          </select>
                        </td>
                        <td className="text-xs font-mono">{r.protocol === '-1' ? 'All' : (r.protocol || 'tcp').toUpperCase()}</td>
                        <td>
                          <input
                            className="aws-input text-xs w-24"
                            value={r.portRange ?? r.port ?? ''}
                            disabled={portLocked || r.protocol === '-1'}
                            placeholder="e.g. 8080"
                            onChange={e => updateDraftRule(i, { portRange: e.target.value, port: e.target.value })}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <select
                              className="aws-input text-xs w-32"
                              value={SOURCE_PRESETS.find(p => p.cidr === r.source)?.label || 'Custom'}
                              onChange={e => {
                                const preset = SOURCE_PRESETS.find(p => p.label === e.target.value);
                                updateDraftRule(i, { sourceType: preset.label, source: preset.cidr ?? r.source ?? '' });
                              }}
                            >
                              {SOURCE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                            </select>
                            <input
                              className="aws-input text-xs font-mono flex-1"
                              value={r.source || ''}
                              placeholder="0.0.0.0/0"
                              onChange={e => updateDraftRule(i, { source: e.target.value })}
                            />
                          </div>
                          {OPEN_TO_WORLD.has(r.source) && (
                            <p className="text-xs text-aws-warning mt-1">
                              This rule opens the port to all addresses. We recommend setting
                              security group rules to allow access from known IP addresses only.
                            </p>
                          )}
                        </td>
                        <td>
                          <input
                            className="aws-input text-xs"
                            value={r.description || ''}
                            placeholder="Optional"
                            onChange={e => updateDraftRule(i, { description: e.target.value })}
                          />
                        </td>
                        <td>
                          <button className="aws-btn aws-btn-danger text-xs" onClick={() => removeDraftRule(i)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button className="aws-btn aws-btn-secondary text-xs mt-3" onClick={addDraftRule}>
                <Plus size={14} /> Add rule
              </button>
            </div>
            <div className="aws-modal-footer">
              <button className="aws-btn aws-btn-secondary" onClick={() => setEditRules(null)}>Cancel</button>
              <button className="aws-btn aws-btn-primary" onClick={saveRules}>Save rules</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
}
