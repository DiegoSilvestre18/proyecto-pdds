package hga;

import model.*;
import java.util.*;

/**
 * Operadores genéticos para el HGA:
 * - Selección por torneo
 * - Crossover de rutas (intercambio de sub-secuencias de aeropuertos)
 * - Mutación de desvío aleatorio (reemplazo de aeropuerto intermedio)
 *
 * Referencia: Informe §3.2 - Fase 1: Metaheurística de Rutas.
 */
public class GeneticOperators {

    private final Random random = new Random();
    private int tournamentSize = 3;

    public GeneticOperators() {}

    public GeneticOperators(int tournamentSize) {
        this.tournamentSize = tournamentSize;
    }

    /**
     * Selección por torneo: elige los k mejores de un grupo aleatorio.
     * Retorna un par de padres para crossover.
     */
    public Chromosome[] tournamentSelection(Chromosome[] population) {
        Chromosome parent1 = selectOne(population);
        Chromosome parent2 = selectOne(population);
        // Asegurar que sean individuos distintos
        int attempts = 0;
        while (parent2 == parent1 && attempts < 10) {
            parent2 = selectOne(population);
            attempts++;
        }
        return new Chromosome[]{parent1, parent2};
    }

    private Chromosome selectOne(Chromosome[] population) {
        Chromosome best = null;
        for (int i = 0; i < tournamentSize; i++) {
            int idx = random.nextInt(population.length);
            Chromosome candidate = population[idx];
            if (best == null || candidate.getFitness() < best.getFitness()) {
                best = candidate;
            }
        }
        return best;
    }

    /**
     * Crossover de rutas: intercambia sub-secuencias de aeropuertos intermedios
     * entre dos padres para un lote específico.
     *
     * Referencia: Informe §3.2 - Crossover de Rutas.
     */
    public Chromosome crossoverRoutes(Chromosome parent1, Chromosome parent2) {
        int lotCount = parent1.getLotCount();
        Chromosome child = new Chromosome(lotCount);

        for (int i = 0; i < lotCount; i++) {
            Route r1 = parent1.getRoute(i);
            Route r2 = parent2.getRoute(i);

            if (r1 == null && r2 == null) {
                continue;
            }
            if (r1 == null) {
                child.setRoute(i, new Route(r2));
                continue;
            }
            if (r2 == null) {
                child.setRoute(i, new Route(r1));
                continue;
            }

            // Crossover: con 50% de probabilidad tomar ruta de parent1 o parent2
            // Si ambas tienen intermediarios, intentar combinar
            if (random.nextBoolean()) {
                child.setRoute(i, crossSingleRoute(r1, r2));
            } else {
                child.setRoute(i, crossSingleRoute(r2, r1));
            }
        }
        return child;
    }

    /**
     * Combina dos rutas para el mismo par origen-destino.
     * Si tienen aeropuertos intermedios, intenta intercambiar un tramo.
     */
    private Route crossSingleRoute(Route primary, Route secondary) {
        int[] seq1 = primary.getAirportSequence();
        int[] seq2 = secondary.getAirportSequence();

        // Si alguna es directa (sin intermediarios), tomar la primaria
        if (seq1.length <= 2 || seq2.length <= 2) {
            return new Route(primary);
        }

        // Intercambiar un aeropuerto intermedio aleatorio
        int[] childSeq = Arrays.copyOf(seq1, seq1.length);
        int intermediateIdx = 1 + random.nextInt(seq1.length - 2); // Excluir origen y destino

        if (seq2.length > 2) {
            int donorIdx = 1 + random.nextInt(seq2.length - 2);
            childSeq[intermediateIdx] = seq2[donorIdx];
        }

        return new Route(childSeq);
    }

    /**
     * Mutación — Desvío Aleatorio: reemplaza un aeropuerto intermedio
     * por otro aeropuerto alternativo que mantenga la conexión.
     *
     * Referencia: Informe §3.2 - Mutación — Desvío Aleatorio.
     *
     * @param chromosome      El cromosoma a mutar.
     * @param mutationRate    Probabilidad de mutación por lote (0.0 a 1.0).
     * @param networkState    Estado de la red para verificar conexiones.
     */
    public void mutateDetour(Chromosome chromosome, double mutationRate, NetworkState networkState) {
        for (int i = 0; i < chromosome.getLotCount(); i++) {
            if (random.nextDouble() > mutationRate) continue;

            Route route = chromosome.getRoute(i);
            if (route == null) continue;

            int[] seq = route.getAirportSequence();
            if (seq.length <= 2) {
                // Ruta directa: intentar agregar un intermedio
                tryAddIntermediate(route, networkState);
                continue;
            }

            // Reemplazar un aeropuerto intermedio aleatorio
            int mutIdx = 1 + random.nextInt(seq.length - 2);
            int prevAirport = seq[mutIdx - 1];
            int nextAirport = seq[mutIdx + 1];

            // Buscar un aeropuerto alternativo conectado a ambos
            List<Integer> prevNeighbors = networkState.getNeighborAirports(prevAirport);
            List<Integer> candidates = new ArrayList<>();
            for (int neighbor : prevNeighbors) {
                if (neighbor != seq[mutIdx]
                    && networkState.hasDirectConnection(neighbor, nextAirport)) {
                    candidates.add(neighbor);
                }
            }

            if (!candidates.isEmpty()) {
                int newAirport = candidates.get(random.nextInt(candidates.size()));
                route.replaceIntermediateAirport(mutIdx, newAirport);
            }
        }
    }

    /** Intenta agregar un aeropuerto intermedio a una ruta directa. */
    private void tryAddIntermediate(Route route, NetworkState networkState) {
        int[] seq = route.getAirportSequence();
        if (seq.length != 2) return;

        int origin = seq[0];
        int dest = seq[1];

        List<Integer> originNeighbors = networkState.getNeighborAirports(origin);
        List<Integer> candidates = new ArrayList<>();
        for (int neighbor : originNeighbors) {
            if (neighbor != dest && networkState.hasDirectConnection(neighbor, dest)) {
                candidates.add(neighbor);
            }
        }

        if (!candidates.isEmpty()) {
            int intermediate = candidates.get(random.nextInt(candidates.size()));
            route.setAirportSequence(new int[]{origin, intermediate, dest});
        }
    }

    // ──────── Configuración ────────

    public void setTournamentSize(int size) { this.tournamentSize = size; }
    public int getTournamentSize() { return tournamentSize; }
}
