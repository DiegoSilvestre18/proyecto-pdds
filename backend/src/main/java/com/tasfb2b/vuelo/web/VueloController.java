package com.tasfb2b.vuelo.web;

import com.tasfb2b.vuelo.dto.*;
import com.tasfb2b.vuelo.service.VueloService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/vuelos")
@RequiredArgsConstructor
public class VueloController {

    private final VueloService service;

    @PostMapping
    public VueloResponse crear(@Valid @RequestBody VueloRequest request) {
        return service.crear(request);
    }
}