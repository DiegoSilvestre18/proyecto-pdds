package com.tasfb2b.vuelo.dto;

public record VueloResponse(
        Long id,
        String origenIcao,
        String destinoIcao,
        Integer capacity,
        Boolean cancelled
) {}