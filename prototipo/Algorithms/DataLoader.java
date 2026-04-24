import model.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Cargador de datos reales desde los archivos del proyecto:
 * - Aeropuertos: c.1inf54.26.1.v1.Aeropuerto.husos.v1.20250818__estudiantes.txt (UTF-16BE)
 * - Planes de vuelo: planes_vuelo.txt (ASCII)
 *
 * Formatos:
 *   Aeropuertos: "ID   ICAO   Ciudad   País   Código   GMT   Capacidad   Latitude: ..."
 *   Vuelos:      "ICAO_ORIG-ICAO_DEST-HH:MM-HH:MM-CCCC" (CCCC = capacidad, ej. 0300 = 300)
 */
public class DataLoader {

    /**
     * Carga los aeropuertos desde el archivo de datos (UTF-16BE).
     *
     * @param filePath Ruta al archivo de aeropuertos.
     * @return         Array de aeropuertos indexados por ID.
     */
    public static Airport[] loadAirports(String filePath) throws IOException {
        List<Airport> airports = new ArrayList<>();
        int currentContinent = -1;

        // Leer como UTF-16BE
        byte[] rawBytes = readAllBytes(filePath);
        String content = new String(rawBytes, "UTF-16BE");
        String[] lines = content.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();

            // Detectar sección de continente
            if (trimmed.contains("America")) {
                currentContinent = Airport.CONTINENT_AMERICA;
                continue;
            } else if (trimmed.contains("Europa")) {
                currentContinent = Airport.CONTINENT_EUROPE;
                continue;
            } else if (trimmed.contains("Asia")) {
                currentContinent = Airport.CONTINENT_ASIA;
                continue;
            }

            // Ignorar líneas no relevantes
            if (trimmed.isEmpty() || trimmed.startsWith("*") || trimmed.startsWith("PDDS")
                || currentContinent < 0) {
                continue;
            }

            // Intentar parsear línea de aeropuerto
            // Los campos están separados por espacios variables
            // Buscar: número al inicio, luego ICAO de 4 letras mayúsculas
            String[] tokens = trimmed.split("\\s+");
            if (tokens.length < 7) continue;

            try {
                int numId = Integer.parseInt(tokens[0]);

                // Validar ICAO: 4 letras mayúsculas
                String icao = tokens[1];
                if (icao.length() != 4 || !icao.matches("[A-Z]{4}")) continue;

                // Encontrar el GMT y capacidad buscando desde el final de los tokens
                // hasta Latitude, recorriendo hacia atrás
                int gmtOffset = 0;
                int capacity = 400;
                String city = "";

                // Buscar el índice de "Latitude:" para saber dónde terminan los datos tabulares
                int latIdx = -1;
                for (int i = 0; i < tokens.length; i++) {
                    if (tokens[i].startsWith("Latitude")) {
                        latIdx = i;
                        break;
                    }
                }

                if (latIdx > 4) {
                    // Los dos tokens antes de "Latitude:" son GMT y CAPACIDAD
                    capacity = Integer.parseInt(tokens[latIdx - 1]);
                    gmtOffset = Integer.parseInt(tokens[latIdx - 2]);

                    // El código abreviado (bogo, quit, etc.) está antes del GMT
                    // La ciudad está entre ICAO y el código abreviado
                    // Reconstruir nombre de ciudad
                    StringBuilder cityBuilder = new StringBuilder();
                    // tokens[2..codeIdx-1] = ciudad + país
                    // tokens[codeIdx] = código
                    // tokens[codeIdx+1] = GMT
                    // tokens[codeIdx+2] = capacidad
                    int codeIdx = latIdx - 3; // el código abreviado (bogo, quit, etc.)
                    // Antes del código: ciudad y país, necesitamos pais = 1 token antes del código
                    // OK simplificación: tomar tokens[2] como ciudad
                    city = tokens[2];
                    // Si la ciudad tiene múltiples palabras (ej. "Santiago de Chile"),
                    // buscar el país (primera palabra que no es parte de la ciudad)
                    // Simplificación: concatenar tokens[2..codeIdx-1] como ciudad + país
                    cityBuilder = new StringBuilder();
                    for (int i = 2; i < codeIdx; i++) {
                        if (cityBuilder.length() > 0) cityBuilder.append(" ");
                        cityBuilder.append(tokens[i]);
                    }
                    city = cityBuilder.toString();
                }

                // Extraer lat/lon de forma simplificada (no crítico para la lógica)
                double lat = 0, lon = 0;

                int id = airports.size(); // 0-indexed
                Airport airport = new Airport(id, icao, city, "",
                    currentContinent, capacity, gmtOffset, lat, lon);
                airports.add(airport);

            } catch (NumberFormatException e) {
                // Token no parseable, ignorar línea
            }
        }

