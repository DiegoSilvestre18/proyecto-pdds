package com.tasfb2b.planificador.alns.operator;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.planificador.service.RouteBuilder;
import com.tasfb2b.superlote.domain.SuperLot;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Operador de reparación regret-2.
 * Para cada lote calcula el "regret": diferencia de costo entre la mejor ruta
 * disponible y la segunda mejor (con readyTime perturbado +30 min).
 * Inserta primero el lote con mayor regret (el más difícil de reubicar luego),
 * lo que genera soluciones más robustas que el greedy puro.
 */
public class RegretRepairOp implements RepairOperator {

    private static final long PERTURBACION_MS = 30L * 60 * 1000; // 30 min

    private final RouteBuilder routeBuilder;

    public RegretRepairOp(RouteBuilder routeBuilder) {
        this.routeBuilder = routeBuilder;
    }

    @Override
    public List<Route> repair(List<Route> partialRoutes,
                              List<SuperLot> removed,
                              Map<String, Aeropuerto> airportMap,
                              Map<Long, Integer> capacidadDisponible) {

        List<Route> result = new ArrayList<>(partialRoutes);
        List<SuperLot> pending = new ArrayList<>(removed);

        while (!pending.isEmpty()) {

            // Calcular regret de cada lote pendiente
            SuperLot bestLot   = null;
            double   maxRegret = Double.NEGATIVE_INFINITY;

            for (SuperLot lot : pending) {
                double regret = calcularRegret(lot, airportMap, capacidadDisponible);
                if (regret > maxRegret) {
                    maxRegret = regret;
                    bestLot   = lot;
                }
            }

            // Insertar el lote con mayor regret pasando capacidad real
            Route r = routeBuilder.build(bestLot, airportMap,
                    new HashMap<>(), capacidadDisponible);
            result.add(r);
            pending.remove(bestLot);
        }

        return result;
    }

    /**
     * Regret-2: costo(mejor_ruta) - costo(segunda_mejor_ruta).
     * La segunda mejor se obtiene perturbando el readyTime para forzar
     * a Dijkstra a encontrar un camino diferente con distinto timing.
     * Un regret alto → este lote es difícil de reubicar → insertarlo primero.
     */
    private double calcularRegret(SuperLot lot, Map<String, Aeropuerto> airportMap,
                                  Map<Long, Integer> capacidadDisponible) {

        Route mejorRuta = routeBuilder.build(lot, airportMap,
                new HashMap<>(), capacidadDisponible);

        // Perturbar readyTime para obtener segunda alternativa
        SuperLot lotPerturbado = new SuperLot(
                lot.getId(),
                lot.getOrigenIcao(),
                lot.getDestinoIcao(),
                lot.getTotalMaletas(),
                lot.getReadyTime() + PERTURBACION_MS,
                lot.getSla(),
                lot.isIntercontinental(),
                lot.getPriority()
        );

        Route segundaMejor = routeBuilder.build(lotPerturbado, airportMap,
                new HashMap<>(), capacidadDisponible);

        double costMejor   = costoDe(mejorRuta);
        double costSegunda = costoDe(segundaMejor);

        // Regret = diferencia de costo (cuánto perdería si no inserto ahora)
        return Math.abs(costSegunda - costMejor);
    }

    /**
     * Función de costo para calcular regret.
     * Menor arrivalTime y sin delay = menor costo = mejor posición.
     */
    private double costoDe(Route r) {
        if (r == null || r.isNoAtendido()) return Double.MAX_VALUE;
        return r.getArrivalTime() + r.getDelayHoras() * 3_600_000.0;
    }

    @Override
    public String name() {
        return "RegretRepair";
    }
}
