/**
 * controlTowerData.js
 *
 * Configuración de orquestación del Control Tower.
 * Los datos dinámicos (vuelos, ocupación, KPIs) se obtienen
 * vía WebSocket/API en tiempo real, no de este archivo.
 */

import {
  AIRPORTS,
  AIRPORT_BY_ICAO,
} from "./airportsData";

export { AIRPORTS as AIRPORT_NODES, AIRPORT_BY_ICAO as AIRPORT_BY_CODE };

// ── Pestañas de escenario ──────────────────────────────────────────────────────
export const SCENARIO_TABS = [
  { key: "vivo", label: "Operación Día a Día" },
  { key: "periodo", label: "Simulación Periodo" },
  { key: "colapso", label: "Simulación Colapso" },
];
