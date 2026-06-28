package com.tasfb2b.tracking.service;

import com.tasfb2b.tracking.domain.ShipmentState;
import com.tasfb2b.tracking.domain.ShipmentStatus;
import com.tasfb2b.planificador.domain.Event;


import java.util.*;
import java.util.concurrent.ConcurrentHashMap;



public class ShipmentTracker {

    // estado global de envíos
    private final Map<String, ShipmentState> bags = new ConcurrentHashMap<>();

    //  índice: instancia de vuelo ("vueloId-departureEpoch") -> bagIds
    private final Map<String, Set<String>> byFlightInstance = new ConcurrentHashMap<>();

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

    public List<ShipmentState> getByFlightInstance(String instanceKey) {
        return byFlightInstance.getOrDefault(instanceKey, Set.of())
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
        String instanceKey = event.getFlightInstanceKey();
        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);
            removeFromAirportIndex(bagId, s.getAeropuertoActual());

            s.setEstado(ShipmentStatus.EN_VUELO);
            s.setVueloActual(event.getVuelo().getId());
            s.setVueloInstanceActual(instanceKey);
            s.setAeropuertoActual(null);

            byFlightInstance.computeIfAbsent(instanceKey, k -> ConcurrentHashMap.newKeySet()).add(bagId);
        }
    }

    private void handleArrival(Event event) {
        String instanceKey = event.getFlightInstanceKey();
        String icao = event.getVuelo().getDestino().getIcaoCode();

        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);

            s.setEstado(ShipmentStatus.EN_ALMACEN_DESTINO);
            s.setAeropuertoActual(icao);
            s.setVueloActual(null);
            s.setVueloInstanceActual(null);

            Set<String> set = byFlightInstance.get(instanceKey);
            if (set != null) {
                set.remove(bagId);
                if (set.isEmpty()) byFlightInstance.remove(instanceKey);
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
            s.setVueloInstanceActual(null);
        }
    }

    private void handleLotArrival(Event event) {
        String icao = event.getLot().getOrigenIcao();

        for (String bagId : event.getBagIds()) {
            ShipmentState s = getOrCreate(bagId);

            s.setEstado(ShipmentStatus.EN_ALMACEN_ORIGEN);
            s.setAeropuertoActual(icao);

            String oldInstanceKey = s.getVueloInstanceActual();
            if (oldInstanceKey != null) {
                Set<String> set = byFlightInstance.get(oldInstanceKey);
                if (set != null) {
                    set.remove(bagId);
                    if (set.isEmpty()) byFlightInstance.remove(oldInstanceKey);
                }
            }
            s.setVueloActual(null);
            s.setVueloInstanceActual(null);

            byAirport.computeIfAbsent(icao, k -> ConcurrentHashMap.newKeySet()).add(bagId);
        }
    }

    private void removeFromAirportIndex(String bagId, String icao) {
        if (icao == null) return;
        Set<String> set = byAirport.get(icao);
        if (set != null) set.remove(bagId);
    }
}