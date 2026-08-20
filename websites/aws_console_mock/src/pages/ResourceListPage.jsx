import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePaged, TablePager } from '../components/TablePaging';
import ColumnToggle, { useColumnVisibility } from '../components/ColumnToggle';
import ActionsMenu from '../components/ActionsMenu';
import LastUpdated from '../components/LastUpdated';
import TagsDialog from '../components/dialogs/TagsDialog';
import { RESOURCES } from '../lib/resourceRegistry';
import { Search, Plus, X } from 'lucide-react';

/**
 * Every console list page, from its registry entry.
 *
 * The detail layer went this way in 1.6.3 — one component, 26 pages — while list pages stayed
 * bespoke: 13,300 lines across ~60 files, each with its own copy of a header, a filter box, a
 * table, a create form and a pager. That is where the slow, non-compounding work was, and where
 * the drift lived: pages that never got real pagination, or a column chooser, or a rendered h1.
 *
 * Actions are declarative. `kind` covers the shapes that recur across the captured menus —
 * create, view-details, manage-tags, delete, and unavailable — so a page only needs bespoke code
 * for genuinely bespoke behaviour. An `unavailable` item renders disabled with its reason rather
 * than being dropped, because the console shows it and an agent should see why it cannot be used.
 */
function at(state, path) {
  return path.split('.').reduce((n, k) => (n ? n[k] : undefined), state) || [];
}

