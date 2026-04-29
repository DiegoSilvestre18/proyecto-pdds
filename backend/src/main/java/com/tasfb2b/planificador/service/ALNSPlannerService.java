package com.tasfb2b.planificador.service;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
import com.tasfb2b.planificador.alns.AdaptiveWeightTracker;
import com.tasfb2b.planificador.alns.operator.*;
import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.planificador.domain.Solution;
import com.tasfb2b.planificador.simulation.SimulationRunner;
import com.tasfb2b.planificador.simulation.SimulationState;
import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.vuelo.repository.VueloRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Adaptive Large Neighborhood Search (ALNS) para Tasf.B2B.
 *
 * <p>Soporta dos modos de operación:
 * <ol>
 *   <li><b>plan()</b>: planificación desde cero, comparable con HGA para experimentación numérica.</li>
 *   <li><b>replanificar()</b>: replanificación operativa ante cancelación de un vuelo.
 *       Usa warm-start con backup routes precalculadas por el HGA.</li>
 * </ol>
 *
 * <p>Parámetros:
 * <ul>
 *   <li>INITIAL_TEMP_FACTOR = 0.05 × |fitness₀|</li>
 *   <li>COOLING_FACTOR = 0.997</li>
 *   <li>SEGMENT_SIZE = 100 iteraciones</li>
 *   <li>DESTROY_FRACTION = 0.20 (20% de lotes destruidos por iteración)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ALNSPlannerService {

    // ── Dependencias ───────────────────────────────────────────────
    private final RouteBuilder           routeBuilder;
    private final FitnessEvaluator       fitnessEval;
    private final AeropuertoRepository   aeropuertoRepo;
    private final SimulationRunner       simulator;
    private final PlanningSessionHolder  sessionHolder;
    private final VueloRepository        vueloRepo;

    // ── Parámetros ALNS ────────────────────────────────────────────
    private static final double INITIAL_TEMP_FACTOR = 0.05;
    private static final double COOLING_FACTOR      = 0.997;
    private static final int    SEGMENT_SIZE        = 100;
    private static final double DESTROY_FRACTION    = 0.20;

    // ─────────────────────────────────────────────────────────────
    // MODO 1: Planificación desde cero (comparación con HGA)
    // ─────────────────────────────────────────────────────────────

    /**
     * Ejecuta el ALNS completo sobre todos los SuperLots.
     * Usar para experimentación numérica y comparación con HGA.
     *
     * @param lots      lotes a planificar
     * @param windowMs  tiempo máximo de ejecución en milisegundos
     * @return solución optimizada
     */
    public Solution plan(List<SuperLot> lots, long windowMs) {

        if (lots.isEmpty()) return emptySolution();

        Map<String, Aeropuerto> airportMap = loadAirportMap();
        Random rng = new Random();

        // Solución inicial greedy: ordenar por urgencia SLA ascendente
        List<Route> currentRoutes = buildInitialSolution(lots, airportMap);

        return runAlns(currentRoutes, airportMap, rng, windowMs,
                /* vueloIdCancelado */ null);
    }

    // ─────────────────────────────────────────────────────────────
    // MODO 2: Replanificación operativa por cancelación de vuelo
    // ─────────────────────────────────────────────────────────────

    /**
     * Replanifica solo los lotes afectados por la cancelación de un vuelo.
     * Utiliza warm-start con las backup routes precalculadas por HGA
     * para acelerar la respuesta operativa.
     *
     * @param vueloIdCancelado ID del vuelo que se está cancelando
     * @param windowMs         tiempo máximo para el ciclo ALNS (en ms)
     * @return solución actualizada con rutas de los lotes afectados corregidas
     */
    public Solution replanificar(Long vueloIdCancelado, long windowMs) {

        // Verificar que hay un plan activo
        if (!sessionHolder.hasSolution()) {
            throw new IllegalStateException(
                    "No hay planificación activa. Ejecute /planificador/ejecutar primero.");
        }

        Solution current = sessionHolder.get();
        Map<String, Aeropuerto> airportMap = loadAirportMap();
        Random rng = new Random();

        List<Route> rutasActuales      = new ArrayList<>(current.getRoutes());
        List<Route> rutasNoAfectadas   = new ArrayList<>();
        List<SuperLot> afectados       = new ArrayList<>();
        List<SuperLot> sinBackupValido = new ArrayList<>();

        // Separar rutas afectadas de las no afectadas
        for (Route r : rutasActuales) {
            boolean usoVueloCancelado = r.getFlights().stream()
                    .anyMatch(v -> vueloIdCancelado.equals(v.getId()));
            if (usoVueloCancelado) {
                afectados.add(r.getLot());
            } else {
                rutasNoAfectadas.add(r);
            }
        }

        // ── WARM START: usar backup routes precalculadas ───────────
        for (SuperLot lot : afectados) {
            Route backup = current.getBackupRoutes().get(lot.getId());
            if (backup != null
                    && backup.isFeasibleArrival()
                    && !usaVuelo(backup, vueloIdCancelado)) {
                rutasNoAfectadas.add(backup);  // backup válido → aceptar directamente
            } else {
                sinBackupValido.add(lot);      // necesita ALNS completo
            }
        }

        // Si todos los afectados tienen backup válido → respuesta inmediata
        if (sinBackupValido.isEmpty()) {
            Solution sol = buildSolution(rutasNoAfectadas, airportMap,
                    System.currentTimeMillis());
            sessionHolder.store(sol);
            return sol;
        }

        // ── ALNS: completar los lotes sin backup ───────────────────
        // Construir solución parcial con los lotes que sí tienen solución inmediata,
        // más rutas iniciales greedy para los lotes sin backup.
        List<Route> partialRoutes = new ArrayList<>(rutasNoAfectadas);
        for (SuperLot lot : sinBackupValido) {
            Route r = routeBuilder.build(lot, airportMap, new HashMap<>(), new HashMap<>());
            partialRoutes.add(r);
        }

        Solution sol = runAlns(partialRoutes, airportMap, rng, windowMs, vueloIdCancelado);
        sessionHolder.store(sol);
        return sol;
    }

    // ─────────────────────────────────────────────────────────────
    // NÚCLEO DEL ALNS
    // ─────────────────────────────────────────────────────────────

    private Solution runAlns(List<Route> initialRoutes,
                             Map<String, Aeropuerto> airportMap,
                             Random rng,
                             long windowMs,
                             Long vueloIdCancelado) {

        long start = System.currentTimeMillis();

        // Configurar operadores
        List<DestroyOperator> destroyOps = buildDestroyOps(vueloIdCancelado);
        List<RepairOperator>  repairOps  = buildRepairOps();
        AdaptiveWeightTracker tracker    = new AdaptiveWeightTracker(destroyOps, repairOps);

        List<Route> current = new ArrayList<>(initialRoutes);
        List<Route> best    = new ArrayList<>(current);

        double currentFitness = evalFitness(current, airportMap, start);
        double bestFitness    = currentFitness;

        // Temperatura inicial: proporcional al fitness de la solución inicial
        double temp = Math.max(1.0, INITIAL_TEMP_FACTOR * Math.abs(currentFitness));

        int iter = 0;
        boolean primeraIteracion = (vueloIdCancelado != null);

        while (System.currentTimeMillis() - start < windowMs) {

            int q = Math.max(1, (int) (current.size() * DESTROY_FRACTION));

            // Copia de trabajo (para no corromper current si se rechaza)
            List<Route> candidate = new ArrayList<>(current);

            // ── Selección de operadores ────────────────────────────
            DestroyOperator dOp;
            RepairOperator  rOp;

            if (primeraIteracion && vueloIdCancelado != null) {
                // Forzar AffectedByFlightDestroyOp en la primera iteración de replanificación
                dOp = destroyOps.get(0);
                tracker.forceDestroy(0);
                primeraIteracion = false;
            } else {
                dOp = tracker.selectDestroy(rng);
            }
            rOp = tracker.selectRepair(rng);

            // ── Destruir ───────────────────────────────────────────
            List<SuperLot> removed = dOp.destroy(candidate, q, rng);

            // ── Reparar ────────────────────────────────────────────
            candidate = rOp.repair(candidate, removed, airportMap);

            // ── Resolver conflictos de capacidad ───────────────────
            resolverConflictosCapacidad(candidate);

            // ── Evaluar ────────────────────────────────────────────
            double candidateFitness = evalFitness(candidate, airportMap, start);
            double delta = candidateFitness - currentFitness;

            double reward;
            if (delta > 0) {
                // Mejora respecto a la solución actual
                current        = candidate;
                currentFitness = candidateFitness;
                reward = AdaptiveWeightTracker.REWARD_IMPROVE;
            } else if (acceptarSA(delta, temp, rng)) {
                // Aceptado por Simulated Annealing (peor solución aceptada para escapar óptimos locales)
                current        = candidate;
                currentFitness = candidateFitness;
                reward = AdaptiveWeightTracker.REWARD_ACCEPT;
            } else {
                reward = AdaptiveWeightTracker.REWARD_REJECT;
            }

            // Actualizar mejor solución global
            if (candidateFitness > bestFitness) {
                best         = new ArrayList<>(candidate);
                bestFitness  = candidateFitness;
                reward = AdaptiveWeightTracker.REWARD_GLOBAL_BEST;
            }

            tracker.update(reward);

            // ── Enfriar temperatura ────────────────────────────────
            temp *= COOLING_FACTOR;

            // ── Actualizar pesos al final de cada segmento ─────────
            iter++;
            if (iter % SEGMENT_SIZE == 0) {
                tracker.normalizeWeights();
            }
        }

        Solution sol = buildSolution(best, airportMap, start);
        sessionHolder.store(sol);
        return sol;
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    /** Construye la solución inicial greedy (urgencia SLA ascendente). */
    private List<Route> buildInitialSolution(List<SuperLot> lots,
                                              Map<String, Aeropuerto> airportMap) {
        return lots.stream()
                .sorted(Comparator.comparingLong(SuperLot::getSla))
                .map(lot -> routeBuilder.build(lot, airportMap,
                        new HashMap<>(), new HashMap<>()))
                .collect(Collectors.toList());
    }

    /**
     * Si una ruta tiene más demanda que capacidad asignada (exceso de capacidad),
     * se "expulsa" el exceso para evitar colapso, siguiendo la regla del negocio:
     * "se saca una maleta porque sino el sistema colapsa".
     * Los lotes expulsados quedan con capacidadAsignada = demanda - exceso.
     */
    private void resolverConflictosCapacidad(List<Route> routes) {
        // Mapear capacidad disponible por vuelo
        Map<Long, Integer> capacidadDisponible = new HashMap<>();
        for (Route r : routes) {
            for (Vuelo v : r.getFlights()) {
                capacidadDisponible.putIfAbsent(v.getId(), v.getCapacidadTotal());
            }
        }

        // Ordenar rutas por prioridad descendente (mayor prioridad primero)
        routes.sort(Comparator.comparingInt(r -> -r.getLot().getPriority()));

        for (Route r : routes) {
            if (r.getFlights().isEmpty()) continue;

            // Capacidad mínima disponible en los vuelos de esta ruta
            int capacidadRuta = r.getFlights().stream()
                    .mapToInt(v -> capacidadDisponible.getOrDefault(v.getId(), 0))
                    .min()
                    .orElse(0);

            int asignar = Math.min(r.getDemandaTotal(), capacidadRuta);

            // Actualizar el campo capacidadAsignada en la ruta
            r.setCapacidadAsignada(asignar);

            // Descontar la capacidad usada de cada vuelo
            for (Vuelo v : r.getFlights()) {
                capacidadDisponible.merge(v.getId(), -asignar, Integer::sum);
            }
        }
    }

    private double evalFitness(List<Route> routes,
                                Map<String, Aeropuerto> airportMap,
                                long startTime) {
        if (routes.isEmpty()) return 0;
        SimulationState state = simulator.run(routes, airportMap, startTime);
        return fitnessEval.evaluate(routes, state);
    }

    private boolean acceptarSA(double delta, double temp, Random rng) {
        if (temp <= 0) return false;
        return rng.nextDouble() < Math.exp(delta / temp);
    }

    private boolean usaVuelo(Route r, Long vueloId) {
        return r.getFlights().stream().anyMatch(v -> vueloId.equals(v.getId()));
    }

    private Map<String, Aeropuerto> loadAirportMap() {
        return aeropuertoRepo.findAll().stream()
                .collect(Collectors.toMap(Aeropuerto::getIcaoCode, a -> a));
    }

    private List<DestroyOperator> buildDestroyOps(Long vueloIdCancelado) {
        List<DestroyOperator> ops = new ArrayList<>();
        // AffectedByFlightDestroyOp en posición 0 (forzado en primera iteración de replanificación)
        ops.add(new AffectedByFlightDestroyOp(
                vueloIdCancelado != null ? vueloIdCancelado : -1L));
        ops.add(new WorstDestroyOp());
        ops.add(new RelatedDestroyOp());
        return ops;
    }

    private List<RepairOperator> buildRepairOps() {
        return List.of(
                new GreedyRepairOp(routeBuilder),
                new RegretRepairOp(routeBuilder)
        );
    }

    private Solution buildSolution(List<Route> routes,
                                   Map<String, Aeropuerto> airportMap,
                                   long startTime) {
        SimulationState state = simulator.run(routes, airportMap, startTime);
        double fit = fitnessEval.evaluate(routes, state);

        Solution sol = new Solution();
        sol.setRoutes(routes);
        sol.setFitness(fit);
        sol.setRouteCount(routes.size());
        sol.setRoutesValidas(
                (int) routes.stream().filter(Route::isAtendido).count());
        sol.setRoutesFallidas(
                (int) routes.stream().filter(r -> r.isNoAtendido() || r.isTarde()).count());
        sol.setCollapseTime(
                state.isColapsado() ? state.getCurrentTime() : -1L);
        return sol;
    }

    private Solution emptySolution() {
        Solution sol = new Solution();
        sol.setRoutes(List.of());
        sol.setFitness(0);
        sol.setRouteCount(0);
        sol.setRoutesValidas(0);
        sol.setRoutesFallidas(0);
        sol.setCollapseTime(-1L);
        return sol;
    }
}
