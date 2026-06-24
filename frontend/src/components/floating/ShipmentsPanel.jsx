import React, { useEffect, useRef, useState } from "react";


const PAGE_SIZE = 50;

const ShipmentsPanel = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchOrigin, setSearchOrigin] = useState("");
    const [searchCode, setSearchCode] = useState("");

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const debounceRef = useRef(null);
    const observerRef = useRef(null);
    const lastItemRef = useRef(null);

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

    const containerRef = useRef(null);

    // Scroll infinito
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = () => {
            const bottom =
                el.scrollTop + el.clientHeight >= el.scrollHeight - 100;

            if (bottom && !loading && hasMore) {
                fetchShipments(page + 1, false);   // ← reset=false explícito y correcto
            }
        };

        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [page, loading, hasMore, searchOrigin, searchCode]);

    return (
        <div style={{ padding: "12px", color: "#e2e8f0" }}>
            <h3>Envíos</h3>

            {/* SEARCH */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                    placeholder="Origen (SKBO)"
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value.toUpperCase())}
                />

                <input
                    placeholder="Código"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                />
            </div>

            {/* LISTA */}
            <div>
                {shipments.map((shipment, index) => {
                    const isLast = index === shipments.length - 1;

                    return (
                        <div
                            key={shipment.id}
                            ref={isLast ? lastItemRef : null}
                            style={{
                                padding: "8px",
                                borderBottom: "1px solid #334155",
                            }}
                        >
                            <div><b>{shipment.codigoPedido}</b></div>

                            <div>
                                {shipment.origenIcao} ➔ {shipment.destinoIcao}
                            </div>

                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                {shipment.cantidadMaletas} maletas
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div style={{ fontSize: "12px", marginTop: "10px" }}>
                    Cargando...
                </div>
            )}
        </div>
    );
};

export default React.memo(ShipmentsPanel);