package com.tasfb2b.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Configuración del motor de tareas programadas de Spring.
 *
 * <p>{@code @EnableScheduling} activa el procesamiento de {@code @Scheduled}.
 * Sin esta anotación, el {@link com.tasfb2b.vuelo.service.FlightCancellationScheduler}
 * y cualquier otro scheduler del sistema simplemente no se ejecutarían.
 *
 * <p>Se mantiene en una clase dedicada (no en {@code BackendApplication}) para
 * separar correctamente las responsabilidades de configuración.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
    // Clase de configuración pura — no requiere ningún bean adicional.
}
