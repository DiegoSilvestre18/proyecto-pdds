package model;

/**
 * Super-Lote: agrupación de maletas con mismo origen, destino y rango de SLA.
 * Reduce el espacio de búsqueda del algoritmo (Clustering, §2.5 del informe).
 */
public class SuperLot {

    private final int id;
    private final int originAirportId;
    private final int destAirportId;
    private int bagCount;
    private final long slaDeadlineMillis;   // Plazo máximo absoluto
    private final boolean isIntercontinental;
    private int priority;                   // Mayor valor = más urgente

    public SuperLot(int id, int originAirportId, int destAirportId,
                    int bagCount, long slaDeadlineMillis, boolean isIntercontinental) {
        this.id = id;
        this.originAirportId = originAirportId;
        this.destAirportId = destAirportId;
        this.bagCount = bagCount;
        this.slaDeadlineMillis = slaDeadlineMillis;
        this.isIntercontinental = isIntercontinental;
        this.priority = 0;
    }

    /**
     * SLA en horas:
     * - 24h para mismo continente
     * - 48h para distinto continente
     */
    public int getSlaHours() {
        return isIntercontinental ? 48 : 24;
    }

    // ──────── Getters / Setters ────────

    public int getId() { return id; }
    public int getOriginAirportId() { return originAirportId; }
    public int getDestAirportId() { return destAirportId; }
    public int getBagCount() { return bagCount; }
    public void setBagCount(int n) { this.bagCount = n; }
    public long getSlaDeadlineMillis() { return slaDeadlineMillis; }
    public boolean isIntercontinental() { return isIntercontinental; }
    public int getPriority() { return priority; }
    public void setPriority(int p) { this.priority = p; }

    @Override
    public String toString() {
        return String.format("SuperLot[%d: %d->%d bags=%d sla=%dh pri=%d]",
            id, originAirportId, destAirportId, bagCount, getSlaHours(), priority);
    }
}
