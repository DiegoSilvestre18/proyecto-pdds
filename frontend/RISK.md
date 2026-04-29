## PROFILE

Se un experto project manager especializado en proyectos de ingenieria de software. Eres un analista profesional de riesgos.

## CONTEXT

Se elabora un proyecto de universidad que combine algoritmos de heuristica para gestion de malestas en aeropuertos.

## MODEL RISK

Modelo de los atributos que debe tener un riesgo

ID de riesgo Categoría de riesgo Descripción del riesgo o punto desencadenante Resultado potencial Identificado por Fecha de identificación Fuente Impacto Impact Val Probabilidad Prob. Val Valoración Estrategia de riesgos Plan de respuesta Estado Fecha de aparición Comentarios Valorac.Color

## RISK REGISTER

| ID de riesgo | Categoría de riesgo | Descripción del riesgo o punto desencadenante | Resultado potencial | Identificado por | Fecha de identificación | Fuente | Impacto | Impact Val | Probabilidad | Prob. Val | Valoración | Estrategia de riesgos | Plan de respuesta | Estado | Fecha de aparición | Comentarios | Valorac.Color |
|---|---|---|---|---|---|---|---|---:|---|---:|---:|---|---|---|---|---|---|
| RSK-001 | Desarrollo - Requisitos | Inconsistencias/ambigüedades en requisitos (ej.: duplicidad funcional R-029 y R-030; redacción ambigua en requisitos de simulación). | Retrabajo, interpretaciones distintas y entregables no alineados con evaluación. | Equipo DP1 | 09/04/2026 | Revision de artefactos | alto | 4 | alto | 4 | 16 | mitigar | Depurar duplicados, cerrar glosario, definir criterios de aceptación por requisito exigible y baseline por módulo. | identificado | Iteración actual | Impacta M1-M8 y trazabilidad funcional. | rojo |
| RSK-002 | Desarrollo - Análisis | Complejidad para modelar restricciones simultáneas: capacidades (vuelos/almacenes), plazos 24h/48h, replanificación por cancelaciones y política de un aeropuerto por ciudad. | Planes de ruta inválidos o incumplimiento de SLA de entrega. | Equipo DP1 | 09/04/2026 | Reunion con profesor | muy alto | 5 | alto | 4 | 20 | mitigar | Construir matriz de reglas y casos límite; validar con datasets controlados antes de integrar visualización. | identificado | Fase análisis-diseño | Relacionado con R-026, R-091, R-094, R-095. | rojo |
| RSK-003 | Desarrollo - Diseño | Riesgo de arquitectura por integración de frontend en tiempo real + backend con motor de tiempo + metaheurísticos en Java. | Desincronización de estados, APIs inestables y baja mantenibilidad. | Equipo DP1 | 09/04/2026 | Revision Semanal | muy alto | 5 | moderado | 3 | 15 | mitigar | Definir contratos API/versionado, desacoplar componentes y ejecutar pruebas de integración tempranas. | identificado | Implementación base | Afecta monitoreo en tiempo real y comparación de algoritmos. | naranja |
| RSK-004 | Desarrollo - Programación | Riesgo de rendimiento: simulación de 7 días en pocos minutos, replanificación automática y render en mapa interactivo en tiempo real. | Degradación de desempeño, cuellos de botella y fallos durante demos/evaluación. | Equipo DP1 | 09/04/2026 | Revision de artefactos | muy alto | 5 | alto | 4 | 20 | mitigar | Perfilamiento temprano, pruebas de carga por escenario (3/5/7 días), optimización incremental y límites operativos configurables. | identificado | Pruebas de escenarios | Vinculado a R-088, R-093, R-071, R-026, R-091. | rojo |
| RSK-005 | PM - Planificación | Alta carga de requisitos exigibles de M1-M8 con dependencias fuertes (planificador, monitoreo, visualización y comparación de algoritmos) para un prototipo no funcional. | Retraso de cronograma, alcance incompleto y priorización reactiva de última hora. | Equipo DP1 | 09/04/2026 | Reunion con jefe de practica | alto | 4 | alto | 4 | 16 | mitigar | Replanificar por entregas: MVP por escenario (primero periodo 30-90 min), ruta crítica, hitos semanales y control de avance. | identificado | Inicio de ejecución | Priorizar Exigibles sobre Deseables. | rojo |

## CATEGORIES

#### Categoria del riesggo

    - Desarrollo - Requisitos
    - Desarrollo - Análisis
    - Desarrollo - Diseño
    - Desarrollo - Programación
    - Desarrollo - Pruebas
    - Recursos - Computadora/Laptop
    - Recursos - Red interna
    - Recursos - Internet
    - Recursos - Entorno de Desarrollo
    - Recursos - Base de datos
    - RecHumano - A nivel personal
    - RecHumano - Trabajo en equipo
    - RecHumano - Comunicación en pares
    - RecHumano - Resolución de conflicto
    - PM - Planificación
    - PM - Control
    - PM - Ejecución

#### Fuente

    - Revision Semanal
    - Revision de artefactos
    - Reunion con jefe de practica
    - Reunion con profesor

#### Impacto, Probabilidad

    - muy bajo
    - bajo
    - moderado
    - alto
    - muy alto

#### Estrategia de riesgos

    - Evitar
    - transferir
    - mitigar
    - aceptar

#### Estado

    - identificado
    - evaluado
    - planeado
    - cerrado
