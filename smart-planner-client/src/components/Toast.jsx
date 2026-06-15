import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

// ── Toast Item ────────────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(t);
  }, [toast.id]);

  const styles = {
    success: { bg: '#DCFCE7', border: '#BBF7D0', color: '#166534', icon: '✓' },
    error:   { bg: '#FEE2E2', border: '#FECACA', color: '#991B1B', icon: '✕' },
    info:    { bg: '#FEF3C7', border: '#FDE68A', color: '#92400E', icon: 'ℹ' },
  };
  const s = styles[toast.type] || styles.info;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 16px', borderRadius: 10,
      background: s.bg, border: `1px solid ${s.border}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      animation: 'slideInRight 0.3s ease forwards',
      maxWidth: 340, width: '100%',
    }}>
      {/* Icon */}
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: s.color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: s.color, flexShrink: 0,
      }}>
        {s.icon}
      </div>

      {/* Message */}
      <div style={{ flex: 1, fontSize: 13, color: s.color, lineHeight: 1.5, fontWeight: 500 }}>
        {toast.message}
      </div>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none', border: 'none', color: s.color,
          fontSize: 16, cursor: 'pointer', padding: 0,
          opacity: 0.6, lineHeight: 1, flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}

// ── Toast Provider ────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useToast = () => useContext(ToastContext);