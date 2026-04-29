package com.tasfb2b.planificador.domain;

import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.vuelo.domain.Vuelo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;

@Data
@Getter
@AllArgsConstructor
public class Event {

    private long time;        // epoch ms
    private EventType type;

    private SuperLot lot;
    private Vuelo vuelo;

    private int load;         // carga asociada (maletas)
}
