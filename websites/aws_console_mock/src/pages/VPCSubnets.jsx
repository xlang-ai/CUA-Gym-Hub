import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import ActionsMenu from '../components/ActionsMenu';
import LastUpdated from '../components/LastUpdated';
import TagsDialog from '../components/dialogs/TagsDialog';
import PickerDialog from '../components/dialogs/PickerDialog';
import FlowLogDialog from '../components/dialogs/FlowLogDialog';
import { Search, X, Plus, Trash2 } from 'lucide-react';

const PATH = 'vpc.subnets';

export default function VPCSubnets() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [vpcId, setVpcId] = useState(state.vpc.vpcs[0]?.id || '');
  const [cidr, setCidr] = useState('');
  const [az, setAz] = useState('us-east-1a');
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [aclPick, setAclPick] = useState(null);
  const [rtPick, setRtPick] = useState(null);
  const [reservations, setReservations] = useState(null);
  const [tagFor, setTagFor] = useState(null);
  const [flowLogFor, setFlowLogFor] = useState(null);

  const subnets = state.vpc.subnets.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.vpcId.toLowerCase().includes(q);
  });
  const paged = usePaged(subnets);

  const handleCreate = (e) => {
    e.preventDefault();
    const id = `subnet-${Math.random().toString(16).substr(2, 17)}`;
    dispatch({ type: 'CREATE_SUBNET', payload: {
      id, name: name || 'unnamed-subnet', vpcId, cidr, az, availableIps: 251,
      autoAssignPublicIp: false, routeTable: '', type: 'private'
    }});
    addFlash('success', `Successfully created subnet ${id}`);
    setName(''); setCidr(''); setShowCreate(false);
  };

  const handleDelete = () => {
    selected.forEach(id => dispatch({ type: 'DELETE_SUBNET', payload: id }));
    addFlash('success', `Deleted ${selected.length} subnet(s)`);
    setSelected([]);
  };


  const chosen = state.vpc.subnets.filter(s => selected.includes(s.id));
  const one = chosen.length === 1 ? chosen[0] : null;

  const saveSettings = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: settings.id, fields: {
      autoAssignPublicIp: settings.autoAssignPublicIp,
      dns64: settings.dns64,
      resourceNameDnsARecord: settings.resourceNameDnsARecord,
    }}});
    addFlash('success', `Updated subnet settings for ${settings.id}`);
    setSettings(null);
  };

  const saveReservations = (e) => {
    e.preventDefault();
    const list = reservations.list.map(r => r.trim()).filter(Boolean);
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: reservations.id, fields: { cidrReservations: list } } });
    addFlash('success', `Updated CIDR reservations for ${reservations.id}`);
    setReservations(null);
  };

  // Item list and gating captured from the live VPC console on 2026-08-18:
  // reference/capture/extracted/vpc-family-actions.2026-08-18.json.
  // "Edit IPv6 CIDRs" and "Share subnet" were disabled there for stated reasons — no IPv6
  // association, and sharing needs Resource Access Manager — so they are gated on the same
  // conditions rather than dropped or silently enabled.
  const actions = [
    { label: 'Create subnet', onSelect: () => setShowCreate(true) },
    { label: 'View details', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => navigate(`/vpc/subnets/${one.id}`) },
    { label: 'Create flow log', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => setFlowLogFor(one.id) },
    { separator: true },
    { label: 'Edit subnet settings', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => setSettings({ id: one.id,
        autoAssignPublicIp: !!one.autoAssignPublicIp,
        dns64: !!one.dns64,
        resourceNameDnsARecord: !!one.resourceNameDnsARecord }) },
    { label: 'Edit IPv6 CIDRs',
      disabled: !one || !one.ipv6Cidr,
      reason: one ? 'This subnet has no IPv6 CIDR association' : 'Select exactly one subnet',
      onSelect: () => addFlash('info', `IPv6 CIDR editing for ${one.id}`) },
    { label: 'Edit network ACL association', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => setAclPick(one) },
    { label: 'Edit route table association', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => setRtPick(one) },
    { label: 'Edit CIDR reservations', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => setReservations({ id: one.id, list: [...(one.cidrReservations || [])] }) },
    { label: 'Share subnet', disabled: true,
      reason: 'Sharing a subnet requires XWS Resource Access Manager, which is not modelled',
      onSelect: () => {} },
    { separator: true },
    { label: 'Manage tags', disabled: !one, reason: 'Select exactly one subnet',
      onSelect: () => setTagFor(one) },
    { separator: true },
    { label: 'Delete subnet', danger: true, disabled: chosen.length === 0,
      reason: 'Select at least one subnet', onSelect: handleDelete },
  ];

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">
            Subnets ({selected.length > 0 ? `${selected.length}/${subnets.length}` : subnets.length})
          </h1>
          <div className="flex items-center gap-2">
            <TableToolbar p={paged} />
            <LastUpdated />
            <ActionsMenu items={actions} />
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}><Plus size={14} className="inline mr-1" />Create subnet</button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter subnets" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="aws-table">
            <thead>
              <tr><th className="w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? paged.rows.map(s=>s.id) : [])} /></th>
              <th>Subnet ID</th><th>Name</th><th>VPC</th><th>IPv4 CIDR</th><th>Availability Zone</th><th>Available IPs</th><th>Auto-assign public IP</th><th>Type</th></tr>
            </thead>
            <tbody>
              {paged.rows.map(s => (
                <tr key={s.id} className={selected.includes(s.id) ? 'bg-aws-status-info-bg/50' : ''}>
                  <td><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(e.target.checked ? [...selected, s.id] : selected.filter(x=>x!==s.id))} /></td>
                  <td className="font-mono text-sm"><Link to={`/vpc/subnets/${s.id}`} className="text-aws-blue hover:underline">{s.id}</Link></td>
                  <td className="font-medium">{s.name}</td>
                  <td className="font-mono text-sm">{s.vpcId}</td>
                  <td className="font-mono text-sm">{s.cidr}</td>
                  <td>{s.az}</td>
                  <td>{s.availableIps}</td>
                  <td>{s.autoAssignPublicIp ? 'Yes' : 'No'}</td>
                  <td><span className={`aws-badge ${s.type === 'public' ? 'bg-aws-status-success-bg text-aws-success' : 'bg-aws-disabled-bg text-aws-text-secondary'}`}>{s.type}</span></td>
                </tr>
              ))}
              {subnets.length === 0 && <tr><td colSpan="9" className="text-center py-8 text-aws-text-secondary">No subnets found.</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create subnet</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div><label className="block text-sm font-bold mb-1">Name</label>
                <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="my-subnet" required /></div>
              <div><label className="block text-sm font-bold mb-1">VPC</label>
                <select className="aws-input" value={vpcId} onChange={e => setVpcId(e.target.value)}>
                  {state.vpc.vpcs.map(v => <option key={v.id} value={v.id}>{v.name} ({v.id})</option>)}
                </select></div>
              <div><label className="block text-sm font-bold mb-1">IPv4 CIDR block</label>
                <input className="aws-input" value={cidr} onChange={e => setCidr(e.target.value)} placeholder="10.0.5.0/24" required /></div>
              <div><label className="block text-sm font-bold mb-1">Availability Zone</label>
                <select className="aws-input" value={az} onChange={e => setAz(e.target.value)}>
                  {['us-east-1a','us-east-1b','us-east-1c','us-east-1d'].map(z => <option key={z} value={z}>{z}</option>)}
                </select></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create subnet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {settings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit subnet settings</h3>
              <button onClick={() => setSettings(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveSettings} className="p-4 space-y-4 text-sm">
              <p className="text-aws-text-secondary">Subnet: <span className="font-mono">{settings.id}</span></p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={settings.autoAssignPublicIp}
                  onChange={(e) => setSettings({ ...settings, autoAssignPublicIp: e.target.checked })} />
                <span><span className="font-bold">Enable auto-assign public IPv4 address</span>
                  <span className="block text-aws-text-secondary">Instances launched in this subnet receive a public IPv4 address.</span></span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={settings.dns64}
                  onChange={(e) => setSettings({ ...settings, dns64: e.target.checked })} />
                <span><span className="font-bold">Enable DNS64</span>
                  <span className="block text-aws-text-secondary">Returns synthetic IPv6 addresses for IPv4-only destinations.</span></span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={settings.resourceNameDnsARecord}
                  onChange={(e) => setSettings({ ...settings, resourceNameDnsARecord: e.target.checked })} />
                <span><span className="font-bold">Enable resource-name DNS A record</span>
                  <span className="block text-aws-text-secondary">Answers DNS queries for instance resource names with an A record.</span></span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setSettings(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aclPick && (
        <PickerDialog
          title="Edit network ACL association"
          description={`Subnet: ${aclPick.id}`}
          label="Network ACL"
          initial={(state.vpc.networkAcls || []).find(a => (a.associations || []).includes(aclPick.id))?.id || ''}
          options={(state.vpc.networkAcls || []).map(a => ({ value: a.id, label: `${a.id}${a.name ? ` (${a.name})` : ''}` }))}
          emptyMessage="No network ACLs exist in this VPC."
          confirmLabel="Save"
          onClose={() => setAclPick(null)}
          onConfirm={(aclId) => {
            // Association lives on the ACL, so both the new and the previous owner change.
            (state.vpc.networkAcls || []).forEach(a => {
              const has = (a.associations || []).includes(aclPick.id);
              if (a.id === aclId && !has) {
                dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'vpc.networkAcls', key: 'id', id: a.id,
                  fields: { associations: [...(a.associations || []), aclPick.id] } } });
              } else if (a.id !== aclId && has) {
                dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'vpc.networkAcls', key: 'id', id: a.id,
                  fields: { associations: (a.associations || []).filter(x => x !== aclPick.id) } } });
              }
            });
            addFlash('success', `Associated ${aclPick.id} with network ACL ${aclId}`);
          }}
        />
      )}

      {rtPick && (
        <PickerDialog
          title="Edit route table association"
          description={`Subnet: ${rtPick.id}`}
          label="Route table"
          initial={rtPick.routeTable || ''}
          options={(state.vpc.routeTables || []).map(r => ({ value: r.id, label: `${r.id}${r.name ? ` (${r.name})` : ''}${r.main ? ' — main' : ''}` }))}
          emptyMessage="No route tables exist in this VPC."
          confirmLabel="Save"
          onClose={() => setRtPick(null)}
          onConfirm={(rtId) => {
            dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: rtPick.id, fields: { routeTable: rtId } } });
            (state.vpc.routeTables || []).forEach(r => {
              const has = (r.associations || []).includes(rtPick.id);
              if (r.id === rtId && !has) {
                dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'vpc.routeTables', key: 'id', id: r.id,
                  fields: { associations: [...(r.associations || []), rtPick.id] } } });
              } else if (r.id !== rtId && has) {
                dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'vpc.routeTables', key: 'id', id: r.id,
                  fields: { associations: (r.associations || []).filter(x => x !== rtPick.id) } } });
              }
            });
            addFlash('success', `Associated ${rtPick.id} with route table ${rtId}`);
          }}
        />
      )}

      {reservations && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit CIDR reservations</h3>
              <button onClick={() => setReservations(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveReservations} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">Subnet: <span className="font-mono">{reservations.id}</span></p>
              {reservations.list.length === 0 && <p className="text-aws-text-secondary">No CIDR reservations on this subnet.</p>}
              {reservations.list.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="aws-input font-mono" value={c} placeholder="10.0.1.16/28" aria-label={`Reservation ${i + 1}`}
                    onChange={(e) => setReservations({ ...reservations, list: reservations.list.map((x, j) => (j === i ? e.target.value : x)) })} />
                  <button type="button" className="p-1.5 hover:bg-aws-disabled-bg" aria-label="Remove reservation"
                    onClick={() => setReservations({ ...reservations, list: reservations.list.filter((_, j) => j !== i) })}>
                    <Trash2 size={15} className="text-aws-text-secondary" />
                  </button>
                </div>
              ))}
              <button type="button" className="aws-btn aws-btn-secondary text-xs"
                onClick={() => setReservations({ ...reservations, list: [...reservations.list, ''] })}>
                Add CIDR reservation
              </button>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setReservations(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tagFor && <TagsDialog path={PATH} keyField="id" resource={tagFor} label="Subnet" onClose={() => setTagFor(null)} />}
      {flowLogFor && <FlowLogDialog resourceId={flowLogFor} onClose={() => setFlowLogFor(null)} />}
    </div>
  );
}
