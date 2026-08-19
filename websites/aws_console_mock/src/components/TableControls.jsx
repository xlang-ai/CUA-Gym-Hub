import React, { useMemo, useState } from 'react';
import { Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Table controls every real console table has and this mock mostly lacked: a Preferences
 * dialog for page size and column visibility, and a pager.
 *
 * Sourced from the EC2 "Find your Amazon EC2 resources" guide, which documents the
 * Preferences window as the home of the column chooser plus the "Use regular expression
 * matching" and "Use case sensitive matching" toggles.
 *
 * Usage:
 *
 *   const t = useTableView(rows, ALL_COLUMNS);
 *   ...
 *   <TableControls view={t} />                 // gear, sits next to refresh
 *   <thead>{t.visibleColumns.map(...)}</thead>
 *   <tbody>{t.pageRows.map(...)}</tbody>
 *   <TablePager view={t} />                    // footer count + prev/next
 */

export const PAGE_SIZES = [10, 25, 50, 100];

export function useTableView(rows, columns, { defaultPageSize = 25 } = {}) {
  const allIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const [hidden, setHidden] = useState(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id))
  );
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const visibleColumns = columns.filter((c) => !hidden.has(c.id));
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return {
    columns, allIds, hidden, setHidden,
    visibleColumns,
    pageSize, setPageSize,
    page: current, setPage, pageCount,
    total,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
    pageRows,
    regex, setRegex,
    caseSensitive, setCaseSensitive,
    /** Match helper honouring the Preferences toggles, for the page's own filter input. */
    matches(haystack, needle) {
      if (!needle) return true;
      const h = String(haystack ?? '');
      if (regex) {
        try { return new RegExp(needle, caseSensitive ? '' : 'i').test(h); }
        catch { return false; }
      }
      return caseSensitive ? h.includes(needle) : h.toLowerCase().includes(needle.toLowerCase());
    },
  };
}

export function TableControls({ view, title = 'Preferences' }) {
  const [open, setOpen] = useState(false);
  const toggle = (id) => {
    view.setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  return (
    <>
      <button
        className="p-1.5 hover:bg-aws-disabled-bg rounded"
        aria-label={title}
        title={title}
        onClick={() => setOpen(true)}
      >
        <Settings size={16} className="text-aws-text-secondary" />
      </button>

      {open && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-2xl">
            <div className="aws-modal-header">
              <h3 className="font-bold">Preferences</h3>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="aws-modal-body space-y-5 text-sm">
              <div>
                <h4 className="font-bold mb-2">Page size</h4>
                <div className="space-y-1">
                  {PAGE_SIZES.map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="page-size"
                        checked={view.pageSize === n}
                        onChange={() => { view.setPageSize(n); view.setPage(1); }}
                      />
                      <span>{n} items</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-2">Search behaviour</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={view.regex} onChange={(e) => view.setRegex(e.target.checked)} />
                  <span>Use regular expression matching</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={view.caseSensitive} onChange={(e) => view.setCaseSensitive(e.target.checked)} />
                  <span>Use case sensitive matching</span>
                </label>
              </div>

              <div>
                <h4 className="font-bold mb-2">Select visible columns</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-h-64 overflow-y-auto">
                  {view.columns.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!view.hidden.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="aws-modal-footer">
              <button className="aws-btn aws-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="aws-btn aws-btn-primary" onClick={() => setOpen(false)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TablePager({ view }) {
  return (
    <div className="px-4 py-2 border-t border-aws-border-secondary flex items-center justify-between text-xs text-aws-text-secondary">
      <span>
        Showing {view.rangeStart}-{view.rangeEnd} of {view.total} items
      </span>
      <div className="flex items-center gap-1">
        <button
          className="aws-btn aws-btn-secondary text-xs px-2"
          disabled={view.page <= 1}
          onClick={() => view.setPage(view.page - 1)}
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span className="px-2">{view.page} / {view.pageCount}</span>
        <button
          className="aws-btn aws-btn-secondary text-xs px-2"
          disabled={view.page >= view.pageCount}
          onClick={() => view.setPage(view.page + 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
