package com.tasfb2b.vuelo.service;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
import com.tasfb2b.shared.exception.AeropuertoNotFoundException;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.vuelo.dto.*;
import com.tasfb2b.vuelo.repository.VueloRepository;
import com.tasfb2b.vuelo.util.VueloParser;
import com.tasfb2b.planificador.strategy.NetworkAdapter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.tasfb2b.vuelo.util.ParsedVuelo;

import java.io.BufferedReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VueloService {

    private final VueloRepository vueloRepo;
    private final AeropuertoRepository aeropuertoRepo;
    private final NetworkAdapter networkAdapter;

    public VueloResponse crear(VueloRequest request) {

        Aeropuerto origen = aeropuertoRepo.findById(request.origenId())
                .orElseThrow(() -> new AeropuertoNotFoundException(request.origenId()));

        Aeropuerto destino = aeropuertoRepo.findById(request.destinoId())
                .orElseThrow(() -> new AeropuertoNotFoundException(request.destinoId()));

        boolean intercontinental = !origen.getContinent().equals(destino.getContinent());

        Vuelo vuelo = Vuelo.builder()
                .origen(origen)
                .destino(destino)
                .capacidadTotal(request.capacity())
                .departureMinute(request.departureMinute())
                .arrivalMinute(request.arrivalMinute())
                .intercontinental(intercontinental)
                .cancelled(false)
                .build();

        vueloRepo.save(vuelo);

        return new VueloResponse(
                vuelo.getId(),
                origen.getIcaoCode(),
                destino.getIcaoCode(),
                vuelo.getCapacidadTotal(),
                vuelo.getCancelled()
        );
    }

    public void cargarDesdeArchivo(Path rutaArchivo) {

        try (BufferedReader reader = Files.newBufferedReader(rutaArchivo)) {

            List<Vuelo> vuelos = new ArrayList<>();

            String linea;

            while ((linea = reader.readLine()) != null) {

                ParsedVuelo parsed = VueloParser.parse(linea);

                Aeropuerto origen = aeropuertoRepo
                        .findByIcaoCode(parsed.origenIcao())
                        .orElseThrow(() ->
                                new RuntimeException("Origen no encontrado: " + parsed.origenIcao()));

                Aeropuerto destino = aeropuertoRepo
                        .findByIcaoCode(parsed.destinoIcao())
                        .orElseThrow(() ->
                                new RuntimeException("Destino no encontrado: " + parsed.destinoIcao()));

                boolean intercontinental = origen.getContinent() != destino.getContinent();

                Vuelo vuelo = Vuelo.builder()
                        .origen(origen)
                        .destino(destino)
                        .capacidadTotal(parsed.capacidad())
                        .departureMinute(parsed.departureMinute())
                        .arrivalMinute(parsed.arrivalMinute())
                        .intercontinental(intercontinental)
                        .cancelled(false)
                        .build();

                vuelos.add(vuelo);
            }

            vueloRepo.saveAll(vuelos);

        } catch (Exception e) {
            throw new RuntimeException("Error cargando vuelos desde: " + rutaArchivo, e);
        }
    }

    public void cancelarVuelo(Long vueloId) {
        Vuelo vuelo = vueloRepo.findById(vueloId)
                .orElseThrow(() -> new RuntimeException("Vuelo no encontrado: " + vueloId));

        vuelo.setCancelled(true);
        vueloRepo.save(vuelo);

        // Invalidar el caché del grafo para que Dijkstra no vuelva a usarlo
        networkAdapter.invalidateGraph();
    }
}