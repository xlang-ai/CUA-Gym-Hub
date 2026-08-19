import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import ActionsMenu from '../components/ActionsMenu';
import LastUpdated from '../components/LastUpdated';
import TagsDialog from '../components/dialogs/TagsDialog';
import {Search, X, Plus, Trash2} from 'lucide-react';

const PATH = 'vpc.routeTables';

export default function VPCRouteTables() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailTab, setDetailTab] = useState('Routes');
  const [name, setName] = useState('');
  const [vpcId, setVpcId] = useState(state.vpc.vpcs[0]?.id || '');
  const navigate = useNavigate();
  const [routesEdit, setRoutesEdit] = useState(null);
  const [subnetAssoc, setSubnetAssoc] = useState(null);
  const [edgeAssoc, setEdgeAssoc] = useState(null);
  const [propagation, setPropagation] = useState(null);
  const [tagFor, setTagFor] = useState(null);

  const routeTables = state.vpc.routeTables.filter(rt => {
    if (!search) return true;
    const q = search.toLowerCase();
    return rt.name.toLowerCase().includes(q) || rt.id.toLowerCase().includes(q);
  });
  const paged = usePaged(routeTables);

  const detail = detailId ? state.vpc.routeTables.find(rt => rt.id === detailId) : null;

  const handleCreate = (e) => {
    e.preventDefault();
    const id = `rtb-${Math.random().toString(16).substr(2, 12)}`;
    dispatch({ type: 'CREATE_ROUTE_TABLE', payload: {
      id, name: name || 'unnamed-rt', vpcId, associations: [],
      routes: [{ destination: state.vpc.vpcs.find(v=>v.id===vpcId)?.cidr || '10.0.0.0/16', target: 'local', status: 'active' }]
    }});
    addFlash('success', `Successfully created route table ${id}`);
    setName(''); setShowCreate(false);
  };

  const handleDelete = () => {
    // The console refuses to delete a VPC's main route table.
    const picked = state.vpc.routeTables.filter(rt => selected.includes(rt.id));
    const blocked = picked.filter(rt => rt.main);
    const deletable = picked.filter(rt => !rt.main);
    deletable.forEach(rt => dispatch({ type: 'DELETE_ROUTE_TABLE', payload: rt.id }));
    if (deletable.length) addFlash('success', `Deleted ${deletable.length} route table(s)`);
    if (blocked.length) addFlash('error', `Cannot delete the main route table ${blocked.map(rt => rt.id).join(', ')}`);
    setSelected([]); setDetailId(null);
  };


  const chosen = state.vpc.routeTables.filter(rt => selected.includes(rt.id));
  const one = chosen.length === 1 ? chosen[0] : null;

  const setMain = () => {
    // Exactly one main route table per VPC: promoting one demotes the incumbent.
    state.vpc.routeTables
      .filter(rt => rt.vpcId === one.vpcId)
      .forEach(rt => dispatch({ type: 'RESOURCE_UPDATE', payload: {
        path: PATH, key: 'id', id: rt.id, fields: { main: rt.id === one.id } } }));
    addFlash('success', `${one.id} is now the main route table for ${one.vpcId}`);
  };

  const saveRoutes = (e) => {
    e.preventDefault();
    const list = routesEdit.list
      .filter(r => r.destination.trim() && r.target.trim())
      .map(r => ({ destination: r.destination.trim(), target: r.target.trim(), status: r.status || 'active' }));
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: routesEdit.id, fields: { routes: list } } });
    addFlash('success', `Updated routes for ${routesEdit.id}`);
    setRoutesEdit(null);
  };

  const saveSubnetAssoc = (e) => {
    e.preventDefault();
    // The subnet also records its route table, so both sides move together.
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: subnetAssoc.id, fields: { associations: subnetAssoc.list } } });
    state.vpc.subnets.forEach(sn => {
      const now = subnetAssoc.list.includes(sn.id);
      if (now && sn.routeTable !== subnetAssoc.id) {
        dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'vpc.subnets', key: 'id', id: sn.id, fields: { routeTable: subnetAssoc.id } } });
      } else if (!now && sn.routeTable === subnetAssoc.id) {
        dispatch({ type: 'RESOURCE_UPDATE', payload: { path: 'vpc.subnets', key: 'id', id: sn.id, fields: { routeTable: '' } } });
      }
    });
    addFlash('success', `Updated subnet associations for ${subnetAssoc.id}`);
    setSubnetAssoc(null);
  };

  const saveEdgeAssoc = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: edgeAssoc.id, fields: { edgeAssociations: edgeAssoc.list } } });
    addFlash('success', `Updated edge associations for ${edgeAssoc.id}`);
    setEdgeAssoc(null);
  };

  const savePropagation = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESOURCE_UPDATE', payload: { path: PATH, key: 'id', id: propagation.id, fields: { propagatingGateways: propagation.list } } });
    addFlash('success', `Updated route propagation for ${propagation.id}`);
    setPropagation(null);
  };

  // Item list and gating captured from the live VPC console on 2026-08-18:
  // reference/capture/extracted/vpc-family-actions.2026-08-18.json. "Set main route table" was
  // disabled there because the selected table was already the main one.
  const actions = [
    { label: 'Create route table', onSelect: () => setShowCreate(true) },
    { label: 'View details', disabled: !one, reason: 'Select exactly one route table',
      onSelect: () => navigate(`/vpc/route-tables/${one.id}`) },
    { label: 'Set main route table',
      disabled: !one || !!one.main,
      reason: one ? 'This is already the main route table for its VPC' : 'Select exactly one route table',
      onSelect: setMain },
    { separator: true },
    { label: 'Edit routes', disabled: !one, reason: 'Select exactly one route table',
      onSelect: () => setRoutesEdit({ id: one.id, list: (one.routes || []).map(r => ({ ...r })) }) },
    { label: 'Edit subnet associations', disabled: !one, reason: 'Select exactly one route table',
      onSelect: () => setSubnetAssoc({ id: one.id, list: [...(one.associations || [])] }) },
    { label: 'Edit edge associations', disabled: !one, reason: 'Select exactly one route table',
      onSelect: () => setEdgeAssoc({ id: one.id, list: [...(one.edgeAssociations || [])] }) },
    { label: 'Edit route propagation', disabled: !one, reason: 'Select exactly one route table',
      onSelect: () => setPropagation({ id: one.id, list: [...(one.propagatingGateways || [])] }) },
    { separator: true },
    { label: 'Manage tags', disabled: !one, reason: 'Select exactly one route table',
      onSelect: () => setTagFor(one) },
    { separator: true },
    { label: 'Delete route table', danger: true, disabled: chosen.length === 0,
      reason: 'Select at least one route table', onSelect: handleDelete },
  ];

  return (
    <div className="space-y-0">
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">Route Tables ({routeTables.length})</h1>
          <div className="flex items-center gap-2">
            <TableToolbar p={paged} />
            <LastUpdated />
            <LastUpdated />
            <ActionsMenu items={actions} />
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}><Plus size={14} className="inline mr-1" />Create route table</button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter route tables" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th className="w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? paged.rows.map(r=>r.id) : [])} /></th>
            <th>Route Table ID</th><th>Name</th><th>Main</th><th>VPC</th><th>Associations</th></tr>
          </thead>
          <tbody>
            {paged.rows.map(rt => (
              <tr key={rt.id} className={`cursor-pointer ${selected.includes(rt.id) ? 'bg-aws-status-info-bg/50' : ''}`} onClick={() => setDetailId(rt.id)}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.includes(rt.id)} onChange={e => setSelected(e.target.checked ? [...selected, rt.id] : selected.filter(x=>x!==rt.id))} />
                </td>
                <td className="font-mono text-sm"><Link to={`/vpc/route-tables/${rt.id}`} className="text-aws-blue hover:underline">{rt.id}</Link></td>
                <td className="font-medium">{rt.name}</td>
                <td>{rt.main ? 'Yes' : 'No'}</td>
                <td className="font-mono text-sm">
                  <Link to={`/vpc/vpcs/${rt.vpcId}`} className="text-aws-blue hover:underline">{rt.vpcId}</Link>
                </td>
                <td>{rt.associations.length} subnet(s)</td>
              </tr>
            ))}
            {routeTables.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-aws-text-secondary">No route tables found.</td></tr>}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {detail && (
        <div className="aws-card mt-0 border-t-0">
          <div className="flex gap-4 border-b border-aws-border mb-4">
            {['Routes', 'Subnet Associations'].map(tab => (
              <button role="tab" aria-selected={detailTab === tab} key={tab} onClick={() => setDetailTab(tab)} className={`pb-2 px-1 text-sm font-medium border-b-2 ${detailTab === tab ? 'border-aws-blue text-aws-blue' : 'border-transparent text-aws-text-secondary hover:text-aws-text'}`}>{tab}</button>
            ))}
          </div>
          {detailTab === 'Routes' && (
            <table className="aws-table">
              <thead><tr><th>Destination</th><th>Target</th><th>Status</th></tr></thead>
              <tbody>
                {(detail.routes || []).map((r, i) => (
                  <tr key={i}>
                    <td className="font-mono text-sm">{r.destination}</td>
                    <td className="font-mono text-sm text-aws-blue">{r.target}</td>
                    <td><span className="aws-badge bg-aws-status-success-bg text-aws-success">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {detailTab === 'Subnet Associations' && (
            <table className="aws-table">
              <thead><tr><th>Subnet ID</th><th>Subnet Name</th></tr></thead>
              <tbody>
                {detail.associations.map(subId => {
                  const sub = state.vpc.subnets.find(s => s.id === subId);
                  return <tr key={subId}><td className="font-mono text-sm text-aws-blue">{subId}</td><td>{sub?.name || '-'}</td></tr>;
                })}
                {detail.associations.length === 0 && <tr><td colSpan="2" className="text-center py-4 text-aws-text-secondary">No subnet associations.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create route table</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div><label className="block text-sm font-bold mb-1">Name</label>
                <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="my-route-table" required /></div>
              <div><label className="block text-sm font-bold mb-1">VPC</label>
                <select className="aws-input" value={vpcId} onChange={e => setVpcId(e.target.value)}>
                  {state.vpc.vpcs.map(v => <option key={v.id} value={v.id}>{v.name} ({v.id})</option>)}
                </select></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {routesEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white shadow-xl w-full max-w-2xl border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit routes</h3>
              <button onClick={() => setRoutesEdit(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveRoutes} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">Route table: <span className="font-mono">{routesEdit.id}</span></p>
              <div className="grid grid-cols-[1fr_1fr_110px_auto] gap-2 font-bold text-xs">
                <span>Destination</span><span>Target</span><span>Status</span><span />
              </div>
              {routesEdit.list.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_110px_auto] gap-2 items-center">
                  <input className="aws-input font-mono" value={r.destination} aria-label={`Destination ${i + 1}`}
                    onChange={e => setRoutesEdit({ ...routesEdit, list: routesEdit.list.map((x, j) => j === i ? { ...x, destination: e.target.value } : x) })} />
                  <input className="aws-input font-mono" value={r.target} aria-label={`Target ${i + 1}`}
                    onChange={e => setRoutesEdit({ ...routesEdit, list: routesEdit.list.map((x, j) => j === i ? { ...x, target: e.target.value } : x) })} />
                  <span className="text-aws-success">{r.status || 'active'}</span>
                  <button type="button" className="p-1.5 hover:bg-aws-disabled-bg" aria-label="Remove route"
                    disabled={r.target === 'local'} title={r.target === 'local' ? 'The local route cannot be removed' : undefined}
                    onClick={() => setRoutesEdit({ ...routesEdit, list: routesEdit.list.filter((_, j) => j !== i) })}>
                    <Trash2 size={15} className={r.target === 'local' ? 'text-aws-text-disabled' : 'text-aws-text-secondary'} />
                  </button>
                </div>
              ))}
              <button type="button" className="aws-btn aws-btn-secondary text-xs"
                onClick={() => setRoutesEdit({ ...routesEdit, list: [...routesEdit.list, { destination: '', target: '', status: 'active' }] })}>
                Add route
              </button>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setRoutesEdit(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subnetAssoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit subnet associations</h3>
              <button onClick={() => setSubnetAssoc(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveSubnetAssoc} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">Route table: <span className="font-mono">{subnetAssoc.id}</span></p>
              {state.vpc.subnets.map(sn => (
                <label key={sn.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={subnetAssoc.list.includes(sn.id)}
                    onChange={e => setSubnetAssoc({ ...subnetAssoc, list: e.target.checked
                      ? [...subnetAssoc.list, sn.id] : subnetAssoc.list.filter(x => x !== sn.id) })} />
                  <span className="font-mono">{sn.id}</span>
                  <span className="text-aws-text-secondary">{sn.name} · {sn.cidr}</span>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setSubnetAssoc(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {edgeAssoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit edge associations</h3>
              <button onClick={() => setEdgeAssoc(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={saveEdgeAssoc} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">
                Edge associations route traffic arriving at a gateway into the VPC.
              </p>
              {(state.vpc.internetGateways || []).length === 0
                ? <p className="text-aws-text-secondary">No gateways available to associate.</p>
                : (state.vpc.internetGateways || []).map(ig => (
                  <label key={ig.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={edgeAssoc.list.includes(ig.id)}
                      onChange={e => setEdgeAssoc({ ...edgeAssoc, list: e.target.checked
                        ? [...edgeAssoc.list, ig.id] : edgeAssoc.list.filter(x => x !== ig.id) })} />
                    <span className="font-mono">{ig.id}</span>
                    <span className="text-aws-text-secondary">{ig.name}</span>
                  </label>
                ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setEdgeAssoc(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {propagation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Edit route propagation</h3>
              <button onClick={() => setPropagation(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={savePropagation} className="p-4 space-y-3 text-sm">
              <p className="text-aws-text-secondary">
                A virtual private gateway can propagate its routes into this route table automatically.
              </p>
              {(state.vpc.virtualPrivateGateways || []).length === 0
                ? <p className="text-aws-text-secondary">No virtual private gateways in this Region.</p>
                : (state.vpc.virtualPrivateGateways || []).map(g => (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={propagation.list.includes(g.id)}
                      onChange={e => setPropagation({ ...propagation, list: e.target.checked
                        ? [...propagation.list, g.id] : propagation.list.filter(x => x !== g.id) })} />
                    <span className="font-mono">{g.id}</span>
                    <span className="text-aws-text-secondary">{g.name} · {g.state}</span>
                  </label>
                ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setPropagation(null)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tagFor && <TagsDialog path={PATH} keyField="id" resource={tagFor} label="Route table" onClose={() => setTagFor(null)} />}
    </div>
  );
}
