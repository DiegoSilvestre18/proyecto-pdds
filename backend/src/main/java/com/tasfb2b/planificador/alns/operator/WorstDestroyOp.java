package com.tasfb2b.planificador.alns.operator;

import com.tasfb2b.planificador.domain.Route;
import com.tasfb2b.superlote.domain.SuperLot;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Operador de destrucción: elimina los q lotes con mayor delay o sin ruta asignada.
 * Útil para mejorar soluciones con muchos SLA incumplidos.
 */
public class WorstDestroyOp implements DestroyOperator {

    @Override
    public List<SuperLot> destroy(List<Route> routes, int q, Random rng) {
        if (routes.isEmpty()) return List.of();

        // Ordenar: primero los noAtendidos, luego por delayHoras descendente
        routes.sort(Comparator
                .comparing(Route::isNoAtendido).reversed()
                .thenComparingDouble(Route::getDelayHoras).reversed());

        int toRemove = Math.min(q, routes.size());
        List<SuperLot> removed = new ArrayList<>();

        for (int i = 0; i < toRemove; i++) {
            removed.add(routes.get(0).getLot());
            routes.remove(0);
        }
        return removed;
    }

    @Override
    public String name() {
        return "WorstDestroy";
    }
}
