package com.tasfb2b.envio.domain;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
        name = "envios",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"codigo_pedido", "origen_id"})
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Envio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //Identificador del archivo
    @Column(nullable = false)
    private String codigoPedido;

    private LocalDate fecha;

    private LocalTime hora;

    //Relación real
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "origen_id", nullable = false)
    private Aeropuerto origen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destino_id", nullable = false)
    private Aeropuerto destino;

    private Integer cantidadMaletas;

    private String clienteId;

    @Version
    private Long version;
}