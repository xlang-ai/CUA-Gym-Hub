import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * The Actions dropdown every console list page carries.
 *
 * Every item must do something observable. A menu item that opens nothing is the same
 * defect class this codebase spent several releases removing — an agent clicks it, sees a
 * menu close, and learns that the action "worked". So `onSelect` is required, and an item
 * that genuinely cannot apply right now is rendered disabled with a `reason`, which is
 * honest and still lets the agent read why.
 *
 *   <ActionsMenu
 *     items={[
 *       { label: 'Edit CIDRs', onSelect: () => setEditCidrs(vpc) },
 *       { label: 'Delete VPC', onSelect: handleDelete, danger: true,
 *         disabled: !selected.length, reason: 'Select a VPC first' },
 *     ]}
 *   />
 */
export default function ActionsMenu({ items, label = 'Actions', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="aws-btn aws-btn-secondary text-xs flex items-center gap-1"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <ChevronDown size={12} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-64 bg-white border border-aws-border shadow-lg z-30 py-1"
          style={{ borderRadius: 8 }}
        >
          {items.map((it, i) =>
            it.separator ? (
              <div key={`sep-${i}`} className="my-1 border-t border-aws-border-secondary" />
            ) : (
              <button
                key={it.label}
                role="menuitem"
                disabled={it.disabled}
                title={it.disabled ? it.reason : undefined}
                className={
                  'w-full text-left px-4 py-2 text-sm ' +
                  (it.disabled
                    ? 'text-aws-text-disabled cursor-not-allowed'
                    : it.danger
                      ? 'text-aws-error hover:bg-aws-status-error-bg'
                      : 'hover:bg-aws-status-info-bg/40')
                }
                onClick={() => { if (it.disabled) return; setOpen(false); it.onSelect(); }}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
