import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * Sistema global de notificaciones (toasts).
 *
 * Reemplaza alert() y los mensajes silenciosos. Se monta una sola vez en la
 * raíz mediante <ToastProvider> y se consume desde cualquier componente con
 * el hook useToast().
 *
 *   const toast = useToast();
 *   toast.success('Reporte descargado');
 *   toast.error('No se pudo conectar al servidor');
 *   toast.info('Se cerró el panel X por límite de paneles');
 */

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4000;

const TYPE_STYLES = {
  success: { icon: '✅', border: 'rgba(16, 185, 129, 0.5)', bg: 'rgba(6, 78, 59, 0.92)', accent: '#34d399' },
  error: { icon: '⛔', border: 'rgba(248, 113, 113, 0.5)', bg: 'rgba(127, 29, 29, 0.92)', accent: '#f87171' },
  warning: { icon: '⚠️', border: 'rgba(251, 191, 36, 0.5)', bg: 'rgba(120, 53, 15, 0.92)', accent: '#fbbf24' },
  info: { icon: 'ℹ️', border: 'rgba(96, 165, 250, 0.5)', bg: 'rgba(30, 58, 138, 0.92)', accent: '#60a5fa' },
};

let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const api = useRef({
    show: push,
    success: (msg, duration) => push(msg, 'success', duration),
    error: (msg, duration) => push(msg, 'error', duration),
    warning: (msg, duration) => push(msg, 'warning', duration),
    info: (msg, duration) => push(msg, 'info', duration),
    dismiss,
  });
  // Mantener referencias frescas a las closures.
  api.current.show = push;
  api.current.success = (msg, duration) => push(msg, 'success', duration);
  api.current.error = (msg, duration) => push(msg, 'error', duration);
  api.current.warning = (msg, duration) => push(msg, 'warning', duration);
  api.current.info = (msg, duration) => push(msg, 'info', duration);
  api.current.dismiss = dismiss;

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toast-container" role="region" aria-label="Notificaciones" aria-live="polite">
        {toasts.map((t) => {
          const style = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <div
              key={t.id}
              className="toast-item"
              role={t.type === 'error' ? 'alert' : 'status'}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderLeft: `4px solid ${style.accent}`,
                color: '#f1f5f9',
                fontSize: '13px',
                lineHeight: 1.4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
                maxWidth: '360px',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1.2 }} aria-hidden="true">{style.icon}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar notificación"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1,
                  padding: '2px',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Devuelve la API de toasts. Si se usa fuera del provider, devuelve un stub
 * silencioso para no romper componentes aislados (p. ej. en tests).
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {}, success: () => {}, error: () => {},
      warning: () => {}, info: () => {}, dismiss: () => {},
    };
  }
  return ctx;
}

export default useToast;
