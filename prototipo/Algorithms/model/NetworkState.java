package model;

import java.util.ArrayList;
import java.util.List;

/**
 * Estado actual de la red de transporte aéreo.
 * Mantiene la información de todos los aeropuertos, vuelos y sus capacidades residuales.
 * Es la estructura central que ambos algoritmos consultan y modifican.
 */
public class NetworkState {

    private final Airport[] airports;
    private final Flight[] flights;

    // Matriz de adyacencia: flightsByRoute[originId][destId] = lista de flightIds
    private final List<Integer>[][] flightsByRoute;

    @SuppressWarnings("unchecked")
    public NetworkState(Airport[] airports, Flight[] flights) {
        this.airports = airports;
        this.flights = flights;

        // Construir índice de vuelos por par origen-destino
        int n = airports.length;
        this.flightsByRoute = new List[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                flightsByRoute[i][j] = new ArrayList<>();
            }
        }
        for (Flight f : flights) {
            if (f != null) {
                flightsByRoute[f.getOriginId()][f.getDestinationId()].add(f.getId());
            }
        }
    }

    /** Crea una copia profunda del estado de la red (para simulaciones sin side-effects). */
    public NetworkState deepCopy() {
        Airport[] airportsCopy = new Airport[airports.length];
        for (int i = 0; i < airports.length; i++) {
            Airport a = airports[i];
            airportsCopy[i] = new Airport(a.getId(), a.getIcaoCode(), a.getCity(),
                a.getCountry(), a.getContinent(), a.getStorageCapacity(),
                a.getGmtOffset(), a.getLatitude(), a.getLongitude());
            airportsCopy[i].setCurrentLoad(a.getCurrentLoad());
        }
        Flight[] flightsCopy = new Flight[flights.length];
        for (int i = 0; i < flights.length; i++) {
            Flight f = flights[i];
            if (f != null) {
                flightsCopy[i] = new Flight(f.getId(), f.getOriginId(), f.getDestinationId(),
                    f.getCapacity(), f.getDepartureMinute(), f.getArrivalMinute(),
                    f.isIntercontinental());
                flightsCopy[i].setAssignedBags(f.getAssignedBags());
                if (f.isCancelled()) flightsCopy[i].cancel();
            }
        }
        return new NetworkState(airportsCopy, flightsCopy);
    }

    /** Obtiene vuelos disponibles (no cancelados, con capacidad) entre dos aeropuertos. */
    public List<Integer> getAvailableFlights(int originId, int destId) {
        List<Integer> available = new ArrayList<>();
        for (int fId : flightsByRoute[originId][destId]) {
            Flight f = flights[fId];
            if (!f.isCancelled() && f.getAvailableCapacity() > 0) {
                available.add(fId);
            }
        }
        return available;
    }

    /** Obtiene TODOS los vuelos (incluidos cancelados/llenos) entre dos aeropuertos. */
    public List<Integer> getAllFlights(int originId, int destId) {
        return flightsByRoute[originId][destId];
    }

    /** Verifica si existe conexión directa entre dos aeropuertos. */
    public boolean hasDirectConnection(int originId, int destId) {
        return !flightsByRoute[originId][destId].isEmpty();
    }

    /** Obtiene los IDs de aeropuertos vecinos (con vuelo directo desde origin). */
    public List<Integer> getNeighborAirports(int originId) {
        List<Integer> neighbors = new ArrayList<>();
        for (int j = 0; j < airports.length; j++) {
            if (j != originId && !flightsByRoute[originId][j].isEmpty()) {
                neighbors.add(j);
            }
        }
        return neighbors;
    }

    /** Comprueba si dos aeropuertos están en el mismo continente. */
    public boolean isSameContinent(int airportId1, int airportId2) {
        return airports[airportId1].getContinent() == airports[airportId2].getContinent();
    }

    /**
     * Tiempo de tránsito en horas entre dos aeropuertos:
     * - 12h si mismo continente
     * - 24h si distinto continente
     */
    public int getTransitTimeHours(int originId, int destId) {
        return isSameContinent(originId, destId) ? 12 : 24;
    }

    // ──────── Getters directos ────────

    public Airport getAirport(int id) { return airports[id]; }
    public Flight getFlight(int id) { return flights[id]; }
    public int getAirportCount() { return airports.length; }
    public int getFlightCount() { return flights.length; }
    public Airport[] getAirports() { return airports; }
    public Flight[] getFlights() { return flights; }
}
