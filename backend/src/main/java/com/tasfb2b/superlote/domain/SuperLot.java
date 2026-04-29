package com.tasfb2b.superlote.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SuperLot {

    private int id;
    private String origenIcao;
    private String destinoIcao;
    private int totalMaletas;
    private long readyTime;
    private long sla;
    private boolean intercontinental;
    private int priority;

    public long getDeadline() {
        return readyTime + sla;
    }

    public boolean isFeasibleArrival(long arrivalTime) {
        return arrivalTime <= getDeadline();
    }

    public boolean isExpired(long currentTime) {
        return currentTime > getDeadline();
    }

    public long getUrgencyScore(long currentTime) {
        return getDeadline() - currentTime;
    }

    public String getKey() {
        return origenIcao + "-" + destinoIcao + "-" + readyTime;
    }

    public void validate() {
        if (origenIcao == null || destinoIcao == null) {
            throw new IllegalArgumentException("ICAO no puede ser null");
        }
        if (totalMaletas <= 0) {
            throw new IllegalArgumentException("Maletas debe ser > 0");
        }
        if (sla <= 0) {
            throw new IllegalArgumentException("SLA inválido");
        }
    }


}