import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Search } from 'lucide-react';

/**
 * The table Preferences dialog, as the console builds it.
 *
 * Captured 2026-08-18 from the live EC2 console (reference/capture/extracted/ec2.2026-08-18.json):
 * a two-column modal, display options on the left and an attribute-column list on the right with
 * its own "Filter columns" box. This was previously a 224px popover holding a flat checkbox list,
 * which is unusable once the column set is the console's real 52.
 *
 * Every control here changes something. `Wrap lines`, `Striped rows` and `Compact table mode`
 * apply classes to the table through `onPreferences`; page size drives the pager; the sticky
 * first/last column options pin columns. A preference that only sets state would be the same
 * defect as a menu item that opens nothing, one layer down.
 *
 * Cancel discards. Confirm applies — and only Confirm writes, matching the console, where
 * toggling a column and cancelling leaves the table alone.
 */
const PAGE_SIZES = [10, 25, 50];

const DISPLAY_OPTIONS = [
  { key: 'wrapLines', label: 'Wrap lines', hint: 'Enable to wrap table cell content, disable to truncate text.' },
  { key: 'stripedRows', label: 'Striped rows', hint: 'Select to add alternating shaded rows.' },
  { key: 'tagSuggestions', label: 'Use tags as suggestion options', hint: 'Enables tags to be included in auto-suggestion options.' },
  { key: 'contextMenu', label: 'Context menu', hint: 'Replace the browser context menu on table rows to allow quick actions.' },
  { key: 'rowClickSelection', label: 'Row click selection', hint: 'Enable to allow clicking anywhere on a row item to select the item.' },
  { key: 'compact', label: 'Compact table mode', hint: 'Enabled compact table mode across the application making table rows more compact.' },
];

const STICKY_FIRST = [
  { value: 0, label: 'None' }, { value: 1, label: 'First column' }, { value: 2, label: 'First two columns' },
];
const STICKY_LAST = [{ value: 0, label: 'None' }, { value: 1, label: 'Last column' }];

export const DEFAULT_PREFERENCES = {
  pageSize: 50, wrapLines: false, stripedRows: false, tagSuggestions: true,
  contextMenu: true, rowClickSelection: true, compact: true, stickyFirst: 0, stickyLast: 0,
};


/**
 * Column visibility for one table, remembered across visits.
 *
 * A task harness may reload the page mid-run, so which columns are showing has to survive that;
 * it is stored per table name rather than globally, since the console remembers per table too.
 */
