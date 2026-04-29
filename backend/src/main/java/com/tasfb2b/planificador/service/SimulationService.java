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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SimulationService {

    private final SimulationRunner simulator;
    private final HGAPlannerService planner;
    private final AeropuertoRepository airportRepo;
    private final SuperLotService superLotService;


    private static final long SIMULATION_EPOCH_2026 =
            java.time.LocalDateTime.of(2026, 1, 1, 0, 0)
                    .toInstant(java.time.ZoneOffset.UTC)
                    .toEpochMilli();

    public List<SimulationDayReport> runFullSimulation(int dias) {

        // ─────────────────────────────
        // 1. SUPERLOTS (NO REPOSITORY)
        // ─────────────────────────────
        List<SuperLot> lots = superLotService.agruparEnvios();

        // ─────────────────────────────
        // 2. AEROPUERTOS BASE
        // ─────────────────────────────
        Map<String, Aeropuerto> airportMap  =
                airportRepo.findAll().stream()
                        .collect(Collectors.toMap(
                                Aeropuerto::getIcaoCode,
                                a -> a
                        ));

        List<SimulationDayReport> history = new ArrayList<>();

        long currentTime = SIMULATION_EPOCH_2026;

        boolean colapsed = false;

        // ─────────────────────────────
        // 3. SIMULACIÓN POR DÍAS
        // ─────────────────────────────
        for (int day = 0; day < dias && !colapsed; day++) {

            // IMPORTANTE: estado fresco por día

            // ── PLANIFICACIÓN (HGA)
            Solution sol = planner.plan(lots, null, 500);

            // ── SIMULACIÓN
            SimulationState state =
                    simulator.run(sol.getRoutes(), airportMap , currentTime);

            // ── REPORTE
            SimulationDayReport report = new SimulationDayReport();
            report.setDayIndex(day);
            report.setStartTime(currentTime);
            report.setEndTime(currentTime + 24L * 60 * 60 * 1000);

            report.setRoutes(sol.getRoutes());

            report.setColapsed(state.isColapsado());
            report.setAirportSaturation(state.getSaturacionAeropuerto());
            report.setCollapseTime(state.getCurrentTime());

            history.add(report);

            // ── AVANZAR TIEMPO
            colapsed = state.isColapsado();
            currentTime += 24L * 60 * 60 * 1000;
        }

        return history;
    }

}
