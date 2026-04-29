package com.tasfb2b.envio.web;

import com.tasfb2b.envio.service.EnvioService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;

@RestController
@RequestMapping("/api/v1/envios")
@RequiredArgsConstructor
public class EnvioController {

    private final EnvioService envioService;

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
}
