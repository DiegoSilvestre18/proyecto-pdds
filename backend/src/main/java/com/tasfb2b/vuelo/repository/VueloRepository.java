package com.tasfb2b.vuelo.repository;

import com.tasfb2b.vuelo.domain.Vuelo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VueloRepository extends JpaRepository<Vuelo, Long> {

    /** Retorna todos los vuelos con cancelación activa (para restaurar al día siguiente). */
    List<Vuelo> findByCancelledTrue();
}