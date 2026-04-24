package alns;

import java.util.Random;

/**
 * Gestión de pesos adaptativos para los operadores del ALNS.
 * Los pesos se actualizan según el éxito/fracaso de cada operador,
 * y la selección se realiza por ruleta ponderada.
 *
 * Referencia: Informe §4.1 - Selección adaptativa de operadores.
 */
public class AdaptiveWeights {

    private final double[] weights;
    private final int[] usageCount;
    private final double[] scores;

    // Recompensas
    private double rewardBest = 3.0;        // Encontró nueva mejor solución global
    private double rewardImproved = 2.0;    // Mejoró la solución actual
    private double rewardAccepted = 1.0;    // Solución aceptada (SA)
    private double rewardRejected = 0.0;    // Solución rechazada

    private double decayFactor = 0.8;       // Factor de decaimiento para suavizar

    private final Random random = new Random();

    public AdaptiveWeights(int operatorCount) {
        this.weights = new double[operatorCount];
        this.usageCount = new int[operatorCount];
        this.scores = new double[operatorCount];

        // Inicializar pesos uniformemente
        for (int i = 0; i < operatorCount; i++) {
            weights[i] = 1.0;
        }
    }

    /**
     * Selecciona un operador por ruleta ponderada.
     * @return Índice del operador seleccionado.
     */
    public int selectOperator() {
        double totalWeight = 0;
        for (double w : weights) {
            totalWeight += w;
        }

        double r = random.nextDouble() * totalWeight;
        double cumulative = 0;
        for (int i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (r <= cumulative) {
                usageCount[i]++;
                return i;
            }
        }
        // Fallback
        int last = weights.length - 1;
        usageCount[last]++;
        return last;
    }

    /**
     * Actualiza el score de un operador tras su uso.
     *
     * @param operatorIndex Índice del operador.
     * @param isNewBest     ¿Encontró nueva mejor solución global?
     * @param isImproved    ¿Mejoró la solución actual?
     * @param isAccepted    ¿Fue aceptada por el criterio SA?
     */
    public void update(int operatorIndex, boolean isNewBest, boolean isImproved, boolean isAccepted) {
        if (isNewBest) {
            scores[operatorIndex] += rewardBest;
        } else if (isImproved) {
            scores[operatorIndex] += rewardImproved;
        } else if (isAccepted) {
            scores[operatorIndex] += rewardAccepted;
        } else {
            scores[operatorIndex] += rewardRejected;
        }
    }

    /**
     * Recalcula los pesos al final de un segmento (cada N iteraciones).
     * Usa suavizado exponencial para evitar cambios bruscos.
     */
    public void recalculateWeights() {
        for (int i = 0; i < weights.length; i++) {
            if (usageCount[i] > 0) {
                double performance = scores[i] / usageCount[i];
                weights[i] = decayFactor * weights[i] + (1 - decayFactor) * performance;
            }
            // Asegurar peso mínimo para exploración
            weights[i] = Math.max(0.1, weights[i]);
            // Reset contadores del segmento
            scores[i] = 0;
            usageCount[i] = 0;
        }
    }

    // ──────── Getters / Setters ────────

    public double[] getWeights() { return weights; }
    public void setDecayFactor(double f) { this.decayFactor = f; }
    public void setRewards(double best, double improved, double accepted) {
        this.rewardBest = best;
        this.rewardImproved = improved;
        this.rewardAccepted = accepted;
    }
}
