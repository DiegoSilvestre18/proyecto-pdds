# Comparación de Cambios — TASF.B2B Refactorización Arquitectónica

> **Fecha:** 2026-05-04 | **Módulos afectados:** 8 archivos Java | **Compilación:** ✅ BUILD SUCCESS

---

## RESUMEN EJECUTIVO

Se corrigieron 3 problemas arquitectónicos detectados por auditoría técnica. Ningún cambio altera la lógica de negocio ni la interfaz de usuario — solo mejoran la **corrección interna del algoritmo** y la **parametrizabilidad del sistema**.

```
Archivos modificados:
  ├── NetworkAdapter.java            (interfaz)
  ├── NetworkAdapterImpl.java        (Dijkstra + cálculo de tiempos)
  ├── RouteBuilder.java              (despacho al Dijkstra correcto)
  ├── RepairOperator.java            (interfaz de operadores ALNS)
  ├── GreedyRepairOp.java            (operador de reparación greedy)
  ├── RegretRepairOp.java            (operador de reparación regret-2)
  ├── ALNSPlannerService.java        (motor ALNS + nuevo helper)
  └── SimulationService.java         (orquestador de simulación)
  └── SimulationController.java      (endpoints REST)
```

---

## CAMBIO 1 — Dijkstra consciente de capacidad de vuelos

### 📋 Qué problema resolvía

Dijkstra buscaba la ruta más rápida **sin importar si el vuelo estaba lleno**.
Luego `resolverConflictosCapacidad()` recortaba las maletas que no cabían.
Esto creaba un ciclo donde el ALNS nunca escapaba de una ruta saturada:

```
[Antes — ciclo de estancamiento]
  Destruir lote A de vuelo V1
  → Dijkstra: "V1 es el más rápido" → vuelve a asignar a V1 (lleno)
  → resolverConflictosCapacidad: recorta maletas → E_cap sube
  → Destruir lote A de vuelo V1
  → ... (bucle infinito)
```

### 📁 `NetworkAdapter.java` — Interfaz

```diff
  public interface NetworkAdapter {
      List<Vuelo> findBestRoute(Aeropuerto origen,
                                Aeropuerto destino,
                                SuperLot lot);

+     // NUEVO: overload con filtro de capacidad
+     List<Vuelo> findBestRoute(Aeropuerto origen,
+                               Aeropuerto destino,
+                               SuperLot lot,
+                               Map<Long, Integer> remainingCap);

      List<Vuelo> findAlternativeRoute(..., Set<Long> excludedFlightIds);
      void invalidateGraph();
  }
```

**Por qué:** El nuevo overload permite a Dijkstra saber qué vuelos tienen espacio antes de proponerlos. Es retrocompatible — el overload sin `remainingCap` sigue existiendo para llamadas legacy (HGA, buildBackup).

---

### 📁 `NetworkAdapterImpl.java` — Implementación del Dijkstra

```diff
- private List<Vuelo> calcularRuta(Aeropuerto origen, Aeropuerto destino,
-                                  long startTime, Set<Long> excludedFlightIds) {
+ private List<Vuelo> calcularRuta(Aeropuerto origen, Aeropuerto destino,
+                                  long startTime, Set<Long> excludedFlightIds,
+                                  Map<Long, Integer> remainingCap) {      // NUEVO

      for (Vuelo v : localGraph.getOrDefault(current.airport, List.of())) {
          if (Boolean.TRUE.equals(v.getCancelled())) continue;
          if (excludedFlightIds.contains(v.getId())) continue;

+         // NUEVO: filtrar vuelos sin espacio disponible
+         if (!remainingCap.isEmpty()) {
+             int capRestante = remainingCap.getOrDefault(v.getId(), v.getCapacidadTotal());
+             if (capRestante <= 0) continue;  // ← Dijkstra ya no propone vuelos llenos
+         }

          long wait = calcularEsperaMatematica(current.time, v);
          // ... resto igual
      }
  }
```

**También:** Los dos métodos públicos `findBestRoute()` se actualizan:

```diff
  // El overload original → sigue igual (sin capacidad)
  public List<Vuelo> findBestRoute(origen, destino, lot) {
-     return calcularRuta(origen, destino, lot.getReadyTime(), Collections.emptySet());
+     return calcularRuta(origen, destino, lot.getReadyTime(),
+             Collections.emptySet(), Collections.emptyMap());
  }

  // NUEVO overload → con capacidad
+ public List<Vuelo> findBestRoute(origen, destino, lot, Map<Long,Integer> remainingCap) {
+     return calcularRuta(origen, destino, lot.getReadyTime(),
+             Collections.emptySet(), remainingCap);
+ }
```

