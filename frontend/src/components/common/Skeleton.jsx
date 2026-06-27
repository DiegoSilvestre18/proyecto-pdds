import React from 'react';

/**
 * Bloques de carga (skeleton) y spinner reutilizables.
 *
 * Eliminan los flashes vacíos: mientras un panel carga datos muestra una
 * silueta animada en lugar de un hueco en blanco. Compartido por todos los
 * paneles (TopAirports, Shipments, AirportConfig, etc.).
 */

/** Bloque shimmer único. */
export function Skeleton({ width = '100%', height = 14, radius = 6, style = {} }) {
  return (
    <span
      className="skeleton-block"
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

/** Lista de filas skeleton, para tablas/listados. */
export function SkeletonList({ rows = 5, gap = 8, rowHeight = 36, label = 'Cargando…' }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={rowHeight} />
      ))}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{label}</span>
    </div>
  );
}

/** Spinner circular. */
export function Spinner({ size = 22, color = '#38bdf8', label = 'Cargando…' }) {
  return (
    <span
      className="ui-spinner"
      role="status"
      aria-label={label}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `${Math.max(2, size / 10)}px solid rgba(148, 163, 184, 0.25)`,
        borderTopColor: color,
        borderRadius: '50%',
      }}
    />
  );
}

/** Estado vacío estandarizado. */
export function EmptyState({ icon = '∅', title = 'Sin datos', hint = null }) {
  return (
    <div style={{ textAlign: 'center', color: '#64748b', padding: '24px 16px', fontSize: '12px' }}>
      <div style={{ fontSize: '26px', marginBottom: '8px', opacity: 0.6 }} aria-hidden="true">{icon}</div>
      <div style={{ fontWeight: 600, color: '#94a3b8' }}>{title}</div>
      {hint && <div style={{ marginTop: '4px', fontSize: '11px', color: '#475569' }}>{hint}</div>}
    </div>
  );
}

export default Skeleton;
