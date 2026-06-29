package com.tasfb2b.tracking.web;

import com.tasfb2b.tracking.service.ShipmentTracker;
import com.tasfb2b.tracking.domain.ShipmentState;
import com.tasfb2b.tracking.service.ShipmentTrackerRegistry;
import com.tasfb2b.planificador.simulation.EventEngine;

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

    @GetMapping("/{sessionId}/flight-instance/{instanceKey}")
    public List<ShipmentState> getByFlightInstance(@PathVariable String sessionId, @PathVariable String instanceKey) {
        ShipmentTracker tracker = trackerRegistry.get(sessionId);
        List<ShipmentState> result = tracker != null ? tracker.getByFlightInstance(instanceKey) : List.of();

        if (instanceKey.startsWith(EventEngine.DEBUG_VUELO_ID + "-")) {
            System.out.println(String.format(
                    "[CONTROLLER] sessionId=%s instanceKey=%s resultados=%d",
                    sessionId, instanceKey, result.size()
            ));
        }
        return result;
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