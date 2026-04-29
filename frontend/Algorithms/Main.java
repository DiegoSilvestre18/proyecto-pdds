import model.*;
import hga.HGAPlanner;
import alns.ALNSPlanner;
import common.FitnessEvaluator;
import java.util.*;

/**
 * Punto de entrada principal para ejecutar y comparar
 * los algoritmos HGA y ALNS con datos reales del proyecto Tasf.B2B.
 *
 * Proceso:
 * 1. Cargar aeropuertos y vuelos desde Data/
 * 2. Generar Super-Lotes de prueba
 * 3. Ejecutar HGA (planificación periódica)
 * 4. Simular disrupciones (cancelación de vuelos)
 * 5. Ejecutar ALNS (replanificación dinámica)
 * 6. Comparar resultados (R-046)
 */
public class Main {

    // Rutas a los archivos de datos (relativas al directorio de ejecución)
    private static final String AIRPORTS_FILE = "../Data/c.1inf54.26.1.v1.Aeropuerto.husos.v1.20250818__estudiantes.txt";
    private static final String FLIGHTS_FILE = "../Data/planes_vuelo.txt";

    public static void main(String[] args) {
        try {
            System.out.println("╔══════════════════════════════════════════════════════╗");
            System.out.println("║    Tasf.B2B - Algoritmos Metaheurísticos v1.0        ║");
            System.out.println("║    HGA (Planificación) + ALNS (Replanificación)      ║");
            System.out.println("╚══════════════════════════════════════════════════════╝");
            System.out.println();

            // ══════════════════════════════════════════════
            // 1. CARGAR DATOS
            // ══════════════════════════════════════════════
            System.out.println("─── Fase 1: Carga de Datos ───");

            Airport[] airports = DataLoader.loadAirports(AIRPORTS_FILE);
            Flight[] flights = DataLoader.loadFlights(FLIGHTS_FILE, airports);
            NetworkState networkState = new NetworkState(airports, flights);

            System.out.printf("  Red: %d aeropuertos, %d vuelos%n",
                airports.length, flights.length);
            System.out.println();

            // Mostrar resumen de aeropuertos por continente
            int[] continentCount = new int[3];
            String[] continentNames = {"América", "Europa", "Asia"};
            for (Airport a : airports) {
                continentCount[a.getContinent()]++;
            }
            for (int i = 0; i < 3; i++) {
                System.out.printf("  %s: %d aeropuertos%n", continentNames[i], continentCount[i]);
            }
            System.out.println();

            // ══════════════════════════════════════════════
            // 2. GENERAR SUPER-LOTES DE PRUEBA
            // ══════════════════════════════════════════════
            System.out.println("─── Fase 2: Generación de Super-Lotes ───");

            int lotCount = 30; // Cantidad de lotes de prueba
            List<SuperLot> lots = DataLoader.generateTestSuperLots(airports, lotCount);

            int totalBags = 0;
            int interLots = 0;
            for (SuperLot lot : lots) {
                totalBags += lot.getBagCount();
                if (lot.isIntercontinental()) interLots++;
            }
            System.out.printf("  %d Super-Lotes | %d maletas totales%n", lotCount, totalBags);
            System.out.printf("  Locales: %d | Intercontinentales: %d%n",
                lotCount - interLots, interLots);
            System.out.println();

            // ══════════════════════════════════════════════
            // 3. EJECUTAR HGA — Planificación Periódica
            // ══════════════════════════════════════════════
            System.out.println("─── Fase 3: HGA (Algoritmo Genético Híbrido) ───");
            System.out.println("  Parámetros: population=50, mutation=0.15, Sa=5000ms");

            HGAPlanner hga = new HGAPlanner();
            hga.setPopulationSize(50);
            hga.setMutationRate(0.15);

            long hgaStart = System.nanoTime();
            Solution hgaSolution = hga.plan(lots, networkState, 5000); // 5 segundos
            long hgaTime = (System.nanoTime() - hgaStart) / 1_000_000;

            System.out.printf("  Resultado HGA: Fitness=%.2f | Tiempo=%dms%n",
                hgaSolution.getFitness(), hgaTime);
            System.out.printf("  Rutas generadas: %d/%d%n",
                hgaSolution.getRouteCount(), lotCount);
            printSolutionSummary("HGA", hgaSolution, lots, networkState);
            System.out.println();

            // ══════════════════════════════════════════════
            // 4. SIMULAR DISRUPCIONES
            // ══════════════════════════════════════════════
            System.out.println("─── Fase 4: Simulación de Disrupciones ───");

            // Cancelar algunos vuelos aleatoriamente
            Random rng = new Random(123);
            List<Integer> cancelledFlights = new ArrayList<>();
            int cancelCount = Math.max(1, flights.length / 20); // ~5% de vuelos

            for (int i = 0; i < cancelCount; i++) {
                int fId = rng.nextInt(flights.length);
                flights[fId].cancel();
                cancelledFlights.add(fId);
            }
            System.out.printf("  Vuelos cancelados: %d/%d (%.1f%%)%n",
                cancelCount, flights.length,
                100.0 * cancelCount / flights.length);

            // Agregar un envío urgente
            int urgentId = lots.size();
            int urgentOrigin = rng.nextInt(airports.length);
            int urgentDest;
            do {
                urgentDest = rng.nextInt(airports.length);
            } while (urgentDest == urgentOrigin);
            boolean urgentInter = airports[urgentOrigin].getContinent() != airports[urgentDest].getContinent();
            SuperLot urgentLot = new SuperLot(urgentId, urgentOrigin, urgentDest, 20,
                System.currentTimeMillis() + 12L * 3600 * 1000, urgentInter);
            urgentLot.setPriority(9); // Alta prioridad
            lots.add(urgentLot);
            System.out.printf("  Envío urgente: %s -> %s (%d maletas, prioridad=%d)%n",
                airports[urgentOrigin].getIcaoCode(),
                airports[urgentDest].getIcaoCode(),
                20, 9);
            System.out.println();

            // ══════════════════════════════════════════════
            // 5. EJECUTAR ALNS — Replanificación Dinámica
            // ══════════════════════════════════════════════
            System.out.println("─── Fase 5: ALNS (Adaptive Large Neighborhood Search) ───");
            System.out.println("  Parámetros: T_init=1000, cooling=0.995, Sa=3000ms");

            ALNSPlanner alns = new ALNSPlanner();
            alns.setInitialTemperature(1000.0);
            alns.setCoolingRate(0.995);

            long alnsStart = System.nanoTime();
            Solution alnsSolution = alns.replan(
                hgaSolution, lots, cancelledFlights, urgentId, networkState, 3000);
            long alnsTime = (System.nanoTime() - alnsStart) / 1_000_000;

            System.out.printf("  Resultado ALNS: Fitness=%.2f | Tiempo=%dms%n",
                alnsSolution.getFitness(), alnsTime);
            System.out.printf("  Rutas generadas: %d/%d%n",
                alnsSolution.getRouteCount(), lots.size());
            printSolutionSummary("ALNS", alnsSolution, lots, networkState);
            System.out.println();

            // ══════════════════════════════════════════════
            // 6. TABLA COMPARATIVA (R-046)
            // ══════════════════════════════════════════════
            System.out.println("═══════════════════════════════════════════════════════");
            System.out.println("  TABLA COMPARATIVA (R-046)");
            System.out.println("═══════════════════════════════════════════════════════");
            System.out.printf("  %-25s %15s %15s%n", "Métrica", "HGA", "ALNS");
            System.out.println("  " + "─".repeat(55));
            System.out.printf("  %-25s %15.2f %15.2f%n", "Fitness",
                hgaSolution.getFitness(), alnsSolution.getFitness());
            System.out.printf("  %-25s %13dms %13dms%n", "Tiempo de ejecución",
                hgaTime, alnsTime);
            System.out.printf("  %-25s %15d %15d%n", "Rutas generadas",
                hgaSolution.getRouteCount(), alnsSolution.getRouteCount());
            System.out.printf("  %-25s %15d %15d%n", "Lotes procesados",
                lotCount, lots.size());

            int hgaOnTime = countOnTimeLots(hgaSolution, lots, networkState);
            int alnsOnTime = countOnTimeLots(alnsSolution, lots, networkState);
            System.out.printf("  %-25s %15d %15d%n", "Entregas a tiempo",
                hgaOnTime, alnsOnTime);
            System.out.printf("  %-25s %14.1f%% %14.1f%%%n", "% a tiempo",
                100.0 * hgaOnTime / Math.max(1, lotCount),
                100.0 * alnsOnTime / Math.max(1, lots.size()));
            System.out.println("═══════════════════════════════════════════════════════");

        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /** Imprime resumen de una solución. */
    private static void printSolutionSummary(String name, Solution solution,
                                              List<SuperLot> lots, NetworkState state) {
        int directRoutes = 0;
        int multiHopRoutes = 0;
        int maxHops = 0;

        for (SuperLot lot : lots) {
            Route route = solution.getRoute(lot.getId());
            if (route == null) continue;

            int hops = route.getSegmentCount();
            if (hops == 1) directRoutes++;
            else multiHopRoutes++;
            maxHops = Math.max(maxHops, hops);
        }

        System.out.printf("  [%s] Rutas directas: %d | Con escalas: %d | Máx. escalas: %d%n",
            name, directRoutes, multiHopRoutes, maxHops - 1);
    }

    /** Cuenta lotes entregados a tiempo (cumpliendo SLA). */
    private static int countOnTimeLots(Solution solution, List<SuperLot> lots,
                                        NetworkState state) {
        int onTime = 0;
        for (SuperLot lot : lots) {
            Route route = solution.getRoute(lot.getId());
            if (route == null) continue;

            double totalTransit = 0;
            for (int seg = 0; seg < route.getSegmentCount(); seg++) {
                totalTransit += state.getTransitTimeHours(
                    route.getSegmentOrigin(seg),
                    route.getSegmentDestination(seg));
            }

            if (totalTransit <= lot.getSlaHours()) {
                onTime++;
            }
        }
        return onTime;
    }
}
