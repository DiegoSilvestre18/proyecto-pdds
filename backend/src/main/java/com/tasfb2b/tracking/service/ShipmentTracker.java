package com.tasfb2b.tracking.service;

import com.tasfb2b.tracking.domain.ShipmentState;
import com.tasfb2b.tracking.domain.ShipmentStatus;
import com.tasfb2b.planificador.domain.Event;


import java.util.*;
import java.util.concurrent.ConcurrentHashMap;



public class ShipmentTracker {

    // estado global de envíos
    private final Map<String, ShipmentState> bags = new ConcurrentHashMap<>();

    // índice: vuelo -> envíos
    private final Map<Long, Set<String>> byFlight = new ConcurrentHashMap<>();

    // índice: aeropuerto -> envíos
    private final Map<String, Set<String>> byAirport = new ConcurrentHashMap<>();

    private final Map<String, Set<String>> byShipmentCode = new ConcurrentHashMap<>();


    private ShipmentState getOrCreate(String bagId) {
        return bags.computeIfAbsent(bagId, id -> {
            ShipmentState s = new ShipmentState(id);
            byShipmentCode.computeIfAbsent(s.getShipmentCode(), k -> ConcurrentHashMap.newKeySet()).add(id);
            return s;
        });
    }

    public ShipmentState getBag(String bagId) {
        return bags.get(bagId);
    }

    /** Todas las maletas de un código de envío completo. */
    public List<ShipmentState> getByShipment(String codigoPedido) {
        return byShipmentCode.getOrDefault(codigoPedido, Set.of())
                .stream().map(bags::get).filter(Objects::nonNull).toList();
    }

    public Collection<ShipmentState> getAll() {
        return bags.values();
    }

    public List<ShipmentState> getByFlight(Long flightId) {
        return byFlight.getOrDefault(flightId, Set.of())
                .stream().map(bags::get).filter(Objects::nonNull).toList();
    }

    public List<ShipmentState> getByAirport(String icao) {
        return byAirport.getOrDefault(icao, Set.of())
                .stream().map(bags::get).filter(Objects::nonNull).toList();
    }

    public void observe(Event event) {
        switch (event.getType()) {
            case LOT_ARRIVAL -> handleLotArrival(event);
            case FLIGHT_DEPARTURE -> handleDeparture(event);
            case FLIGHT_ARRIVAL -> handleArrival(event);
            case BAGGAGE_PICKUP -> handlePickup(event);
            default -> {}
        }
    }

    private void handleDeparture(Event event) {
        Long flightId = event.getVuelo().getId();
        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);
            removeFromAirportIndex(bagId, s.getAeropuertoActual());

            s.setEstado(ShipmentStatus.EN_VUELO);
            s.setVueloActual(flightId);
            s.setAeropuertoActual(null);

            byFlight.computeIfAbsent(flightId, k -> ConcurrentHashMap.newKeySet()).add(bagId);
        }
    }

    private void handleArrival(Event event) {
        Long flightId = event.getVuelo().getId();
        String icao = event.getVuelo().getDestino().getIcaoCode();

        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);

            s.setEstado(ShipmentStatus.EN_ALMACEN_DESTINO);
            s.setAeropuertoActual(icao);
            s.setVueloActual(null);

            Set<String> set = byFlight.get(flightId);
            if (set != null) {
                set.remove(bagId);
                if (set.isEmpty()) byFlight.remove(flightId);
            }

            byAirport.computeIfAbsent(icao, k -> ConcurrentHashMap.newKeySet()).add(bagId);
        }
    }

    private void handlePickup(Event event) {
        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);
            removeFromAirportIndex(bagId, s.getAeropuertoActual());

            s.setEstado(ShipmentStatus.ENTREGADO);
            s.setAeropuertoActual(null);
            s.setVueloActual(null);
        }
    }

    private void handleLotArrival(Event event) {
        String icao = event.getVuelo().getOrigen().getIcaoCode();

        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);

            s.setEstado(ShipmentStatus.EN_ALMACEN_ORIGEN);
            s.setAeropuertoActual(icao);

            Long oldFlight = s.getVueloActual();
            if (oldFlight != null) {
                Set<String> set = byFlight.get(oldFlight);
                if (set != null) set.remove(bagId);
            }
            s.setVueloActual(null);

            byAirport.computeIfAbsent(icao, k -> ConcurrentHashMap.newKeySet()).add(bagId);
        }
    }

    private void removeFromAirportIndex(String bagId, String icao) {
        if (icao == null) return;
        Set<String> set = byAirport.get(icao);
        if (set != null) set.remove(bagId);
    }
}