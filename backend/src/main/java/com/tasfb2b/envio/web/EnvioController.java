package com.tasfb2b.envio.web;

import com.tasfb2b.envio.service.EnvioService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.tasfb2b.envio.dto.EnvioResponse;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/v1/envios")
@RequiredArgsConstructor
public class EnvioController {

    private final EnvioService envioService;

    // Se llamaría a la api así: GET /api/v1/envios?page=0&size=50
    @GetMapping
    public Page<EnvioResponse> listar(
            @RequestParam(required = false) String origen,
            @RequestParam(required = false) String codigo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by("fecha").descending().and(Sort.by("hora").descending())
        );

        return envioService.buscar(origen, codigo, pageable);
    }



    @PostMapping("/carga")
    public String cargarArchivo(@RequestParam("file") MultipartFile file) {
        try {
            String nombreArchivo = file.getOriginalFilename();

            if (nombreArchivo == null) {
                throw new RuntimeException("Nombre de archivo inválido");
            }

            List<String> lineas = new BufferedReader(
                    new InputStreamReader(file.getInputStream()))
                    .lines()
                    .toList();

            envioService.cargarDesdeLineasArchivo(nombreArchivo, lineas);

            return "Archivo cargado correctamente";

        } catch (Exception e) {
            throw new RuntimeException("Error procesando archivo", e);
        }
    }

    @PostMapping("/manual")
    public String registrarManual(@RequestBody UserEnvioRequest req) {
        envioService.registrarManual(req);
        return "Envío registrado correctamente";
    }

    @PostMapping("/archivo")
    public String registrarArchivo(@RequestParam("file") MultipartFile file) {
        try {
            List<String> lineas = new java.io.BufferedReader(
                    new java.io.InputStreamReader(file.getInputStream()))
                    .lines()
                    .toList();

            envioService.registrarLoteUsuario(lineas);

            return "Archivo de usuario procesado correctamente";

        } catch (Exception e) {
            throw new RuntimeException("Error procesando archivo de usuario", e);
        }
    }
}
