import React from 'react';
import { Spinner, EmptyState } from '../common/Skeleton';

const TopAirportsPanel = React.memo(({ isVisible, airportRows, onHide, loading = false }) => {
  if (!isVisible) {
    return null
  }

  const rows = airportRows || [];
  // loading explícito, o aún sin datos cargados (null) → estado de carga.
  const isLoading = loading || airportRows == null;

  return (
    <aside className="ct-panel">
      <div className="ct-panel-header">
        <p>AEROPUERTOS CON MAYOR OCUPACIÓN</p>
        <button
          type="button"
          className="ct-panel-close"
          onClick={onHide}
        >
          Ocultar
        </button>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '28px 16px' }}>
          <Spinner label="Cargando ocupación…" />
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Cargando ocupación…</span>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="🏭" title="Sin datos de ocupación" hint="Inicia una simulación para ver los aeropuertos." />
      ) : (
        <table>
          <thead>
            <tr>
              <th>CIUDAD</th>
              <th>CAPACIDAD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((airport) => (
              <tr key={airport.icao || airport.city}>
                <td>{airport.city}</td>
                <td>{airport.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  )
});

export default TopAirportsPanel
