package com.tasfb2b.superlote.dto;

import lombok.Data;

@Data
public class SuperLotDTO {

    private String origenIcao;
    private String destinoIcao;
    private int bagCount;

    // Cuándo aparece el lote en el sistema (epoch millis)
    private long readyTime;

    //ventana máxima de atención (SLA en ms)
    private long sla;

    // si es intercontinental o no
    private boolean intercontinental;

    // prioridad de negocio
    private int priority;
}
