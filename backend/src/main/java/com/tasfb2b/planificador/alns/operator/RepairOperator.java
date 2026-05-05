package com.tasfb2b.planificador.alns.operator;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.superlote.domain.SuperLot;

import java.util.List;
import java.util.Map;

/**
 * Operador de reparación del ALNS.
 * Reinserta los lotes removidos en el conjunto de rutas parciales,
 * delegando en RouteBuilder (Dijkstra) para encontrar el mejor camino.
 */
public interface RepairOperator {

    /**
     * @param partialRoutes      rutas actuales sin los lotes removidos
     * @param removed            lotes que deben ser reinsertados
     * @param airportMap         mapa ICAO → Aeropuerto
     * @param capacidadDisponible mapa vueloId → capacidad restante (vacío = sin restricción)
     * @return nueva lista de rutas con los lotes removidos ya insertados
     */
    List<Route> repair(List<Route> partialRoutes,
                       List<SuperLot> removed,
                       Map<String, Aeropuerto> airportMap,
                       Map<Long, Integer> capacidadDisponible);

    /** Nombre identificador para el tracker de pesos. */
    String name();
}
