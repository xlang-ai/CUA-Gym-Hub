import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import ActionsMenu from '../components/ActionsMenu';
import { RefreshCw, Search, X, Plus, Trash2 } from 'lucide-react';

// Flow-log field values as the VPC console presents them. Sourced from the VPC User Guide
// "Create a flow log" procedure, which names each control and its choices verbatim.
const FLOW_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACCEPT', label: 'Accept' },
  { value: 'REJECT', label: 'Reject' },
];
const FLOW_INTERVALS = [
  { value: 60, label: '1 minute' },
  { value: 600, label: '10 minutes' },
];
const FLOW_DESTINATIONS = [
  { value: 'cloud-watch-logs', label: 'Send to CloudWatch Logs' },
  { value: 's3', label: 'Send to an XWS S3 bucket' },
  { value: 'kinesis-data-firehose', label: 'Send to XWS Data Firehose in the same account' },
];

export default function VPCList() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [cidr, setCidr] = useState('10.0.0.0/16');
  const [tenancy, setTenancy] = useState('default');

  // Actions-menu dialogs. Each holds the VPC it was opened for, so the dialog keeps
  // working even if the selection changes underneath it.
  const [cidrEdit, setCidrEdit] = useState(null);
  const [tagEdit, setTagEdit] = useState(null);
  const [flowLog, setFlowLog] = useState(null);

  const vpcs = state.vpc.vpcs.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || v.cidr.includes(q);
  });
  const paged = usePaged(vpcs);
  const selectedVpcs = state.vpc.vpcs.filter(v => selected.includes(v.id));
  const one = selectedVpcs.length === 1 ? selectedVpcs[0] : null;

  const handleCreate = (e) => {
    e.preventDefault();
    const id = `vpc-${Math.random().toString(16).substr(2, 17)}`;
    dispatch({ type: 'CREATE_VPC', payload: {
      id, name: name || 'unnamed-vpc', cidr, state: 'available', isDefault: false,
      tenancy, dnsHostnames: true, dnsResolution: true, tags: [{ Key: 'Name', Value: name }]
    }});
    addFlash('success', `Successfully created VPC ${id}`);
    setName(''); setCidr('10.0.0.0/16'); setTenancy('default'); setShowCreate(false);
  };

  const handleDelete = () => {
    // The console refuses to delete a default VPC from this screen.
    const blocked = selectedVpcs.filter(v => v.isDefault);
    const deletable = selectedVpcs.filter(v => !v.isDefault);
    deletable.forEach(v => dispatch({ type: 'DELETE_VPC', payload: v.id }));
    if (deletable.length) addFlash('success', `Deleted ${deletable.length} VPC(s)`);
    if (blocked.length) addFlash('error', `Cannot delete default VPC ${blocked.map(v => v.id).join(', ')}`);
    setSelected([]);
  };

  const saveCidrs = (e) => {
    e.preventDefault();
    const extra = cidrEdit.secondary.map(c => c.trim()).filter(Boolean);
    dispatch({ type: 'UPDATE_VPC_CIDR', payload: {
      id: cidrEdit.id, cidr: cidrEdit.primary.trim(), secondaryCidrs: extra,
    }});
    addFlash('success', `Updated CIDR blocks for ${cidrEdit.id}`);
    setCidrEdit(null);
  };

  const saveTags = (e) => {
    e.preventDefault();
    const tags = tagEdit.tags.filter(t => t.Key.trim()).map(t => ({ Key: t.Key.trim(), Value: t.Value }));
    dispatch({ type: 'UPDATE_VPC_TAGS', payload: { id: tagEdit.id, tags } });
    addFlash('success', `Updated tags for ${tagEdit.id}`);
    setTagEdit(null);
  };

  const saveFlowLog = (e) => {
    e.preventDefault();
    const id = `fl-${Math.random().toString(16).substr(2, 17)}`;
    dispatch({ type: 'CREATE_VPC_FLOW_LOG', payload: {
      id,
      name: flowLog.name,
      resourceId: flowLog.resourceId,
      filter: flowLog.filter,
      maxAggregationInterval: flowLog.interval,
      destinationType: flowLog.destination,
      destination: flowLog.destinationArn,
      logFormat: flowLog.customFormat ? flowLog.format : 'XWS default format',
      status: 'Active',
    }});
    addFlash('success', `Flow log ${id} created for ${flowLog.resourceId}`);
    setFlowLog(null);
  };

  // Sourced from official VPC console screenshots: Edit CIDRs, Delete VPC, Create flow log,
  // Manage tags. Anything not applicable is rendered disabled with a reason rather than
  // silently doing nothing.
  const actions = [
    { label: 'Edit CIDRs',
      disabled: !one, reason: 'Select exactly one VPC',
      onSelect: () => setCidrEdit({ id: one.id, primary: one.cidr, secondary: one.secondaryCidrs || [] }) },
    { label: 'Edit DNS hostnames',
      disabled: !one, reason: 'Select exactly one VPC',
      onSelect: () => {
        dispatch({ type: 'UPDATE_VPC', payload: { id: one.id, dnsHostnames: !one.dnsHostnames } });
        addFlash('success', `DNS hostnames ${one.dnsHostnames ? 'disabled' : 'enabled'} for ${one.id}`);
      } },
    { label: 'Create flow log',
      disabled: !one, reason: 'Select exactly one VPC',
      onSelect: () => setFlowLog({
        resourceId: one.id, name: '', filter: 'ALL', interval: 600,
        destination: 'cloud-watch-logs', destinationArn: '/aws/vpc/flowlogs',
        customFormat: false, format: '${version} ${account-id} ${interface-id}',
      }) },
    { separator: true },
    { label: 'Manage tags',
      disabled: !one, reason: 'Select exactly one VPC',
      onSelect: () => setTagEdit({ id: one.id, tags: (one.tags || []).map(t => ({ ...t })) }) },
    { separator: true },
    { label: 'Delete VPC', danger: true,
      disabled: selected.length === 0, reason: 'Select at least one VPC',
      onSelect: handleDelete },
  ];

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">Your VPCs ({vpcs.length})</h1>
          <div className="flex items-center gap-2">
            <TableToolbar p={paged} />
            <button className="p-1.5 hover:bg-aws-disabled-bg" onClick={() => addFlash('success', 'Refreshed')}><RefreshCw size={16} className="text-aws-text-secondary" /></button>
            <ActionsMenu items={actions} />
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}><Plus size={14} className="inline mr-1" />Create VPC</button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter VPCs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th className="w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? paged.rows.map(v=>v.id) : [])} /></th>
            <th>VPC ID</th><th>Name</th><th>State</th><th>IPv4 CIDR</th><th>Default VPC</th><th>DNS hostnames</th><th>Tenancy</th></tr>
          </thead>
          <tbody>
            {paged.rows.map(v => (
              <tr key={v.id} className={selected.includes(v.id) ? 'bg-aws-status-info-bg/50' : ''}>
                <td><input type="checkbox" checked={selected.includes(v.id)} onChange={e => setSelected(e.target.checked ? [...selected, v.id] : selected.filter(x=>x!==v.id))} /></td>
                <td className="font-mono text-sm"><Link to={`/vpc/vpcs/${v.id}`} className="text-aws-blue hover:underline">{v.id}</Link></td>
                <td className="font-medium">{v.name}</td>
                <td><span className="aws-badge bg-aws-status-success-bg text-aws-success">{v.state}</span></td>
                <td className="font-mono text-sm">
                  {v.cidr}
                  {(v.secondaryCidrs || []).map(c => <div key={c} className="text-aws-text-secondary">{c}</div>)}
                </td>
                <td>{v.isDefault ? 'Yes' : 'No'}</td>
                <td>{v.dnsHostnames ? 'Enabled' : 'Disabled'}</td>
                <td>{v.tenancy}</td>
              </tr>
            ))}
            {vpcs.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-aws-text-secondary">No VPCs found.</td></tr>}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create VPC</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div><label className="block text-sm font-bold mb-1">Name</label>
                <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="my-vpc" required /></div>
              <div><label className="block text-sm font-bold mb-1">IPv4 CIDR block</label>
                <input className="aws-input" value={cidr} onChange={e => setCidr(e.target.value)} placeholder="10.0.0.0/16" required /></div>
              <div><label className="block text-sm font-bold mb-1">Tenancy</label>
                <select className="aws-input" value={tenancy} onChange={e => setTenancy(e.target.value)}>
                  <option value="default">Default</option><option value="dedicated">Dedicated</option>
                </select></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create VPC</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cidrEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-xl border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit CIDRs</h3>
              <button onClick={() => setCidrEdit(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveCidrs} className="p-4 space-y-4 text-sm">
              <p className="text-aws-text-secondary">VPC: <span className="font-mono">{cidrEdit.id}</span></p>
              <div>
                <label className="block font-bold mb-1">Primary IPv4 CIDR</label>
                <input className="aws-input font-mono" value={cidrEdit.primary} required
                  onChange={e => setCidrEdit({ ...cidrEdit, primary: e.target.value })} />
              </div>
              <div>
                <label className="block font-bold mb-1">Additional IPv4 CIDR blocks</label>
                {cidrEdit.secondary.length === 0 && (
                  <p className="text-aws-text-secondary mb-2">No additional CIDR blocks associated.</p>
                )}
                {cidrEdit.secondary.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input className="aws-input font-mono" value={c} placeholder="10.1.0.0/16"
                      onChange={e => {
                        const next = [...cidrEdit.secondary]; next[i] = e.target.value;
                        setCidrEdit({ ...cidrEdit, secondary: next });
                      }} />
                    <button type="button" className="p-1.5 hover:bg-aws-disabled-bg" aria-label="Remove CIDR"
                      onClick={() => setCidrEdit({ ...cidrEdit, secondary: cidrEdit.secondary.filter((_, j) => j !== i) })}>
                      <Trash2 size={15} className="text-aws-text-secondary" />
                    </button>
                  </div>
                ))}
                <button type="button" className="aws-btn aws-btn-secondary text-xs"
                  onClick={() => setCidrEdit({ ...cidrEdit, secondary: [...cidrEdit.secondary, ''] })}>
                  Add new IPv4 CIDR
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setCidrEdit(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tagEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-xl border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Manage tags</h3>
              <button onClick={() => setTagEdit(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveTags} className="p-4 space-y-4 text-sm">
              <p className="text-aws-text-secondary">VPC: <span className="font-mono">{tagEdit.id}</span></p>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 font-bold">
                <span>Key</span><span>Value</span><span />
              </div>
              {tagEdit.tags.length === 0 && <p className="text-aws-text-secondary">No tags associated with this resource.</p>}
              {tagEdit.tags.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input className="aws-input" value={t.Key} aria-label={`Tag key ${i + 1}`}
                    onChange={e => {
                      const next = tagEdit.tags.map((x, j) => j === i ? { ...x, Key: e.target.value } : x);
                      setTagEdit({ ...tagEdit, tags: next });
                    }} />
                  <input className="aws-input" value={t.Value} aria-label={`Tag value ${i + 1}`}
                    onChange={e => {
                      const next = tagEdit.tags.map((x, j) => j === i ? { ...x, Value: e.target.value } : x);
                      setTagEdit({ ...tagEdit, tags: next });
                    }} />
                  <button type="button" className="p-1.5 hover:bg-aws-disabled-bg" aria-label="Remove tag"
                    onClick={() => setTagEdit({ ...tagEdit, tags: tagEdit.tags.filter((_, j) => j !== i) })}>
                    <Trash2 size={15} className="text-aws-text-secondary" />
                  </button>
                </div>
              ))}
              <button type="button" className="aws-btn aws-btn-secondary text-xs"
                onClick={() => setTagEdit({ ...tagEdit, tags: [...tagEdit.tags, { Key: '', Value: '' }] })}>
                Add new tag
              </button>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setTagEdit(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {flowLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white shadow-xl w-full max-w-xl border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create flow log</h3>
              <button onClick={() => setFlowLog(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveFlowLog} className="p-4 space-y-4 text-sm">
              <p className="text-aws-text-secondary">Resource: <span className="font-mono">{flowLog.resourceId}</span></p>
              <div>
                <label className="block font-bold mb-1">Name <span className="font-normal text-aws-text-secondary">- optional</span></label>
                <input className="aws-input" value={flowLog.name} placeholder="my-flow-log"
                  onChange={e => setFlowLog({ ...flowLog, name: e.target.value })} />
              </div>
              <div>
                <label className="block font-bold mb-1">Filter</label>
                {FLOW_FILTERS.map(f => (
                  <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="flow-filter" checked={flowLog.filter === f.value}
                      onChange={() => setFlowLog({ ...flowLog, filter: f.value })} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block font-bold mb-1">Maximum aggregation interval</label>
                <select className="aws-input" value={flowLog.interval}
                  onChange={e => setFlowLog({ ...flowLog, interval: Number(e.target.value) })}>
                  {FLOW_INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Destination</label>
                {FLOW_DESTINATIONS.map(d => (
                  <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="flow-dest" checked={flowLog.destination === d.value}
                      onChange={() => setFlowLog({
                        ...flowLog, destination: d.value,
                        destinationArn: d.value === 's3' ? 's3://my-flow-logs-bucket' : '/aws/vpc/flowlogs',
                      })} />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block font-bold mb-1">
                  {flowLog.destination === 's3' ? 'S3 bucket ARN' : 'Destination log group'}
                </label>
                <input className="aws-input font-mono" value={flowLog.destinationArn} required
                  onChange={e => setFlowLog({ ...flowLog, destinationArn: e.target.value })} />
              </div>
              <div>
                <label className="block font-bold mb-1">Log record format</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="flow-format" checked={!flowLog.customFormat}
                    onChange={() => setFlowLog({ ...flowLog, customFormat: false })} />
                  <span>XWS default format</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="flow-format" checked={flowLog.customFormat}
                    onChange={() => setFlowLog({ ...flowLog, customFormat: true })} />
                  <span>Custom format</span>
                </label>
                {flowLog.customFormat && (
                  <textarea className="aws-input font-mono mt-2" rows={3} value={flowLog.format}
                    onChange={e => setFlowLog({ ...flowLog, format: e.target.value })} />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setFlowLog(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create flow log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