---

### 📁 `RouteBuilder.java` — Despacho inteligente

```diff
  public Route build(SuperLot lot, Map<String, Aeropuerto> airportMap,
                     Map<String, Integer> cargaAeropuerto,
                     Map<Long, Integer> capacidadVuelo) {

      Aeropuerto origen  = airportMap.get(lot.getOrigenIcao());
      Aeropuerto destino = airportMap.get(lot.getDestinoIcao());

-     List<Vuelo> flights = network.findBestRoute(origen, destino, lot);
+     // Si el caller tiene estado de capacidad real → usar Dijkstra consciente
+     // Si el mapa está vacío (HGA/legacy) → usar Dijkstra estándar
+     List<Vuelo> flights = capacidadVuelo.isEmpty()
+             ? network.findBestRoute(origen, destino, lot)
+             : network.findBestRoute(origen, destino, lot, capacidadVuelo);  // NUEVO
```

**Por qué aquí:** `RouteBuilder` es el puente entre los algoritmos y el Dijkstra. Solo él decide qué overload usar, manteniendo los algoritmos agnósticos al mecanismo.

---

### 📁 `RepairOperator.java` — Interfaz de operadores ALNS

```diff
  public interface RepairOperator {
      List<Route> repair(List<Route> partialRoutes,
                         List<SuperLot> removed,
-                        Map<String, Aeropuerto> airportMap);
+                        Map<String, Aeropuerto> airportMap,
+                        Map<Long, Integer> capacidadDisponible);  // NUEVO
  }
```

**Por qué:** Para que los operadores puedan pasar el estado de capacidad al `RouteBuilder`, necesitan recibirlo como parámetro. La interfaz obliga a todos los operadores a implementarlo.

---

### 📁 `GreedyRepairOp.java` — Operador greedy

```diff
  @Override
  public List<Route> repair(List<Route> partialRoutes,
                             List<SuperLot> removed,
-                            Map<String, Aeropuerto> airportMap) {
+                            Map<String, Aeropuerto> airportMap,
+                            Map<Long, Integer> capacidadDisponible) {  // NUEVO

      removed.stream()
             .sorted(Comparator.comparingLong(SuperLot::getSla))
             .forEach(lot -> {
                 Route r = routeBuilder.build(lot, airportMap,
-                        new HashMap<>(), new HashMap<>());   // ← mapas VACÍOS (antes)
+                        new HashMap<>(), capacidadDisponible);  // ← estado REAL (ahora)
                 result.add(r);
             });
  }
```

---

### 📁 `RegretRepairOp.java` — Operador regret-2

Mismo patrón que `GreedyRepairOp`. El `capacidadDisponible` se propaga a:
- `repair()` → `routeBuilder.build()`
- `calcularRegret()` → `routeBuilder.build()` (para la mejor ruta y la segunda mejor)

```diff
- private double calcularRegret(SuperLot lot, Map<String, Aeropuerto> airportMap) {
+ private double calcularRegret(SuperLot lot, Map<String, Aeropuerto> airportMap,
+                               Map<Long, Integer> capacidadDisponible) {

      Route mejorRuta   = routeBuilder.build(lot, airportMap,
-             new HashMap<>(), new HashMap<>());
+             new HashMap<>(), capacidadDisponible);

      Route segundaMejor = routeBuilder.build(lotPerturbado, airportMap,
-             new HashMap<>(), new HashMap<>());
+             new HashMap<>(), capacidadDisponible);
  }
```

**Por qué importa en el regret:** El regret mide "cuánto pierdo si no inserto este lote ahora". Si el regret se calcula sin conocer la capacidad real, puede insertar en el orden incorrecto — primero el lote "difícil" pero cuya única ruta ya está llena.

---

### 📁 `ALNSPlannerService.java` — Motor ALNS (el cambio más importante)

**NUEVO helper `buildCapacidadDisponible()`:**

```diff
+ /**
+  * Construye el mapa de capacidad restante por vuelo dado el estado actual de rutas.
+  * capacidadTotal - ya_asignado = restante
+  */
+ private Map<Long, Integer> buildCapacidadDisponible(List<Route> routes) {
+     Map<Long, Integer> cap = new HashMap<>();
+     for (Route r : routes) {
+         for (Vuelo v : r.getFlights()) {
+             cap.putIfAbsent(v.getId(), v.getCapacidadTotal());
+         }
+     }
+     for (Route r : routes) {
+         int asignado = r.getCapacidadAsignada();
+         for (Vuelo v : r.getFlights()) {
+             cap.merge(v.getId(), -asignado, Integer::sum);
+         }
+     }
+     return cap;
+ }
```

