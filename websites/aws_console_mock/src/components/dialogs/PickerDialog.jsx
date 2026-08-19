import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * A single-choice association dialog: "Edit route table association", "Edit network ACL
 * association", "Set main route table" and friends all have this shape — pick one resource
 * from a list, confirm, and the association changes.
 *
 * `onConfirm(value)` must perform a real dispatch. Nothing here fires a success message on
 * its own, so a caller that forgets to mutate produces a visibly unchanged page rather than
 * a reassuring toast.
 */
export default function PickerDialog({
  title, description, label, options, initial = '', confirmLabel = 'Save',
  emptyMessage = 'Nothing available to choose.', onConfirm, onClose,
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white shadow-xl w-full max-w-lg border border-aws-border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form
          className="p-4 space-y-4 text-sm"
          onSubmit={(e) => { e.preventDefault(); onConfirm(value); onClose(); }}
        >
          {description && <p className="text-aws-text-secondary">{description}</p>}
          {options.length === 0 ? (
            <p className="text-aws-text-secondary">{emptyMessage}</p>
          ) : (
            <div>
              <label className="block font-bold mb-1" htmlFor="picker-value">{label}</label>
              <select id="picker-value" className="aws-input" value={value} required
                onChange={(e) => setValue(e.target.value)}>
                <option value="">Choose an option</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="aws-btn aws-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="aws-btn aws-btn-primary" disabled={!options.length}>{confirmLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
