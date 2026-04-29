package model;

/**
 * Representa un vuelo operado por Tasf.B2B entre dos aeropuertos.
 * Capacidad: 150-250 (mismo continente) o 150-400 (distinto continente).
 */
public class Flight {

    private final int id;
    private final int originId;         // ID del aeropuerto origen
    private final int destinationId;    // ID del aeropuerto destino
    private final int capacity;         // Capacidad máxima de maletas
    private final int departureMinute;  // Hora de salida en minutos desde 00:00
    private final int arrivalMinute;    // Hora de llegada en minutos desde 00:00
    private final boolean isIntercontinental;

    private int assignedBags;           // Maletas actualmente asignadas
    private boolean isCancelled;

    public Flight(int id, int originId, int destinationId, int capacity,
                  int departureMinute, int arrivalMinute, boolean isIntercontinental) {
        this.id = id;
        this.originId = originId;
        this.destinationId = destinationId;
        this.capacity = capacity;
        this.departureMinute = departureMinute;
        this.arrivalMinute = arrivalMinute;
        this.isIntercontinental = isIntercontinental;
        this.assignedBags = 0;
        this.isCancelled = false;
    }

    /** Verifica si el vuelo tiene capacidad para n maletas más. */
    public boolean hasCapacityFor(int bags) {
        return !isCancelled && (assignedBags + bags) <= capacity;
    }

    /** Asigna maletas al vuelo. Retorna la cantidad que efectivamente se pudo asignar. */
    public int assignBags(int n) {
        int canAssign = Math.min(n, capacity - assignedBags);
        assignedBags += canAssign;
        return canAssign;
    }

    /** Libera maletas del vuelo (usado en replanificación ALNS). */
    public void releaseBags(int n) {
        assignedBags = Math.max(0, assignedBags - n);
    }

    /** Capacidad disponible restante. */
    public int getAvailableCapacity() {
        return Math.max(0, capacity - assignedBags);
    }

    /**
     * Tiempo de tránsito en horas:
     * - 12h para mismo continente
     * - 24h para distinto continente
     */
    public int getTransitTimeHours() {
        return isIntercontinental ? 24 : 12;
    }

    /** Duración real del vuelo en minutos (según datos). */
    public int getFlightDurationMinutes() {
        int duration = arrivalMinute - departureMinute;
        if (duration < 0) duration += 1440; // Cruza medianoche
        return duration;
    }

    /** Porcentaje de carga ocupada (R-043). */
    public double getLoadPercentage() {
        return (double) assignedBags / capacity;
    }

    public void cancel() { this.isCancelled = true; }
    public void restore() { this.isCancelled = false; }

    // ──────── Getters ────────

    public int getId() { return id; }
    public int getOriginId() { return originId; }
    public int getDestinationId() { return destinationId; }
    public int getCapacity() { return capacity; }
    public int getDepartureMinute() { return departureMinute; }
    public int getArrivalMinute() { return arrivalMinute; }
    public boolean isIntercontinental() { return isIntercontinental; }
    public int getAssignedBags() { return assignedBags; }
    public boolean isCancelled() { return isCancelled; }

    public void setAssignedBags(int n) { this.assignedBags = n; }

    @Override
    public String toString() {
        return String.format("Flight[%d: %d->%d cap=%d/%d %s%s]",
            id, originId, destinationId, assignedBags, capacity,
            isIntercontinental ? "INTER" : "LOCAL",
            isCancelled ? " CANCELLED" : "");
    }
}
