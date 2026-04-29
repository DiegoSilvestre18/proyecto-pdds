package com.tasfb2b.planificador.domain;

import lombok.Data;
import lombok.Getter;

import java.util.List;

@Data
@Getter
public class SimulationDayReport {

    private int dayIndex;
    private long startTime;
    private long endTime;

    private List<Route> routes;

    private boolean colapsed;
    private int airportSaturation;
    private int flightSaturation;

    private long collapseTime;

}
