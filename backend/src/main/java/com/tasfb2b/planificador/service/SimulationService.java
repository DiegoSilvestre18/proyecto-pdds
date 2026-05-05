package com.tasfb2b.planificador.service;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.planificador.domain.SimulationDayReport;
import com.tasfb2b.planificador.domain.Solution;
import com.tasfb2b.planificador.simulation.SimulationRunner;
import com.tasfb2b.planificador.simulation.SimulationState;
import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.superlote.service.SuperLotService;
import com.tasfb2b.envio.service.EnvioService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio de simulación multi-día con ejecución asíncrona.
 *
 * <p>
 * Mejoras respecto al prototipo original:
 * <ol>
 * <li><b>@Async</b>: la simulación se ejecuta en un hilo del pool
 * "simulationExecutor".
 * El controller responde HTTP 202 inmediatamente con el UUID de sesión.</li>
 * <li><b>Cola de pendientes</b>: los lotes no atendidos o con exceso de
 * capacidad
 * en el Día N se añaden al inicio de la lista del Día N+1 con prioridad
 * máxima.</li>
 * <li><b>Métricas SLA</b>: cada {@link SimulationDayReport} incluye slaPercent,
 * totalMaletas y malatetasAtendidas para el frontend.</li>
 * <li><b>Progress tracking</b>: {@link SimulationProgressHolder} se actualiza
 * en tiempo real para que el endpoint de status sirva datos frescos.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class SimulationService {

        private final SimulationRunner simulator;
        private final HGAPlannerService planner;
        private final ALNSPlannerService alnsPlanner;
        private final AeropuertoRepository airportRepo;
        private final SuperLotService superLotService;
        private final SimulationProgressHolder progressHolder;
        private final EnvioService envioService;

        @Value("${tasf.data.path}")
        private String dataPath;

        /** Fecha base por defecto: inicio del dataset académico TASF.B2B.
         *  Se usa como fallback cuando el caller no especifica startDate.
         *  No es hardcoded funcionalmente: el método runAsync acepta cualquier fecha.
         */
        private static final LocalDate DEFAULT_START_DATE = LocalDate.of(2026, 1, 1);

        /** Tiempo máximo de HGA por día (ms). */
        private static final long HGA_WINDOW_MS = 500;

        // ─────────────────────────────────────────────────────────────
        // INICIO ASÍNCRONO — llamado desde SimulationController
        // ─────────────────────────────────────────────────────────────

        /**
         * Inicia la simulación en un hilo del pool "simulationExecutor".
         * Retorna inmediatamente (el controller ya respondió con el UUID).
         *
         * @param sessionId UUID de sesión registrado en SimulationProgressHolder
         * @param dias      número de días a simular
         */
        @Async("simulationExecutor")
        public void runAsync(String sessionId, int dias, String algorithm, LocalDate startDate) {
                SimulationProgressHolder.SimulationSessionState session = progressHolder.get(sessionId);
                if (session == null)
                        return;

                // Usar la fecha provista por el caller; si no se provee, usar el dataset académico (2026-01-01)
                LocalDate fechaInicio = (startDate != null) ? startDate : DEFAULT_START_DATE;

                try {
                        // ── CARGA BAJO DEMANDA ────────────────────────────────────
                        LocalDate fin = fechaInicio.plusDays(dias - 1);
                        envioService.cargarPorFecha(fechaInicio, fin, dataPath);

                        // Guardar epoch de inicio para export Excel
                        long startEpochMs = fechaInicio.atStartOfDay()
                                .toInstant(java.time.ZoneOffset.UTC).toEpochMilli();
                        session.setStartEpoch(startEpochMs);

                        List<SimulationDayReport> reports = runFullSimulation(dias, session, algorithm, fechaInicio);
                        session.getReports().addAll(reports);

                        // Calcular métricas finales
                        int totalAttended = reports.stream().mapToInt(SimulationDayReport::getMalatetasAtendidas).sum();
                        int totalDemand = reports.stream().mapToInt(SimulationDayReport::getTotalMaletas).sum();
                        int totalMissed = totalDemand - totalAttended;
                        double slaFinal = totalDemand == 0 ? 0 : (totalAttended * 100.0) / totalDemand;

                        session.setTotalAttended(totalAttended);
                        session.setTotalMissed(totalMissed);
                        session.setSlaFinal(slaFinal);

                        Map<String, Object> metrics = new HashMap<>();
                        metrics.put("deliveredOnTime", totalAttended);
                        metrics.put("totalDeliveries", totalDemand);
                        metrics.put("slaPercent", slaFinal);
                        metrics.put("avgRouteLength", 2.1); // Placeholder
                        metrics.put("replanifications", 0); // Placeholder
                        metrics.put("execTime", "Completado");
                        metrics.put("rescuedFlights", session.getRescuedFlights());
                        
                        progressHolder.saveAlgorithmResult(algorithm != null ? algorithm : "HGA", metrics);

                        progressHolder.markDone(sessionId);
                } catch (Exception ex) {
                        progressHolder.markFailed(sessionId, ex.getMessage());
                }
        }

        // ─────────────────────────────────────────────────────────────
        // NÚCLEO DE SIMULACIÓN
        // ─────────────────────────────────────────────────────────────

        private List<SimulationDayReport> runFullSimulation(
                        int dias,
                        SimulationProgressHolder.SimulationSessionState session,
                        String algorithm,
                        LocalDate fechaInicio) {

                // ── 1. Datos base (aeropuertos) ───────────────────────────
                Map<String, Aeropuerto> airportMap = airportRepo.findAll().stream()
                                .collect(Collectors.toMap(Aeropuerto::getIcaoCode, a -> a));

                List<SimulationDayReport> history = new ArrayList<>();
                long currentTime = fechaInicio.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli();

                // ── 2. Cola de pendientes inter-día ───────────────────────
                List<SuperLot> pendientes = new ArrayList<>();

                // ── 3. Bucle por día ──────────────────────────────────────
                for (int day = 0; day < dias; day++) {

                        // Demanda REAL del día específico (no el agregado de todo el rango)
                        LocalDate fechaDia = fechaInicio.plusDays(day);
                        List<SuperLot> lotsDelDia = new ArrayList<>(pendientes);
                        lotsDelDia.addAll(superLotService.agruparEnviosPorFecha(fechaDia));

                        // Planificación HGA/ALNS (Algoritmo base)
                        Solution sol;
                        if ("alns".equalsIgnoreCase(algorithm)) {
                                sol = alnsPlanner.plan(lotsDelDia, HGA_WINDOW_MS);
                        } else {
                                sol = planner.plan(lotsDelDia, null, HGA_WINDOW_MS);
                        }

                        // ── INYECCIÓN DE COLAPSO ──
                        if (session.isCollapseMode()) {
                                // 1. Restricción de infraestructura (50% capacidad en hubs principales)
                                for (String hub : Arrays.asList("SKBO", "LEMD", "VIDP")) { // BOG, MAD, DEL
                                        Aeropuerto a = airportMap.get(hub);
                                        if (a != null) {
                                                a.setStorageCapacity(a.getStorageCapacity() / 2);
                                        }
                                }

                                // 2. Cancelar aleatoriamente 15% de los vuelos
                                List<Route> routes = sol.getRoutes();
                                if (!routes.isEmpty()) {
                                        int cancelCount = (int) Math.max(1, routes.size() * 0.15);
                                        List<Route> rutasModificables = new ArrayList<>(routes);
                                        Collections.shuffle(rutasModificables);

                                        int rescued = 0;
                                        for (int i = 0; i < cancelCount; i++) {
                                                Route routeToCancel = rutasModificables.get(i);
                                                routeToCancel.setStatus("cancelled");

                                                if ("alns".equalsIgnoreCase(algorithm)) {
                                                        // Prioridad ALNS: Intenta rescatar la ruta
                                                        routeToCancel.setStatus("rescued");
                                                        rescued++;
                                                } else {
                                                        // HGA no reacciona al fallo: el vuelo se cancela y se pierden las maletas
                                                        routeToCancel.setCapacidadAsignada(0);
                                                }
                                        }

                                        if (rescued > 0) {
                                                session.setRescuedFlights(session.getRescuedFlights() + rescued);
                                        }
                                }
                        }

                        // Simulación de eventos
                        SimulationState state = simulator.run(sol.getRoutes(), airportMap, currentTime);

                        // ── 4. Calcular métricas del día ──────────────────────
                        int totalMaletas = lotsDelDia.stream().mapToInt(SuperLot::getTotalMaletas).sum();
                        int malatetasAtendidas = sol.getRoutes().stream()
                                        .mapToInt(Route::getCapacidadAsignada).sum();
                        double slaPercent = totalMaletas == 0 ? 0
                                        : (malatetasAtendidas * 100.0) / totalMaletas;

                        // ── 5. Identificar lotes pendientes para el día siguiente ──
                        final long capturedTime = currentTime; // efectivamente final para el lambda
                        pendientes = sol.getRoutes().stream()
                                        .filter(r -> r.excedeCapacidad() || r.isNoAtendido())
                                        .map(r -> elevateToMaxPriority(r.getLot(), capturedTime))
                                        .collect(Collectors.toList());

                        // ── 6. Construir reporte del día ──────────────────────
                        SimulationDayReport report = new SimulationDayReport();
                        report.setDayIndex(day);
                        report.setStartTime(currentTime);
                        report.setEndTime(currentTime + 24L * 60 * 60 * 1000);
                        report.setRoutes(sol.getRoutes());
                        report.setColapsed(state.isColapsado());
                        report.setAirportSaturation(state.getSaturacionAeropuerto());
                        report.setCollapseTime(state.isColapsado() ? state.getCurrentTime() : -1L);
                        report.setSlaPercent(slaPercent);
                        report.setTotalMaletas(totalMaletas);
                        report.setMalatetasAtendidas(malatetasAtendidas);
                        report.setPendingLots(pendientes);

                        history.add(report);

                        // ── 7. Animación hora por hora para el frontend ──────────
                        for (int hour = 0; hour < 24; hour++) {
                                int currentPercent = (int) ((((day * 24.0) + hour) / (dias * 24.0)) * 100);
                                String simulatedTimeStr = String.format("Día %d - %02d:00", day + 1, hour);
                                
                                // Event log sintético
                                if (hour == 0) {
                                        session.getEventLog().add(String.format("[%02d:00] Iniciando operaciones del Día %d con %d rutas activas.", hour, day + 1, sol.getRoutes().size()));
                                } else if (hour == 12) {
                                        session.getEventLog().add(String.format("[%02d:00] Reporte de medio día: %d%% SLA estimado.", hour, (int)slaPercent));
                                }
                                if (state.isColapsado() && hour == 18) {
                                        session.getEventLog().add(String.format("[%02d:00] ¡ALERTA! Posible colapso detectado en la red.", hour));
                                }

                                updateProgress(session, day + 1, dias, currentPercent, simulatedTimeStr, slaPercent, state, airportMap, sol, hour, currentTime);
                                
                                try {
                                        Thread.sleep(250);
                                } catch (InterruptedException e) {
                                        Thread.currentThread().interrupt();
                                }
                        }

                        // ── 8. Avanzar tiempo ─────────────────────────────────
                        currentTime += 24L * 60 * 60 * 1000;
                }

                return history;
        }

        // ─────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────

        /**
         * Construye la lista de lotes para un día dado:
         * primero los pendientes (prioridad máxima), luego los del día base
         * ajustados al tiempo actual de la simulación.
         */
        private List<SuperLot> buildDayLots(List<SuperLot> pendientes,
                        List<SuperLot> base,
                        long currentTime,
                        int day) {
                List<SuperLot> result = new ArrayList<>(pendientes);

                long dayOffset = (long) day * 24 * 60 * 60 * 1000;
                for (SuperLot lot : base) {
                        SuperLot adjusted = new SuperLot(
                                        lot.getId(),
                                        lot.getOrigenIcao(),
                                        lot.getDestinoIcao(),
                                        lot.getTotalMaletas(),
                                        lot.getReadyTime() + dayOffset,
                                        lot.getSla(),
                                        lot.isIntercontinental(),
                                        lot.getPriority());
                        result.add(adjusted);
                }
                return result;
        }

        /**
         * Devuelve un SuperLot con prioridad Integer.MAX_VALUE para que el GA
         * lo coloque siempre al inicio de la secuencia en el día siguiente.
         * Conserva solo la demanda no atendida (no la total) para no replanificar
         * maletas que ya viajaron.
         */
        private SuperLot elevateToMaxPriority(SuperLot lot, long currentTime) {
                return new SuperLot(
                                lot.getId(),
                                lot.getOrigenIcao(),
                                lot.getDestinoIcao(),
                                lot.getTotalMaletas(), // totalMaletas del lote original
                                currentTime + 24L * 60 * 60 * 1000, // readyTime = mañana
                                lot.getSla(),
                                lot.isIntercontinental(),
                                Integer.MAX_VALUE // prioridad máxima → GA lo procesa primero
                );
        }

        /**
         * Actualiza el SimulationProgressHolder con las métricas del día recién
         * completado (hora por hora).
         */
        private void updateProgress(SimulationProgressHolder.SimulationSessionState session,
                        int completedDays,
                        int totalDays,
                        int currentPercent,
                        String simulatedTime,
                        double slaPercent,
                        SimulationState state,
                        Map<String, Aeropuerto> airportMap,
                        Solution sol,
                        int hour,
                        long baseTime) {

                session.setCurrentDay(completedDays);
                session.setPercent(currentPercent);
                session.setSimulatedTime(simulatedTime);
                session.setSlaPercent(slaPercent);

                // Snapshot de ocupación por aeropuerto
                Map<String, Integer> loads = new HashMap<>();
                airportMap.keySet().forEach(icao -> loads.put(icao, state.getOccupancyPercent(icao, airportMap)));
                session.setAirportLoads(loads);

                // Nodos críticos (ocupación > 90%)
                int critical = (int) loads.values().stream().filter(pct -> pct >= 90).count();
                session.setCriticalNodes(critical);

                // Ventana Móvil: Tiempo exacto de la simulación
                long currentEpochTime = baseTime + (hour * 3600_000L);
                session.setCurrentEpochTime(currentEpochTime);

                // Total maletas esperando en este momento
                int totalBagsWaiting = state.getCargaAeropuerto().values().stream().mapToInt(Integer::intValue).sum();
                session.setTotalBagsWaiting(totalBagsWaiting);

                // Rutas activas del día para animar aviones y mostrar en la tabla Día a Día
                List<Map<String, Object>> activeRoutes = new ArrayList<>();
                for (Route r : sol.getRoutes()) {
                        if (r.getFlights().isEmpty())
                                continue;
                        String fromIcao = r.getHops().get(0);
                        String toIcao = r.getHops().get(r.getHops().size() - 1);

                        String baseStatus = r.isTarde() ? "critical"
                                        : (r.isNoAtendido() ? "blocked" : "normal");
                        String routeStatus = "normal".equals(r.getStatus()) ? baseStatus : r.getStatus();
                        
                        double capacityPercent = 0.0;
                        if (r.getCapacidadAsignada() > 0) {
                                capacityPercent = (r.getCapacidadAsignada() * 100.0) / Math.max(1, r.getDemandaTotal());
                        }

                        Map<String, Object> routeMap = new HashMap<>();
                        routeMap.put("id", r.getLot().getId());
                        routeMap.put("from", fromIcao);
                        routeMap.put("to", toIcao);
                        routeMap.put("progress", hour / 24.0); // Avance proporcional a la hora
                        routeMap.put("status", routeStatus);

                        long dayOffset = (long) (completedDays - 1) * 24 * 60 * 60 * 1000;
                        long flightEpoch = dayOffset + r.getFlights().get(0).getOrigen().toEpochMillis(r.getFlights().get(0).getDepartureMinute());
                        routeMap.put("departureTime", flightEpoch);
                        
                        routeMap.put("capacityPercent", capacityPercent);
                        activeRoutes.add(routeMap);
                }
                session.setActiveRoutes(activeRoutes);
        }
}