export function useColumnVisibility(tableName, defaultColumns) {
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem(`aws_table_columns_${tableName}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* private mode, or a corrupt entry — fall back to the defaults */ }
    return defaultColumns;
  });
  return [visibleColumns, setVisibleColumns];
}

/** Table preferences (page size, wrapping, sticky columns), remembered the same way. */
export function useTablePreferences(tableName) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(`aws_table_prefs_${tableName}`);
      if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    } catch (e) { /* fall through to defaults */ }
    return DEFAULT_PREFERENCES;
  });
  const update = (next) => {
    setPrefs(next);
    try { localStorage.setItem(`aws_table_prefs_${tableName}`, JSON.stringify(next)); } catch (e) { /* private mode */ }
  };
  return [prefs, update];
}

export default function ColumnToggle({ tableName, columns, visibleColumns, onToggle, preferences, onPreferences }) {
  const [open, setOpen] = useState(false);
  const [draftCols, setDraftCols] = useState(visibleColumns);
  const [draftPrefs, setDraftPrefs] = useState({ ...DEFAULT_PREFERENCES, ...(preferences || {}) });
  const [filter, setFilter] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraftCols(visibleColumns);
    setDraftPrefs({ ...DEFAULT_PREFERENCES, ...(preferences || {}) });
    setFilter('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  const toggleCol = (key) => {
    setDraftCols((prev) => (prev.includes(key)
      // The console keeps at least one column visible.
      ? (prev.length <= 1 ? prev : prev.filter((k) => k !== key))
      : [...prev, key]));
  };

  const confirm = () => {
    onToggle(draftCols);
    try { localStorage.setItem(`aws_table_columns_${tableName}`, JSON.stringify(draftCols)); } catch (e) { /* private mode */ }
    if (onPreferences) onPreferences(draftPrefs);
    setOpen(false);
  };

  const shown = columns.filter((c) => !filter || c.label.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Preferences"
        title="Preferences"
        className="p-1.5 hover:bg-aws-disabled-bg rounded"
        onClick={() => setOpen(true)}
      >
        <Settings size={16} className="text-aws-text-secondary" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white shadow-xl w-full max-w-3xl border border-aws-border flex flex-col" style={{ maxHeight: '86vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-aws-border">
              <h3 className="font-bold text-lg">Preferences</h3>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-5 overflow-y-auto text-sm">
              <div className="space-y-5">
                <fieldset>
                  <legend className="font-bold mb-2">Page size</legend>
                  {PAGE_SIZES.map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input type="radio" name="pref-page-size" checked={draftPrefs.pageSize === n}
                        onChange={() => setDraftPrefs({ ...draftPrefs, pageSize: n })} />
                      <span>{n} resources</span>
                    </label>
                  ))}
                </fieldset>

                {DISPLAY_OPTIONS.map((o) => (
                  <label key={o.key} className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={!!draftPrefs[o.key]}
                      onChange={(e) => setDraftPrefs({ ...draftPrefs, [o.key]: e.target.checked })} />
                    <span>
                      <span className="font-bold">{o.label}</span>
                      <span className="block text-aws-text-secondary text-xs">{o.hint}</span>
                    </span>
                  </label>
                ))}

                <fieldset>
                  <legend className="font-bold mb-1">First column</legend>
                  <p className="text-aws-text-secondary text-xs mb-2">
                    Keep the first column(s) visible while horizontally scrolling the table content.
                  </p>
                  {STICKY_FIRST.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input type="radio" name="pref-sticky-first" checked={draftPrefs.stickyFirst === o.value}
                        onChange={() => setDraftPrefs({ ...draftPrefs, stickyFirst: o.value })} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </fieldset>

                <fieldset>
                  <legend className="font-bold mb-1">Last column</legend>
                  <p className="text-aws-text-secondary text-xs mb-2">
                    Keep the last column visible while horizontally scrolling the table content.
                  </p>
                  {STICKY_LAST.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input type="radio" name="pref-sticky-last" checked={draftPrefs.stickyLast === o.value}
                        onChange={() => setDraftPrefs({ ...draftPrefs, stickyLast: o.value })} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

              <div>
                <h4 className="font-bold">Attribute columns</h4>
                <p className="text-aws-text-secondary text-xs mb-2">Select visible attribute columns</p>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-aws-text-disabled w-4 h-4" />
                  <input className="aws-input pl-8" placeholder="Filter columns" value={filter}
                    aria-label="Filter columns" onChange={(e) => setFilter(e.target.value)} />
                </div>
                <ul className="border border-aws-border-secondary divide-y divide-aws-border-secondary max-h-80 overflow-y-auto">
                  {shown.map((col) => (
                    <li key={col.key} className="flex items-center justify-between px-3 py-2">
                      <span>{col.label}{col.pinned ? ' (default)' : ''}</span>
                      <label className="cursor-pointer">
                        <input
                          type="checkbox"
                          role="switch"
                          aria-checked={draftCols.includes(col.key)}
                          aria-label={col.label}
                          checked={draftCols.includes(col.key)}
                          onChange={() => toggleCol(col.key)}
                        />
                      </label>
                    </li>
                  ))}
                  {shown.length === 0 && (
                    <li className="px-3 py-4 text-aws-text-secondary">No columns match “{filter}”.</li>
                  )}
                </ul>
                <p className="text-xs text-aws-text-secondary mt-2">
                  {draftCols.length} of {columns.length} columns selected
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-aws-border">
              <button className="aws-btn aws-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="aws-btn aws-btn-primary" onClick={confirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
