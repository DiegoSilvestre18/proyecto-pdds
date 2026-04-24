package alns;

import model.*;
import common.GreedyHeuristic;
import java.util.*;

/**
 * Operadores Reparadores (Repair) del ALNS.
 * Reconstruyen rutas para lotes huérfanos y los asignan a vuelos.
 *
 * Referencia: Informe §4.1 - Operadores Reparadores.
 */
public class RepairOperators {

    public static final int REPAIR_REGRET = 0;
    public static final int REPAIR_SUBLOT = 1;
    public static final int REPAIR_BACKUP = 2;
    public static final int OPERATOR_COUNT = 3;

    private final GreedyHeuristic greedy = new GreedyHeuristic();
    private final Random random = new Random();

    /**
     * Aplica el operador de reparación seleccionado.
     *
     * @param operatorIndex    Índice del operador.
     * @param solution         Solución parcial a reparar.
     * @param orphanLotIds     IDs de lotes que necesitan nueva ruta.
     * @param lots             Lista completa de Super-Lotes.
     * @param state            Estado de la red.
     */
    public void apply(int operatorIndex, Solution solution, List<Integer> orphanLotIds,
                       List<SuperLot> lots, NetworkState state) {
        switch (operatorIndex) {
            case REPAIR_REGRET:
                regretInsertion(solution, orphanLotIds, lots, state);
                break;
            case REPAIR_SUBLOT:
                repairSubLot(solution, orphanLotIds, lots, state);
                break;
            case REPAIR_BACKUP:
                repairBackupRoute(solution, orphanLotIds, lots, state);
                break;
        }
    }

    /**
     * Regret Insertion (R-091, R-095):
     * Inserta rutas calculando el "arrepentimiento" (diferencia de costo
     * entre la mejor y la segunda mejor ruta posible).
     * Prioriza las maletas urgentes que no tienen muchas rutas alternativas.
     */
    private void regretInsertion(Solution solution, List<Integer> orphanLotIds,
                                  List<SuperLot> lots, NetworkState state) {
        Map<Integer, SuperLot> lotMap = buildLotMap(lots);

        // Calcular regret para cada lote huérfano
        List<int[]> regretList = new ArrayList<>(); // [lotId, regretValue]

        for (int lotId : orphanLotIds) {
            SuperLot lot = lotMap.get(lotId);
            if (lot == null) continue;

            // Generar múltiples rutas candidatas
            List<Route> candidates = generateCandidateRoutes(
                lot.getOriginAirportId(), lot.getDestAirportId(), state, 3);

            if (candidates.isEmpty()) {
                regretList.add(new int[]{lotId, Integer.MAX_VALUE}); // Sin alternativas
                continue;
            }

            // Calcular costos
            int[] costs = new int[candidates.size()];
            for (int i = 0; i < candidates.size(); i++) {
                costs[i] = calculateRouteCost(candidates.get(i), state);
            }
            Arrays.sort(costs);

            // Regret = diferencia entre mejor y segunda mejor
            int regret = (costs.length > 1) ? (costs[1] - costs[0]) : Integer.MAX_VALUE;
            regretList.add(new int[]{lotId, regret});
        }

        // Ordenar por regret descendente (insertar primero los más urgentes)
        regretList.sort((a, b) -> Integer.compare(b[1], a[1]));

        // Insertar en orden de regret
        for (int[] entry : regretList) {
            int lotId = entry[0];
            SuperLot lot = lotMap.get(lotId);
            if (lot == null) continue;

            Route bestRoute = greedy.buildGreedyRoute(
                lot.getOriginAirportId(), lot.getDestAirportId(), state);
            greedy.assignFlightsToRoute(bestRoute, lot.getBagCount(), state);
            solution.setRoute(lotId, bestRoute);
        }
    }

    /**
     * Repair_SubLote (R-014):
     * Cuando no hay capacidad suficiente en un solo vuelo del tramo,
     * divide el lote en sub-lotes asignándolos a vuelos distintos.
     */
    private void repairSubLot(Solution solution, List<Integer> orphanLotIds,
                               List<SuperLot> lots, NetworkState state) {
        Map<Integer, SuperLot> lotMap = buildLotMap(lots);

        for (int lotId : orphanLotIds) {
            SuperLot lot = lotMap.get(lotId);
            if (lot == null) continue;

            Route route = greedy.buildGreedyRoute(
                lot.getOriginAirportId(), lot.getDestAirportId(), state);

            // Intentar asignar vuelos; si no hay capacidad, dividir
            boolean fullyAssigned = greedy.assignFlightsToRoute(
                route, lot.getBagCount(), state);

            if (!fullyAssigned) {
                // Intentar redistribuir entre múltiples vuelos del mismo tramo
                for (int seg = 0; seg < route.getSegmentCount(); seg++) {
                    int fromId = route.getSegmentOrigin(seg);
                    int toId = route.getSegmentDestination(seg);
                    List<Integer> availableFlights = state.getAvailableFlights(fromId, toId);

                    // Seleccionar el vuelo con mayor capacidad disponible
                    int bestFlightId = -1;
                    int bestCap = 0;
                    for (int fId : availableFlights) {
                        Flight f = state.getFlight(fId);
                        if (f.getAvailableCapacity() > bestCap) {
                            bestCap = f.getAvailableCapacity();
                            bestFlightId = fId;
                        }
                    }
                    if (bestFlightId >= 0) {
                        route.setFlightAssignment(seg, bestFlightId);
                    }
                }
            }

            solution.setRoute(lotId, route);
        }
    }

