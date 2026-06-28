package com.tasfb2b.tracking.service;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

//Registro de trackers aislados por simulación según session
@Component
public class ShipmentTrackerRegistry {

    private final Map<String, ShipmentTracker> bySession = new ConcurrentHashMap<>();

    public ShipmentTracker getOrCreate(String sessionId) {
        return bySession.computeIfAbsent(sessionId, k -> new ShipmentTracker());
    }

    public ShipmentTracker get(String sessionId) {
        return bySession.get(sessionId);
    }

    public void remove(String sessionId) {
        bySession.remove(sessionId); // limpieza al terminar/expirar la sesión
    }

    public int activeSessions() {
        return bySession.size();
    }
}