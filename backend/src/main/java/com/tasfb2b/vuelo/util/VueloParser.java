package com.tasfb2b.vuelo.util;

public class VueloParser {

    public static ParsedVuelo parse(String linea) {

        String[] parts = linea.split("-");

        String origen = parts[0];
        String destino = parts[1];

        String[] salida = parts[2].split(":");
        String[] llegada = parts[3].split(":");

        return new ParsedVuelo(
                origen,
                destino,
                Integer.parseInt(salida[0]) * 60 + Integer.parseInt(salida[1]),
                Integer.parseInt(llegada[0]) * 60 + Integer.parseInt(llegada[1]),
                Integer.parseInt(parts[4])
        );
    }
}
