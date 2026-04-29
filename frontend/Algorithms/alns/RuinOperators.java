package alns;

import model.*;
import java.util.*;

/**
 * Operadores Destructivos (Ruin) del ALNS.
 * Extraen maletas de la solución actual para permitir su replanificación.
 *
 * Referencia: Informe §4.1 - Operadores Destructivos.
 */
public class RuinOperators {

    public static final int RUIN_CANCELLED = 0;
    public static final int RUIN_BOTTLENECK = 1;
    public static final int RUIN_URGENT = 2;
    public static final int OPERATOR_COUNT = 3;

    private final Random random = new Random();

    /**
     * Aplica el operador de destrucción seleccionado.
     *
     * @param operatorIndex   Índice del operador (RUIN_CANCELLED, RUIN_BOTTLENECK, RUIN_URGENT).
     * @param solution        Solución actual a destruir parcialmente.
     * @param lots            Lista de Super-Lotes.
     * @param cancelledFlights  Lista de IDs de vuelos cancelados (para RUIN_CANCELLED).
     * @param urgentLotId     ID del lote urgente (para RUIN_URGENT, -1 si no aplica).
     * @param state           Estado de la red.
     * @return                Lista de IDs de lotes "huérfanos" que necesitan nueva ruta.
     */
    public List<Integer> apply(int operatorIndex, Solution solution, List<SuperLot> lots,
                                List<Integer> cancelledFlights, int urgentLotId,
                                NetworkState state) {
        switch (operatorIndex) {
            case RUIN_CANCELLED:
                return ruinCancelled(solution, lots, cancelledFlights);
            case RUIN_BOTTLENECK:
                return ruinBottleneck(solution, lots, state);
            case RUIN_URGENT:
                return ruinUrgent(solution, lots, urgentLotId, state);
            default:
                return new ArrayList<>();
        }
    }

    /**
     * Ruin_Cancelados (R-026, R-091):
     * Extrae las maletas asignadas a vuelos cancelados.
     * Libera la capacidad de esos vuelos y las marca como "huérfanas".
     */
    private List<Integer> ruinCancelled(Solution solution, List<SuperLot> lots,
                                         List<Integer> cancelledFlights) {
        Set<Integer> cancelledSet = new HashSet<>(cancelledFlights);
        List<Integer> orphanLotIds = new ArrayList<>();

        for (SuperLot lot : lots) {
            Route route = solution.getRoute(lot.getId());
            if (route == null) continue;

            int[] assignments = route.getFlightAssignments();
            boolean isAffected = false;

            for (int flightId : assignments) {
                if (cancelledSet.contains(flightId)) {
                    isAffected = true;
                    break;
                }
            }

            if (isAffected) {
                solution.removeRoute(lot.getId());
                orphanLotIds.add(lot.getId());
            }
        }

        return orphanLotIds;
    }

    /**
     * Ruin_CuelloBotella (R-044):
     * Extrae maletas de aeropuertos que superan el 90% de su capacidad de almacén.
     * Prioriza la extracción de maletas cuyo destino final está más lejos.
     */
    private List<Integer> ruinBottleneck(Solution solution, List<SuperLot> lots,
                                          NetworkState state) {
        List<Integer> orphanLotIds = new ArrayList<>();

        // Identificar aeropuertos congestionados (> 90% capacidad)
        Set<Integer> congestedAirports = new HashSet<>();
        for (int i = 0; i < state.getAirportCount(); i++) {
            if (state.getAirport(i).isNearCapacity()) {
                congestedAirports.add(i);
            }
        }

        if (congestedAirports.isEmpty()) {
            // Si no hay congestión, extraer aleatoriamente algunos lotes para diversificar
            List<Integer> allLotIds = new ArrayList<>();
            for (SuperLot lot : lots) {
                if (solution.getRoute(lot.getId()) != null) {
                    allLotIds.add(lot.getId());
                }
            }
            int removeCount = Math.max(1, allLotIds.size() / 5); // 20%
            Collections.shuffle(allLotIds, random);
            for (int i = 0; i < removeCount && i < allLotIds.size(); i++) {
                solution.removeRoute(allLotIds.get(i));
                orphanLotIds.add(allLotIds.get(i));
            }
            return orphanLotIds;
        }

        // Ordenar lotes por distancia al destino (descendente) y extraer los que pasan por congestión
        for (SuperLot lot : lots) {
            Route route = solution.getRoute(lot.getId());
            if (route == null) continue;

            int[] airports = route.getAirportSequence();
            for (int apId : airports) {
                if (congestedAirports.contains(apId)) {
                    solution.removeRoute(lot.getId());
                    orphanLotIds.add(lot.getId());
                    break;
                }
            }
        }

        return orphanLotIds;
    }

    /**
     * Ruin_Urgente (R-084):
     * En caso de paquete urgente, extrae maletas de menor prioridad
     * de un avión en tránsito cercano para hacer espacio al envío urgente.
     */
    private List<Integer> ruinUrgent(Solution solution, List<SuperLot> lots,
                                      int urgentLotId, NetworkState state) {
        List<Integer> orphanLotIds = new ArrayList<>();

        if (urgentLotId < 0) {
            // Sin urgencia, destrucción aleatoria pequeña
            List<Integer> allLotIds = new ArrayList<>();
            for (SuperLot lot : lots) {
                if (solution.getRoute(lot.getId()) != null) {
                    allLotIds.add(lot.getId());
                }
            }
            int removeCount = Math.max(1, allLotIds.size() / 10); // 10%
            Collections.shuffle(allLotIds, random);
            for (int i = 0; i < removeCount && i < allLotIds.size(); i++) {
                solution.removeRoute(allLotIds.get(i));
                orphanLotIds.add(allLotIds.get(i));
            }
            return orphanLotIds;
        }

        // Encontrar el lote urgente
        SuperLot urgentLot = null;
        for (SuperLot lot : lots) {
            if (lot.getId() == urgentLotId) {
                urgentLot = lot;
                break;
            }
        }
        if (urgentLot == null) return orphanLotIds;

        // Extraer lotes de menor prioridad que comparten vuelos con el urgente
        orphanLotIds.add(urgentLotId);
        solution.removeRoute(urgentLotId);

        // Extraer otros lotes de baja prioridad para hacer espacio
        List<SuperLot> lowPriority = new ArrayList<>();
        for (SuperLot lot : lots) {
            if (lot.getId() != urgentLotId
                && lot.getPriority() < urgentLot.getPriority()
                && solution.getRoute(lot.getId()) != null) {
                lowPriority.add(lot);
            }
        }

        // Ordenar por prioridad ascendente (menor prioridad primero)
        lowPriority.sort(Comparator.comparingInt(SuperLot::getPriority));

        int removeCount = Math.min(3, lowPriority.size());
        for (int i = 0; i < removeCount; i++) {
            int lotId = lowPriority.get(i).getId();
            solution.removeRoute(lotId);
            orphanLotIds.add(lotId);
        }

        return orphanLotIds;
    }
}
