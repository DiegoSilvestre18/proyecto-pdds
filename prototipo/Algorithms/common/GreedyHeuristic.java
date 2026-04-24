package common;

import model.*;
import java.util.*;

/**
 * Heurística de punto más cercano (Greedy Nearest-Neighbor).
 * Genera rutas iniciales seleccionando siempre el aeropuerto con
 * conexión más directa al destino (R-082).
 *
 * Referencia: Informe §3.2 - Población Inicial Voraz.
 */
public class GreedyHeuristic {

    /**
     * Genera una ruta greedy desde el origen al destino,
     * priorizando aeropuertos con vuelos directos y menor número de escalas.
     *
     * @param originId    ID del aeropuerto de origen.
     * @param destId      ID del aeropuerto de destino.
     * @param state       Estado actual de la red.
     * @return            Ruta con secuencia de aeropuertos (puede incluir escalas).
     */
    public Route buildGreedyRoute(int originId, int destId, NetworkState state) {
        // Caso 1: Existe vuelo directo
        if (state.hasDirectConnection(originId, destId)) {
            return new Route(new int[]{originId, destId});
        }

        // Caso 2: BFS ponderado por distancia al destino (greedy best-first)
        int airportCount = state.getAirportCount();
        boolean[] visited = new boolean[airportCount];
        int[] parent = new int[airportCount];
        Arrays.fill(parent, -1);

        // Cola de prioridad: menor "distancia estimada al destino" primero
        PriorityQueue<int[]> queue = new PriorityQueue<>(
            Comparator.comparingDouble(a -> a[1])
        );

        visited[originId] = true;
        queue.offer(new int[]{originId, estimateDistance(originId, destId, state)});

        while (!queue.isEmpty()) {
            int[] current = queue.poll();
            int currentId = current[0];

            if (currentId == destId) {
                break; // Encontramos el destino
            }

            List<Integer> neighbors = state.getNeighborAirports(currentId);
            for (int neighborId : neighbors) {
                if (!visited[neighborId]) {
                    visited[neighborId] = true;
                    parent[neighborId] = currentId;

                    // Verificar si hay vuelos no cancelados disponibles
                    List<Integer> flights = state.getAvailableFlights(currentId, neighborId);
                    if (!flights.isEmpty()) {
                        int dist = estimateDistance(neighborId, destId, state);
                        queue.offer(new int[]{neighborId, dist});
                    }
                }
            }
        }

        // Reconstruir el camino
        if (!visited[destId]) {
            // No se encontró ruta: ruta directa forzada (será penalizada por fitness)
            return new Route(new int[]{originId, destId});
        }

        List<Integer> path = new ArrayList<>();
        int current = destId;
        while (current != -1) {
            path.add(current);
            current = parent[current];
        }
        Collections.reverse(path);

        int[] airportSeq = path.stream().mapToInt(i -> i).toArray();
        return new Route(airportSeq);
    }

    /**
     * Asigna vuelos concretos a cada tramo de una ruta.
     * Selecciona el vuelo con mayor capacidad disponible.
     *
     * @param route     Ruta con secuencia de aeropuertos definida.
     * @param bagCount  Cantidad de maletas a transportar.
     * @param state     Estado de la red.
     * @return          true si se asignaron todos los tramos exitosamente.
     */
    public boolean assignFlightsToRoute(Route route, int bagCount, NetworkState state) {
        boolean allAssigned = true;
        for (int seg = 0; seg < route.getSegmentCount(); seg++) {
            int fromId = route.getSegmentOrigin(seg);
            int toId = route.getSegmentDestination(seg);

            List<Integer> flights = state.getAvailableFlights(fromId, toId);
            int bestFlightId = -1;
            int bestCapacity = 0;

            for (int fId : flights) {
                Flight f = state.getFlight(fId);
                if (f.getAvailableCapacity() >= bagCount && f.getAvailableCapacity() > bestCapacity) {
                    bestFlightId = fId;
                    bestCapacity = f.getAvailableCapacity();
                }
            }

            // Si no hay vuelo con capacidad total, tomar el de mayor capacidad
            if (bestFlightId < 0) {
                for (int fId : flights) {
                    Flight f = state.getFlight(fId);
                    if (f.getAvailableCapacity() > bestCapacity) {
                        bestFlightId = fId;
                        bestCapacity = f.getAvailableCapacity();
                    }
                }
                allAssigned = false;
            }

            route.setFlightAssignment(seg, bestFlightId);
        }
        return allAssigned;
    }

    /**
     * Estimación heurística de la "distancia" entre dos aeropuertos.
     * Usa el concepto de continente para priorizar:
     * - 1 si mismo continente (tránsito 12h)
     * - 2 si distinto continente (tránsito 24h)
     */
    private int estimateDistance(int fromId, int toId, NetworkState state) {
        if (fromId == toId) return 0;
        if (state.hasDirectConnection(fromId, toId)) {
            return state.isSameContinent(fromId, toId) ? 1 : 2;
        }
        return state.isSameContinent(fromId, toId) ? 3 : 5;
    }
}
