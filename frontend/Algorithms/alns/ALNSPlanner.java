package alns;

import model.*;
import common.*;
import java.util.*;

/**
 * Adaptive Large Neighborhood Search (ALNS) — Replanificación Dinámica.
 *
 * Responde de forma ágil a disrupciones sin recalcular toda la red mundial,
 * modificando únicamente la vecindad afectada.
 *
 * Implementa el pseudocódigo descrito en el Informe §4.4, con:
 *   - Operadores destructivos adaptativos (Ruin)
 *   - Operadores reparadores adaptativos (Repair)
 *   - Criterio de aceptación: Recocido Simulado (SA)
 *   - Time-Boxing Anytime
 *
 * Requerimientos cubiertos: R-090, R-026, R-091, R-014, R-028, R-084, R-094, R-095.
 */
public class ALNSPlanner {

    // ──────── Parámetros del algoritmo ────────
    private double initialTemperature = 1000.0;
    private double coolingRate = 0.995;
    private long defaultSaMillis = 3000;    // S_a por defecto: 3 segundos
    private long epsilonMillis = 50;        // Margen de seguridad: 50ms
    private int weightUpdateSegment = 50;   // Recalcular pesos cada N iteraciones

    // ──────── Componentes ────────
    private final RuinOperators ruinOps;
    private final RepairOperators repairOps;
    private final AdaptiveWeights ruinWeights;
    private final AdaptiveWeights repairWeights;
    private final FitnessEvaluator fitnessEval;
    private final TimeBoxController timeBox;

    private final Random random = new Random();

    public ALNSPlanner() {
        this.ruinOps = new RuinOperators();
        this.repairOps = new RepairOperators();
        this.ruinWeights = new AdaptiveWeights(RuinOperators.OPERATOR_COUNT);
        this.repairWeights = new AdaptiveWeights(RepairOperators.OPERATOR_COUNT);
        this.fitnessEval = new FitnessEvaluator();
        this.timeBox = new TimeBoxController();
    }

    /**
     * Replanificación dinámica ante disrupciones.
     *
     * @param baseSolution      Solución actual (antes de las disrupciones).
     * @param lots              Lista completa de Super-Lotes (incluyendo los afectados).
     * @param cancelledFlights  IDs de vuelos cancelados (vacío si no hay cancelaciones).
     * @param urgentLotId       ID de lote urgente (-1 si no hay urgencia).
     * @param state             Estado actual de la red.
     * @param saMillis          Salto del algoritmo (S_a) en milisegundos.
     * @return                  Solución replanificada.
     */
    public Solution replan(Solution baseSolution, List<SuperLot> lots,
                            List<Integer> cancelledFlights, int urgentLotId,
                            NetworkState state, long saMillis) {
        if (lots.isEmpty()) {
            return baseSolution;
        }

        // ═══════════════════════════════════════════
        // Inicio: Time-Boxing y estado inicial
        // ═══════════════════════════════════════════
        timeBox.start(saMillis, epsilonMillis);

        Solution bestSol = new Solution(baseSolution);
        Solution currentSol = new Solution(baseSolution);

        fitnessEval.evaluate(bestSol, lots, state);
        fitnessEval.evaluate(currentSol, lots, state);

        double temperature = initialTemperature;
        int iteration = 0;

        // ═══════════════════════════════════════════
        // Bucle Adaptativo Anytime (Time-Boxed)
        // ═══════════════════════════════════════════
        while (timeBox.hasTime()) {
            iteration++;

            // Seleccionar operadores por ruleta ponderada
            int ruinIdx = ruinWeights.selectOperator();
            int repairIdx = repairWeights.selectOperator();

            // ═════════════════════════════════════
            // FASE RUTAS: Destruir (Ruin)
            // ═════════════════════════════════════
            Solution candidateSol = new Solution(currentSol);
            List<Integer> orphanLotIds = ruinOps.apply(
                ruinIdx, candidateSol, lots, cancelledFlights, urgentLotId, state);

            // ═════════════════════════════════════
            // FASE RUTAS + ASIGNACIÓN: Reparar (Repair)
            // ═════════════════════════════════════
            repairOps.apply(repairIdx, candidateSol, orphanLotIds, lots, state);

            // Evaluar fitness de la solución candidata
            double candidateFitness = fitnessEval.evaluate(candidateSol, lots, state);
            double currentFitness = currentSol.getFitness();
            double deltaCost = candidateFitness - currentFitness;

            boolean isAccepted = false;
            boolean isImproved = false;
            boolean isNewBest = false;

            // ═════════════════════════════════════
            // Criterio de Aceptación: Recocido Simulado
            // P(aceptar) = e^(-ΔCosto / T)
            // ═════════════════════════════════════
            if (deltaCost < 0) {
                // Mejora: aceptar siempre
                isAccepted = true;
                isImproved = true;
            } else {
                // Peor solución: aceptar con probabilidad SA
                double acceptProb = Math.exp(-deltaCost / temperature);
                if (random.nextDouble() < acceptProb) {
                    isAccepted = true;
                }
            }

            if (isAccepted) {
                currentSol = candidateSol;

                if (candidateFitness < bestSol.getFitness()) {
                    bestSol = new Solution(candidateSol);
                    isNewBest = true;
                }
            }

            // Actualizar pesos adaptativos
            ruinWeights.update(ruinIdx, isNewBest, isImproved, isAccepted);
            repairWeights.update(repairIdx, isNewBest, isImproved, isAccepted);

            // Recalcular pesos periódicamente
            if (iteration % weightUpdateSegment == 0) {
                ruinWeights.recalculateWeights();
                repairWeights.recalculateWeights();
            }

            // Enfriamiento
            temperature *= coolingRate;
        }

        System.out.printf("[ALNS] Finalizado en %dms | %d iteraciones | Fitness=%.2f%n",
            timeBox.getElapsedMillis(), iteration, bestSol.getFitness());

        return bestSol;
    }

    // ──────── Configuración de parámetros ────────

    public void setInitialTemperature(double t) { this.initialTemperature = t; }
    public void setCoolingRate(double rate) { this.coolingRate = rate; }
    public void setDefaultSaMillis(long ms) { this.defaultSaMillis = ms; }
    public void setEpsilonMillis(long ms) { this.epsilonMillis = ms; }
    public void setWeightUpdateSegment(int n) { this.weightUpdateSegment = n; }

    public double getInitialTemperature() { return initialTemperature; }
    public double getCoolingRate() { return coolingRate; }
}
