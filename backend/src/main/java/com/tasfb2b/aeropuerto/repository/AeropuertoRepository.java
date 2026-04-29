package com.tasfb2b.aeropuerto.repository;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AeropuertoRepository extends JpaRepository<Aeropuerto, Long> {

    Optional<Aeropuerto> findByIcaoCode(String icaoCode);
}