function cellValue(col, row, state) {
  if (col.get) return col.get(row, state);
  const v = row[col.field];
  if (col.format) return col.format(v, row);
  if (v === null || v === undefined || v === '') return '–';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '–';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export default function ResourceListPage({ resourceId }) {
  const spec = RESOURCES.find((r) => r.id === resourceId);
  const { state, dispatch, addFlash } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const [tagFor, setTagFor] = useState(null);

  const list = spec?.list;
  const columns = list?.columns || [];
  const [visibleCols, setVisibleCols] = useColumnVisibility(
    `list_${resourceId}`, columns.map((c) => c.label));

  if (!spec || !list) {
    return <div className="aws-card p-6 text-sm">No list configuration for “{resourceId}”.</div>;
  }

  const all = at(state, spec.path);
  const rows = all.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (list.searchFields || [spec.key, spec.titleField]).some(
      (f) => String(r[f] ?? '').toLowerCase().includes(q));
  });
  const paged = usePaged(rows);
  const shown = columns.filter((c) => visibleCols.includes(c.label));
  const chosen = all.filter((r) => selected.includes(r[spec.key]));
  const one = chosen.length === 1 ? chosen[0] : null;

  const openCreate = () => {
    setForm(Object.fromEntries((list.create?.fields || []).map((f) => [f.name, f.initial ?? ''])));
    setShowCreate(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const item = list.create.build(form, state);
    dispatch({ type: 'RESOURCE_CREATE', payload: { path: spec.path, key: spec.key, item } });
    addFlash('success', `Created ${item[spec.key]}`);
    setShowCreate(false);
  };

  const handleDelete = () => {
    const guard = list.deleteGuard;
    const blocked = guard ? chosen.filter((r) => guard.blocked(r, state)) : [];
    const ok = chosen.filter((r) => !blocked.includes(r));
    ok.forEach((r) => dispatch({ type: 'RESOURCE_DELETE', payload: { path: spec.path, key: spec.key, id: r[spec.key] } }));
    if (ok.length) addFlash('success', `Deleted ${ok.length} ${ok.length === 1 ? 'resource' : 'resources'}`);
    if (blocked.length) addFlash('error', guard.message(blocked));
    setSelected([]);
  };

  const needsOne = `Select exactly one ${list.singular}`;
  const actions = (list.actions || []).map((a) => {
    if (a.separator) return a;
    switch (a.kind) {
      case 'create':
        return { label: a.label, disabled: a.disabledWhen?.(state), reason: a.reason, onSelect: openCreate };
      case 'view-details':
        return { label: a.label, disabled: !one, reason: needsOne,
          onSelect: () => navigate(spec.detailRoute.replace(':id', encodeURIComponent(one[spec.key]))) };
      case 'manage-tags':
        return { label: a.label, disabled: !one, reason: needsOne, onSelect: () => setTagFor(one) };
      case 'delete':
        return { label: a.label, danger: true, disabled: chosen.length === 0,
          reason: `Select at least one ${list.singular}`, onSelect: handleDelete };
      case 'unavailable':
        // Shown because the console shows it, disabled because this mock does not model what it
        // needs. Stating the reason beats hiding the item or letting it do nothing.
        return { label: a.label, disabled: true, reason: a.reason, onSelect: () => {} };
      default: {
        const gated = one && a.disabledWhenSelected?.(one, state);
        return {
          label: a.label,
          disabled: !one || !!gated,
          reason: !one ? needsOne : a.disabledReason,
          onSelect: () => a.onSelect?.({ resource: one, state, dispatch, addFlash, navigate }),
        };
      }
    }
  });

  return (
    <div>
      <div className="aws-card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
          <h1 className="font-bold text-2xl">
            {list.title} ({selected.length > 0 ? `${selected.length}/${rows.length}` : rows.length})
          </h1>
          <div className="flex items-center gap-2">
            <ColumnToggle tableName={`list_${resourceId}`}
              columns={columns.map((c) => ({ key: c.label, label: c.label }))}
              visibleColumns={visibleCols} onToggle={setVisibleCols} />
            <LastUpdated />
            {actions.length > 0 && <ActionsMenu items={actions} />}
            {list.create && (
              <button className="aws-btn aws-btn-call-to-action text-xs" onClick={openCreate}>
                <Plus size={14} className="inline mr-1" />{list.create.label}
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-b border-aws-border-secondary">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
            <input className="aws-input pl-8" placeholder={list.filterPlaceholder}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="aws-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" aria-label="Select all"
                    checked={paged.rows.length > 0 && paged.rows.every((r) => selected.includes(r[spec.key]))}
                    onChange={(e) => setSelected(e.target.checked ? paged.rows.map((r) => r[spec.key]) : [])} />
                </th>
                {shown.map((c) => <th key={c.label} className="whitespace-nowrap">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => {
                const id = row[spec.key];
                return (
                  <tr key={id} className={selected.includes(id) ? 'bg-aws-status-info-bg/50' : ''}>
                    <td>
                      <input type="checkbox" checked={selected.includes(id)} aria-label={`Select ${id}`}
                        onChange={(e) => setSelected(e.target.checked
                          ? [...selected, id] : selected.filter((x) => x !== id))} />
                    </td>
                    {shown.map((c) => (
                      <td key={c.label} className={`${c.mono ? 'font-mono text-sm ' : ''}whitespace-nowrap`}>
                        {c.linkToDetail
                          ? <Link to={spec.detailRoute.replace(':id', encodeURIComponent(id))}
                              className="text-aws-blue hover:underline">{cellValue(c, row, state)}</Link>
                          : c.link
                            ? <Link to={c.link(row)} className="text-aws-blue hover:underline">{cellValue(c, row, state)}</Link>
                            : cellValue(c, row, state)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={1 + shown.length} className="text-center py-8 text-aws-text-secondary">
                  {list.emptyMessage || `No ${list.title.toLowerCase()} found.`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePager p={paged} />
      </div>

      {showCreate && list.create && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
              <h3 className="font-bold">{list.create.label}</h3>
              <button onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4 text-sm">
              {list.create.fields.map((f) => (
                <div key={f.name}>
                  <label className="block font-bold mb-1" htmlFor={`create-${f.name}`}>
                    {f.label}{f.optional && <span className="font-normal text-aws-text-secondary"> - optional</span>}
                  </label>
                  {f.options ? (
                    <select id={`create-${f.name}`} className="aws-input" value={form[f.name] ?? ''}
                      required={!f.optional} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                      <option value="">Choose an option</option>
                      {f.options(state).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input id={`create-${f.name}`} className="aws-input" value={form[f.name] ?? ''}
                      placeholder={f.placeholder} required={!f.optional}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                  )}
                  {f.hint && <p className="text-aws-text-secondary text-xs mt-1">{f.hint}</p>}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="aws-btn aws-btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="aws-btn aws-btn-primary">{list.create.label}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tagFor && (
        <TagsDialog path={spec.path} keyField={spec.key} resource={tagFor}
          label={list.singular} onClose={() => setTagFor(null)} />
      )}
    </div>
  );
}
