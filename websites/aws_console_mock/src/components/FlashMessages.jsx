import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'bg-aws-status-success-bg border border-aws-success/30 text-aws-text',
  error: 'bg-aws-status-error-bg border border-aws-error/30 text-aws-text',
  warning: 'bg-aws-status-warning-bg border border-aws-warning/30 text-aws-text',
  info: 'bg-aws-status-info-bg border border-aws-blue-lighter text-aws-text',
};

// 4px status-coloured left accent, per the Cloudscape flash spec.
const ACCENTS = {
  success: '#00802f',
  error: '#db0000',
  warning: '#855900',
  info: '#006ce0',
};

const ICON_COLORS = {
  success: 'text-aws-success',
  error: 'text-aws-error',
  warning: 'text-aws-warning',
  info: 'text-aws-blue',
};

export default function FlashMessages() {
  const { state, dispatch } = useStore();
  const flashes = state.flash || [];

  useEffect(() => {
    if (flashes.length === 0) return;
    const timers = flashes.map(f => {
      return setTimeout(() => {
        dispatch({ type: 'DISMISS_FLASH', payload: f.id });
      }, 5000);
    });
    return () => timers.forEach(clearTimeout);
  }, [flashes, dispatch]);

  if (flashes.length === 0) return null;

  return (
    <div className="px-6 pt-4 space-y-2">
      {flashes.map(f => {
        const Icon = ICONS[f.type] || Info;
        return (
          <div key={f.id} className={`flex items-center gap-3 px-4 py-3 animate-fade-in ${STYLES[f.type] || STYLES.info}`} style={{ borderRadius: 16, borderLeft: `4px solid ${ACCENTS[f.type] || ACCENTS.info}` }}>
            <Icon size={18} className={ICON_COLORS[f.type] || ICON_COLORS.info} />
            <span className="flex-1 text-sm font-medium">{f.message}</span>
            <button
              onClick={() => dispatch({ type: 'DISMISS_FLASH', payload: f.id })}
              className="text-aws-text-disabled hover:text-aws-text-secondary p-0.5 rounded"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