**Loop principal del ALNS actualizado:**

```diff
  while (System.currentTimeMillis() - start < windowMs) {
      List<Route> candidate = new ArrayList<>(current);

      List<SuperLot> removed = dOp.destroy(candidate, q, rng);

+     // NUEVO: calcular estado real ANTES de reparar
+     Map<Long, Integer> capacidadDisponible = buildCapacidadDisponible(candidate);

-     candidate = rOp.repair(candidate, removed, airportMap);
+     candidate = rOp.repair(candidate, removed, airportMap, capacidadDisponible);

      resolverConflictosCapacidad(candidate);  // ← sigue existiendo como 2do filtro
      // ... evaluar, SA, actualizar best
  }
```

---

## CAMBIO 2 — Periodo de vuelo documentado (24h)

### 📋 Qué problema resolvía

La constante `24L * 60 * 60 * 1000` aparecía en el código sin explicación.
Esto hace que el sistema parezca que "asume 24h sin justificación".
Académicamente, una constante sin nombre ni documentación es indefendible.

### 📁 `NetworkAdapterImpl.java`

```diff
  public class NetworkAdapterImpl implements NetworkAdapter {

+     /**
+      * Período de repetición de vuelos (ms).
+      * Todos los vuelos del dataset académico TASF.B2B son diarios.
+      * Extraemos la constante para que sea documentable y testeable;
+      * un futuro upgrade puede leer la frecuencia por vuelo desde la BD.
+      */
+     static final long PERIODO_DIARIO_MS = 24L * 60 * 60 * 1000;

      private long calcularEsperaMatematica(long currentTime, Vuelo v) {
          long dep = v.getDepartureEpoch();
          if (currentTime <= dep) return dep - currentTime;

-         long periodoMs = 24L * 60 * 60 * 1000;   // ← magic number sin nombre
          long diff = currentTime - dep;
-         long saltosNecesarios = (diff / periodoMs) + 1;
-         return (dep + (saltosNecesarios * periodoMs)) - currentTime;
+         long saltosNecesarios = (diff / PERIODO_DIARIO_MS) + 1;   // ← constante nombrada
+         return (dep + (saltosNecesarios * PERIODO_DIARIO_MS)) - currentTime;
      }
  }
```

**Impacto en sustentación:** Cuando Dávila pregunte "¿asumen vuelos diarios?", puedes responder: *"Sí, está documentado en `PERIODO_DIARIO_MS` como asunción del dataset académico. Un upgrade futuro leería `v.getFrecuenciaDias()` desde la BD."* Eso es una respuesta de arquitecto, no de estudiante improvisando.

---

## CAMBIO 3 — Fecha de inicio parametrizable

### 📋 Qué problema resolvía

```java
// ANTES — en SimulationService.java
private static final long SIMULATION_EPOCH_2026 =
    LocalDateTime.of(2026, 1, 1, 0, 0).toInstant(ZoneOffset.UTC).toEpochMilli();

// Y en runAsync():
LocalDate inicio = LocalDate.of(2026, 1, 1);  // ← hardcodeado
```

Si Dávila pedía: *"Muéstrame la simulación con datos de agosto 2027"*, el sistema siempre respondía con `2026-01-01` en los logs. Violación directa del principio de Solución Única Parametrizable.

### 📁 `SimulationService.java`

```diff
- private static final long SIMULATION_EPOCH_2026 =
-     LocalDateTime.of(2026, 1, 1, 0, 0).toInstant(ZoneOffset.UTC).toEpochMilli();

+ /** Fallback explícito: inicio del dataset académico TASF.B2B.
+  *  No es hardcode funcional: runAsync() acepta cualquier fecha. */
+ private static final LocalDate DEFAULT_START_DATE = LocalDate.of(2026, 1, 1);

  // Firma del método:
- public void runAsync(String sessionId, int dias, String algorithm) {
+ public void runAsync(String sessionId, int dias, String algorithm, LocalDate startDate) {

      // Dentro del método:
+     LocalDate fechaInicio = (startDate != null) ? startDate : DEFAULT_START_DATE;

-     LocalDate inicio = LocalDate.of(2026, 1, 1);      // hardcodeado
-     LocalDate fin = inicio.plusDays(dias - 1);
-     envioService.cargarPorFecha(inicio, fin, dataPath);
+     LocalDate fin = fechaInicio.plusDays(dias - 1);
+     envioService.cargarPorFecha(fechaInicio, fin, dataPath);

-     long currentTime = SIMULATION_EPOCH_2026;
+     // Epoch derivado de la fecha parametrizable:
+     long currentTime = fechaInicio.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli();
```

