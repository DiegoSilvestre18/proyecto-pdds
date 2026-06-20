package com.tasfb2b.planificador.service;

/*
 * Sistema TASF.B2B — Motor de Optimización Logística
 * Grupo 4D — Curso de Proyecto de Diseño de Software
 * Autores: Jim Navarrete, Diego Silvestre, Jose Avalos, Mathias Medina
 * Fecha: Mayo 2026
 */

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
import com.tasfb2b.planificador.domain.CollapseEndCondition;
import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.planificador.domain.SimulationDayReport;
import com.tasfb2b.planificador.domain.Solution;
import com.tasfb2b.planificador.simulation.SimulationRunner;
import com.tasfb2b.planificador.simulation.SimulationState;
import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.superlote.service.SuperLotService;
import com.tasfb2b.envio.service.EnvioService;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.vuelo.repository.VueloRepository;
import com.tasfb2b.planificador.strategy.NetworkAdapter;
import com.tasfb2b.bloqueo.service.BloqueoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Servicio de simulación multi-día con ejecución asíncrona y micro-batching.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SimulationService {

        private final SimulationRunner simulator;
        private final com.tasfb2b.planificador.simulation.EventEngine eventEngine;
        private final ALNSPlannerService alnsPlanner;
        private final AeropuertoRepository airportRepo;
        private final VueloRepository vueloRepo;
        private final SuperLotService superLotService;
        private final SimulationProgressHolder progressHolder;
        private final EnvioService envioService;
        private final SimulationWsPublisher wsPublisher;
        private final CollapseHelper collapseHelper;
        private final NetworkAdapter networkAdapter;
        private final BloqueoService bloqueoService;

        @Value("${tasf.data.path}")
        private String dataPath;

        @Value("${tasf.sim.playback.targetMinutes:60}")
        private int playbackTargetMinutes;

        private static final LocalDate DEFAULT_START_DATE = LocalDate.of(2026, 1, 2);

        @Async("simulationExecutor")
        public void runAsync(String sessionId, int dias, String algorithm, LocalDate startDate, int playbackMinutes, String preCancelledFlightIds, String startTime, int saMinutes, int planningHorizon, boolean isRealTime) {
                SimulationProgressHolder.SimulationSessionState session = progressHolder.get(sessionId);
                if (session == null) return;
                
                LocalDate fechaInicio = (startDate != null) ? startDate : DEFAULT_START_DATE;

                try {
                        long startEpochMs = fechaInicio.atStartOfDay()
                                .toInstant(ZoneOffset.UTC).toEpochMilli();
                        session.setStartEpoch(startEpochMs);

                        List<SimulationDayReport> reports = runFullSimulation(
                                dias, session, algorithm, fechaInicio, playbackMinutes, preCancelledFlightIds, startTime, saMinutes, planningHorizon, isRealTime);
                        session.getReports().addAll(reports);

                        int totalAttended = reports.stream().mapToInt(SimulationDayReport::getMalatetasAtendidas).sum();
                        int totalDemand   = reports.stream().mapToInt(SimulationDayReport::getTotalMaletas).sum();
                        int totalMissed   = totalDemand - totalAttended;
                        double slaFinal   = totalDemand == 0 ? 0 : (totalAttended * 100.0) / totalDemand;

                        session.setTotalAttended(totalAttended);
                        session.setTotalMissed(totalMissed);
                        session.setSlaFinal(slaFinal);
                        session.setSlaPercent(slaFinal);

                        Map<String, Object> metrics = new HashMap<>();
                        metrics.put("deliveredOnTime",  totalAttended);
                        metrics.put("totalDeliveries",  totalDemand);
                        metrics.put("slaPercent",        slaFinal);
                        metrics.put("avgRouteLength",    Math.round(session.getAvgRouteLength() * 10.0) / 10.0);
                        metrics.put("replanifications",  session.getRescuedFlights());
                        metrics.put("execTime",          "Completado");
                        metrics.put("rescuedFlights",    session.getRescuedFlights());

                        progressHolder.saveAlgorithmResult("ALNS", metrics);
                        progressHolder.markDone(sessionId);
                        wsPublisher.pushImmediate(sessionId, session);

                } catch (Exception ex) {
                        log.error("Simulation failed", ex);
                        progressHolder.markFailed(sessionId, ex.getMessage());
                        wsPublisher.pushImmediate(sessionId, session);
                }
        }

        public record PreCancellation(Long flightId, Integer day) {}

        private List<SimulationDayReport> runFullSimulation(
                        int dias,
                        SimulationProgressHolder.SimulationSessionState session,
                        String algorithm,
                        LocalDate fechaInicio,
                        int playbackMinutes,
                        String preCancelledFlightIds,
                        String startTimeStr,
                        int saMinutes,
                        int planningHorizon,
                        boolean isRealTime) {

                List<PreCancellation> preCancellations = new ArrayList<>();
                if (preCancelledFlightIds != null && !preCancelledFlightIds.isBlank()) {
                        for (String entry : preCancelledFlightIds.split(",")) {
                                try {
                                        entry = entry.trim();
                                        if (entry.contains(":")) {
                                                String[] parts = entry.split(":");
                                                Long fId = Long.parseLong(parts[0].trim());
                                                String dayPart = parts[1].trim();
                                                Integer dNum = null;
                                                if (!"all".equalsIgnoreCase(dayPart)) {
                                                        dNum = Integer.parseInt(dayPart);
                                                }
                                                preCancellations.add(new PreCancellation(fId, dNum));
                                        } else {
                                                Long fId = Long.parseLong(entry);
                                                preCancellations.add(new PreCancellation(fId, null));
                                        }
                                } catch (Exception ignored) {}
                        }
                }

                restaurarVuelosEnBD();

                Map<String, Aeropuerto> airportMap = airportRepo.findAll().stream()
                                .collect(Collectors.toMap(Aeropuerto::getIcaoCode, a -> a));

                int initHour = 0;
                int initMin = 0;
                if (startTimeStr != null && startTimeStr.contains(":")) {
                    try {
                        String[] parts = startTimeStr.split(":");
                        initHour = Integer.parseInt(parts[0].trim());
                        initMin = Integer.parseInt(parts[1].trim());
                    } catch (Exception ignored) {}
                }
                long startTime = fechaInicio.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli();
                long initialDisplayTime = startTime + (initHour * 3600_000L) + (initMin * 60_000L);

                if (startTimeStr != null && !startTimeStr.isBlank()) {
                        session.setStatus(SimulationProgressHolder.Status.RECONSTRUCTING);
                }

                List<Vuelo> todosLosVuelos = vueloRepo.findAllWithAirports();
                updateProgress(session, 1, dias, 0, "Inicializando...", 100.0,
                        new SimulationState(new ArrayList<>(airportMap.values()), new ArrayList<>(), initialDisplayTime, bloqueoService),
                        airportMap, new ArrayList<>(), initialDisplayTime, startTime, algorithm, null, new ArrayList<>(), todosLosVuelos, null, false);

                wsPublisher.pushImmediate(session.getSessionId(), session);

                List<SimulationDayReport> history = new ArrayList<>();
                List<Route> inTransitRoutes = new ArrayList<>();
                Map<Integer, SuperLot> planifiablePool = new ConcurrentHashMap<>();

                SimulationState globalState = new SimulationState(
                        new ArrayList<>(airportMap.values()),
                        todosLosVuelos,
                        startTime,
                        bloqueoService
                );
                
                PriorityQueue<com.tasfb2b.planificador.domain.Event> globalEventQueue = 
                        new PriorityQueue<>(Comparator.comparingLong(com.tasfb2b.planificador.domain.Event::getTime));

                long totalFlightLegs = 0;
                long totalRoutesWithFlights = 0;
                Set<Long> processedCancelledFlightIds = new HashSet<>();

                int day = 0;
                while (day < dias) {
                        LocalDate fechaDia = fechaInicio.plusDays(day);
                        long dayStartEpochMs = fechaDia.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();

                        if (day > 0) {
                                restaurarVuelosEnBD();
                                processedCancelledFlightIds.clear();
                        }

                        final int currentDayNum = day + 1;
                        List<Long> currentDayCancellations = preCancellations.stream()
                                        .filter(pc -> pc.day() == null || pc.day() == currentDayNum)
                                        .map(PreCancellation::flightId)
                                        .toList();

                        if (!currentDayCancellations.isEmpty()) {
                                List<Vuelo> preCancelados = vueloRepo.findAllByIdWithAirports(currentDayCancellations);
                                preCancelados.forEach(v -> v.setCancelled(true));
                                vueloRepo.saveAll(preCancelados);
                                networkAdapter.invalidateGraph();
                        }

                        if(!isRealTime) {
                                envioService.cargarPorDia(fechaDia, dataPath);
                        }

                        int malatetasAtendidasDia = 0;
                        int totalMaletasDia = planifiablePool.values().stream().mapToInt(SuperLot::getTotalMaletas).sum();
                        Set<String> countedArrivalLotKeysToday = new HashSet<>();
                        Set<String> countedAssignedLotKeysToday = new HashSet<>();
                        int maletasEntregadasAlEmpezarDia = globalState.getMaletasEntregadas();
                        
                        long targetEpoch = dayStartEpochMs;
                        if (day == 0 && startTimeStr != null && startTimeStr.contains(":")) {
                                try {
                                        String[] parts = startTimeStr.split(":");
                                        int h = Integer.parseInt(parts[0].trim());
                                        int m = Integer.parseInt(parts[1].trim());
                                        targetEpoch = dayStartEpochMs + (h * 3600_000L) + (m * 60_000L);
                                } catch (Exception ignored) {}
                        }

                        int currentSimMinuteOfDay = 0;
                        List<Route> masterPlan = new ArrayList<>();

                        while (currentSimMinuteOfDay < 1440) {
                                int currentSa = isRealTime ? 1 : saMinutes;
                                if (currentSimMinuteOfDay + currentSa > 1440) currentSa = 1440 - currentSimMinuteOfDay;
                                session.setCurrentSaMinutes(currentSa);

                                long currentSimTime = dayStartEpochMs + ((long) currentSimMinuteOfDay * 60_000L);

                                java.time.ZonedDateTime zdt = java.time.Instant.ofEpochMilli(currentSimTime).atZone(java.time.ZoneId.systemDefault());
                                String simulatedTimeStr = String.format("Día %d - %02d:%02d", day + 1, zdt.getHour(), zdt.getMinute());

                                // Cancelaciones manuales
                                List<Vuelo> canceladosDb = vueloRepo.findByCancelledTrue();
                                for (Vuelo vf : canceladosDb) {
                                        if (processedCancelledFlightIds.add(vf.getId())) {
                                                List<Route> afectadas = inTransitRoutes.stream()
                                                        .filter(r -> r.getArrivalTime() > currentSimTime && !"cancelled".equals(r.getStatus()))
                                                        .filter(r -> r.getFlights().stream().anyMatch(f -> f.getId().equals(vf.getId())))
                                                        .toList();
                                                for (Route r : afectadas) {
                                                        r.setStatus("cancelled");
                                                        SuperLot replanLot = elevateToMaxPriority(r.getLot(), currentSimTime);
                                                        replanLot.setTotalMaletas(r.getCapacidadAsignada());
                                                        r.setCapacidadAsignada(0);
                                                        planifiablePool.put(replanLot.getId(), replanLot);
                                                }
                                        }
                                }

                                List<SuperLot> nuevosEnHorizonte = superLotService.agruparEnviosPorVentana(currentSimTime, currentSimTime + ((long)planningHorizon * 60_000L));
                                for (SuperLot lot : nuevosEnHorizonte) {
                                    planifiablePool.put(lot.getId(), lot);
                                    if (countedArrivalLotKeysToday.add(lot.getKey())) totalMaletasDia += lot.getTotalMaletas();
                                }

                                long tPlanStart = System.currentTimeMillis();
                                Solution sol = alnsPlanner.plan(superLotService.mergeLots(new ArrayList<>(planifiablePool.values())), 3000L, 
                                                globalState.getCapacidadVuelo(), globalState.getCargaAeropuerto(), currentSimTime);
                                session.setLastTaMs(System.currentTimeMillis() - tPlanStart);
                                masterPlan = sol.getRoutes();
                                session.setCurrentPlanId(sol.getPlanId());

                                for (Route r : sol.getRoutes()) {
                                    if (r.isAtendido() && countedAssignedLotKeysToday.add(r.getLot().getKey())) malatetasAtendidasDia += r.getCapacidadAsignada();
                                    if (r.isAtendido() && !r.getFlights().isEmpty() && r.getDepartureTime() <= currentSimTime) planifiablePool.remove(r.getLot().getId());
                                }

                                globalEventQueue.removeIf(e -> e.getTime() > currentSimTime);
                                globalEventQueue.addAll(eventEngine.buildEvents(sol.getRoutes(), dayStartEpochMs));
                                
                                inTransitRoutes.addAll(sol.getRoutes().stream().filter(r -> r.getCapacidadAsignada() > 0).collect(Collectors.toList()));
                                inTransitRoutes = inTransitRoutes.stream().collect(Collectors.toMap(r -> r.getLot().getId(), r -> r, (a, b) -> b)).values()
                                                .stream().filter(r -> r.getArrivalTime() > currentSimTime).collect(Collectors.toList());

                                double slaPercent = totalMaletasDia == 0 ? 0 : (malatetasAtendidasDia * 100.0) / totalMaletasDia;

                                int microSteps = isRealTime ? currentSa * 60 : currentSa; 
                                long stepDurationMs = isRealTime ? 1000L : 60_000L;
                                long sleepPerCycleMsDynamic = computeSleepPerCycleMs(dias, playbackMinutes, 1440 / currentSa, isRealTime, currentSa);
                                long sleepPerMicroStep = (sleepPerCycleMsDynamic / microSteps) / session.getSpeedFactor();

                                for (int step = 0; step < microSteps; step++) {
                                        long tMicroStart = System.nanoTime();
                                        long microEnd = currentSimTime + ((step + 1) * stepDurationMs);
                                        while (!globalEventQueue.isEmpty() && globalEventQueue.peek().getTime() <= microEnd) globalState.apply(globalEventQueue.poll(), airportMap);

                                        int mPercent = (int) ((((day * 1440.0) + currentSimMinuteOfDay + step) / (dias * 1440.0)) * 100);
                                        if (microEnd >= targetEpoch) {
                                                updateProgress(session, day + 1, dias, mPercent, simulatedTimeStr, slaPercent, globalState, airportMap, inTransitRoutes, microEnd, startTime, algorithm, session.getCurrentPlanId(), masterPlan, todosLosVuelos, planifiablePool, isRealTime);
                                        }

                                        long workTimeMs = (System.nanoTime() - tMicroStart) / 1_000_000;
                                        long adjustedSleep = Math.max(0, sleepPerMicroStep - workTimeMs);
                                        if (microEnd >= targetEpoch && adjustedSleep > 0) try { Thread.sleep(adjustedSleep); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                                }
                                currentSimMinuteOfDay += currentSa;
                        }

                        SimulationDayReport report = new SimulationDayReport();
                        report.setDayIndex(day);
                        report.setSlaPercent(totalMaletasDia == 0 ? 0 : (malatetasAtendidasDia * 100.0) / totalMaletasDia);
                        report.setTotalMaletas(totalMaletasDia);
                        report.setMalatetasAtendidas(malatetasAtendidasDia);
                        report.setMaletasEntregadas(globalState.getMaletasEntregadas() - maletasEntregadasAlEmpezarDia);
                        history.add(report);
                        day++;
                }
                return history;
        }

        private SuperLot elevateToMaxPriority(SuperLot lot, long currentTime) {
                return new SuperLot(lot.getId(), lot.getOrigenIcao(), lot.getDestinoIcao(), lot.getTotalMaletas(), currentTime + 86400000L, lot.getSla(), lot.isIntercontinental(), Integer.MAX_VALUE);
        }

        private void updateProgress(SimulationProgressHolder.SimulationSessionState session, int completedDays, int totalDays, int currentPercent, String simulatedTime, double slaPercent, SimulationState state, Map<String, Aeropuerto> airportMap, List<Route> activeRoutesList, long currentSimTime, long baseTime, String algorithm, String planId, List<Route> masterPlan, List<Vuelo> todosLosVuelos, Map<Integer, SuperLot> planifiablePool, boolean isRealTime) {
                session.setCurrentDay(completedDays);
                session.setPercent(currentPercent);
                session.setSimulatedTime(simulatedTime);
                session.setSlaPercent(slaPercent);
                session.setCurrentEpochTime(currentSimTime);

                Map<String, Integer> airportBags = new HashMap<>();
                if (isRealTime && planifiablePool != null) {
                        for (SuperLot lot : planifiablePool.values()) {
                                airportBags.put(lot.getOrigenIcao(), airportBags.getOrDefault(lot.getOrigenIcao(), 0) + lot.getTotalMaletas());
                        }
                }

                Map<String, Map<String, Object>> loads = new HashMap<>();
                int totalWaitingBags = 0;
                for (String icao : airportMap.keySet()) {
                    Map<String, Object> data = new HashMap<>();
                    int bags = isRealTime ? airportBags.getOrDefault(icao, 0) : state.getLoadAt(icao);
                    totalWaitingBags += bags;
                    Aeropuerto ap = airportMap.get(icao);
                    double occ = ap.getStorageCapacity() > 0 ? (bags * 100.0) / ap.getStorageCapacity() : 0;
                    data.put("bags", bags);
                    data.put("occupancy", occ);
                    loads.put(icao, data);
                }
                session.setAirportLoads(loads);

                Map<String, Map<String, Object>> vuelosFisicos = new HashMap<>();
                long currentDayStartEpoch = session.getStartEpoch() + ((long) (completedDays - 1) * 86400000L);
                
                // 1. Capa Base: Todos los vuelos del catálogo que deberían estar en el aire
                for (Vuelo v : todosLosVuelos) {
                        long dep = v.getDepartureEpoch(currentDayStartEpoch);
                        long arr = v.getArrivalEpoch(currentDayStartEpoch);
                        if (currentSimTime >= dep && currentSimTime < arr) {
                                vuelosFisicos.put(v.getId() + "-" + dep, createAvionMap(v, dep, arr, currentSimTime, "normal"));
                        }
                        // Cruce de medianoche (Vuelo que despegó ayer pero aterriza hoy)
                        long prevDep = v.getDepartureEpoch(currentDayStartEpoch - 86400000L);
                        long prevArr = v.getArrivalEpoch(currentDayStartEpoch - 86400000L);
                        if (currentSimTime >= prevDep && currentSimTime < prevArr) {
                                vuelosFisicos.put(v.getId() + "-" + prevDep, createAvionMap(v, prevDep, prevArr, currentSimTime, "normal"));
                        }
                }

                // 2. Capa de Carga: Superponer ocupación real sobre los vuelos base (Deduplicación Estricta)
                for (Route r : activeRoutesList) {
                        if (r.getFlights() == null) continue;
                        for (Vuelo v : r.getFlights()) {
                                // Buscamos en las dos ventanas posibles (Hoy o Ayer) para encontrar el avión físico
                                long d = v.getDepartureEpoch(currentDayStartEpoch);
                                long a = v.getArrivalEpoch(currentDayStartEpoch);
                                String key = v.getId() + "-" + d;
                                
                                if (!(currentSimTime >= d && currentSimTime < a)) {
                                    // Probamos ventana de ayer
                                    d = v.getDepartureEpoch(currentDayStartEpoch - 86400000L);
                                    a = v.getArrivalEpoch(currentDayStartEpoch - 86400000L);
                                    key = v.getId() + "-" + d;
                                }

                                if (currentSimTime >= d && currentSimTime < a) {
                                        Map<String, Object> existing = vuelosFisicos.get(key);
                                        if (existing == null) {
                                            // Caso borde: El vuelo no estaba en el catálogo, lo inyectamos
                                            existing = createAvionMap(v, d, a, currentSimTime, r.getStatus());
                                            vuelosFisicos.put(key, existing);
                                        }
                                        existing.put("ocupacionReal", (int)existing.get("ocupacionReal") + r.getCapacidadAsignada());
                                        if (isHigherPriority(r.getStatus(), (String)existing.get("status"))) {
                                            existing.put("status", r.getStatus());
                                        }
                                }
                        }
                }

                long totalCap = 0, totalCarga = 0;
                for (Map<String, Object> a : vuelosFisicos.values()) {
                        int oc = (int) a.get("ocupacionReal"), mx = (int) a.get("capacidadMax");
                        totalCarga += oc; totalCap += mx;
                        a.put("capacityPercent", (oc * 100.0) / Math.max(1, mx));
                }

                // Ordenamiento de salida: Priorizar vuelos con carga para que sobrevivan al límite visual
                List<Map<String, Object>> active = vuelosFisicos.values().stream()
                        .sorted((a, b) -> {
                            int ocA = (int) a.get("ocupacionReal");
                            int ocB = (int) b.get("ocupacionReal");
                            if (ocA != ocB) return Integer.compare(ocB, ocA); // Más cargados primero
                            return ((String)a.get("status")).compareTo((String)b.get("status")); // Luego por criticidad
                        })
                        .collect(Collectors.toList());

                double fleetOcc = totalCap == 0 ? 0 : (totalCarga * 100.0) / totalCap;
                session.setActiveRoutes(active);
                session.setWsFrame(new SimulationProgressHolder.WsFrame(session.getSessionId(), session.getStatus().name(), currentSimTime, simulatedTime, currentPercent, completedDays, totalDays, slaPercent, (int)loads.values().stream().filter(d -> (double)d.get("occupancy") >= 90).count(), loads, totalWaitingBags, session.isCollapseMode(), session.getRescuedFlights(), session.getErrorMessage(), session.getStartEpoch(), active, algorithm, session.getLastTaMs(), session.getCurrentSaMinutes(), planId, new ArrayList<>(), fleetOcc));
        }

        private Map<String, Object> createAvionMap(Vuelo v, long dep, long arr, long now, String status) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", "vuelo-" + v.getId() + "-" + dep);
                m.put("from", v.getOrigen().getIcaoCode());
                m.put("to", v.getDestino().getIcaoCode());
                m.put("progress", computeFlightProgress(now, dep, arr));
                m.put("status", status);
                m.put("departureTime", dep);
                m.put("arrivalTime", arr);
                m.put("ocupacionReal", 0);
                m.put("capacidadMax", v.getCapacidadTotal());
                return m;
        }

        private boolean isHigherPriority(String n, String c) {
                Map<String, Integer> p = Map.of("critical", 3, "rescued", 2, "cancelled", 1, "normal", 0);
                return p.getOrDefault(n, 0) > p.getOrDefault(c, 0);
        }

        private long computeSleepPerCycleMs(int d, int p, int c, boolean r, int s) {
                return r ? s * 60000L : Math.max(100L, (long) p * 60000L / ((long) d * c));
        }

        private double computeFlightProgress(long c, long d, long a) {
                return (d <= 0 || a <= 0 || a <= d) ? 0.0 : Math.max(0.0, Math.min(1.0, (c - d) / (double) (a - d)));
        }

        private void restaurarVuelosEnBD() {
                try {
                        List<Vuelo> c = vueloRepo.findByCancelledTrue();
                        if (!c.isEmpty()) { c.forEach(v -> v.setCancelled(false)); vueloRepo.saveAll(c); networkAdapter.invalidateGraph(); }
                } catch (Exception e) { log.warn("Error restaurando vuelos: {}", e.getMessage()); }
        }
}
