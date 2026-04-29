package common;

/**
 * Controlador de Time-Boxing para algoritmos Anytime.
 * Garantiza que T_a < S_a - epsilon, interrumpiendo el algoritmo
 * y retornando la mejor solución encontrada hasta el momento.
 *
 * Referencia: Informe §2.2 - Restricción estricta de estabilidad.
 */
public class TimeBoxController {

    private long startNanos;
    private long timeLimitNanos;

    /**
     * Inicia el reloj de time-boxing.
     * @param saMillis Salto del algoritmo (S_a) en milisegundos.
     * @param epsilonMillis Margen de seguridad (epsilon) en milisegundos.
     */
    public void start(long saMillis, long epsilonMillis) {
        this.startNanos = System.nanoTime();
        this.timeLimitNanos = (saMillis - epsilonMillis) * 1_000_000L;
    }

    /**
     * Inicia con un tiempo límite absoluto en milisegundos.
     * @param maxMillis Tiempo máximo de ejecución en milisegundos.
     */
    public void startAbsolute(long maxMillis) {
        this.startNanos = System.nanoTime();
        this.timeLimitNanos = maxMillis * 1_000_000L;
    }

    /** Retorna true si aún queda tiempo para ejecutar iteraciones. */
    public boolean hasTime() {
        return (System.nanoTime() - startNanos) < timeLimitNanos;
    }

    /** Tiempo transcurrido desde el inicio en milisegundos. */
    public long getElapsedMillis() {
        return (System.nanoTime() - startNanos) / 1_000_000L;
    }

    /** Tiempo restante en milisegundos. */
    public long getRemainingMillis() {
        long elapsed = System.nanoTime() - startNanos;
        long remaining = timeLimitNanos - elapsed;
        return Math.max(0, remaining / 1_000_000L);
    }

    /** Porcentaje del tiempo consumido (0.0 a 1.0). */
    public double getProgress() {
        if (timeLimitNanos <= 0) return 1.0;
        return Math.min(1.0, (double)(System.nanoTime() - startNanos) / timeLimitNanos);
    }
}
