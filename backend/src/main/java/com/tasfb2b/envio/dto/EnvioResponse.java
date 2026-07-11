package com.tasfb2b.envio.dto;

import java.time.LocalDate;
import java.time.LocalTime;



public record EnvioResponse(
        Long id,
        String codigoPedido,
        String origenIcao,
        String origenCiudad,
        String origenPais,
        String destinoIcao,
        String destinoCiudad,
        String destinoPais,
        Integer cantidadMaletas,
        LocalDate fecha,
        LocalTime hora,
        String estado,
        Long vueloAsignado
) {}