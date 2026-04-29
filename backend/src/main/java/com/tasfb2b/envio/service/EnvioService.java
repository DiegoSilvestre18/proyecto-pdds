package com.tasfb2b.envio.service;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
import com.tasfb2b.envio.domain.Envio;
import com.tasfb2b.envio.repository.EnvioRepository;
import com.tasfb2b.envio.util.EnvioParser;
import com.tasfb2b.envio.util.NombreArchivoParser;
import com.tasfb2b.envio.util.ParsedEnvio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.ArrayList;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EnvioService {

    private final EnvioRepository envioRepo;
    private final AeropuertoRepository aeropuertoRepo;

    private static final int BATCH_SIZE = 500;

    @Transactional
    public void cargarDesdeLineasArchivo(String nombreArchivo, List<String> lineas) {

        Map<String, Aeropuerto> aeropuertoCache = aeropuertoRepo.findAll()
                .stream()
                .collect(Collectors.toMap(Aeropuerto::getIcaoCode, a -> a));

        String origenIcao = NombreArchivoParser.extraerIcao(nombreArchivo);
        Aeropuerto origen = aeropuertoCache.get(origenIcao);
        if (origen == null) throw new RuntimeException("Origen no encontrado: " + origenIcao);

        List<Envio> batch = new ArrayList<>(BATCH_SIZE);

        for (String linea : lineas) {
            ParsedEnvio parsed = EnvioParser.parse(linea);
            if (parsed == null) continue;

            Aeropuerto destino = aeropuertoCache.get(parsed.destinoIcao());
            if (destino == null) {
                System.err.println("Destino no encontrado: " + parsed.destinoIcao());
                continue;
            }

            batch.add(Envio.builder()
                    .codigoPedido(parsed.codigo())
                    .fecha(LocalDate.parse(parsed.fecha(), DateTimeFormatter.BASIC_ISO_DATE))
                    .hora(LocalTime.parse(parsed.hora()))
                    .origen(origen)
                    .destino(destino)
                    .cantidadMaletas(parsed.cantidad())
                    .clienteId(parsed.cliente())
                    .build());

            if (batch.size() == BATCH_SIZE) {
                envioRepo.saveAll(batch);
                batch.clear();
            }
        }

        if (!batch.isEmpty()) {
            envioRepo.saveAll(batch);
        }
    }
}
