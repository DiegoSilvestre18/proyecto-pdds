package com.tasfb2b.vuelo.dto;

public record VueloResponse(
        Long id,
        String origenIcao,
        String destinoIcao,
        Integer capacity,
        Boolean cancelled,
        Integer departureMinute,
        Integer arrivalMinute
) {
    public VueloResponse(Long id, String origenIcao, String destinoIcao, Integer capacity, Boolean cancelled) {
        this(id, origenIcao, destinoIcao, capacity, cancelled, 0, 0);
    }
}