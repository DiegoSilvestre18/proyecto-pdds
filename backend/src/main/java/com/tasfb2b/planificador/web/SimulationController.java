package com.tasfb2b.planificador.web;

import com.tasfb2b.planificador.domain.SimulationDayReport;
import com.tasfb2b.planificador.service.SimulationService;
import com.tasfb2b.superlote.domain.SuperLot;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/simulation")
@RequiredArgsConstructor
public class SimulationController {

    private final SimulationService service;

    @PostMapping("/run/{dias}")
    public List<SimulationDayReport> run(@PathVariable int dias) {
        return service.runFullSimulation(dias);
    }
}
