package com.tasfb2b.shared.exception;

public class AeropuertoNotFoundException extends RuntimeException {
    public AeropuertoNotFoundException(Long id) {
        super("Aeropuerto no encontrado con id: " + id);
    }

    public AeropuertoNotFoundException(String code) {
        super("Aeropuerto no encontrado con código ICAO: " + code);
    }
}