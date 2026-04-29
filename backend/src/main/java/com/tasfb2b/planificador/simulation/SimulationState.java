package com.tasfb2b.planificador.simulation;

import com.tasfb2b.planificador.domain.Event;
import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.vuelo.domain.Vuelo;
import lombok.Getter;

import java.util.*;

@Getter
public class SimulationState {

    private long currentTime;

    private final Map<String, Integer> cargaAeropuerto = new HashMap<>();
    private final Map<Long, Integer> capacidadVuelo = new HashMap<>();

    private int saturacionAeropuerto = 0;
    private boolean colapso = false;

    public SimulationState(List<Aeropuerto> airports,
                           List<Vuelo> vuelos,
                           long startTime) {

        this.currentTime = startTime;

        airports.forEach(a ->
                cargaAeropuerto.put(a.getIcaoCode(), 0));

        vuelos.forEach(v ->
                capacidadVuelo.put(v.getId(), v.getCapacidadTotal()));
    }

    // ─────────────────────────────────────────────
    // APLICAR EVENTO
    // ─────────────────────────────────────────────

    public void apply(Event event,
                      Map<String, Aeropuerto> airportMap) {

        currentTime = event.getTime();

        switch (event.getType()) {

            case FLIGHT_DEPARTURE -> {

                Vuelo v = event.getVuelo();
                int remaining = capacidadVuelo.getOrDefault(v.getId(), v.getCapacidadTotal());

                capacidadVuelo.put(v.getId(),
                        Math.max(0, remaining - event.getLoad()));
            }

            case FLIGHT_ARRIVAL -> {

                Vuelo v = event.getVuelo();
                String icao = v.getDestino().getIcaoCode();
                Aeropuerto ap = airportMap.get(icao);

                int current = cargaAeropuerto.getOrDefault(icao, 0);
                int updated = current + event.getLoad();

                cargaAeropuerto.put(icao, updated);

                if (updated > ap.getStorageCapacity()) {
                    saturacionAeropuerto += (updated - ap.getStorageCapacity());
                    colapso = true;
                }
            }

            case LOT_ARRIVAL -> {
                // solo informativo o activación
            }
        }
    }

    public boolean isColapsado() {
        return colapso;
    }
}