    /**
     * Repair_RutaRespaldo (R-028):
     * Para envíos de alta prioridad, genera automáticamente una ruta
     * alternativa usando aeropuertos/vuelos distintos a la ruta principal.
     */
    private void repairBackupRoute(Solution solution, List<Integer> orphanLotIds,
                                    List<SuperLot> lots, NetworkState state) {
        Map<Integer, SuperLot> lotMap = buildLotMap(lots);

        for (int lotId : orphanLotIds) {
            SuperLot lot = lotMap.get(lotId);
            if (lot == null) continue;

            // Ruta principal
            Route mainRoute = greedy.buildGreedyRoute(
                lot.getOriginAirportId(), lot.getDestAirportId(), state);
            greedy.assignFlightsToRoute(mainRoute, lot.getBagCount(), state);
            solution.setRoute(lotId, mainRoute);

            // Generar ruta de respaldo para alta prioridad
            if (lot.getPriority() > 5) { // Umbral de alta prioridad
                Route backupRoute = generateAlternativeRoute(
                    lot.getOriginAirportId(), lot.getDestAirportId(),
                    mainRoute, state);
                if (backupRoute != null) {
                    greedy.assignFlightsToRoute(backupRoute, lot.getBagCount(), state);
                    // Almacenar ruta de respaldo (en producción se guardaría en un campo del lote)
                }
            }
        }
    }

    /**
     * Genera una ruta alternativa que evite los aeropuertos de la ruta principal.
     */
    private Route generateAlternativeRoute(int originId, int destId,
                                            Route mainRoute, NetworkState state) {
        Set<Integer> avoidAirports = new HashSet<>();
        int[] mainSeq = mainRoute.getAirportSequence();
        for (int i = 1; i < mainSeq.length - 1; i++) { // Excluir origen y destino
            avoidAirports.add(mainSeq[i]);
        }

        // BFS evitando aeropuertos de la ruta principal
        int airportCount = state.getAirportCount();
        boolean[] visited = new boolean[airportCount];
        int[] parent = new int[airportCount];
        Arrays.fill(parent, -1);

        Queue<Integer> queue = new LinkedList<>();
        visited[originId] = true;
        queue.offer(originId);

        while (!queue.isEmpty()) {
            int current = queue.poll();
            if (current == destId) break;

            for (int neighbor : state.getNeighborAirports(current)) {
                if (!visited[neighbor] && !avoidAirports.contains(neighbor)) {
                    visited[neighbor] = true;
                    parent[neighbor] = current;
                    queue.offer(neighbor);
                }
            }
        }

        if (!visited[destId]) return null;

        // Reconstruir camino
        List<Integer> path = new ArrayList<>();
        int current = destId;
        while (current != -1) {
            path.add(current);
            current = parent[current];
        }
        Collections.reverse(path);
        return new Route(path.stream().mapToInt(i -> i).toArray());
    }

    /**
     * Genera múltiples rutas candidatas entre origen y destino.
     */
    private List<Route> generateCandidateRoutes(int originId, int destId,
                                                  NetworkState state, int maxCandidates) {
        List<Route> candidates = new ArrayList<>();

        // Ruta greedy principal
        Route greedy1 = greedy.buildGreedyRoute(originId, destId, state);
        candidates.add(greedy1);

        // Rutas alternativas evitando intermediarios de la primera
        for (int attempt = 1; attempt < maxCandidates; attempt++) {
            Route alt = generateAlternativeRoute(originId, destId, greedy1, state);
            if (alt != null) {
                candidates.add(alt);
            }
        }

        return candidates;
    }

    /** Calcula el costo estimado de una ruta (suma de tiempos de tránsito). */
    private int calculateRouteCost(Route route, NetworkState state) {
        int cost = 0;
        for (int seg = 0; seg < route.getSegmentCount(); seg++) {
            cost += state.getTransitTimeHours(
                route.getSegmentOrigin(seg),
                route.getSegmentDestination(seg));
        }
        return cost;
    }

    private Map<Integer, SuperLot> buildLotMap(List<SuperLot> lots) {
        Map<Integer, SuperLot> map = new HashMap<>();
        for (SuperLot lot : lots) {
            map.put(lot.getId(), lot);
        }
        return map;
    }
}
