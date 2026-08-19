import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * The Actions dropdown every console list page carries.
 *
 * Two rules, both taken from the live console rather than from documentation:
 *
 * 1. The trigger is never disabled. With nothing selected, the real console leaves
 *    "Actions" and "Instance state" clickable and disables the items inside. Disabling the
 *    trigger hides the vocabulary — an agent cannot discover what the console can do.
 *
 * 2. An item that cannot apply is rendered disabled *with a reason*, never silently inert.
 *    The EC2 page previously wired Start/Stop/Reboot to a handler that checked the instance
 *    state and returned quietly when it did not match, so clicking Start on a running
 *    instance closed the menu and did nothing at all. That teaches an agent the action
 *    succeeded.
 *
 * Items nest one level, matching the console's six submenus (Instance settings, Networking,
 * Security, Image and templates, Storage, Monitor and troubleshoot).
 *
 *   items = [
 *     { label: 'Connect', onSelect, disabled, reason },
 *     { separator: true },
 *     { label: 'Instance settings', items: [{ label: 'Change instance type', onSelect, ... }] },
 *   ]
 */
function Item({ it, depth, onClose }) {
  const [openSub, setOpenSub] = useState(false);
  const hasSub = Array.isArray(it.items) && it.items.length > 0;

  if (it.separator) return <div className="my-1 border-t border-aws-border-secondary" />;

  const base =
    'w-full text-left px-4 py-1.5 text-sm flex items-center justify-between gap-3 ' +
    (it.disabled
      ? 'text-aws-text-disabled cursor-not-allowed'
      : it.danger
        ? 'text-aws-error hover:bg-aws-status-error-bg'
        : 'hover:bg-aws-status-info-bg/40');

  if (hasSub) {
    return (
      <div className="relative" onMouseEnter={() => setOpenSub(true)} onMouseLeave={() => setOpenSub(false)}>
        <button className={base} aria-haspopup="menu" aria-expanded={openSub} onClick={() => setOpenSub((v) => !v)}>
          <span>{it.label}</span>
          <ChevronRight size={12} />
        </button>
        {openSub && (
          <div
            role="menu"
            className="absolute left-full top-0 -mt-1 ml-0 w-72 bg-white border border-aws-border shadow-lg z-40 py-1 max-h-[70vh] overflow-y-auto"
            style={{ borderRadius: 8 }}
          >
            {it.items.map((sub, i) => (
              <Item key={sub.separator ? `s-${i}` : sub.label} it={sub} depth={depth + 1} onClose={onClose} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      role="menuitem"
      disabled={it.disabled}
      aria-disabled={it.disabled || undefined}
      title={it.disabled ? it.reason : undefined}
      className={base}
      onClick={() => { if (it.disabled) return; onClose(); it.onSelect(); }}
    >
      <span>{it.label}</span>
    </button>
  );
}

export default function ActionsMenu({ items, label = 'Actions', width = 'w-64' }) {
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
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <ChevronDown size={12} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 top-full mt-1 ${width} bg-white border border-aws-border shadow-lg z-30 py-1 max-h-[70vh] overflow-y-auto`}
          style={{ borderRadius: 8 }}
        >
          {items.map((it, i) => (
            <Item key={it.separator ? `sep-${i}` : it.label} it={it} depth={0} onClose={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}
