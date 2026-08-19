import React, { useState } from 'react';
import { Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Real pagination plus the Preferences dialog every console table has.
 *
 * Deliberately slices the row array rather than only rendering pager chrome: a pager that
 * does not paginate is the same class of defect as a success toast for a mutation that
 * never happened, and this codebase has had enough of those.
 *
 * The page-size choices and the two search toggles are sourced — the EC2 "Find your
 * Amazon EC2 resources" guide documents "Use regular expression matching" and "Use case
 * sensitive matching" as living in the Preferences window.
 *
 *   const p = usePaged(rows);
 *   <TableToolbar p={p} />            // gear, next to refresh
 *   {p.rows.map(...)}                 // paginated slice, not the full array
 *   <TablePager p={p} />              // replaces the "Showing 1-N of N items" footer
 */

const PAGE_SIZES = [10, 25, 50, 100];

export function usePaged(rows, defaultPageSize = 25) {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const all = Array.isArray(rows) ? rows : [];
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;

  return {
    rows: all.slice(start, start + pageSize),
    total,
    page: current,
    pageCount,
    pageSize,
    setPageSize: (n) => { setPageSize(n); setPage(1); },
    setPage,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
    regex, setRegex,
    caseSensitive, setCaseSensitive,
  };
}

export function TableToolbar({ p }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="p-1.5 hover:bg-aws-disabled-bg rounded"
        aria-label="Preferences"
        title="Preferences"
        onClick={() => setOpen(true)}
      >
        <Settings size={16} className="text-aws-text-secondary" />
      </button>
      {open && (
        <div className="aws-modal-overlay">
          <div className="aws-modal max-w-lg">
            <div className="aws-modal-header">
              <h3 className="font-bold">Preferences</h3>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="aws-modal-body space-y-5 text-sm">
              <div>
                <h4 className="font-bold mb-2">Page size</h4>
                {PAGE_SIZES.map((n) => (
                  <label key={n} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ps" checked={p.pageSize === n} onChange={() => p.setPageSize(n)} />
                    <span>{n} items</span>
                  </label>
                ))}
              </div>
              <div>
                <h4 className="font-bold mb-2">Search behaviour</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={p.regex} onChange={(e) => p.setRegex(e.target.checked)} />
                  <span>Use regular expression matching</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={p.caseSensitive} onChange={(e) => p.setCaseSensitive(e.target.checked)} />
                  <span>Use case sensitive matching</span>
                </label>
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

export function TablePager({ p }) {
  return (
    <div className="px-4 py-2 border-t border-aws-border-secondary flex items-center justify-between text-xs text-aws-text-secondary">
      <span>Showing {p.rangeStart}-{p.rangeEnd} of {p.total} items</span>
      <div className="flex items-center gap-1">
        <button className="aws-btn aws-btn-secondary text-xs px-2" disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)}>
          <ChevronLeft size={13} /> Previous
        </button>
        <span className="px-2">{p.page} / {p.pageCount}</span>
        <button className="aws-btn aws-btn-secondary text-xs px-2" disabled={p.page >= p.pageCount} onClick={() => p.setPage(p.page + 1)}>
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
