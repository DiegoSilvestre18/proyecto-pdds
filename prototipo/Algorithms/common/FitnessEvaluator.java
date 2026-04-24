package common;

import model.*;
import java.util.List;
import java.util.Map;

/**
 * Evaluador de fitness compartido por HGA y ALNS.
 *
 * F(x) = T_viaje + (P_cap × E_cap) + (P_sla × E_sla)
 *
 * Donde:
 * - T_viaje: Tiempo total de tránsito (12h mismo continente / 24h distinto)
 * - P_cap: Penalización por exceder capacidad de almacén o vuelo
 * - E_cap: Cantidad de exceso sobre la capacidad
 * - P_sla: Penalización por no cumplir plazo SLA
 * - E_sla: Cantidad de tiempo excedido sobre el SLA
 *
 * Referencia: Informe §3.1 - Fitness (Función de Costo).
 */
public class FitnessEvaluator {

    // Penalizaciones configurables
    private double penaltyCapacity = 10000.0;   // P_cap: penalización extrema
    private double penaltySla = 5000.0;         // P_sla: penalización fuerte

    public FitnessEvaluator() {}

    public FitnessEvaluator(double penaltyCapacity, double penaltySla) {
        this.penaltyCapacity = penaltyCapacity;
        this.penaltySla = penaltySla;
    }

    /**
     * Evalúa el fitness completo de una solución.
     * Menor fitness = mejor solución.
     */
    public double evaluate(Solution solution, List<SuperLot> lots, NetworkState state) {
        double totalTravelTime = 0;
        double totalCapacityViolation = 0;
        double totalSlaViolation = 0;

        // Crear snapshot temporal de capacidades para detectar sobrecargas
        int[] flightLoad = new int[state.getFlightCount()];
        int[] storageLoad = new int[state.getAirportCount()];

        // Inicializar con cargas actuales de aeropuertos
        for (int i = 0; i < state.getAirportCount(); i++) {
            storageLoad[i] = state.getAirport(i).getCurrentLoad();
        }

        for (SuperLot lot : lots) {
            Route route = solution.getRoute(lot.getId());
            if (route == null) {
                // Lote sin ruta = penalización máxima
                totalSlaViolation += lot.getBagCount() * lot.getSlaHours();
                continue;
            }

            double routeTravelTime = 0;

            for (int seg = 0; seg < route.getSegmentCount(); seg++) {
                int fromId = route.getSegmentOrigin(seg);
                int toId = route.getSegmentDestination(seg);

                // Tiempo de tránsito del tramo
                routeTravelTime += state.getTransitTimeHours(fromId, toId);

                // Acumular carga en vuelos asignados
                int flightId = route.getFlightAssignments()[seg];
                if (flightId >= 0 && flightId < flightLoad.length) {
                    flightLoad[flightId] += lot.getBagCount();
                }

                // Acumular carga en almacén destino del tramo
                if (toId >= 0 && toId < storageLoad.length) {
                    storageLoad[toId] += lot.getBagCount();
                }
            }

            totalTravelTime += routeTravelTime;

            // Verificar violación de SLA
            double slaExcess = routeTravelTime - lot.getSlaHours();
            if (slaExcess > 0) {
                totalSlaViolation += slaExcess * lot.getBagCount();
            }
        }

        // Verificar violaciones de capacidad de vuelos
        for (int i = 0; i < state.getFlightCount(); i++) {
            Flight f = state.getFlight(i);
            if (f != null) {
                int excess = flightLoad[i] - f.getCapacity();
                if (excess > 0) {
                    totalCapacityViolation += excess;
                }
            }
        }

        // Verificar violaciones de capacidad de almacenes
        for (int i = 0; i < state.getAirportCount(); i++) {
            int excess = storageLoad[i] - state.getAirport(i).getStorageCapacity();
            if (excess > 0) {
                totalCapacityViolation += excess;
            }
        }

        double fitness = totalTravelTime
            + (penaltyCapacity * totalCapacityViolation)
            + (penaltySla * totalSlaViolation);

        solution.setFitness(fitness);
        return fitness;
    }

    /**
     * Delta Evaluation: calcula el cambio marginal de fitness
     * al reemplazar una ruta por otra para un lote específico.
     * Complejidad O(segmentos) en lugar de O(n) completo.
     *
     * Referencia: Informe §5 punto 4 - Delta Evaluation.
     */
    public double evaluateDelta(Solution solution, SuperLot lot,
                                 Route oldRoute, Route newRoute,
                                 NetworkState state) {
        double oldCost = 0;
        double newCost = 0;

        // Costo de la ruta vieja
        if (oldRoute != null) {
            for (int seg = 0; seg < oldRoute.getSegmentCount(); seg++) {
                oldCost += state.getTransitTimeHours(
                    oldRoute.getSegmentOrigin(seg),
                    oldRoute.getSegmentDestination(seg));
            }
        }

        // Costo de la ruta nueva
        if (newRoute != null) {
            for (int seg = 0; seg < newRoute.getSegmentCount(); seg++) {
                newCost += state.getTransitTimeHours(
                    newRoute.getSegmentOrigin(seg),
                    newRoute.getSegmentDestination(seg));
            }
        }

        // Delta SLA
        double oldSlaExcess = Math.max(0, oldCost - lot.getSlaHours());
        double newSlaExcess = Math.max(0, newCost - lot.getSlaHours());

        return (newCost - oldCost)
            + penaltySla * (newSlaExcess - oldSlaExcess) * lot.getBagCount();
    }

    // ──────── Getters / Setters ────────

    public double getPenaltyCapacity() { return penaltyCapacity; }
    public void setPenaltyCapacity(double p) { this.penaltyCapacity = p; }
    public double getPenaltySla() { return penaltySla; }
    public void setPenaltySla(double p) { this.penaltySla = p; }
}
