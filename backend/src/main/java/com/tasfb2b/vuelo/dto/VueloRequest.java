package com.tasfb2b.vuelo.dto;

import jakarta.validation.constraints.*;

public record VueloRequest(

        @NotBlank
        String origenIcao,

        @NotBlank
        String destinoIcao,

        @NotNull @Min(1)
        Integer capacity,

        @NotNull
        Integer departureMinute,

        @NotNull
        Integer arrivalMinute
) {}