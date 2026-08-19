import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * The "Last updated / N minutes ago" stamp the console puts beside its refresh control.
 *
 * Two things this fixes. The console shows when the data was last read, and this mock did
 * not. And a Refresh button whose entire effect was `addFlash('success', 'Refreshed')` is a
 * success message for work that never happened — the same defect as a menu item that opens
 * nothing. Refreshing now moves something the user can see.
 *
 * The timestamp is component state on purpose. Putting it in the store would make every
 * refresh show up in `/go` state_diff, and a reward function reading that diff would see the
 * agent "changing" the environment by clicking Refresh.
 */
export default function LastUpdated({ onRefresh, label = 'Refresh' }) {
  const [at, setAt] = useState(() => Date.now());
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const secs = Math.floor((Date.now() - at) / 1000);
  const ago = secs < 45 ? 'Less than a minute ago'
    : secs < 5400 ? `${Math.round(secs / 60)} minute${Math.round(secs / 60) === 1 ? '' : 's'} ago`
    : `${Math.round(secs / 3600)} hour${Math.round(secs / 3600) === 1 ? '' : 's'} ago`;

  return (
    <div className="flex items-center gap-2">
      <div className="text-right leading-tight">
        <div className="text-xs text-aws-text-secondary">Last updated</div>
        <div className="text-xs text-aws-text-secondary" data-testid="last-updated">{ago}</div>
      </div>
      <button
        className="p-1.5 hover:bg-aws-disabled-bg rounded"
        aria-label={label}
        title={label}
        onClick={() => { setAt(Date.now()); force((n) => n + 1); if (onRefresh) onRefresh(); }}
      >
        <RefreshCw size={16} className="text-aws-text-secondary" />
      </button>
    </div>
  );
}
