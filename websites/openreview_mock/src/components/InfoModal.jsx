import React, { useEffect } from 'react'

export default function InfoModal({ title, onClose, children, footer }) {
  useEffect(() => {
    if (!title) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [title, onClose])

  if (!title) return null

  return (
    <div
      className="info-modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 4, padding: 24, maxWidth: 480, width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#2c3a4a' }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ border: 'none', background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: '#757575' }}
          >
            &times;
          </button>
        </div>
        <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>{children}</div>
        {footer && <div style={{ marginTop: 16, textAlign: 'right' }}>{footer}</div>}
      </div>
    </div>
  )
}
