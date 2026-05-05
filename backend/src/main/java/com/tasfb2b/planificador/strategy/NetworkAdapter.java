package com.tasfb2b.planificador.strategy;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.vuelo.domain.Vuelo;

import java.util.List;
import java.util.Map;
import java.util.Set;

public interface NetworkAdapter {

    /** Ruta óptima (Dijkstra) sin restricciones adicionales. */
    List<Vuelo> findBestRoute(Aeropuerto origen,
                              Aeropuerto destino,
                              SuperLot lot);

    /**
     * Ruta óptima con filtrado por capacidad restante.
     * Dijkstra ignora vuelos cuya capacidad disponible sea ≤ 0.
     * Usar cuando se construyen rutas de forma secuencial para evitar
     * que varios lotes compitan por el mismo vuelo lleno.
     *
     * @param remainingCap mapa vueloId → capacidad restante en ese vuelo
     */
    List<Vuelo> findBestRoute(Aeropuerto origen,
                              Aeropuerto destino,
                              SuperLot lot,
                              Map<Long, Integer> remainingCap);

    /**
     * Ruta alternativa que excluye los vuelos indicados.
     * Usada por el HGA para precalcular backup routes.
     */
    List<Vuelo> findAlternativeRoute(Aeropuerto origen,
                                     Aeropuerto destino,
                                     SuperLot lot,
                                     Set<Long> excludedFlightIds);

    /** Invalida el grafo en memoria (llamar tras restaurar vuelos cancelados). */
    void invalidateGraph();
}
