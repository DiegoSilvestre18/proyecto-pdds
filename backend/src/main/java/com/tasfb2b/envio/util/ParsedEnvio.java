package com.tasfb2b.envio.util;

public record ParsedEnvio(
        String codigo,
        String fecha,
        String hora,
        String destinoIcao,
        int cantidad,
        String cliente
) {
}