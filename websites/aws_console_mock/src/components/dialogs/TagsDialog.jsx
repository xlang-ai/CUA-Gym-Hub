import React, { useState } from 'react';
import { useStore } from '../../store/StoreContext';
import { X, Trash2 } from 'lucide-react';

/**
 * "Manage tags" — the one dialog that appears in nearly every captured Actions menu.
 *
 * Path-addressed so a single implementation serves every resource. Writing it per page is how
 * four near-identical copies drift apart, and the tag editor is exactly the control a task
 * verifier is most likely to read.
 *
 *   <TagsDialog path="vpc.subnets" keyField="id" resource={subnet} onClose={...} />
 */
export default function TagsDialog({ path, keyField = 'id', resource, label = 'resource', onClose }) {
  const { dispatch, addFlash } = useStore();
  const [tags, setTags] = useState(() => (resource.tags || []).map((t) => ({ ...t })));
  const id = resource[keyField];

  const save = (e) => {
    e.preventDefault();
    const cleaned = tags.filter((t) => t.Key.trim()).map((t) => ({ Key: t.Key.trim(), Value: t.Value }));
    dispatch({ type: 'RESOURCE_SET_TAGS', payload: { path, key: keyField, id, tags: cleaned } });
    addFlash('success', `Updated tags for ${id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white shadow-xl w-full max-w-xl border border-aws-border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-aws-status-info-bg/30">
          <h3 className="font-bold">Manage tags</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={save} className="p-4 space-y-4 text-sm">
          <p className="text-aws-text-secondary">{label}: <span className="font-mono">{id}</span></p>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 font-bold"><span>Key</span><span>Value</span><span /></div>
          {tags.length === 0 && <p className="text-aws-text-secondary">No tags associated with this resource.</p>}
          {tags.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input className="aws-input" value={t.Key} aria-label={`Tag key ${i + 1}`}
                onChange={(e) => setTags(tags.map((x, j) => (j === i ? { ...x, Key: e.target.value } : x)))} />
              <input className="aws-input" value={t.Value} aria-label={`Tag value ${i + 1}`}
                onChange={(e) => setTags(tags.map((x, j) => (j === i ? { ...x, Value: e.target.value } : x)))} />
              <button type="button" className="p-1.5 hover:bg-aws-disabled-bg" aria-label="Remove tag"
                onClick={() => setTags(tags.filter((_, j) => j !== i))}>
                <Trash2 size={15} className="text-aws-text-secondary" />
              </button>
            </div>
          ))}
          <button type="button" className="aws-btn aws-btn-secondary text-xs"
            onClick={() => setTags([...tags, { Key: '', Value: '' }])}>Add new tag</button>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="aws-btn aws-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="aws-btn aws-btn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
