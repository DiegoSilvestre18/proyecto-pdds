package com.tasfb2b.planificador.strategy;

import com.tasfb2b.aeropuerto.domain.Aeropuerto;
import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.vuelo.domain.Vuelo;
import com.tasfb2b.vuelo.repository.VueloRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.PriorityQueue;
import java.util.Comparator;
import java.util.Set;
import java.util.Collections;

@Component
public class NetworkAdapterImpl implements NetworkAdapter {

    private final VueloRepository repo;
    // Volatile para asegurar visibilidad entre hilos sin bloquear findBestRoute
    private volatile Map<String, List<Vuelo>> graph;

    public NetworkAdapterImpl(VueloRepository repo) {
        this.repo = repo;
    }

    private Map<String, List<Vuelo>> getGraph() {
        if (graph == null) {
            synchronized (this) {
                if (graph == null) {
                    List<Vuelo> vuelos = repo.findAll();
                    Map<String, List<Vuelo>> tempGraph = new HashMap<>();
                    for (Vuelo v : vuelos) {
                        tempGraph.computeIfAbsent(
                                v.getOrigen().getIcaoCode(),
                                k -> new ArrayList<>()
                        ).add(v);
                    }
                    graph = Map.copyOf(tempGraph); // Grafo inmutable
                }
            }
        }
        return graph;
    }

    @Override
    public List<Vuelo> findBestRoute(Aeropuerto origen, Aeropuerto destino, SuperLot lot) {
        // 1. ELIMINADO EL CACHE: Evita inconsistencias y OOM.
        // 2. DETERMINISMO: Usamos el tiempo del lote, no el del sistema.
        return calcularRuta(origen, destino, lot.getReadyTime(), Collections.emptySet());
    }

    @Override
    public List<Vuelo> findAlternativeRoute(Aeropuerto origen,
                                             Aeropuerto destino,
                                             SuperLot lot,
                                             Set<Long> excludedFlightIds) {
        return calcularRuta(origen, destino, lot.getReadyTime(), excludedFlightIds);
    }

    @Override
    public void invalidateGraph() {
        synchronized (this) {
            graph = null;
        }
    }

    // ─────────────────────────────────────────────────────────
    // NÚCLEO: Dijkstra con exclusión de vuelos
    // excludedFlightIds: vacío para ruta principal, lleno para backup
    // ─────────────────────────────────────────────────────────
    private List<Vuelo> calcularRuta(Aeropuerto origen,
                                     Aeropuerto destino,
                                     long startTime,
                                     Set<Long> excludedFlightIds) {

        Map<String, List<Vuelo>> localGraph = getGraph();
        String destIcao = destino.getIcaoCode();

        PriorityQueue<Node> pq = new PriorityQueue<>(Comparator.comparingLong(n -> n.time));
        Map<String, Long> bestTime = new HashMap<>();
        Map<String, Vuelo> prevFlight = new HashMap<>();

        pq.add(new Node(origen.getIcaoCode(), startTime));
        bestTime.put(origen.getIcaoCode(), startTime);

        // Eliminamos maxIter. Con un grafo de ~3k nodos, Dijkstra converge rápido.
        while (!pq.isEmpty()) {
            Node current = pq.poll();

            if (current.time > bestTime.getOrDefault(current.airport, Long.MAX_VALUE)) continue;
            if (current.airport.equals(destIcao)) break;

            for (Vuelo v : localGraph.getOrDefault(current.airport, List.of())) {
                if (Boolean.TRUE.equals(v.getCancelled())) continue;
                if (excludedFlightIds.contains(v.getId())) continue;  // exclusión para backup

                long wait = calcularEsperaMatematica(current.time, v);
                long newTime = current.time + wait + v.getDuracionMs();
                String next = v.getDestino().getIcaoCode();

                if (newTime < bestTime.getOrDefault(next, Long.MAX_VALUE)) {
                    bestTime.put(next, newTime);
                    prevFlight.put(next, v);
                    pq.add(new Node(next, newTime));
                }
            }
        }

        return reconstruirRuta(prevFlight, origen.getIcaoCode(), destIcao);
    }

    private long calcularEsperaMatematica(long currentTime, Vuelo v) {
        long dep = v.getDepartureEpoch();
        if (currentTime <= dep) return dep - currentTime;

        // Aritmética en lugar de bucle while
        long periodoMs = 24L * 60 * 60 * 1000;
        long diff = currentTime - dep;
        long saltosNecesarios = (diff / periodoMs) + 1;

        return (dep + (saltosNecesarios * periodoMs)) - currentTime;
    }

    private List<Vuelo> reconstruirRuta(Map<String, Vuelo> prev, String origen, String destino) {
        LinkedList<Vuelo> path = new LinkedList<>();
        String curr = destino;

        while (curr != null && !curr.equals(origen)) {
            Vuelo v = prev.get(curr);
            if (v == null) return List.of();
            path.addFirst(v); // Más eficiente en LinkedList que add(0, v)
            curr = v.getOrigen().getIcaoCode();
        }
        return path;
    }

    private static record Node(String airport, long time) {}
}
