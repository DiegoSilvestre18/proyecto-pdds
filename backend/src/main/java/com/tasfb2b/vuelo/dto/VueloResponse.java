package com.tasfb2b.vuelo.dto;

public record VueloResponse(
        Long id,
        String origenIcao,
        String destinoIcao,
        Integer capacity,
        Boolean cancelled,
        Boolean reagendado,
        Integer departureMinute,
        Integer arrivalMinute
) {
    public VueloResponse(Long id, String origenIcao, String destinoIcao, Integer capacity, Boolean cancelled, Boolean reagendado) {
        this(id, origenIcao, destinoIcao, capacity, cancelled, reagendado, 0, 0);
    }
}