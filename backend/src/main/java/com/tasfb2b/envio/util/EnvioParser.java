package com.tasfb2b.envio.util;

public class EnvioParser {

    public static ParsedEnvio parse(String linea) {
        String[] parts = linea.split("-");

        if (parts.length != 7) {
            throw new IllegalArgumentException("Formato inválido: " + linea);
        }

        return new ParsedEnvio(
                parts[0],
                parts[1],
                parts[2] + ":" + parts[3],
                parts[4],
                Integer.parseInt(parts[5]),
                parts[6]
        );
    }
}