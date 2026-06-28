package com.tasfb2b.envio.repository;

import java.time.LocalDate;
import java.time.LocalTime;

public interface EnvioResumen {
    //Añadidos para trazabilidad de envíos
    String getCodigoPedido();
    Long getId();
    String getCliente();

    String getOrigenIcao();
    String getDestinoIcao();
    int getCantidadMaletas();
    String getOrigenContinente();
    String getDestinoContinente();
    int getOrigenGmtOffset();

    LocalDate getFecha();
    LocalTime getHora();
}
