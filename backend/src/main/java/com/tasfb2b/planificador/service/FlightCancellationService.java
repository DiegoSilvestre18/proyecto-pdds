package com.tasfb2b.planificador.service;

import com.tasfb2b.planificador.domain.Solution;
import com.tasfb2b.vuelo.service.VueloService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio dedicado para cancelación de vuelos con replanificación ALNS.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FlightCancellationService {

    private final VueloService vueloService;
    private final ALNSPlannerService alnsPlanner;
    private final SimulationProgressHolder progressHolder;
    private final PlanningSessionHolder sessionHolder;

    /**
     * Cancela un vuelo y dispara la replanificación ALNS para rescatar rutas afectadas.
     *
     * @param vueloId   ID del vuelo a cancelar
     * @param sessionId ID de la sesión de simulación activa (puede ser null)
     */
    @Transactional
    public void cancelarVuelo(Long vueloId, String sessionId) {
        log.info("Cancelando manualmente el vuelo {}", vueloId);

        // 1. Delegamos la cancelación de datos al VueloService (DB + Invalida Grafo)
        vueloService.cancelarVuelo(vueloId);

        // 2. Orquestar la replanificación si hay sesión activa
        SimulationProgressHolder.SimulationSessionState session = null;
        if (sessionId != null) {
            session = progressHolder.get(sessionId);
        }

        if (session != null) {
            if (sessionHolder.hasSolution()) {
                try {
                    Solution replanned = alnsPlanner.replanificar(vueloId, 6_500L);
                    if (replanned != null && !replanned.getRoutes().isEmpty()) {
                        session.setRescuedFlights(session.getRescuedFlights() + 1);
                        log.info("Replanificación estática exitosa para el vuelo cancelado {}", vueloId);
                    }
                } catch (Exception e) {
                    log.warn("Fallo en replanificación ALNS para vuelo cancelado {}: {}",
                            vueloId, e.getMessage());
                }
            } else {
                log.info("Simulación activa detectada. La replanificación del vuelo {} se realizará de forma reactiva en el ciclo actual/siguiente.", vueloId);
            }
        }
    }
}
