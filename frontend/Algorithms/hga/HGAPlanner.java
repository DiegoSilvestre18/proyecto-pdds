package hga;

import model.*;
import common.*;
import java.util.*;

/**
 * Algoritmo Genético Híbrido (HGA) — Planificación Periódica.
 *
 * Procesa el gran volumen de maletas pendientes de enrutamiento
 * al inicio de la simulación o durante la ventana periódica regular.
 *
 * Implementa el pseudocódigo descrito en el Informe §3.4,
 * siguiendo las fases:
 *   PASO 0: Clustering (Super-Lotes ya recibidos como input)
 *   PASO 1: Población Inicial Voraz (heurística de punto más cercano)
 *   PASO 2: Asignación inicial de rutas a vuelos
 *   PASO 3: Bucle Evolutivo Anytime (Time-Boxed)
 *   PASO 4: Generar plan de viaje final
 *
 * Requerimientos cubiertos: R-089, R-032, R-081, R-082, R-094, R-095.
 */
public class HGAPlanner {

    // ──────── Parámetros del algoritmo ────────
    private int populationSize = 50;
    private double mutationRate = 0.15;
    private int tournamentSize = 3;
    private int eliteCount = 5;
    private long defaultSaMillis = 5000;    // S_a por defecto: 5 segundos
    private long epsilonMillis = 50;        // Margen de seguridad: 50ms

    // ──────── Componentes ────────
    private final GeneticOperators geneticOps;
    private final LocalSearch localSearch;
    private final GreedyHeuristic greedy;
    private final FitnessEvaluator fitnessEval;
    private final TimeBoxController timeBox;

    public HGAPlanner() {
        this.geneticOps = new GeneticOperators(tournamentSize);
        this.localSearch = new LocalSearch();
        this.greedy = new GreedyHeuristic();
        this.fitnessEval = new FitnessEvaluator();
        this.timeBox = new TimeBoxController();
    }

    /**
     * Planificación principal del HGA.
     *
     * @param lots      Lista de Super-Lotes a enrutar (ya agrupados).
     * @param state     Estado actual de la red de aeropuertos y vuelos.
     * @param saMillis  Salto del algoritmo (S_a) en milisegundos.
     *                  El algoritmo se detendrá antes de S_a - epsilon.
     * @return          Solución con las rutas y asignaciones de vuelos óptimas.
     */
    public Solution plan(List<SuperLot> lots, NetworkState state, long saMillis) {
        if (lots.isEmpty()) {
            return new Solution();
        }

        // ═══════════════════════════════════════════
        // INICIO: Time-Boxing
        // ═══════════════════════════════════════════
        timeBox.start(saMillis, epsilonMillis);

        int lotCount = lots.size();
        int[] lotIds = new int[lotCount];
        for (int i = 0; i < lotCount; i++) {
            lotIds[i] = lots.get(i).getId();
        }

        // ═══════════════════════════════════════════
        // PASO 1: Población Inicial Voraz (R-082)
        // ═══════════════════════════════════════════
        Chromosome[] population = new Chromosome[populationSize];

        // Generar primer individuo con heurística greedy
        Chromosome greedySeed = new Chromosome(lotCount);
        for (int i = 0; i < lotCount; i++) {
            SuperLot lot = lots.get(i);
            Route route = greedy.buildGreedyRoute(
                lot.getOriginAirportId(), lot.getDestAirportId(), state);
            greedySeed.setRoute(i, route);
        }

        // ═══════════════════════════════════════════
        // PASO 2: Asignación inicial de rutas a vuelos
        // ═══════════════════════════════════════════
        for (int i = 0; i < lotCount; i++) {
            Route route = greedySeed.getRoute(i);
            if (route != null) {
                greedy.assignFlightsToRoute(route, lots.get(i).getBagCount(), state);
            }
        }

        population[0] = greedySeed;

        // Generar variantes del greedy para diversidad
        for (int p = 1; p < populationSize; p++) {
            Chromosome variant = new Chromosome(greedySeed);
            // Aplicar mutación agresiva para diversificar
            geneticOps.mutateDetour(variant, 0.5, state);
            // Reasignar vuelos a las rutas mutadas
            for (int i = 0; i < lotCount; i++) {
                Route route = variant.getRoute(i);
                if (route != null) {
                    greedy.assignFlightsToRoute(route, lots.get(i).getBagCount(), state);
                }
            }
            population[p] = variant;
        }

        // Evaluar fitness de toda la población
        evaluatePopulation(population, lots, lotIds, state);

        // ═══════════════════════════════════════════
        // PASO 3: Bucle Evolutivo Anytime (Time-Boxed)
        // ═══════════════════════════════════════════
        int generation = 0;

        while (timeBox.hasTime()) {
            generation++;

            // Selección de padres por torneo
            Chromosome[] parents = geneticOps.tournamentSelection(population);

            // FASE RUTAS: Crossover de rutas
            Chromosome child = geneticOps.crossoverRoutes(parents[0], parents[1]);

            // FASE RUTAS: Mutación de desvío
            geneticOps.mutateDetour(child, mutationRate, state);

            // FASE ASIGNACIÓN: Reasignar vuelos a las nuevas rutas
            for (int i = 0; i < lotCount; i++) {
                Route route = child.getRoute(i);
                if (route != null) {
                    greedy.assignFlightsToRoute(route, lots.get(i).getBagCount(), state);
                    // R-014: División en sub-lotes si no hay capacidad
                    // (manejado por fitness como penalización)
                }
            }

            // Búsqueda Local: redistribuir carga entre vuelos
            localSearch.optimizeCapacities(child, lots, state);

            // Evaluar fitness del hijo
            Solution childSol = child.toSolution(lotIds);
            fitnessEval.evaluate(childSol, lots, state);
            child.setFitness(childSol.getFitness());

            // Reemplazo elitista: reemplazar el peor individuo si el hijo es mejor
            replaceWorst(population, child);
        }

        // ═══════════════════════════════════════════
        // PASO 4: Generar output — Plan de Viaje (R-032)
        // ═══════════════════════════════════════════
        Chromosome best = getBest(population);
        Solution result = best.toSolution(lotIds);

        System.out.printf("[HGA] Finalizado en %dms | %d generaciones | Fitness=%.2f%n",
            timeBox.getElapsedMillis(), generation, result.getFitness());

        return result;
    }

