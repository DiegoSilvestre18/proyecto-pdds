import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { SkeletonList, Spinner, EmptyState } from "../common/Skeleton";
import { apiFetch } from "../../hooks/api";
import { useSelectionBridge } from "../../hooks/useSelectionBridge";

const PAGE_SIZE = 50;

const STATUS_META = {
    SIN_ASIGNAR:           { label: "Sin asignar",        color: "#64748b" },
    PLANIFICADO:           { label: "Planificado",        color: "#64748b" },
    EN_ALMACEN_ORIGEN:     { label: "Almacén origen",     color: "#f59e0b" },
    EN_ALMACEN_INTERMEDIO: { label: "Almacén intermedio", color: "#fb923c" },
    EN_VUELO:              { label: "En vuelo",           color: "#10b981" },
    EN_ALMACEN_DESTINO:    { label: "Almacén destino",    color: "#3b82f6" },
    ENTREGADO:             { label: "Entregado",          color: "#22c55e" },
    REPLANIFICACION:       { label: "Replanificación",    color: "#ef4444" },
};

function summarize(list) {
    if (!list || list.length === 0) return null;
    const counts = {};
    list.forEach((s) => { counts[s.estado] = (counts[s.estado] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { dominant: sorted[0][0], dominantCount: sorted[0][1], total: list.length, mixed: sorted.length > 1 };
}

function pickPrimaryBag(list) {
    if (!list || list.length === 0) return null;
    return (
        list.find((s) => s.estado === "EN_VUELO") ||
        list.find((s) => s.estado?.startsWith("EN_ALMACEN")) ||
        list[0]
    );
}

function formatTime(ms) {
    if (!ms) return "—";
    return new Date(ms).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const ShipmentsPanel = ({ sessionId, airports, onSelectFlight, onAirportSelect }) => {
    const { setFocusedEntity, dispatchMapCommand } = useSelectionBridge();

    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchOrigin, setSearchOrigin] = useState("");
    const [searchCode, setSearchCode] = useState("");
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [statusByShipment, setStatusByShipment] = useState({});
    const [hopsByShipment, setHopsByShipment] = useState({});
    const [expandedCode, setExpandedCode] = useState(null);
    const [expandedBagId, setExpandedBagId] = useState(null);

    const [auditViolations, setAuditViolations] = useState([]);
    const [showAudit, setShowAudit] = useState(false);

    const containerRef = useRef(null);
    const scrollTimerRef = useRef(null);
    const shipmentsRef = useRef(shipments);
    useEffect(() => { shipmentsRef.current = shipments; }, [shipments]);

    // ── Carga paginada de envíos (catálogo) ─────────────────────────────────
    const fetchShipments = async (pageToLoad = 0, reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pageToLoad, size: PAGE_SIZE });
            if (searchOrigin) params.append("origen", searchOrigin);
            if (searchCode) params.append("codigo", searchCode);

            const res = await fetch(`/api/v1/envios?${params.toString()}`);
            const data = await res.json();

            setHasMore(!data.last);
            setShipments((prev) => (reset ? data.content : [...prev, ...data.content]));
            setPage(pageToLoad);
        } catch (err) {
            console.error("Error cargando envíos", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchShipments(0, true), 300);
        return () => clearTimeout(timer);
    }, [searchOrigin, searchCode]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleScroll = () => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(() => {
                const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
                if (bottom && !loading && hasMore) fetchShipments(page + 1, false);
            }, 150);
        };
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", handleScroll);
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, [page, loading, hasMore, searchOrigin, searchCode]);

    // ── Estado de trazabilidad por lote (status-batch) ──────────────────────
    const fetchStatusBatch = useCallback(async (codigos) => {
        if (!sessionId || codigos.length === 0) return;
        try {
            const res = await apiFetch(`/api/shipments/${sessionId}/status-batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(codigos),
            });
            if (!res.ok) return;
            const data = await res.json();
            setStatusByShipment((prev) => ({ ...prev, ...data }));
        } catch (err) {
            console.error("Error cargando estado de envíos", err);
        }
    }, [sessionId]);

    // refresca estado cuando cambia la lista de envíos visibles
    useEffect(() => {
        if (shipments.length === 0) return;
        fetchStatusBatch(shipments.map((s) => s.codigoPedido));
    }, [shipments, fetchStatusBatch]);

    const fetchHops = useCallback(async (codigo) => {
        if (!sessionId) return;
        try {
            const res = await apiFetch(`/api/shipments/${sessionId}/shipment/${codigo}/hops`);
            if (res.ok) {
                const data = await res.json();
                setHopsByShipment((prev) => ({ ...prev, [codigo]: data }));
            }
        } catch (err) {
            console.error("Error cargando escalas", err);
        }
    }, [sessionId]);

    // polling: mantiene vivo el estado de lo visible + lo expandido
    useEffect(() => {
        if (!sessionId) return;
        const id = setInterval(() => {
            if (shipmentsRef.current.length > 0) {
                fetchStatusBatch(shipmentsRef.current.map((s) => s.codigoPedido));
            }
            if (expandedCode) fetchHops(expandedCode);
        }, 4000);
        return () => clearInterval(id);
    }, [sessionId, fetchStatusBatch, fetchHops, expandedCode]);

    // ── Auditoría de consistencia (Recomendación 1) ─────────────────────────
    useEffect(() => {
        if (!sessionId) return;
        const check = async () => {
            try {
                const res = await apiFetch(`/api/shipments/${sessionId}/audit`);
                if (res.ok) setAuditViolations(await res.json());
            } catch (err) { /* silencioso, es solo diagnóstico */ }
        };
        check();
        const id = setInterval(check, 5000);
        return () => clearInterval(id);
    }, [sessionId]);

    // ── Navegación: localizar maleta en mapa ────────────────────────────────
    const handleLocate = useCallback((bagState) => {
        if (!bagState) return;
        if (bagState.estado === "EN_VUELO") {
            if (!bagState.vueloInstanceActual) return;
            const targetId = `vuelo-${bagState.vueloInstanceActual}`;
            setFocusedEntity("flight", targetId, "panel");
            onSelectFlight?.(targetId);
            return;
        }
        if (bagState.estado?.startsWith("EN_ALMACEN")) {
            const icao = bagState.aeropuertoActual;
            if (!icao) return;
            const ap = airports?.find((a) => a.icao === icao);
            setFocusedEntity("airport", icao, "panel");
            onAirportSelect?.(icao);
            if (ap?.coordinates) {
                dispatchMapCommand("flyTo", { coordinates: ap.coordinates, zoom: 5, targetId: icao });
            }
        }
    }, [airports, onSelectFlight, onAirportSelect, setFocusedEntity, dispatchMapCommand]);

    const toggleExpand = (codigo) => {
        setExpandedBagId(null);
        setExpandedCode((prev) => {
            const next = prev === codigo ? null : codigo;
            if (next && !hopsByShipment[next]) fetchHops(next);
            if (next && !statusByShipment[next]) fetchStatusBatch([next]);
            return next;
        });
    };

    const expandedShipmentMeta = shipments.find((s) => s.codigoPedido === expandedCode);
    const totalBags = expandedShipmentMeta?.cantidadMaletas ?? 0;
    const statusList = statusByShipment[expandedCode] || [];
    const statusByBagId = useMemo(() => {
        const m = new Map();
        statusList.forEach((s) => m.set(s.bagId, s));
        return m;
    }, [statusList]);
    const hopsMap = hopsByShipment[expandedCode] || {};
    const expandedBagIds = useMemo(
        () => Array.from({ length: totalBags }, (_, i) => `${expandedCode}-${i + 1}`),
        [expandedCode, totalBags]
    );

    return (
        <div style={{ padding: "8px", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: "4px", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ margin: 0, fontSize: "12px", color: "#f8fafc" }}>Envíos</h3>
                {loading && shipments.length > 0 && <Spinner size={12} label="Actualizando…" />}
                {sessionId && (
                    <span
                        onClick={() => setShowAudit((v) => !v)}
                        title="Auditoría de consistencia de trazabilidad"
                        style={{
                            marginLeft: "auto", fontSize: "10px", cursor: "pointer", padding: "2px 6px", borderRadius: "10px",
                            background: auditViolations.length > 0 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: auditViolations.length > 0 ? "#ef4444" : "#10b981",
                            border: `1px solid ${auditViolations.length > 0 ? "#ef4444" : "#10b981"}`,
                        }}
                    >
            {auditViolations.length > 0 ? `⚠ ${auditViolations.length} inconsist.` : "✓ Sincronizado"}
          </span>
                )}
            </div>

            {showAudit && (
                <div style={{ fontSize: "10px", maxHeight: "100px", overflowY: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "4px", padding: "6px" }}>
                    {auditViolations.length === 0
                        ? <span style={{ color: "#64748b" }}>Sin inconsistencias detectadas.</span>
                        : auditViolations.map((v, i) => (
                            <div key={i} style={{ color: "#fca5a5", padding: "1px 0" }}>{v.bagId}: {v.reason}</div>
                        ))}
                </div>
            )}

            <div style={{ display: "flex", gap: "4px" }}>
                <input
                    placeholder="Origen"
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: "4px 6px", borderRadius: "4px", fontSize: "11px", background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
                />
                <input
                    placeholder="Código"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    style={{ flex: 1, padding: "4px 6px", borderRadius: "4px", fontSize: "11px", background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
                />
            </div>

            <div ref={containerRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                {loading && shipments.length === 0 && <SkeletonList rows={10} rowHeight={28} label="Cargando envíos…" />}
                {!loading && shipments.length === 0 && (
                    <EmptyState icon="📦" title={searchOrigin || searchCode ? "Sin resultados" : "No hay envíos"} hint={searchOrigin || searchCode ? "Ajusta los filtros." : null} />
                )}

                {shipments.map((shipment) => {
                    const codigo = shipment.codigoPedido;
                    const summary = summarize(statusByShipment[codigo]);
                    const isExpanded = expandedCode === codigo;

                    return (
                        <div key={shipment.id} style={{ background: "rgba(255,255,255,0.02)", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div
                                onClick={() => toggleExpand(codigo)}
                                style={{ padding: "4px 6px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                            >
                                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#38bdf8", minWidth: "90px" }}>{codigo}</span>
                                <span style={{ fontSize: "10px", color: "#cbd5e1", whiteSpace: "nowrap" }}>{shipment.origenIcao}→{shipment.destinoIcao}</span>

                                {summary && (
                                    <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "8px", background: `${STATUS_META[summary.dominant]?.color}20`, color: STATUS_META[summary.dominant]?.color, border: `1px solid ${STATUS_META[summary.dominant]?.color}` }}>
                    {STATUS_META[summary.dominant]?.label}{summary.mixed ? ` (+${summary.total - summary.dominantCount})` : ""}
                  </span>
                                )}

                                <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>{shipment.cantidadMaletas} maletas</span>

                                {summary && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleLocate(pickPrimaryBag(statusByShipment[codigo])); }}
                                        title="Localizar en el mapa"
                                        style={{ background: "transparent", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "12px", padding: "0 2px" }}
                                    >
                                        📍
                                    </button>
                                )}
                            </div>

                            {isExpanded && (
                                <div style={{ padding: "6px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
                                    {totalBags === 0 ? (
                                        <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>Sin maletas registradas.</div>
                                    ) : (
                                        expandedBagIds.map((bagId) => {
                                            const bagState = statusByBagId.get(bagId);
                                            const meta = bagState ? STATUS_META[bagState.estado] : STATUS_META.SIN_ASIGNAR;
                                            const isBagExpanded = expandedBagId === bagId;
                                            const hops = hopsMap[bagId] || [];

                                            return (
                                                <div key={bagId} style={{ marginBottom: "3px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", padding: "2px 0" }}>
                                                        <span style={{ color: "#94a3b8", minWidth: "85px" }}>{bagId}</span>
                                                        <span style={{ padding: "1px 6px", borderRadius: "8px", background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}` }}>
                              {bagState ? meta.label : "Pendiente de planificación"}
                            </span>
                                                        {bagState && bagState.aeropuertoActual && (
                                                            <span style={{ color: "#64748b" }}>{bagState.aeropuertoActual}</span>
                                                        )}
                                                        {bagState && (bagState.estado === "EN_VUELO" || bagState.estado?.startsWith("EN_ALMACEN")) && (
                                                            <button
                                                                onClick={() => handleLocate(bagState)}
                                                                title="Localizar en el mapa"
                                                                style={{ background: "transparent", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "11px" }}
                                                            >
                                                                📍
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setExpandedBagId(isBagExpanded ? null : bagId)}
                                                            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "10px" }}
                                                        >
                                                            {isBagExpanded ? "▴ ocultar ruta" : "▾ ver ruta"}
                                                        </button>
                                                    </div>

                                                    {isBagExpanded && (
                                                        <div style={{ paddingLeft: "12px", borderLeft: "2px solid rgba(255,255,255,0.06)", marginTop: "2px" }}>
                                                            {hops.length === 0 ? (
                                                                <div style={{ fontSize: "9px", color: "#64748b", fontStyle: "italic" }}>Aún sin ruta comprometida.</div>
                                                            ) : (
                                                                hops.map((h, i) => (
                                                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#9ca3af", padding: "1px 0" }}>
                                                                        <span>✈ Vuelo {h.vueloId}: {h.origenIcao} → {h.destinoIcao}</span>
                                                                        <span>{formatTime(h.departureTime)} → {formatTime(h.arrivalTime)}</span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {loading && shipments.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#94a3b8" }}>
                    <Spinner size={10} label="Cargando…" /> Cargando más…
                </div>
            )}
        </div>
    );
};

export default React.memo(ShipmentsPanel);