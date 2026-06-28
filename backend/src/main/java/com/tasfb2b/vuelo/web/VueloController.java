package com.tasfb2b.vuelo.web;

import com.tasfb2b.vuelo.dto.*;
import com.tasfb2b.vuelo.service.VueloService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vuelos")
@RequiredArgsConstructor
public class VueloController {

    private final VueloService service;

    @PostMapping("/create")
    public VueloResponse crear(@Valid @RequestBody VueloRequest request) {
        return service.crear(request);
    }

    @GetMapping("/search")
    public List<VueloResponse> buscar(@RequestParam(required = false) String query) {
        return service.buscar(query);
    }

    @PostMapping("/upload")
    public org.springframework.http.ResponseEntity<String> uploadMasivo(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            String result = service.uploadMasivoEnVivo(file);
            return org.springframework.http.ResponseEntity.ok(result);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}