package com.tasfb2b.vuelo.util;

public record ParsedVuelo(
        String origenIcao,
        String destinoIcao,
        int departureMinute,
        int arrivalMinute,
        int capacidad
) {
}
