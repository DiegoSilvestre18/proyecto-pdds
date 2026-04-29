package com.tasfb2b.aeropuerto.util;


import com.tasfb2b.aeropuerto.domain.Continente;

public record ParsedAeropuerto(
        String icao,
        String ciudad,
        String pais,
        int gmtOffset,
        int capacidad,
        double latitud,
        double longitud
) {
}
