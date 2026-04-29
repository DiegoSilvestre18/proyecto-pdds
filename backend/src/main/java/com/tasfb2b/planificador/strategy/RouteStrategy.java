package com.tasfb2b.planificador.strategy;

import com.tasfb2b.superlote.domain.SuperLot;

public interface RouteStrategy {

    Object buildRoute(SuperLot lot);
}
