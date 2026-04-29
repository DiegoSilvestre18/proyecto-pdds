package com.tasfb2b.aeropuerto.dto;

import com.tasfb2b.aeropuerto.domain.Continente;
import jakarta.validation.constraints.*;

public record AeropuertoRequest(

        @NotBlank
        String icaoCode,

        @NotBlank
        String city,

        @NotBlank
        String country,

        @NotNull
        Continente continent,

        @NotNull @Min(100)
        Integer storageCapacity,

        @NotNull
        Integer gmtOffset,

        @NotNull
        Double latitude,

        @NotNull
        Double longitude
) {}