package com.tasfb2b.shared.exception;

public class AeropuertoNotFoundException extends RuntimeException {
    public AeropuertoNotFoundException(Long id) {
        super("Aeropuerto no encontrado con id: " + id);
    }
}