package hga;

import model.*;
import java.util.Arrays;

/**
 * Cromosoma del Algoritmo Genético Híbrido.
 * Codificación: int[][] donde cada fila corresponde a un Super-Lote
 * con dos componentes: Gen de Ruta (secuencia de aeropuertos) y
 * Gen de Asignación (ID de vuelo por tramo).
 *
 * Referencia: Informe §3.1 - Codificación (Cromosoma).
 */
public class Chromosome implements Comparable<Chromosome> {

    private final int lotCount;
    private final Route[] routes;       // Una ruta por Super-Lote
    private double fitness;

    public Chromosome(int lotCount) {
        this.lotCount = lotCount;
        this.routes = new Route[lotCount];
        this.fitness = Double.MAX_VALUE;
    }

    /** Constructor de copia profunda. */
    public Chromosome(Chromosome other) {
        this.lotCount = other.lotCount;
        this.fitness = other.fitness;
        this.routes = new Route[lotCount];
        for (int i = 0; i < lotCount; i++) {
            if (other.routes[i] != null) {
                this.routes[i] = new Route(other.routes[i]);
            }
        }
    }

    /** Convierte el cromosoma a una Solution para evaluación. */
    public Solution toSolution(int[] lotIds) {
        Solution sol = new Solution();
        for (int i = 0; i < lotCount; i++) {
            if (routes[i] != null && i < lotIds.length) {
                sol.setRoute(lotIds[i], new Route(routes[i]));
            }
        }
        sol.setFitness(fitness);
        return sol;
    }

    /** Carga las rutas desde una Solution existente. */
    public void fromSolution(Solution sol, int[] lotIds) {
        for (int i = 0; i < lotIds.length && i < lotCount; i++) {
            Route r = sol.getRoute(lotIds[i]);
            if (r != null) {
                routes[i] = new Route(r);
            }
        }
        this.fitness = sol.getFitness();
    }

    // ──────── Getters / Setters ────────

    public Route getRoute(int lotIndex) { return routes[lotIndex]; }
    public void setRoute(int lotIndex, Route route) { routes[lotIndex] = route; }
    public double getFitness() { return fitness; }
    public void setFitness(double f) { this.fitness = f; }
    public int getLotCount() { return lotCount; }
    public Route[] getRoutes() { return routes; }

    @Override
    public int compareTo(Chromosome other) {
        return Double.compare(this.fitness, other.fitness);
    }

    @Override
    public String toString() {
        return String.format("Chromosome[lots=%d fitness=%.2f]", lotCount, fitness);
    }
}
