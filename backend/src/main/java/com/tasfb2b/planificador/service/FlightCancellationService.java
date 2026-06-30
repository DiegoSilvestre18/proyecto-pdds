package com.tasfb2b.planificador.service;

import com.tasfb2b.planificador.domain.Solution;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.vuelo.service.VueloService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightCancellationService {

    /** Lead time mínimo requerido para cancelar la instancia de HOY. */
    private static final long MIN_LEAD_TIME_MS = 60L * 60 * 1000;

    private final VueloService vueloService;
    private final ALNSPlannerService alnsPlanner;
    private final SimulationProgressHolder progressHolder;
    private final PlanningSessionHolder sessionHolder;

    @Transactional
    public void cancelarVuelo(Long vueloId, String sessionId) {

        SimulationProgressHolder.SimulationSessionState session = null;
        if (sessionId != null) {
            session = progressHolder.get(sessionId);
        }

        boolean diferirAManana = false;

        if (session != null
                && session.getCurrentEpochTime() != null
                && session.getStartEpoch() != null
                && session.getCurrentDay() > 0) {

            Vuelo vuelo = vueloService.obtenerVuelo(vueloId);
            long dayStartEpoch = session.getStartEpoch()
                    + ((long) (session.getCurrentDay() - 1) * 86_400_000L);
            long todayDeparture = vuelo.getDepartureEpoch(dayStartEpoch);
            long currentSimTime = session.getCurrentEpochTime();

            long leadTimeMs = todayDeparture - currentSimTime;
            // Si ya despegó hoy (negativo) o faltan menos de 1h, no se puede
            // cancelar la instancia de hoy: se difiere a la de mañana.
            diferirAManana = leadTimeMs < MIN_LEAD_TIME_MS;
        }

        if (diferirAManana) {
            session.getPendingNextDayCancellations().add(vueloId);
            log.info("Vuelo {} cancelado con menos de 1h de anticipación. " +
                    "Se difiere la cancelación a la instancia de mañana.", vueloId);
            return; // el vuelo de hoy sigue operando con normalidad
        }

        log.info("Cancelando manualmente el vuelo {}", vueloId);
        vueloService.cancelarVuelo(vueloId);

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