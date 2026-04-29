package com.tasfb2b.shared.config;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.aeropuerto.repository.AeropuertoRepository;
import com.tasfb2b.aeropuerto.service.AeropuertoService;
import com.tasfb2b.vuelo.service.VueloService;
import com.tasfb2b.envio.service.EnvioService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.core.annotation.Order;

@Configuration
@RequiredArgsConstructor
@Order(1)
public class DataInitializer {

    private final AeropuertoService aeropuertoService;
    private final VueloService vueloService;
    private final EnvioService envioService;
    private final AeropuertoRepository aeropuertoRepo;

    @Value("${tasf.data.path}")
    private String dataPath;

    @Bean
    CommandLineRunner init() {
        return args -> {

            System.out.println("─── Fase 1: Carga de Datos ───");

            Path basePath = Path.of(dataPath);

            // 1. Aeropuertos
            aeropuertoService.cargarDesdeArchivo(basePath.resolve("c.1inf54.26.1.v1.Aeropuerto.husos.v1.20250818__estudiantes.txt"));

            // 2. Vuelos
            vueloService.cargarDesdeArchivo(basePath.resolve("planes_vuelo.txt"));

            // 3. Envíos (múltiples archivos)
            cargarEnvios(basePath);

            System.out.println("─── Datos cargados correctamente ───");
        };
    }

    private void cargarEnvios(Path basePath) {

        try {
            Map<String, Aeropuerto> cache = aeropuertoRepo.findAll()
                    .stream()
                    .collect(Collectors.toMap(Aeropuerto::getIcaoCode, a -> a));

            try (var stream = Files.list(basePath)) {

                stream
                        .filter(path -> path.getFileName().toString().startsWith("_envios_"))
                        .sorted()
                        .forEach(path -> {
                            try {
                                List<String> lineas = Files.readAllLines(path);

                                envioService.cargarDesdeLineasArchivo(
                                        path.getFileName().toString(),
                                        lineas
                                );

                                System.out.println("✔ Cargado: " + path.getFileName());

                            } catch (Exception e) {
                                throw new RuntimeException("Error cargando " + path, e);
                            }
                        });
            }

        } catch (Exception e) {
            throw new RuntimeException("Error leyendo carpeta de envíos", e);
        }
    }
}