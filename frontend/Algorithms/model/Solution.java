package model;

import java.util.HashMap;
import java.util.Map;

/**
 * Solución completa: conjunto de rutas asignadas a Super-Lotes.
 * Incluye el valor de fitness y un snapshot de las capacidades utilizadas.
 */
public class Solution {

    private Map<Integer, Route> routes;  // lotId -> Route
    private double fitness;

    public Solution() {
        this.routes = new HashMap<>();
        this.fitness = Double.MAX_VALUE;
    }

    /** Constructor de copia profunda. */
    public Solution(Solution other) {
        this.fitness = other.fitness;
        this.routes = new HashMap<>();
        for (Map.Entry<Integer, Route> entry : other.routes.entrySet()) {
            this.routes.put(entry.getKey(), new Route(entry.getValue()));
        }
    }

    public void setRoute(int lotId, Route route) {
        routes.put(lotId, route);
    }

    public Route getRoute(int lotId) {
        return routes.get(lotId);
    }

    public void removeRoute(int lotId) {
        routes.remove(lotId);
    }

    public Map<Integer, Route> getAllRoutes() {
        return routes;
    }

    public int getRouteCount() {
        return routes.size();
    }

    public double getFitness() { return fitness; }
    public void setFitness(double f) { this.fitness = f; }

    @Override
    public String toString() {
        return String.format("Solution[routes=%d fitness=%.2f]", routes.size(), fitness);
    }
}