        Airport[] result = airports.toArray(new Airport[0]);
        System.out.printf("[DataLoader] Cargados %d aeropuertos%n", result.length);
        return result;
    }

    /**
     * Carga los planes de vuelo desde el archivo de datos.
     *
     * @param filePath     Ruta al archivo de planes de vuelo.
     * @param airports     Aeropuertos previamente cargados.
     * @return             Array de vuelos.
     */
    public static Flight[] loadFlights(String filePath, Airport[] airports) throws IOException {
        List<Flight> flights = new ArrayList<>();
        Map<String, Integer> icaoToId = new HashMap<>();
        for (Airport a : airports) {
            icaoToId.put(a.getIcaoCode(), a.getId());
        }

        byte[] bytes = readAllBytes(filePath);
        String content = new String(bytes, StandardCharsets.US_ASCII);
        String[] lines = content.split("\\r?\\n");

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            // Formato: SKBO-SEQM-03:34-04:21-0300
            // Dividir por "-" pero las horas también tienen ":", así que
            // usemos un split más cuidadoso
            String[] parts = line.split("-");
            if (parts.length < 5) continue;

            // parts[0] = ORIGIN ICAO
            // parts[1] = DEST ICAO
            // parts[2] = departure HH:MM (podría ser solo la hora si se cortó)
            // parts[3] = arrival HH:MM
            // parts[4] = capacity (0300 = 300)

            String originIcao = parts[0].trim();
            String destIcao = parts[1].trim();

            // Validar ICAO
            if (originIcao.length() != 4 || destIcao.length() != 4) continue;

            Integer originId = icaoToId.get(originIcao);
            Integer destId = icaoToId.get(destIcao);
            if (originId == null || destId == null) continue;

            try {
                int depMinute = parseTime(parts[2]);
                int arrMinute = parseTime(parts[3]);

                // Capacidad: "0300" -> 300
                String capStr = parts[4].replaceAll("[^0-9]", "");
                if (capStr.isEmpty()) continue;
                int capacity = Integer.parseInt(capStr);

                boolean isInter = airports[originId].getContinent() != airports[destId].getContinent();
                int flightId = flights.size();

                Flight flight = new Flight(flightId, originId, destId, capacity,
                    depMinute, arrMinute, isInter);
                flights.add(flight);
            } catch (NumberFormatException e) {
                // Línea malformada, ignorar
            }
        }

        Flight[] result = flights.toArray(new Flight[0]);
        System.out.printf("[DataLoader] Cargados %d vuelos%n", result.length);
        return result;
    }

    /**
     * Genera Super-Lotes de prueba a partir de un conjunto de envíos sintéticos.
     *
     * @param airports  Aeropuertos disponibles.
     * @param count     Cantidad de Super-Lotes a generar.
     * @return          Lista de Super-Lotes.
     */
    public static List<SuperLot> generateTestSuperLots(Airport[] airports, int count) {
        List<SuperLot> lots = new ArrayList<>();
        if (airports.length == 0) {
            System.out.println("[DataLoader] ADVERTENCIA: No hay aeropuertos para generar Super-Lotes.");
            return lots;
        }

        Random random = new Random(42); // Semilla fija para reproducibilidad

        for (int i = 0; i < count; i++) {
            int originId = random.nextInt(airports.length);
            int destId;
            do {
                destId = random.nextInt(airports.length);
            } while (destId == originId);

            boolean isInter = airports[originId].getContinent() != airports[destId].getContinent();
            int bagCount = 10 + random.nextInt(50); // 10-59 maletas por lote
            long slaDeadline = System.currentTimeMillis()
                + (isInter ? 48L : 24L) * 3600 * 1000; // 1 o 2 días

            SuperLot lot = new SuperLot(i, originId, destId, bagCount, slaDeadline, isInter);
            lot.setPriority(random.nextInt(10)); // 0-9
            lots.add(lot);
        }

        System.out.printf("[DataLoader] Generados %d Super-Lotes de prueba%n", lots.size());
        return lots;
    }

    // ──────── Utilidades ────────

    /** Parsea "HH:MM" a minutos desde 00:00. */
    private static int parseTime(String time) {
        String clean = time.replaceAll("[^0-9:]", "").trim();
        String[] parts = clean.split(":");
        if (parts.length < 2) return 0;
        int hours = Integer.parseInt(parts[0]);
        int minutes = Integer.parseInt(parts[1]);
        return hours * 60 + minutes;
    }

    /** Lee todos los bytes de un archivo. */
    private static byte[] readAllBytes(String filePath) throws IOException {
        File file = new File(filePath);
        byte[] bytes = new byte[(int) file.length()];
        try (FileInputStream fis = new FileInputStream(file)) {
            int read = 0;
            while (read < bytes.length) {
                int r = fis.read(bytes, read, bytes.length - read);
                if (r < 0) break;
                read += r;
            }
        }
        return bytes;
    }

    /** Obtiene el mapeo ICAO -> ID para uso externo. */
    public static Map<String, Integer> buildIcaoMap(Airport[] airports) {
        Map<String, Integer> map = new HashMap<>();
        for (Airport a : airports) {
            map.put(a.getIcaoCode(), a.getId());
        }
        return map;
    }
}
