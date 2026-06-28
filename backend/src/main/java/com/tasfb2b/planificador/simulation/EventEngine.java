package com.tasfb2b.planificador.simulation;

import com.tasfb2b.planificador.domain.Event;
import com.tasfb2b.planificador.domain.EventType;
import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.bloqueo.service.BloqueoService;
import org.springframework.stereotype.Component;
import com.tasfb2b.superlote.domain.SuperLot;

import java.time.Instant;
import java.util.*;

/**
 * Motor de eventos separado del SimulationRunner.
 *
 * <p>Genera la secuencia cronológica completa de eventos para un conjunto
 * de rutas dentro de un período simulado. Incluye:
 * <ul>
 *   <li>{@code LOT_ARRIVAL} — llegada del lote al aeropuerto de origen</li>
 *   <li>{@code FLIGHT_DEPARTURE} — despegue con carga</li>
 *   <li>{@code FLIGHT_ARRIVAL} — aterrizaje en cada escala/destino</li>
 *   <li>{@code STORAGE_RELEASE} — liberación del almacén tras 24h de permanencia</li>
 *   <li>{@code BAGGAGE_PICKUP} — el cliente recoge sus maletas</li>
 * </ul>
 */
@Component
public class EventEngine {

    private final BloqueoService bloqueoService;

    public EventEngine(BloqueoService bloqueoService) {
        this.bloqueoService = bloqueoService;
    }

    /**
     * Construye todos los eventos de simulación para las rutas dadas.
     *
     * @param routes           rutas planificadas con vuelos asignados
     * @param dayStartEpochMs  epoch del inicio del período (para referencia temporal)
     * @return lista de eventos ordenada cronológicamente
     */
    public List<Event> buildEvents(List<Route> routes, long dayStartEpochMs) {

        List<Event> events = new ArrayList<>();

        for (Route r : routes) {

            List<Vuelo> flights = r.getFlights();

            // Rutas sin vuelos asignados no generan eventos de movimiento
            if (flights == null || flights.isEmpty()) continue;

            int load = r.getCapacidadAsignada();
            List<String> bagIds = r.getBagIds() != null ? r.getBagIds() : List.of();

            // ── LLEGADA DEL LOTE AL ORIGEN ──
            events.add(new Event(
                    r.getLot().getReadyTime(),
                    EventType.LOT_ARRIVAL,
                    r.getLot(),
                    flights.get(0), // vuelo de referencia para ICAO destino, origen
                    load,
                    bagIds,
                    null
            ));

            // Aseguramos secuencialidad: el próximo vuelo no puede salir antes de que aterrice el anterior o de que el lote esté listo.
            long sequenceTime = r.getLot().getReadyTime();

            for (Vuelo v : flights) {

                // departure anclado a partir del sequenceTime
                long depTime = v.calcularSiguienteSalida(sequenceTime);
                String instanceKey = v.getId() + "-" + depTime;
                events.add(new Event(
                        depTime,
                        EventType.FLIGHT_DEPARTURE,
                        r.getLot(),
                        v,
                        load,
                        bagIds,
                        instanceKey
                ));

                // llegada del vuelo
                long duration = v.getDuracionMs();
                // B09: Avería Tipo 3 - Demora de tránsito (duplica el tiempo de tránsito)
                if (bloqueoService != null && bloqueoService.tieneDemoraTransito(
                        v.getOrigen().getIcaoCode(),
                        v.getDestino().getIcaoCode(),
                        Instant.ofEpochMilli(depTime))) {
                    duration *= 2;
                }

                long arrTime = depTime + duration;
                events.add(new Event(
                        arrTime,
                        EventType.FLIGHT_ARRIVAL,
                        r.getLot(),
                        v,
                        load,
                        bagIds,
                        instanceKey
                ));
                
                // Actualizamos el sequenceTime para el siguiente tramo (si lo hay)
                sequenceTime = arrTime;
            }

            // ── PERMANENCIA (24h) ──────────────────────────────────────────────
            // Regla de Permanencia: El paquete se queda ocupando espacio
            // en el almacén de destino por exactamente 24 horas tras su llegada,
            // momento en el cual se libera y ya no figura en el almacén.
            if (load > 0 && r.getArrivalTime() > 0) {

                long arrivalTime = r.getArrivalTime();
                Vuelo lastFlight = flights.get(flights.size() - 1);

                long localReleaseTime = computeLocalReleaseTime(
                        arrivalTime,
                        lastFlight.getDestino().getGmtOffset()
                );

                events.add(new Event(
                        localReleaseTime,
                        EventType.STORAGE_RELEASE,
                        r.getLot(),
                        lastFlight,
                        load,
                        bagIds,
                        null
                ));

                // BAGGAGE_PICKUP — instante aleatorio (semilla fija) dentro de [arrivalTime, deadline]
                long deadline = r.getLot().getDeadline();
                long seed = (r.getLot().getKey() + "-" + lastFlight.getId()).hashCode();
                Random rng = new Random(seed);
                long windowMs = Math.max(1L, deadline - arrivalTime);
                long pickupTime = arrivalTime + (long) (rng.nextDouble() * windowMs);

                events.add(new Event(pickupTime, EventType.BAGGAGE_PICKUP, r.getLot(), lastFlight, load, bagIds, null));
            }
        }

        events.sort(Comparator.comparingLong(Event::getTime));
        return events;
    }

