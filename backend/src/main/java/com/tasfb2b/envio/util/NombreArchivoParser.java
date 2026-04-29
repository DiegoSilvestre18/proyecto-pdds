package com.tasfb2b.envio.util;

public class NombreArchivoParser {

    public static String extraerIcao(String nombreArchivo) {
        // _envios_SKBO_.txt
        String[] parts = nombreArchivo.split("_");

        if (parts.length < 3) {
            throw new IllegalArgumentException("Nombre de archivo inválido: " + nombreArchivo);
        }

        return parts[2];
    }
}