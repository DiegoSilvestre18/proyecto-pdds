import React, { useState, useRef, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

let windowSeq = 0;

export default function DraggableWindow({
  title,
  children,
  onClose,
  initialPosition = { x: 50, y: 50 },
  defaultSize = { width: 400, height: "auto" },
  isActive = false,
  onFocus
}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [maxHeight, setMaxHeight] = useState(Math.min(window.innerHeight - 40, 600));
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const windowRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setMaxHeight(Math.min(window.innerHeight - 40, 600));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // IDs estables para aria-labelledby / aria-describedby.
  const idsRef = useRef(null);
  if (!idsRef.current) {
    const n = ++windowSeq;
    idsRef.current = { title: `dw-title-${n}`, body: `dw-body-${n}` };
  }
  const ids = idsRef.current;

  // Inicio de arrastre (ratón o touch). Ignora clics sobre botones.
  const startDrag = (clientX, clientY, target) => {
    if (target.tagName?.toLowerCase() === 'button' || target.closest?.('button')) return;
    setIsDragging(true);
    if (onFocus) onFocus();
    dragRef.current = { startX: clientX, startY: clientY, initialX: position.x, initialY: position.y };
  };

  const handleMouseDown = (e) => startDrag(e.clientX, e.clientY, e.target);
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    if (t) startDrag(t.clientX, t.clientY, e.target);
  };

  useEffect(() => {
    const moveTo = (clientX, clientY) => {
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, dragRef.current.initialX + dx),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.initialY + dy))
      });
    };

    const handleMouseMove = (e) => { if (isDragging) moveTo(e.clientX, e.clientY); };
    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const t = e.touches[0];
      if (t) { moveTo(t.clientX, t.clientY); e.preventDefault(); }
    };
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging]);

  // Al activarse el panel, enfoca su contenedor (entrada de teclado / lectores).
  useEffect(() => {
    if (isActive && windowRef.current) {
      windowRef.current.focus({ preventScroll: true });
    }
  }, [isActive]);

  // Escape cierra; Tab queda atrapado dentro del panel (focus trap).
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;

    const root = windowRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={ids.title}
      aria-describedby={ids.body}
      tabIndex={-1}
      onClick={onFocus}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: defaultSize.width,
        ...(typeof defaultSize.height === 'number' ? { minHeight: defaultSize.height } : {}),
        maxHeight: maxHeight,
        minWidth: 300,
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isActive ? 'rgba(96, 165, 250, 0.8)' : 'rgba(255, 255, 255, 0.15)'}`,
        borderRadius: '8px',
        boxShadow: isActive ? '0 10px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.4)' : '0 10px 25px rgba(0,0,0,0.5)',
        zIndex: isActive ? 'var(--z-draggable-active)' : 'var(--z-draggable)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        resize: 'both',
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          padding: '8px 12px',
          background: isActive ? 'rgba(51, 65, 85, 0.9)' : 'rgba(51, 65, 85, 0.5)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <span id={ids.title} style={{ fontSize: '12px', fontWeight: 'bold', color: isActive ? '#93c5fd' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
        <button
          onClick={onClose}
          aria-label={`Cerrar ${title}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ✕
        </button>
      </div>
      <div id={ids.body} className="draggable-content-wrapper" style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <ErrorBoundary label={title}>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}