    private long computeLocalReleaseTime(long arrivalEpochMs, int gmtOffsetHours) {
        long offsetMs = gmtOffsetHours * 60L * 60 * 1000;
        long localArrival = arrivalEpochMs + offsetMs;
        long localRelease = localArrival + 24L * 60 * 60 * 1000;
        return localRelease - offsetMs;
    }

    /**
     * Genera el evento LOT_ARRIVAL para un subconjunto de maletas, de forma
     * INDEPENDIENTE de cualquier ruta o vuelo asignado. Representa que la maleta
     * ya está físicamente esperando en el almacén de origen — esto es verdad
     * desde el momento en que el envío se agrupa en un SuperLot, sin importar
     * si ALNS ya le encontró vuelo o no.
     */
    public List<Event> buildLotArrivalEvents(SuperLot lot, List<String> bagIdsSubset) {
        List<Event> events = new ArrayList<>();
        if (bagIdsSubset.isEmpty()) return events;

        events.add(new Event(
                lot.getReadyTime(),
                EventType.LOT_ARRIVAL,
                lot,
                null,                 // ya no se necesita vuelo de referencia
                bagIdsSubset.size(),
                bagIdsSubset,
                null
        ));
        return events;
    }

    /**
     * Construye la cadena de eventos para UNA ruta, usando solo el subconjunto
     * de bagIds indicado — no necesariamente todos los de la ruta.
     * Usado para programar eventos de forma incremental, evitando duplicar
     * o reescribir el historial de maletas ya programadas en ciclos anteriores.
     */
    public List<Event> buildEventsForRoute(Route r, List<String> bagIdsSubset, long dayStartEpochMs) {

        List<Event> events = new ArrayList<>();
        List<Vuelo> flights = r.getFlights();

        if (flights == null || flights.isEmpty() || bagIdsSubset.isEmpty()) return events;

        int load = bagIdsSubset.size();
        long sequenceTime = r.getLot().getReadyTime();

        for (Vuelo v : flights) {

            long depTime = v.calcularSiguienteSalida(sequenceTime);
            String instanceKey = v.getId() + "-" + depTime; //acá sacamos el nuevo id de vuelo

            events.add(new Event(depTime, EventType.FLIGHT_DEPARTURE, r.getLot(), v, load, bagIdsSubset, instanceKey));

            long duration = v.getDuracionMs();
            if (bloqueoService != null && bloqueoService.tieneDemoraTransito(
                    v.getOrigen().getIcaoCode(),
                    v.getDestino().getIcaoCode(),
                    Instant.ofEpochMilli(depTime))) {
                duration *= 2;
            }

            long arrTime = depTime + duration;
            // misma instanceKey para la llegada de ESTE mismo tramo — clave para que handleArrival
            // limpie exactamente lo que handleDeparture insertó
            events.add(new Event(arrTime, EventType.FLIGHT_ARRIVAL, r.getLot(), v, load, bagIdsSubset, instanceKey));

            sequenceTime = arrTime;
        }

        if (r.getArrivalTime() > 0) {

            long arrivalTime = r.getArrivalTime();
            Vuelo lastFlight = flights.get(flights.size() - 1);

            long localReleaseTime = computeLocalReleaseTime(arrivalTime, lastFlight.getDestino().getGmtOffset());
            events.add(new Event(localReleaseTime, EventType.STORAGE_RELEASE, r.getLot(), lastFlight, load, bagIdsSubset,null));

            long deadline = r.getLot().getDeadline();
            long seed = (r.getLot().getKey() + "-" + lastFlight.getId()).hashCode();
            Random rng = new Random(seed);
            long windowMs = Math.max(1L, deadline - arrivalTime);
            long pickupTime = arrivalTime + (long) (rng.nextDouble() * windowMs);

            events.add(new Event(pickupTime, EventType.BAGGAGE_PICKUP, r.getLot(), lastFlight, load, bagIdsSubset,null));
        }

        return events;
    }
}