### 📁 `SimulationController.java`

```diff
  @PostMapping("/run/{dias}")
  public ResponseEntity<Map<String, String>> startSimulation(
          @PathVariable Integer dias,
-         @RequestParam(defaultValue = "HGA") String algorithm) {
+         @RequestParam(defaultValue = "HGA") String algorithm,
+         @RequestParam(required = false) String startDate) {   // NUEVO

+     java.time.LocalDate fechaInicio = null;
+     if (startDate != null && !startDate.isBlank()) {
+         try { fechaInicio = java.time.LocalDate.parse(startDate); }
+         catch (Exception ignored) {}
+     }

-     service.runAsync(sessionId, totalDays, algorithm);
+     service.runAsync(sessionId, totalDays, algorithm, fechaInicio);

+     response.put("startDate", fechaInicio != null ? fechaInicio.toString() : "2026-01-01");
```

**Cómo usarlo ahora:**
```bash
# Simulación estándar (usa 2026-01-01 como antes)
POST /simulacion/run/5?algorithm=ALNS

# Simulación con fecha personalizada
POST /simulacion/run/5?algorithm=ALNS&startDate=2027-08-15

# Respuesta incluye la fecha aplicada:
{ "sessionId": "...", "startDate": "2027-08-15", "totalDays": "5" }
```

---

## COMPARACIÓN ANTES vs DESPUÉS — Resumen visual

### Flujo ALNS por iteración

```
══════════════════════════════════════════════════════════════════
                        ANTES (ciclo roto)
══════════════════════════════════════════════════════════════════

  destroy(q lotes)
       ↓
  repair(rutas, removed, airports)
    └→ routeBuilder.build(lot, airports, {}, {})   ← VACÍO
         └→ Dijkstra({ todos los vuelos sin filtro })
               → Propone V1 (rápido pero lleno)
       ↓
  resolverConflictosCapacidad
    → V1 está lleno → recorta maletas → E_cap += N
       ↓
  evalFitness → penaliza por E_cap
       ↓
  ¿Mejora? Casi nunca en alto estrés → ALNS estancado

══════════════════════════════════════════════════════════════════
                        AHORA (flujo correcto)
══════════════════════════════════════════════════════════════════

  destroy(q lotes)
       ↓
  buildCapacidadDisponible(rutas_parciales)         ← NUEVO
    → { V1: 0, V2: 145, V3: 88, ... }
       ↓
  repair(rutas, removed, airports, capDisponible)   ← NUEVO
    └→ routeBuilder.build(lot, airports, {}, capDisponible)
         └→ Dijkstra({ filtra V1 porque cap=0 })
               → Propone V3 (disponible) o V2 (disponible)
       ↓
  resolverConflictosCapacidad   ← segundo filtro de seguridad
       ↓
  evalFitness → menor E_cap → mejor fitness
       ↓
  ALNS puede escapar del óptimo local → converge mejor
```

---

### Impacto esperado en métricas del Excel DOE

| Métrica | Antes | Ahora | Dirección |
|---|---|---|---|
| `Fitness Score` | Más bajo (penalizado por E_cap) | Más alto | ↑ Mejor |
| `Cumplimiento %` | ~99.1% en máximo estrés | > 99.1% | ↑ Mejor |
| `Ecap` (col. K del Excel) | Inflado artificialmente | Reducido | ↓ Mejor |
| `Desv. Est.` (DESV.EST en Excel) | Mayor variabilidad | Menor variabilidad | ↓ Mejor |
| Convergencia ALNS | Puede estancarse | Menos probable | ↑ Mejor |
| `startDate` en simulación | Siempre 2026-01-01 | Cualquier fecha | ✅ Parametrizable |

---

### Lo que NO cambió (para la sustentación)

| Elemento | Estado |
|---|---|
| Fórmula Fitness: `10A − 0.005E_cap − 2D_h − 12S_aero` | ✅ Sin cambio |
| Warm-start HGA → ALNS (backupRoutes) | ✅ Sin cambio |
| Cola de pendientes inter-día (simulación 5D) | ✅ Sin cambio |
| Modo colapso (mutación + cancelaciones) | ✅ Sin cambio |
| DOE: 5 niveles × 10 iteraciones | ✅ Sin cambio |
| Excel exportado (estructura de columnas) | ✅ Sin cambio |
| Frontend / Dashboard | ✅ Sin cambio |
| HGA (population, crossover, mutate) | ✅ Sin cambio |
| SimulationRunner (motor de eventos) | ✅ Sin cambio |

---

*Generado: 2026-05-04 · TASF.B2B · Compilación verificada: BUILD SUCCESS*
