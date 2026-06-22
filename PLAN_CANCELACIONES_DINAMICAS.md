# Plan de Implementación: Cancelaciones Dinámicas en Tiempo Real

Este documento detalla el plan para permitir la cancelación manual de vuelos durante la simulación y asegurar que el sistema replanifique automáticamente la carga afectada.

## 1. Objetivos
- Permitir al usuario visualizar vuelos que aún no han partido en el día actual de simulación.
- Proporcionar un botón de "Cancelar" para cualquier vuelo futuro.
- Asegurar que la cancelación sea temporal (solo afecta al día actual de simulación).
- Garantizar que el motor ALNS replanifique inmediatamente las maletas que perdieron su vuelo.

## 2. Cambios en el Backend

### 2.1. Nuevo Endpoint de Consulta de Vuelos
- **Archivo:** `VueloController.java` / `VueloService.java`
- **Acción:** Crear un endpoint `GET /api/v1/vuelos/search` que permita filtrar vuelos por hora de salida, origen y destino.
- **Utilidad:** El frontend lo usará para llenar la lista de "Vuelos del Futuro".

### 2.2. Ajuste en la Lógica de Replanificación Reactiva
- **Archivo:** `SimulationService.java`
- **Acción:** En el bloque de detección de cancelaciones manuales, los lotes afectados (`replanLot`) deben agregarse inmediatamente al `planifiablePool`.
- **Razón:** Actualmente se agregan a una lista de `pendientes` que parece usarse solo para el reporte final. Al agregarlos al `planifiablePool`, el ALNS los verá en el siguiente ciclo (ej. 30 o 60 min después) y buscará rutas alternativas de inmediato.

## 3. Cambios en el Frontend

### 3.1. Mejora del Panel de Cancelación
- **Archivo:** `FlightCancellationPanel.jsx` (en `components/floating` o `components/scenarios`)
- **Acción:** 
    - Reemplazar el input manual de ID por una lista interactiva.
    - Implementar un buscador (Origen/Destino).
    - Filtrar la lista localmente o vía API para mostrar solo vuelos cuya `departureTime` sea mayor a la `simulatedTime` actual.
    - Mostrar detalles del vuelo: ID, Origen, Destino, Hora Salida.

### 3.2. Integración con el Controlador
- **Archivo:** `useControlTowerController.js`
- **Acción:** Asegurar que la función `cancelFlight` esté correctamente vinculada al nuevo panel y que pase el `sessionId` activo para que el backend sepa qué simulación afectar.

## 4. Flujo de Usuario Esperado
1. El usuario abre el panel de "Cancelación" en la barra lateral izquierda.
2. Ve una lista de vuelos que saldrán en las próximas horas.
3. El usuario filtra por "Origen: SPIM" (Lima).
4. El usuario hace clic en "Cancelar" en el vuelo 502.
5. El sistema marca el vuelo como cancelado en la DB.
6. El `SimulationService` detecta el cambio en el siguiente ciclo, identifica las maletas en el almacén que iban a usar ese vuelo, y las devuelve al pool de planificación.
7. El mapa muestra los aviones de esos lotes desapareciendo de su ruta antigua y, tras unos segundos (replanificación), apareciendo en rutas nuevas si hay disponibilidad.

## 5. Consideraciones de Integridad y Validación
- **Bloqueo de Vuelos Pasados:** Se implementará una validación tanto en el Frontend como en el Backend para impedir la cancelación de vuelos cuya hora de salida sea anterior al tiempo actual de la simulación (`departureTime < currentSimTime`). El botón de cancelar estará deshabilitado para estos casos.
- **Eficiencia de Datos (API vs WS):** Aunque los vuelos son fijos y repetitivos, el frontend no los tiene todos en memoria para evitar sobrecargar el navegador. El uso de un API REST puntual (`GET`) es preferible a enviar el plan maestro completo por WebSockets, lo cual saturaría el canal de comunicación en tiempo real.
- **Temporalidad:** Confirmar que `restaurarVuelosEnBD()` se ejecute correctamente al inicio de cada nuevo día de simulación para que la cancelación no sea permanente.
- **SLA:** Las maletas rescatadas deben mantener su `deadline` original para que el ALNS priorice su entrega urgente.
