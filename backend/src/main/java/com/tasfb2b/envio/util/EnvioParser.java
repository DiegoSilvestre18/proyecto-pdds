package com.tasfb2b.envio.util;

public class EnvioParser {

    public static ParsedEnvio parse(String linea) {
        String[] parts = linea.split("-");

        if (parts.length != 7) {
            throw new IllegalArgumentException("Formato inválido: " + linea);
        }

        return new ParsedEnvio(
                parts[0],          // codigo
                parts[1],          // fecha YYYYMMDD
                parts[2] + ":" + parts[3], // hora HH:MM
                parts[4],          // destinoIcao
                Integer.parseInt(parts[5]), // cantidadMaletas (###, 3 posiciones: 001..999)
                parts[6]           // clienteId        (7 posiciones: 0000001..9999999)
        );
    }
}