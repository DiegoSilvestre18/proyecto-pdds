package com.tasfb2b.planificador.domain;

import com.tasfb2b.superlote.domain.SuperLot;
import com.tasfb2b.vuelo.domain.Vuelo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.ArrayList;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Route {

    private SuperLot lot;

    private List<String> hops;
    private List<Vuelo> flights;

    private int demandaTotal;
    private int capacidadAsignada;
    private long arrivalTime;
    private long deadline;
    private List<Long> legDepartures = new ArrayList<>();
    private List<Long> legArrivals = new ArrayList<>();

    @Builder.Default
    private String status = "normal";
    /**
     * Maletas específicas que ESTA ruta transporta (subconjunto de lot.getBagIds()).
     * Se sincroniza automáticamente cada vez que se llama setCapacidadAsignada(),
     *Si en algún punto
     * se construye una Route con Route.builder()...build() o con el constructor
     * @AllArgsConstructor directamente (sin pasar por setCapacidadAsignada),
     * bagIds NO se sincroniza automáticamente.
     */
    private List<String> bagIds;

    /**
     * Setter custom: cada vez que se fija la capacidad asignada, se re-recorta
     * bagIds para que coincida exactamente. Esto cubre tanto la asignación inicial
     * en RouteBuilder como los ajustes posteriores en resolverConflictosCapacidad.
     */
    public void setCapacidadAsignada(int capacidadAsignada) {
        this.capacidadAsignada = capacidadAsignada;
        if (lot != null && lot.getBagIds() != null && !lot.getBagIds().isEmpty()) {
            int n = Math.max(0, Math.min(capacidadAsignada, lot.getBagIds().size()));
            this.bagIds = new ArrayList<>(lot.getBagIds().subList(0, n));
        } else {
            this.bagIds = new ArrayList<>();
        }
    }

    // ── DERIVADOS ─────────────────────────────────────

    public boolean isIntercontinental() {
        return lot.isIntercontinental();
    }

    public double getPorcentajeAtendido() {
        if (capacidadAsignada == 0) return 0;
        return (double) demandaTotal / capacidadAsignada;
    }

    public int getExcesoCapacidad(){
        return demandaTotal-capacidadAsignada;
    }
    public long getDelayMs() {
        return Math.max(0, arrivalTime - deadline);
    }

    public double getDelayHoras() {
        return getDelayMs() / 3_600_000.0;
    }

    public boolean isAtendido() {
        return capacidadAsignada > 0;
    }

    public boolean isNoAtendido() {
        return capacidadAsignada == 0;
    }

    public boolean isTarde() {
        return arrivalTime > deadline;
    }

    /**
     * Retorna true si la ruta llega antes o exactamente en el deadline.
     * Usado para validar backup routes precalculadas.
     */
    public boolean isFeasibleArrival() {
        return arrivalTime > 0 && arrivalTime <= deadline;
    }

    //Demanda supera la capacidad
    public boolean excedeCapacidad() {
        return capacidadAsignada < demandaTotal;
    }

    // ── CONSISTENCIA ─────────────────────────────────

    public void validarConsistencia() {
        if (hops == null || flights == null) {
            throw new IllegalStateException("Route incompleta");
        }
        if (lot == null) throw new IllegalStateException("Lot null");
        if (flights.size() != hops.size() - 1) {
            throw new IllegalStateException(
                    "flights.size() debe ser hops.size() - 1"
            );
        }
    }

    public void calcularArrivalTime() {

        if (flights == null || flights.isEmpty()) {
            arrivalTime = -1L;
            return;
        }

        long currentTime = lot.getReadyTime();

        for (Vuelo v : flights) {

            long dep = v.calcularSiguienteSalida(currentTime);
            long arr = dep + v.getDuracionMs();

            currentTime = arr;
        }

        this.arrivalTime = currentTime;
    }

    public boolean isSinRuta() {
        return arrivalTime < 0;
    }

    public int getDemandaNoAtendida() {
        return Math.max(0, demandaTotal - capacidadAsignada);
    }

    /**
     * Limpia la ruta para evitar estado sucio al ser reciclada en el RoutePool.
     */
    public void clear() {
        this.lot = null;
        this.hops = null;
        this.flights = null;
        this.demandaTotal = 0;
        this.capacidadAsignada = 0;
        this.bagIds = new ArrayList<>();
        this.legDepartures = new ArrayList<>();
        this.legArrivals = new ArrayList<>();
        this.arrivalTime = 0;
        this.deadline = 0;
        this.status = "normal";
    }

    public long getDepartureTime() {
        if (flights == null || flights.isEmpty()) return -1L;
        // Obtenemos la salida real basada en el momento en que las maletas están listas
        return flights.get(0).calcularSiguienteSalida(lot.getReadyTime());
    }
}