package com.tasfb2b.experiment;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class ExperimentSession {

    private final String id = UUID.randomUUID().toString();
    private String algorithm;
    private Status status = Status.IDLE;
    private int progressPercent = 0;
    private int currentLevelIndex = -1; // -1 = no iniciado, 0-4 = nivel en curso
    private String errorMessage;

    // Definición de los 5 niveles (calculados dinámicamente al crear la sesión)
    private List<LevelDefinition> levels = new ArrayList<>();

    // Resultados parciales (se van llenando conforme termina cada nivel)
    private List<ExperimentRunResult> results = new ArrayList<>();

    public enum Status { IDLE, RUNNING, DONE, FAILED }

    @Data
    @Builder
    public static class LevelDefinition {
        private String name;         // "Caso Mínimo de Envíos", etc.
        private String levelTag;     // "MIN", "MID_LOW", "AVG", "MID_HIGH", "MAX"
        private String fecha;        // Fecha histórica real: "YYYY-MM-DD"
        private long suitcaseCount;  // Total de maletas de esa fecha
    }
}
