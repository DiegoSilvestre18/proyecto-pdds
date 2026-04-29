package com.tasfb2b.vuelo.dto;

import jakarta.validation.constraints.*;

public record VueloRequest(

        @NotNull
        Long origenId,

        @NotNull
        Long destinoId,

        @NotNull @Min(1)
        Integer capacity,

        @NotNull
        Integer departureMinute,

        @NotNull
        Integer arrivalMinute
) {}