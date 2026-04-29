package com.tasfb2b.envio.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record EnvioResponse(
        Long id,
        String codigoPedido,
        String origenIcao,
        String destinoIcao,
        Integer cantidadMaletas,
        LocalDate fecha,
        LocalTime hora
) {}