package hga;

import model.*;
import java.util.*;

/**
 * Búsqueda Local para el componente "Híbrido" del HGA.
 * Mueve maletas de vuelos casi llenos a vuelos con holgura
 * para mejorar la distribución de carga.
 *
 * Referencia: Informe §3.3 - Búsqueda Local (componente "Híbrido").
 */
public class LocalSearch {

    private final Random random = new Random();

    /**
     * Optimiza las asignaciones de vuelos en un cromosoma,
     * redistribuyendo carga entre vuelos del mismo tramo.
     *
     * @param chromosome Cromosoma a optimizar.
     * @param lots       Lista de Super-Lotes correspondientes.
     * @param state      Estado de la red.
     */
    public void optimizeCapacities(Chromosome chromosome, List<SuperLot> lots,
                                    NetworkState state) {
        // Construir mapa de carga por vuelo
        Map<Integer, Integer> flightLoadMap = new HashMap<>();
        Map<Integer, List<int[]>> flightUsers = new HashMap<>(); // flightId -> [(lotIdx, segIdx)]

        for (int i = 0; i < chromosome.getLotCount() && i < lots.size(); i++) {
            Route route = chromosome.getRoute(i);
            if (route == null) continue;

            int bagCount = lots.get(i).getBagCount();
            int[] assignments = route.getFlightAssignments();

            for (int seg = 0; seg < assignments.length; seg++) {
                int fId = assignments[seg];
                if (fId < 0) continue;

                flightLoadMap.merge(fId, bagCount, Integer::sum);
                flightUsers.computeIfAbsent(fId, k -> new ArrayList<>())
                    .add(new int[]{i, seg});
            }
        }

        // Iterar sobre vuelos sobrecargados
        for (Map.Entry<Integer, Integer> entry : flightLoadMap.entrySet()) {
            int flightId = entry.getKey();
            int totalLoad = entry.getValue();
            Flight flight = state.getFlight(flightId);
            if (flight == null) continue;

            int excess = totalLoad - flight.getCapacity();
            if (excess <= 0) continue;

            // Intentar mover lotes a vuelos alternativos del mismo tramo
            List<int[]> users = flightUsers.get(flightId);
            if (users == null) continue;

            for (int[] user : users) {
                if (excess <= 0) break;

                int lotIdx = user[0];
                int segIdx = user[1];
                Route route = chromosome.getRoute(lotIdx);
                SuperLot lot = lots.get(lotIdx);

                int fromId = route.getSegmentOrigin(segIdx);
                int toId = route.getSegmentDestination(segIdx);

                // Buscar vuelo alternativo con capacidad
                List<Integer> alternatives = state.getAvailableFlights(fromId, toId);
                for (int altFlightId : alternatives) {
                    if (altFlightId == flightId) continue;

                    Flight altFlight = state.getFlight(altFlightId);
                    int altLoad = flightLoadMap.getOrDefault(altFlightId, 0);
                    int altAvailable = altFlight.getCapacity() - altLoad;

                    if (altAvailable >= lot.getBagCount()) {
                        // Mover este lote al vuelo alternativo
                        route.setFlightAssignment(segIdx, altFlightId);
                        flightLoadMap.merge(flightId, -lot.getBagCount(), Integer::sum);
                        flightLoadMap.merge(altFlightId, lot.getBagCount(), Integer::sum);
                        excess -= lot.getBagCount();
                        break;
                    }
                }
            }
        }
    }
}
