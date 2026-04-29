package com.tasfb2b.planificador.service;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
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

@Service
@RequiredArgsConstructor
public class HGAPlannerService {

    private final RouteBuilder routeBuilder;
    private final FitnessEvaluator fitness;
    private final AeropuertoRepository aeropuertoRepo;
    private final SimulationRunner simulator;

    private static final int POP_SIZE = 50;
    private static final double MUTATION_RATE = 0.15;
    private static final int ELITE_SIZE = 5;

    public Solution plan(List<SuperLot> lots, Object ignored, long windowMs) {

        if (lots.isEmpty()) return emptySolution();

        Map<String, Aeropuerto> airportMap = aeropuertoRepo.findAll().stream()
                .collect(Collectors.toMap(Aeropuerto::getIcaoCode, a -> a));

        long start = System.currentTimeMillis();

        List<List<SuperLot>> population = initPopulation(lots);

        List<SuperLot> best = population.get(0);
        double bestFitness = Double.NEGATIVE_INFINITY;

        while (System.currentTimeMillis() - start < windowMs) {

            population.sort(Comparator.comparingDouble(
                    ind -> -evaluate(ind, airportMap, start)));

            List<List<SuperLot>> newPop = new ArrayList<>(
                    population.subList(0, ELITE_SIZE)
            );

            Random rng = new Random();

            while (newPop.size() < POP_SIZE) {

                List<SuperLot> p1 = tournament(population, rng, airportMap, start);
                List<SuperLot> p2 = tournament(population, rng, airportMap, start);

                List<SuperLot> child = crossover(p1, p2, rng);

                if (rng.nextDouble() < MUTATION_RATE)
                    mutate(child, rng);

                newPop.add(child);
            }

            population = newPop;

            List<SuperLot> candidate = population.get(0);
            double candFit = evaluate(candidate, airportMap, start);

            if (candFit > bestFitness) {
                bestFitness = candFit;
                best = candidate;
            }
        }

        List<Route> bestRoutes = buildIndividual(best, airportMap);

        SimulationState state =
                simulator.run(bestRoutes, airportMap, start);

        double finalFitness = fitness.evaluate(bestRoutes, state);

        Solution solution = buildSolution(bestRoutes, state, finalFitness);

        // ── GENERACIÓN DE BACKUP ROUTES ──────────────────────────────
        // Para cada ruta óptima, precalcular una ruta alternativa que
        // evite los vuelos del camino principal. El ALNS las usará como
        // warm-start ante cancelaciones, reduciendo el tiempo de respuesta.
        Map<Integer, Route> backupRoutes = new HashMap<>();
        for (Route r : bestRoutes) {
            if (r.getFlights().isEmpty()) continue;

            Set<Long> usedFlightIds = r.getFlights().stream()
                    .map(Vuelo::getId)
                    .collect(Collectors.toSet());

            Route backup = routeBuilder.buildBackup(r.getLot(), airportMap, usedFlightIds);
            if (backup != null && backup.isFeasibleArrival()) {
                backupRoutes.put(r.getLot().getId(), backup);
            }
        }
        solution.setBackupRoutes(backupRoutes);
        // ─────────────────────────────────────────────────────────────

        return solution;
    }

    // ─────────────────────────────
    // EVALUACIÓN
    // ─────────────────────────────

    private double evaluate(List<SuperLot> individual,
                            Map<String, Aeropuerto> airportMap,
                            long startTime) {

        List<Route> routes = buildIndividual(individual, airportMap);

        SimulationState state =
                simulator.run(routes, airportMap,startTime);

        return fitness.evaluate(routes, state);
    }

    private List<Route> buildIndividual(List<SuperLot> lots,
                                        Map<String, Aeropuerto> airportMap) {

        return lots.stream()
                .map(lot -> routeBuilder.build(
                        lot,
                        airportMap,
                        new HashMap<>(),
                        new HashMap<>()
                ))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────
    // GA OPERATORS
    // ─────────────────────────────

    private List<List<SuperLot>> initPopulation(List<SuperLot> lots) {

        List<List<SuperLot>> pop = new ArrayList<>();

        List<SuperLot> sorted = new ArrayList<>(lots);
        sorted.sort(Comparator.comparingLong(SuperLot::getSla));
        pop.add(sorted);

        Random rng = new Random();

        while (pop.size() < POP_SIZE) {
            List<SuperLot> shuffled = new ArrayList<>(lots);
            Collections.shuffle(shuffled, rng);
            pop.add(shuffled);
        }

        return pop;
    }

    private List<SuperLot> crossover(List<SuperLot> p1,
                                     List<SuperLot> p2,
                                     Random rng) {

        int n = p1.size();
        int c1 = rng.nextInt(n), c2 = rng.nextInt(n);
        if (c1 > c2) { int t = c1; c1 = c2; c2 = t; }

        Set<SuperLot> used = new HashSet<>();
        List<SuperLot> child = new ArrayList<>(Collections.nCopies(n, null));

        for (int i = c1; i <= c2; i++) {
            child.set(i, p1.get(i));
            used.add(p1.get(i));
        }

        int pos = (c2 + 1) % n;

        for (SuperLot lot : p2) {
            if (!used.contains(lot)) {
                child.set(pos, lot);
                pos = (pos + 1) % n;
            }
        }

        return child;
    }

    private void mutate(List<SuperLot> ind, Random rng) {
        int i = rng.nextInt(ind.size());
        int j = rng.nextInt(ind.size());
        Collections.swap(ind, i, j);
    }

    private List<SuperLot> tournament(List<List<SuperLot>> pop,
                                      Random rng,
                                      Map<String, Aeropuerto> airportMap,
                                      long startTime) {

        List<SuperLot> best = null;
        double bestFit = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < 3; i++) {
            List<SuperLot> candidate = pop.get(rng.nextInt(pop.size()));
            double fit = evaluate(candidate, airportMap, startTime);

            if (fit > bestFit) {
                bestFit = fit;
                best = candidate;
            }
        }

        return best;
    }

    private Solution buildSolution(List<Route> routes,
                                   SimulationState state,
                                   double fitnessValue) {

        Solution sol = new Solution();

        sol.setRoutes(routes);
        sol.setFitness(fitnessValue);
        sol.setRouteCount(routes.size());

        sol.setRoutesValidas(
                (int) routes.stream().filter(Route::isAtendido).count()
        );

        sol.setRoutesFallidas(
                (int) routes.stream().filter(r ->
                        r.isNoAtendido() || r.isTarde()).count()
        );

        sol.setCollapseTime(
                state.isColapsado()
                        ? state.getCurrentTime()
                        : -1L
        );

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