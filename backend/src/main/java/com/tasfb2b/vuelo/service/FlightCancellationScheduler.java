package com.tasfb2b.vuelo.service;

import com.tasfb2b.planificador.strategy.NetworkAdapter;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.vuelo.repository.VueloRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Scheduler que restaura automáticamente los vuelos cancelados al inicio de cada día.
 *
 * <p>Regla de negocio (según el caso Tasf.B2B):
 * "Una cancelación de vuelo es solo por ese día. Al día siguiente el vuelo vuelve a estar vigente."
 *
 * <p>Proceso nocturno (00:00 UTC cada día):
 * <ol>
 *   <li>Busca todos los vuelos con {@code cancelled = true}.</li>
 *   <li>Los restablece a {@code cancelled = false}.</li>
 *   <li>Invalida el grafo en memoria de {@link NetworkAdapter} para que Dijkstra
 *       vea los vuelos restaurados en la siguiente planificación.</li>
 * </ol>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FlightCancellationScheduler {

    private final VueloRepository vueloRepo;
    private final NetworkAdapter  networkAdapter;

    /**
     * Se ejecuta a las 00:00 UTC todos los días.
     * Restaura los vuelos cancelados y refresca el grafo de vuelos en memoria.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void restaurarVuelosCancelados() {

        List<Vuelo> cancelados = vueloRepo.findByCancelledTrue();

        if (cancelados.isEmpty()) {
            log.info("[Scheduler] No hay vuelos cancelados que restaurar.");
            return;
        }

        cancelados.forEach(v -> v.setCancelled(false));
        vueloRepo.saveAll(cancelados);

        // Refrescar el grafo en memoria para que la siguiente planificación
        // ya vea estos vuelos como disponibles.
        networkAdapter.invalidateGraph();

        log.info("[Scheduler] {} vuelo(s) restaurado(s) para el nuevo día.", cancelados.size());
    }
}
