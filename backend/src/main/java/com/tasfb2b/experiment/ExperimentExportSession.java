package com.tasfb2b.experiment;

import lombok.Data;

import java.util.UUID;

/**
 * Sesión de exportación DOE: rastrea el progreso de las 10 iteraciones × 5 niveles.
 * Vive en memoria mientras dura el proceso (~7-10 minutos para HGA).
 */
@Data
public class ExperimentExportSession {

    private final String id = UUID.randomUUID().toString();
    private String algorithm;                    // "ALNS" o "HGA"
    private int totalWork;                       // iterations * levels (ej. 10 * 5 = 50)
    private int completedWork = 0;               // unidades completadas
    private int currentIteration = 0;            // iteración actual (1-10)
    private int currentLevel = 0;               // nivel actual dentro de la iteración (1-5)
    private Status status = Status.IDLE;
    private String fileName;                     // nombre del archivo generado
    private String filePath;                     // ruta absoluta del archivo
    private String errorMessage;

    public int getProgressPercent() {
        if (totalWork <= 0) return 0;
        return Math.min(100, (completedWork * 100) / totalWork);
    }

    public enum Status { IDLE, RUNNING, DONE, FAILED }
}