    /** Evalúa el fitness de todos los individuos de la población. */
    private void evaluatePopulation(Chromosome[] population, List<SuperLot> lots,
                                     int[] lotIds, NetworkState state) {
        for (Chromosome chr : population) {
            if (chr != null) {
                Solution sol = chr.toSolution(lotIds);
                fitnessEval.evaluate(sol, lots, state);
                chr.setFitness(sol.getFitness());
            }
        }
    }

    /** Reemplazo elitista: reemplaza al peor individuo si el hijo es mejor. */
    private void replaceWorst(Chromosome[] population, Chromosome child) {
        int worstIdx = 0;
        double worstFitness = Double.MIN_VALUE;
        for (int i = 0; i < population.length; i++) {
            if (population[i] != null && population[i].getFitness() > worstFitness) {
                worstFitness = population[i].getFitness();
                worstIdx = i;
            }
        }
        if (child.getFitness() < worstFitness) {
            population[worstIdx] = child;
        }
    }

    /** Obtiene el mejor individuo de la población. */
    private Chromosome getBest(Chromosome[] population) {
        Chromosome best = population[0];
        for (Chromosome chr : population) {
            if (chr != null && chr.getFitness() < best.getFitness()) {
                best = chr;
            }
        }
        return best;
    }

    // ──────── Configuración de parámetros ────────

    public void setPopulationSize(int size) { this.populationSize = size; }
    public void setMutationRate(double rate) { this.mutationRate = rate; }
    public void setTournamentSize(int size) {
        this.tournamentSize = size;
        this.geneticOps.setTournamentSize(size);
    }
    public void setEliteCount(int count) { this.eliteCount = count; }
    public void setDefaultSaMillis(long ms) { this.defaultSaMillis = ms; }
    public void setEpsilonMillis(long ms) { this.epsilonMillis = ms; }

    public int getPopulationSize() { return populationSize; }
    public double getMutationRate() { return mutationRate; }
}
