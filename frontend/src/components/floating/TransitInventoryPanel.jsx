import React from 'react';
import { EmptyState } from '../common/Skeleton';

const TransitInventoryPanel = React.memo(({ isVisible, transitByContinent, onHide }) => {
  if (!isVisible) {
    return null
  }

  // Null-guard: transitByContinent puede llegar undefined antes del primer tick.
  const transit = transitByContinent || {};
  const america = transit.america ?? 0;
  const europe = transit.europe ?? 0;
  const asia = transit.asia ?? 0;
  const total = america + europe + asia;

  return (
    <aside className="ct-panel ct-panel--transit">
      <div className="ct-panel-header">
        <p>INVENTARIO EN TRÁNSITO</p>
        <button
          type="button"
          className="ct-panel-close"
          onClick={onHide}
        >
          Ocultar
        </button>
      </div>
      {total === 0 ? (
        <EmptyState icon="✈️" title="Sin maletas en tránsito" hint="No hay carga activa en vuelo o escala." />
      ) : (
        <div className="ct-transit-summary ct-transit-summary--panel">
          <p>CONSOLIDADO GLOBAL DE LA RED</p>
          <small className="ct-transit-context">
            Conteo agregado de maletas activas en vuelo y escala (no por avión individual)
          </small>
          <div>
            <span>América: {america.toLocaleString('es-PE')} maletas</span>
            <span>Europa: {europe.toLocaleString('es-PE')} maletas</span>
            <span>Asia: {asia.toLocaleString('es-PE')} maletas</span>
          </div>
        </div>
      )}
    </aside>
  )
});

export default TransitInventoryPanel
