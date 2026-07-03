package com.tasfb2b.envio.repository;

import com.tasfb2b.envio.domain.Envio;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public interface EnvioRepository extends JpaRepository<Envio, Long> {


    @Query("""
    SELECT e FROM Envio e
    WHERE (:origen IS NULL OR
      LOWER(e.origen.icaoCode) LIKE CONCAT('%', LOWER(:origen), '%') OR
      LOWER(e.origen.city) LIKE CONCAT('%', LOWER(:origen), '%') OR
      LOWER(e.origen.country) LIKE CONCAT('%', LOWER(:origen), '%'))
    AND (:destino IS NULL OR
      LOWER(e.destino.icaoCode) LIKE CONCAT('%', LOWER(:destino), '%') OR
      LOWER(e.destino.city) LIKE CONCAT('%', LOWER(:destino), '%') OR
      LOWER(e.destino.country) LIKE CONCAT('%', LOWER(:destino), '%'))
    AND (:codigo IS NULL OR e.codigoPedido LIKE CONCAT(:codigo, '%'))
    """)
    Page<Envio> buscar(String origen, String destino, String codigo, Pageable pageable);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Envio")
    void deleteAllEnvios();

    @Query("SELECT e.codigoPedido, o.icaoCode, d.icaoCode, e.cantidadMaletas, e.fecha, e.hora FROM Envio e JOIN e.origen o JOIN e.destino d WHERE e.fecha BETWEEN :inicio AND :fin")
    List<Object[]> findActiveShipmentData(@Param("inicio") java.time.LocalDate inicio, @Param("fin") java.time.LocalDate fin);

    @Query("SELECT e FROM Envio e JOIN FETCH e.origen JOIN FETCH e.destino WHERE e.fecha BETWEEN :inicio AND :fin")
    List<Envio> findByFechaBetween(@Param("inicio") java.time.LocalDate inicio, @Param("fin") java.time.LocalDate fin);

    @org.springframework.transaction.annotation.Transactional
    void deleteByFechaBetween(java.time.LocalDate inicio, java.time.LocalDate fin);

    boolean existsByFechaBetween(java.time.LocalDate inicio, java.time.LocalDate fin);

    /** Verifica si existe al menos un envío para una fecha específica. */
    boolean existsByFecha(java.time.LocalDate fecha);

    @Query("""
    SELECT
        e.id                    AS id,
        e.codigoPedido          AS codigoPedido,
        e.clienteId             AS clienteId,
        e.origen.icaoCode       AS origenIcao,
        e.destino.icaoCode      AS destinoIcao,
        e.cantidadMaletas       AS cantidadMaletas,
        e.origen.continent      AS origenContinente,
        e.destino.continent     AS destinoContinente,
        e.origen.gmtOffset      AS origenGmtOffset,
        e.fecha                 AS fecha,
        e.hora                  AS hora
    FROM Envio e
""")
    Stream<EnvioResumen> streamResumenes();

    @Query("""
    SELECT
        e.id                    AS id,
        e.codigoPedido          AS codigoPedido,
        e.clienteId             AS clienteId,
        e.origen.icaoCode       AS origenIcao,
        e.destino.icaoCode      AS destinoIcao,
        e.cantidadMaletas       AS cantidadMaletas,
        e.origen.continent      AS origenContinente,
        e.destino.continent     AS destinoContinente,
        e.origen.gmtOffset      AS origenGmtOffset,
        e.fecha                 AS fecha,
        e.hora                  AS hora
    FROM Envio e
    WHERE e.fecha = :fecha
""")
    Stream<EnvioResumen> streamResumenesPorFecha(@Param("fecha") java.time.LocalDate fecha);

    @Query("""
    SELECT
        e.id                    AS id,
        e.codigoPedido          AS codigoPedido,
        e.clienteId             AS clienteId,
        e.origen.icaoCode       AS origenIcao,
        e.destino.icaoCode      AS destinoIcao,
        e.cantidadMaletas       AS cantidadMaletas,
        e.origen.continent      AS origenContinente,
        e.destino.continent     AS destinoContinente,
        e.origen.gmtOffset      AS origenGmtOffset,
        e.fecha                 AS fecha,
        e.hora                  AS hora
    FROM Envio e
    WHERE e.fecha >= :inicio AND e.fecha <= :fin
""")
    Stream<EnvioResumen> streamResumenesPorRangoFechas(
            @Param("inicio") java.time.LocalDate inicio,
            @Param("fin") java.time.LocalDate fin
    );

    /** Total real de maletas por día dentro de un rango (para el reporte de demanda) */
    @Query("SELECT e.fecha as fecha, SUM(e.cantidadMaletas) as total FROM Envio e WHERE e.fecha BETWEEN :inicio AND :fin GROUP BY e.fecha ORDER BY e.fecha ASC")
    List<DailyTotal> findDailyTotalsByRange(
        @org.springframework.data.repository.query.Param("inicio") java.time.LocalDate inicio,
        @org.springframework.data.repository.query.Param("fin") java.time.LocalDate fin);

    @Query("SELECT e.fecha as fecha, SUM(e.cantidadMaletas) as total FROM Envio e GROUP BY e.fecha ORDER BY SUM(e.cantidadMaletas) ASC")
    List<DailyTotal> findDailyTotals();

    /** Devuelve los codigoPedido ya registrados para un origen, para pre-filtrar duplicados. */
    @Query("SELECT e.codigoPedido FROM Envio e WHERE e.origen.icaoCode = :icao")
    Set<String> findCodigosByOrigenIcao(@Param("icao") String icao);

    /** Elimina envíos con fecha anterior a la dada (sliding window para liberar heap). */
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Envio e WHERE e.fecha < :antes")
    void deleteByFechaBefore(@Param("antes") java.time.LocalDate antes);

    interface DailyTotal {
        java.time.LocalDate getFecha();
        Long getTotal();
    }
}
