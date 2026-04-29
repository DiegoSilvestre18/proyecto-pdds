package com.tasfb2b.aeropuerto.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "aeropuertos")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Aeropuerto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── IDENTIDAD ─────────────────────────────────────

    @Column(unique = true, nullable = false)
    private String icaoCode;

    private String city;
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Continente continent;

    // ── CAPACIDAD (ESTÁTICA) ──────────────────────────

    /**
     * Capacidad máxima de almacenamiento del aeropuerto
     */
    @Column(nullable = false)
    private Integer storageCapacity;

    // ── GEOGRAFÍA / TIEMPO ────────────────────────────

    /**
     * Offset GMT en horas (ej: -5, +1, etc.)
     */
    @Column(nullable = false)
    private Integer gmtOffset;

    private Double latitude;
    private Double longitude;

    @Version
    private Long version;

    // ── MÉTODOS DE NEGOCIO ────────────────────────────

    /**
     * Verifica si el aeropuerto pertenece a otro continente
     */
    public boolean esIntercontinentalCon(Aeropuerto otro) {
        return this.continent != otro.continent;
    }


    public void validar() {

        if (icaoCode == null || icaoCode.isBlank()) {
            throw new IllegalStateException("ICAO no puede ser vacío");
        }

        if (continent == null) {
            throw new IllegalStateException("Continente no puede ser null");
        }

        if (storageCapacity == null || storageCapacity <= 0) {
            throw new IllegalStateException("Capacidad inválida");
        }

        if (gmtOffset == null) {
            throw new IllegalStateException("GMT offset no puede ser null");
        }
    }

    public long toEpochMillis(int minuteOfDay) {
        int utcMinute = minuteOfDay - (gmtOffset * 60);
        return utcMinute * 60_000L;
    }
}