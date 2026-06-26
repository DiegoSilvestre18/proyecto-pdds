package com.tasfb2b.tracking.web;

import com.tasfb2b.tracking.service.ShipmentTracker;
import com.tasfb2b.tracking.domain.ShipmentState;
import com.tasfb2b.tracking.service.ShipmentTrackerRegistry;

import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentTrackingController {

    private final ShipmentTrackerRegistry trackerRegistry;

    @GetMapping("/{sessionId}/bag/{bagId}")
    public ShipmentState getByBagId(@PathVariable String sessionId,@PathVariable String bagId) {
        ShipmentTracker tracker = trackerRegistry.get(sessionId);
        return tracker != null ? tracker.getBag(bagId) : null;
    }

    @GetMapping("/{sessionId}/shipment/{codigo}")
    public List<ShipmentState> getByShipment(@PathVariable String sessionId,@PathVariable String codigo) {
        ShipmentTracker tracker = trackerRegistry.get(sessionId);
        return tracker != null ? tracker.getByShipment(codigo) : List.of();
    }

    @GetMapping("/{sessionId}/flight/{flightId}")
    public List<ShipmentState> getByFlight(@PathVariable String sessionId,@PathVariable Long flightId) {
        ShipmentTracker tracker = trackerRegistry.get(sessionId);
        return tracker != null ? tracker.getByFlight(flightId) : List.of();
    }

    @GetMapping("/{sessionId}/airport/{icao}")
    public List<ShipmentState> getByAirport(@PathVariable String sessionId,@PathVariable String icao) {
        ShipmentTracker tracker = trackerRegistry.get(sessionId);
        return tracker != null ? tracker.getByAirport(icao) : List.of();
    }

    @GetMapping("/{sessionId}")
    public Collection<ShipmentState> getAll(@PathVariable String sessionId) {
        ShipmentTracker tracker = trackerRegistry.get(sessionId);
        return tracker != null ? tracker.getAll() : List.of();
    }

    @DeleteMapping("/{sessionId}")
    public void clearSession(@PathVariable String sessionId) {
        trackerRegistry.remove(sessionId);
    }
}