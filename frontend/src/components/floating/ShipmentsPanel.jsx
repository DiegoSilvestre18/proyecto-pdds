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

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchShipments(0, true);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchOrigin, searchCode]);

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
        <div style={{ padding: "8px", color: "#e2e8f0", display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '12px', color: '#f8fafc' }}>Envíos</h3>
                {loading && shipments.length > 0 && <Spinner size={12} label="Actualizando…" />}
            </div>

            <div style={{ display: "flex", gap: "4px" }}>
                <input
                    placeholder="Origen"
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value.toUpperCase())}
                    style={{
                        flex: 1, padding: '4px 6px', borderRadius: '4px', fontSize: '11px',
                        background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', outline: 'none'
                    }}
                />

                <input
                    placeholder="Código"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    style={{
                        flex: 1, padding: '4px 6px', borderRadius: '4px', fontSize: '11px',
                        background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', outline: 'none'
                    }}
                />
            </div>

            <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {loading && shipments.length === 0 && (
                    <SkeletonList rows={10} rowHeight={28} label="Cargando envíos…" />
                )}

                {!loading && shipments.length === 0 && (
                    <EmptyState
                        icon="📦"
                        title={searchOrigin || searchCode ? 'Sin resultados' : 'No hay envíos'}
                        hint={searchOrigin || searchCode ? 'Ajusta los filtros.' : null}
                    />
                )}

                {shipments.map((shipment) => {
                    return (
                        <div
                            key={shipment.id}
                            style={{
                                padding: "3px 6px",
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', minWidth: '90px' }}>{shipment.codigoPedido}</span>

                            <span style={{ fontSize: '10px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                                {shipment.origenIcao}→{shipment.destinoIcao}
                            </span>

                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                {shipment.cantidadMaletas} maletas
                            </span>
                        </div>
                    );
                })}
            </div>

            {loading && shipments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: "10px", color: '#94a3b8' }}>
                    <Spinner size={10} label="Cargando…" /> Cargando más…
                </div>
            )}
        </div>
    );
};

export default React.memo(ShipmentsPanel);
