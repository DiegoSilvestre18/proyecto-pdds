package com.tasfb2b.envio.repository;

import com.tasfb2b.envio.domain.Envio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import java.util.stream.Stream;

public interface EnvioRepository extends CrudRepository<Envio, Long> {

    @Query("""
    SELECT
        e.origen.icaoCode       AS origenIcao,
        e.destino.icaoCode      AS destinoIcao,
        e.cantidadMaletas       AS cantidadMaletas,
        e.origen.continent      AS origenContinente,
        e.destino.continent     AS destinoContinente,
        e.fecha                 AS fecha,
        e.hora                  AS hora
    FROM Envio e
""")
    Stream<EnvioResumen> streamResumenes();
}