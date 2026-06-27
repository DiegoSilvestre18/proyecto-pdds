import React, { useEffect, useRef, useState } from "react";
import { SkeletonList, Spinner, EmptyState } from "../common/Skeleton";


const PAGE_SIZE = 50;

const ShipmentsPanel = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchOrigin, setSearchOrigin] = useState("");
    const [searchCode, setSearchCode] = useState("");

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const containerRef = useRef(null);
    const scrollTimerRef = useRef(null);

    const fetchShipments = async (pageToLoad = 0, reset = false) => {
        if (loading) return;

        setLoading(true);

        try {
            const params = new URLSearchParams({
                page: pageToLoad,
                size: PAGE_SIZE,
            });

            if (searchOrigin) params.append("origen", searchOrigin);
            if (searchCode) params.append("codigo", searchCode);

            const res = await fetch(`/api/v1/envios?${params.toString()}`);
            const data = await res.json();

            setHasMore(!data.last);
            setShipments(prev =>
                reset ? data.content : [...prev, ...data.content]
            );
            setPage(pageToLoad);
        } catch (err) {
            console.error("Error cargando envíos", err);
        } finally {
            setLoading(false);
        }
    };

    // Búsqueda con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchShipments(0, true);   // ← solo 2 args, reset=true real
        }, 300);

        return () => clearTimeout(timer);
    }, [searchOrigin, searchCode]);

    // Scroll infinito con debounce (antes disparaba en cada evento de scroll).
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = () => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(() => {
                const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
                if (bottom && !loading && hasMore) {
                    fetchShipments(page + 1, false);
                }
            }, 150);
        };

        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", handleScroll);
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, [page, loading, hasMore, searchOrigin, searchCode]);

    return (
        <div style={{ padding: "12px", color: "#e2e8f0", display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#f8fafc' }}>Envíos</h3>
                {/* Indicador de refresco: solo cuando ya hay datos en pantalla. */}
                {loading && shipments.length > 0 && <Spinner size={14} label="Actualizando envíos…" />}
            </div>

            {/* SEARCH */}
            <div style={{ display: "flex", gap: "6px" }}>
                <input
                    placeholder="Origen (SKBO)"
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value.toUpperCase())}
                    style={{
                        flex: 1, padding: '6px 8px', borderRadius: '6px', fontSize: '12px',
                        background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', outline: 'none'
                    }}
                />

                <input
                    placeholder="Código"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    style={{
                        flex: 1, padding: '6px 8px', borderRadius: '6px', fontSize: '12px',
                        background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', outline: 'none'
                    }}
                />
            </div>

            {/* LISTA */}
            <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Carga inicial: skeleton en lugar de hueco vacío. */}
                {loading && shipments.length === 0 && (
                    <SkeletonList rows={8} rowHeight={46} label="Cargando envíos…" />
                )}

                {/* Empty state: búsqueda sin resultados o sin envíos. */}
                {!loading && shipments.length === 0 && (
                    <EmptyState
                        icon="📦"
                        title={searchOrigin || searchCode ? 'Sin envíos que coincidan' : 'No hay envíos'}
                        hint={searchOrigin || searchCode ? 'Ajusta los filtros de búsqueda.' : null}
                    />
                )}

                {shipments.map((shipment) => {
                    return (
                        <div
                            key={shipment.id}
                            style={{
                                padding: "6px 8px",
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}
                        >
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>{shipment.codigoPedido}</div>

                            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                {shipment.origenIcao} ➔ {shipment.destinoIcao}
                            </div>

                            <div style={{ fontSize: "10px", color: "#64748b" }}>
                                {shipment.cantidadMaletas} maletas
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Paginación: indicador al cargar más páginas. */}
            {loading && shipments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: "12px", marginTop: "10px", color: '#94a3b8' }}>
                    <Spinner size={14} label="Cargando más…" /> Cargando más…
                </div>
            )}
        </div>
    );
};

export default React.memo(ShipmentsPanel);