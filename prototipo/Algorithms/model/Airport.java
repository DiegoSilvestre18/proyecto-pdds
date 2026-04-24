package model;

/**
 * Representa un aeropuerto en la red de Tasf.B2B.
 * Cada aeropuerto pertenece a un continente y tiene capacidad de almacenamiento limitada (500-800 maletas).
 */
public class Airport {

    public static final int CONTINENT_AMERICA = 0;
    public static final int CONTINENT_EUROPE = 1;
    public static final int CONTINENT_ASIA = 2;

    private final int id;               // ID numérico interno (0-indexed para arrays primitivos)
    private final String icaoCode;      // Código ICAO (ej. SKBO)
    private final String city;
    private final String country;
    private final int continent;        // CONTINENT_AMERICA, CONTINENT_EUROPE, CONTINENT_ASIA
    private final int storageCapacity;  // Capacidad máxima de almacén (500-800)
    private final int gmtOffset;        // Huso horario GMT offset en horas
    private final double latitude;
    private final double longitude;

    private int currentLoad;            // Maletas actualmente en almacén

    public Airport(int id, String icaoCode, String city, String country,
                   int continent, int storageCapacity, int gmtOffset,
                   double latitude, double longitude) {
        this.id = id;
        this.icaoCode = icaoCode;
        this.city = city;
        this.country = country;
        this.continent = continent;
        this.storageCapacity = storageCapacity;
        this.gmtOffset = gmtOffset;
        this.latitude = latitude;
        this.longitude = longitude;
        this.currentLoad = 0;
    }

    /** Verifica si hay espacio para almacenar n maletas adicionales. */
    public boolean hasStorageFor(int bags) {
        return (currentLoad + bags) <= storageCapacity;
    }

    /** Agrega maletas al almacén. */
    public void addBags(int n) {
        currentLoad += n;
    }

    /** Retira maletas del almacén. */
    public void removeBags(int n) {
        currentLoad = Math.max(0, currentLoad - n);
    }

    /** Porcentaje de ocupación actual (0.0 a 1.0+). */
    public double getOccupancyRate() {
        return (double) currentLoad / storageCapacity;
    }

    /** Comprueba si el almacén supera el 90% de su capacidad (R-044). */
    public boolean isNearCapacity() {
        return getOccupancyRate() >= 0.90;
    }

    /** Capacidad residual disponible. */
    public int getResidualCapacity() {
        return Math.max(0, storageCapacity - currentLoad);
    }

    /**
     * Comprueba si dos aeropuertos están en el mismo continente.
     * Determina tiempos de tránsito (12h vs 24h) y SLA (1 día vs 2 días).
     */
    public boolean isSameContinent(Airport other) {
        return this.continent == other.continent;
    }

    // ──────── Getters ────────

    public int getId() { return id; }
    public String getIcaoCode() { return icaoCode; }
    public String getCity() { return city; }
    public String getCountry() { return country; }
    public int getContinent() { return continent; }
    public int getStorageCapacity() { return storageCapacity; }
    public int getGmtOffset() { return gmtOffset; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public int getCurrentLoad() { return currentLoad; }

    public void setCurrentLoad(int load) { this.currentLoad = load; }

    @Override
    public String toString() {
        return String.format("Airport[%s (%s) cont=%d cap=%d/%d]",
            icaoCode, city, continent, currentLoad, storageCapacity);
    }
}
