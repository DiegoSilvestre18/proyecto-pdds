import { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * SelectionBridge — Puente de estado compartido entre Panel y Mapa.
 *
 * Centraliza:
 * 1. focusedEntity      → Entidad seleccionada (vuelo, aeropuerto o envío)
 * 2. mapCommand         → Instrucción reactiva para el mapa (flyTo, highlight, drawRoute)
 * 3. trackedRoute       → Ruta multi-hop para Track & Trace de una maleta/envío
 * 4. exceptionHighlight → Bloqueo/avería enfocada con su overlay visual
 * 5. activeFilters      → Filtros por semáforo que Panel y Mapa comparten
 */

const SelectionBridgeContext = createContext(null);

export const SelectionBridgeProvider = ({ children }) => {
  // ── 1. Entidad enfocada ──────────────────────────────────────────────────
  const [focusedEntity, setFocusedEntityRaw] = useState(null);
  // { type: 'airport'|'flight'|'shipment', id: string, source: 'panel'|'map' }

  const setFocusedEntity = useCallback((type, id, source = 'panel') => {
    setFocusedEntityRaw({ type, id, source, ts: Date.now() });
  }, []);

  const clearFocusedEntity = useCallback(() => {
    setFocusedEntityRaw(null);
  }, []);

  // ── 2. Comando para el mapa ──────────────────────────────────────────────
  const [mapCommand, setMapCommandRaw] = useState(null);
  // { action: 'flyTo'|'highlight', payload: { coordinates, zoom, targetId, type, from, to }, ts }

  const dispatchMapCommand = useCallback((action, payload = {}) => {
    setMapCommandRaw({ action, payload, ts: Date.now() });
  }, []);

  const clearMapCommand = useCallback(() => {
    setMapCommandRaw(null);
  }, []);

  // ── 3. Track & Trace (ruta multi-hop) ────────────────────────────────────
  const [trackedRoute, setTrackedRoute] = useState(null);
  // { shipmentId: string, hops: [{ from, to, flightId, status }] }

  const clearTrackedRoute = useCallback(() => {
    setTrackedRoute(null);
  }, []);

  // ── 4. Highlight de excepciones ──────────────────────────────────────────
  const [exceptionHighlight, setExceptionHighlight] = useState(null);
  // { type: 'TRAMO'|'NODO'|'AVERIA', origenIcao, destinoIcao?, averiaType?, ts }

  const clearExceptionHighlight = useCallback(() => {
    setExceptionHighlight(null);
  }, []);

  // ── 5. Filtros visuales (semáforo, estado vuelo, continente) ─────────────
  const [activeFilters, setActiveFilters] = useState({
    semaphoreLevel: null, // null = todos, 'green', 'amber', 'red'
    flightStatus: null,   // null = todos, 'low' (<70%), 'medium' (70-90%), 'high' (>90%)
    continent: null,      // null = todos, 'america', 'europe', 'asia'
  });

  // ── 6. Filtros de color del mapa (checkboxes del popover) ─────────────────
  // Compartidos para sincronizar con los botones del panel lateral
  const [flightColorFilters, setFlightColorFiltersRaw] = useState({ gray: true, green: true, yellow: true, red: true });
  const [airportColorFilters, setAirportColorFiltersRaw] = useState({ gray: true, green: true, yellow: true, red: true });

  // Traduce checkboxes del mapa → valor del panel (radio single-select)
  const _checkboxesToFlightStatus = (filters) => {
    const { green, yellow, red } = filters;
    // Si solo uno está activo → mapeamos al panel
    if (green && !yellow && !red) return 'low';
    if (!green && yellow && !red) return 'medium';
    if (!green && !yellow && red) return 'high';
    return null; // mixto o todos → "Todos" en el panel
  };

  const _checkboxesToSemaphore = (filters) => {
    const { green, yellow, red } = filters;
    if (green && !yellow && !red) return 'green';
    if (!green && yellow && !red) return 'amber';
    if (!green && !yellow && red) return 'red';
    return null;
  };

  // Cuando el mapa cambia sus checkboxes de vuelos → sincroniza el panel
  const setFlightColorFilters = useCallback((updater) => {
    setFlightColorFiltersRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sincroniza panel lateral
      setActiveFilters(f => ({ ...f, flightStatus: _checkboxesToFlightStatus(next) }));
      return next;
    });
  }, []);

  // Cuando el mapa cambia sus checkboxes de almacenes → sincroniza el panel
  const setAirportColorFilters = useCallback((updater) => {
    setAirportColorFiltersRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sincroniza panel lateral
      setActiveFilters(f => ({ ...f, semaphoreLevel: _checkboxesToSemaphore(next) }));
      return next;
    });
  }, []);

  // Traduce valor del panel de vuelos → checkboxes del mapa
  const _flightStatusToCheckboxes = (status) => {
    if (status === 'low')    return { gray: true,  green: true,  yellow: false, red: false };
    if (status === 'medium') return { gray: false, green: false, yellow: true,  red: false };
    if (status === 'high')   return { gray: false, green: false, yellow: false, red: true  };
    return { gray: true, green: true, yellow: true, red: true }; // null → todos
  };

  // Traduce valor del panel de almacenes → checkboxes del mapa
  const _semaphoreToCheckboxes = (level) => {
    if (level === 'green') return { gray: true,  green: true,  yellow: false, red: false };
    if (level === 'amber') return { gray: false, green: false, yellow: true,  red: false };
    if (level === 'red')   return { gray: false, green: false, yellow: false, red: true  };
    return { gray: true, green: true, yellow: true, red: true }; // null → todos
  };

  // Wrapper de setActiveFilters que también sincroniza los checkboxes del mapa
  const setActiveFiltersSync = useCallback((updater) => {
    setActiveFilters(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sincroniza checkboxes del mapa si cambiaron estos valores
      if (next.flightStatus !== prev.flightStatus) {
        setFlightColorFiltersRaw(_flightStatusToCheckboxes(next.flightStatus));
      }
      if (next.semaphoreLevel !== prev.semaphoreLevel) {
        setAirportColorFiltersRaw(_semaphoreToCheckboxes(next.semaphoreLevel));
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setActiveFilters({ semaphoreLevel: null, flightStatus: null, continent: null });
    setFlightColorFiltersRaw({ gray: true, green: true, yellow: true, red: true });
    setAirportColorFiltersRaw({ gray: true, green: true, yellow: true, red: true });
  }, []);

  const value = {
    // 1. Focused Entity
    focusedEntity,
    setFocusedEntity,
    clearFocusedEntity,
    // 2. Map Command
    mapCommand,
    dispatchMapCommand,
    clearMapCommand,
    // 3. Track & Trace
    trackedRoute,
    setTrackedRoute,
    clearTrackedRoute,
    // 4. Exception Highlight
    exceptionHighlight,
    setExceptionHighlight,
    clearExceptionHighlight,
    // 5. Visual Filters (sincronizados con checkboxes del mapa)
    activeFilters,
    setActiveFilters: setActiveFiltersSync,
    resetFilters,
    // 6. Color filters del mapa (sincronizados con panel lateral)
    flightColorFilters,
    setFlightColorFilters,
    airportColorFilters,
    setAirportColorFilters,
  };

  return (
    <SelectionBridgeContext.Provider value={value}>
      {children}
    </SelectionBridgeContext.Provider>
  );
};

/**
 * Hook para consumir el bridge desde cualquier componente.
 * Lanza error si se usa fuera del Provider.
 */
export const useSelectionBridge = () => {
  const ctx = useContext(SelectionBridgeContext);
  if (!ctx) {
    throw new Error('useSelectionBridge debe usarse dentro de <SelectionBridgeProvider>');
  }
  return ctx;
};
