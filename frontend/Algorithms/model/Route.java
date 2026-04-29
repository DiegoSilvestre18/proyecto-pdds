package model;

import java.util.Arrays;

/**
 * Ruta asignada a un Super-Lote.
 * Contiene la secuencia de aeropuertos y el vuelo asignado por cada tramo.
 */
public class Route {

    private int[] airportSequence;      // IDs de aeropuertos [origen, ..., destino]
    private int[] flightAssignments;    // IDs de vuelos por tramo (longitud = airportSequence.length - 1)
    private long[] estimatedArrivals;   // Tiempo estimado de llegada a cada aeropuerto (millis)

    public Route(int[] airportSequence) {
        this.airportSequence = airportSequence;
        this.flightAssignments = new int[Math.max(0, airportSequence.length - 1)];
        this.estimatedArrivals = new long[airportSequence.length];
        Arrays.fill(flightAssignments, -1); // Sin asignar
    }

    /** Constructor de copia profunda. */
    public Route(Route other) {
        this.airportSequence = Arrays.copyOf(other.airportSequence, other.airportSequence.length);
        this.flightAssignments = Arrays.copyOf(other.flightAssignments, other.flightAssignments.length);
        this.estimatedArrivals = Arrays.copyOf(other.estimatedArrivals, other.estimatedArrivals.length);
    }

    /** Número de tramos (aristas) en la ruta. */
    public int getSegmentCount() {
        return Math.max(0, airportSequence.length - 1);
    }

    /** Aeropuerto origen de la ruta. */
    public int getOrigin() {
        return airportSequence[0];
    }

    /** Aeropuerto destino final de la ruta. */
    public int getDestination() {
        return airportSequence[airportSequence.length - 1];
    }

    /** Aeropuerto origen del tramo i. */
    public int getSegmentOrigin(int segmentIndex) {
        return airportSequence[segmentIndex];
    }

    /** Aeropuerto destino del tramo i. */
    public int getSegmentDestination(int segmentIndex) {
        return airportSequence[segmentIndex + 1];
    }

    /** Reemplaza un aeropuerto intermedio (para mutación). */
    public void replaceIntermediateAirport(int index, int newAirportId) {
        if (index > 0 && index < airportSequence.length - 1) {
            airportSequence[index] = newAirportId;
        }
    }

    // ──────── Getters / Setters ────────

    public int[] getAirportSequence() { return airportSequence; }
    public void setAirportSequence(int[] seq) {
        this.airportSequence = seq;
        this.flightAssignments = new int[Math.max(0, seq.length - 1)];
        this.estimatedArrivals = new long[seq.length];
        Arrays.fill(flightAssignments, -1);
    }
    public int[] getFlightAssignments() { return flightAssignments; }
    public void setFlightAssignment(int segmentIndex, int flightId) {
        flightAssignments[segmentIndex] = flightId;
    }
    public long[] getEstimatedArrivals() { return estimatedArrivals; }
    public void setEstimatedArrival(int index, long time) {
        estimatedArrivals[index] = time;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("Route[");
        for (int i = 0; i < airportSequence.length; i++) {
            if (i > 0) sb.append(" -> ");
            sb.append(airportSequence[i]);
            if (i < flightAssignments.length) {
                sb.append("(f").append(flightAssignments[i]).append(")");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
