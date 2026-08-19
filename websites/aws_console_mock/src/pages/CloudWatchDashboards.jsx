import { usePaged, TableToolbar, TablePager } from '../components/TablePaging';
import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { RefreshCw, Search, X, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function CloudWatchDashboards() {
  const { state, dispatch, addFlash } = useStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const dashboards = state.cloudwatch.dashboards.filter(d => {
    if (!search) return true;
    return d.name.toLowerCase().includes(search.toLowerCase());
  });
  const paged = usePaged(dashboards);

  const handleCreate = (e) => {
    e.preventDefault();
    dispatch({ type: 'CREATE_DASHBOARD', payload: {
      name, widgets: 0, lastModified: new Date().toISOString()
    }});
    addFlash('success', `Successfully created dashboard "${name}"`);
    setName(''); setShowCreate(false);
  };

  const handleDelete = () => {
    selected.forEach(name => dispatch({ type: 'DELETE_DASHBOARD', payload: name }));
    addFlash('success', `Deleted ${selected.length} dashboard(s)`);
    setSelected([]);
  };

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">Dashboards ({dashboards.length})</h1>
          <div className="flex items-center gap-2">
            <TableToolbar p={paged} />
            <button className="p-1.5 hover:bg-aws-disabled-bg" onClick={() => addFlash('success', 'Refreshed')}><RefreshCw size={16} className="text-aws-text-secondary" /></button>
            {selected.length > 0 && <button className="aws-btn aws-btn-secondary text-xs" onClick={handleDelete}>Delete</button>}
            <button className="aws-btn aws-btn-call-to-action text-xs" onClick={() => setShowCreate(true)}><Plus size={14} className="inline mr-1" />Create dashboard</button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder="Filter dashboards" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="aws-table">
          <thead>
            <tr><th className="w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? paged.rows.map(d=>d.name) : [])} /></th>
            <th>Dashboard name</th><th>Widgets</th><th>Last modified</th></tr>
          </thead>
          <tbody>
            {paged.rows.map(d => (
              <tr key={d.name} className={selected.includes(d.name) ? 'bg-aws-status-info-bg/50' : ''}>
                <td><input type="checkbox" checked={selected.includes(d.name)} onChange={e => setSelected(e.target.checked ? [...selected, d.name] : selected.filter(x=>x!==d.name))} /></td>
                <td className="font-medium text-aws-blue">{d.name}</td>
                <td>{d.widgets}</td>
                <td>{d.lastModified ? format(new Date(d.lastModified), 'MMM d, yyyy h:mm a') : '-'}</td>
              </tr>
            ))}
            {dashboards.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-aws-text-secondary">No dashboards found.</td></tr>}
          </tbody>
        </table>
        <TablePager p={paged} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">Create dashboard</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div><label className="block text-sm font-bold mb-1">Dashboard name</label>
                <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="My-Dashboard" required /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">Create dashboard</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
