import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import ActionsMenu from '../components/ActionsMenu';
import LastUpdated from '../components/LastUpdated';
import TagsDialog from '../components/dialogs/TagsDialog';
import { Search, Plus, X, Trash2 } from 'lucide-react';

/**
 * Network ACLs.
 *
 * The registry gained a network-ACL DETAIL page in 1.6.3 while this list page did not exist,
 * so the detail page's back link fell through to Console Home — a link that looks like it
 * worked. Gate S8 now refuses that combination.
 *
 * Actions menu captured from the live VPC console on 2026-08-18
 * (reference/capture/extracted/vpc-family-actions.2026-08-18.json). It was read with no row
 * selected, so every item but Create showed as disabled; the per-item gating below follows
 * that observation.
 */
const PATH = 'vpc.networkAcls';

export default function VPCNetworkAcls() {
  const { state, dispatch, addFlash } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [vpcId, setVpcId] = useState(state.vpc.vpcs[0]?.id || '');
  const [rules, setRules] = useState(null);      // { id, direction, list }
  const [assoc, setAssoc] = useState(null);      // { id, subnets }
  const [tagFor, setTagFor] = useState(null);

  const acls = (state.vpc.networkAcls || []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.name || '').toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.vpcId || '').includes(q);
  });
  const paged = usePaged(acls);
  const chosen = (state.vpc.networkAcls || []).filter((a) => selected.includes(a.id));
  const one = chosen.length === 1 ? chosen[0] : null;

  const handleCreate = (e) => {
    e.preventDefault();
    const id = `acl-${Math.random().toString(16).substr(2, 8)}`;
    dispatch({ type: 'RESOURCE_CREATE', payload: { path: PATH, key: 'id', item: {
      id, name: name || 'unnamed-nacl', vpcId, isDefault: false, associations: [],
      // A new ACL denies everything until rules are added — the console's own default.
      inbound: [{ ruleNumber: '*', protocol: 'All', portRange: 'All', source: '0.0.0.0/0', allow: false }],
      outbound: [{ ruleNumber: '*', protocol: 'All', portRange: 'All', destination: '0.0.0.0/0', allow: false }],
      tags: name ? [{ Key: 'Name', Value: name }] : [],
    }}});
    addFlash('success', `Created network ACL ${id}`);
    setName(''); setShowCreate(false);
  };

  const handleDelete = () => {
    const blocked = chosen.filter((a) => a.isDefault);
    const deletable = chosen.filter((a) => !a.isDefault);
    deletable.forEach((a) => dispatch({ type: 'RESOURCE_DELETE', payload: { path: PATH, key: 'id', id: a.id } }));
    if (deletable.length) addFlash('success', `Deleted ${deletable.length} network ACL(s)`);
    if (blocked.length) addFlash('error', `Cannot delete the default network ACL ${blocked.map((a) => a.id).join(', ')}`);
    setSelected([]);
  };

  const saveRules = (e) => {
    e.preventDefault();
    const cleaned = rules.list
      .filter((r) => String(r.ruleNumber).trim())
      .map((r) => ({ ...r, ruleNumber: r.ruleNumber === '*' ? '*' : Number(r.ruleNumber) }));
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: rules.id, fields: { [rules.direction]: cleaned } } });
    addFlash('success', `Updated ${rules.direction} rules for ${rules.id}`);
    setRules(null);
  };

  const saveAssoc = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: assoc.id, fields: { associations: assoc.subnets } } });
    addFlash('success', `Updated subnet associations for ${assoc.id}`);
    setAssoc(null);
  };

  const openRules = (direction) => setRules({
    id: one.id, direction,
    list: (one[direction] || []).map((r) => ({ ...r })),
  });

  const actions = [
    { label: 'Create network ACL', onSelect: () => setShowCreate(true) },
    { label: 'View details', disabled: !one, reason: 'Select exactly one network ACL',
      onSelect: () => navigate(`/vpc/network-acls/${one.id}`) },
    { separator: true },
    { label: 'Edit inbound rules', disabled: !one, reason: 'Select exactly one network ACL',
      onSelect: () => openRules('inbound') },
    { label: 'Edit outbound rules', disabled: !one, reason: 'Select exactly one network ACL',
      onSelect: () => openRules('outbound') },
    { label: 'Edit subnet associations', disabled: !one, reason: 'Select exactly one network ACL',
      onSelect: () => setAssoc({ id: one.id, subnets: [...(one.associations || [])] }) },
    { separator: true },
    { label: 'Manage tags', disabled: !one, reason: 'Select exactly one network ACL',
      onSelect: () => setTagFor(one) },
    { separator: true },
    { label: 'Delete network ACLs', danger: true, disabled: chosen.length === 0,
      reason: 'Select at least one network ACL', onSelect: handleDelete },
  ];

  const peerKey = rules?.direction === 'inbound' ? 'source' : 'destination';

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">
            Network ACLs ({selected.length > 0 ? `${selected.length}/${acls.length}` : acls.length})
          </h1>
          <div className="flex items-center gap-2">
            <TableToolbar p={paged} />
            <LastUpdated />
            <ActionsMenu items={actions} />
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}>
              <Plus size={14} className="inline mr-1" />Create network ACL
            </button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter network ACLs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th className="w-8"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? paged.rows.map((a) => a.id) : [])} /></th>
              <th>Network ACL ID</th><th>Name</th><th>Associated with</th><th>Default</th><th>VPC ID</th><th>Inbound rules</th><th>Outbound rules</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((a) => (
              <tr key={a.id} className={selected.includes(a.id) ? 'bg-aws-status-info-bg/50' : ''}>
                <td><input type="checkbox" checked={selected.includes(a.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, a.id] : selected.filter((x) => x !== a.id))} /></td>
                <td className="font-mono text-sm">
                  <Link to={`/vpc/network-acls/${a.id}`} className="text-aws-blue hover:underline">{a.id}</Link>
                </td>
                <td className="font-medium">{a.name || '–'}</td>
                <td>{(a.associations || []).length} Subnet{(a.associations || []).length === 1 ? '' : 's'}</td>
                <td>{a.isDefault ? 'Yes' : 'No'}</td>
                <td className="font-mono text-sm">
                  <Link to={`/vpc/vpcs/${a.vpcId}`} className="text-aws-blue hover:underline">{a.vpcId}</Link>
                </td>
                <td>{(a.inbound || []).length}</td>
                <td>{(a.outbound || []).length}</td>
              </tr>
            ))}
            {acls.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-aws-text-secondary">No network ACLs found.</td></tr>}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create network ACL</h3>
              <button onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4 text-sm">
              <div>
                <label className="block font-bold mb-1" htmlFor="acl-name">Name <span className="font-normal text-aws-text-secondary">- optional</span></label>
                <input id="acl-name" className="aws-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-nacl" />
              </div>
              <div>
                <label className="block font-bold mb-1" htmlFor="acl-vpc">VPC</label>
                <select id="acl-vpc" className="aws-input" value={vpcId} required onChange={(e) => setVpcId(e.target.value)}>
                  {state.vpc.vpcs.map((v) => <option key={v.id} value={v.id}>{v.id} ({v.name})</option>)}
                </select>
              </div>
              <p className="text-aws-text-secondary">A new network ACL denies all inbound and outbound traffic until you add rules.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create network ACL</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rules && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white shadow-xl w-full max-w-3xl border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit {rules.direction} rules</h3>
              <button onClick={() => setRules(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveRules} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">Network ACL: <span className="font-mono">{rules.id}</span></p>
              <div className="grid grid-cols-[90px_1fr_1fr_1fr_110px_auto] gap-2 font-bold text-xs">
                <span>Rule number</span><span>Protocol</span><span>Port range</span>
                <span>{rules.direction === 'inbound' ? 'Source' : 'Destination'}</span><span>Allow / Deny</span><span />
              </div>
              {rules.list.map((r, i) => (
                <div key={i} className="grid grid-cols-[90px_1fr_1fr_1fr_110px_auto] gap-2 items-center">
                  <input className="aws-input" value={r.ruleNumber} aria-label={`Rule number ${i + 1}`}
                    onChange={(e) => setRules({ ...rules, list: rules.list.map((x, j) => (j === i ? { ...x, ruleNumber: e.target.value } : x)) })} />
                  <select className="aws-input" value={r.protocol} aria-label={`Protocol ${i + 1}`}
                    onChange={(e) => setRules({ ...rules, list: rules.list.map((x, j) => (j === i ? { ...x, protocol: e.target.value } : x)) })}>
                    {['All', 'TCP', 'UDP', 'ICMP'].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input className="aws-input" value={r.portRange} aria-label={`Port range ${i + 1}`}
                    onChange={(e) => setRules({ ...rules, list: rules.list.map((x, j) => (j === i ? { ...x, portRange: e.target.value } : x)) })} />
                  <input className="aws-input font-mono" value={r[peerKey] || ''} aria-label={`Peer ${i + 1}`}
                    onChange={(e) => setRules({ ...rules, list: rules.list.map((x, j) => (j === i ? { ...x, [peerKey]: e.target.value } : x)) })} />
                  <select className="aws-input" value={r.allow ? 'allow' : 'deny'} aria-label={`Allow or deny ${i + 1}`}
                    onChange={(e) => setRules({ ...rules, list: rules.list.map((x, j) => (j === i ? { ...x, allow: e.target.value === 'allow' } : x)) })}>
                    <option value="allow">Allow</option><option value="deny">Deny</option>
                  </select>
                  <button type="button" className="p-1.5 hover:bg-aws-disabled-bg" aria-label="Remove rule"
                    onClick={() => setRules({ ...rules, list: rules.list.filter((_, j) => j !== i) })}>
                    <Trash2 size={15} className="text-aws-text-secondary" />
                  </button>
                </div>
              ))}
              <button type="button" className="aws-btn aws-btn-secondary text-xs"
                onClick={() => setRules({ ...rules, list: [...rules.list, {
                  ruleNumber: (rules.list.filter((r) => r.ruleNumber !== '*').length + 1) * 100,
                  protocol: 'TCP', portRange: '', [peerKey]: '0.0.0.0/0', allow: true }] })}>
                Add new rule
              </button>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setRules(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit subnet associations</h3>
              <button onClick={() => setAssoc(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveAssoc} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">Network ACL: <span className="font-mono">{assoc.id}</span></p>
              {state.vpc.subnets.length === 0 && <p className="text-aws-text-secondary">No subnets in this account.</p>}
              {state.vpc.subnets.map((sn) => (
                <label key={sn.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={assoc.subnets.includes(sn.id)}
                    onChange={(e) => setAssoc({ ...assoc, subnets: e.target.checked
                      ? [...assoc.subnets, sn.id]
                      : assoc.subnets.filter((x) => x !== sn.id) })} />
                  <span className="font-mono">{sn.id}</span>
                  <span className="text-aws-text-secondary">{sn.name} · {sn.cidr}</span>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setAssoc(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tagFor && (
        <TagsDialog path={PATH} keyField="id" resource={tagFor} label="Network ACL" onClose={() => setTagFor(null)} />
      )}
    </div>
  );
}
