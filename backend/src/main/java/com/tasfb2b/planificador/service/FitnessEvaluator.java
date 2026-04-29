package com.tasfb2b.planificador.service;

import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.planificador.simulation.SimulationState;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class FitnessEvaluator {

    public double evaluate(List<Route> routes,
                           SimulationState state) {

        double score = 0;

        int atendidos = 0;

        for (Route r : routes) {

            if (r.isAtendido()) {
                score += 10;
                atendidos++;
            }

            score -= r.getDelayHoras() * 2;

            if (r.isNoAtendido()) {
                score -= 15;
            }
        }

        // penalización por saturación real
        score -= state.getSaturacionAeropuerto() * 12;

        // estabilidad del sistema
        score += routes.isEmpty()
                ? 0
                : (atendidos / (double) routes.size()) * 5;

        return score;
    }
}