import React, { useState, useCallback } from "react";
import { apiFetch } from "../../hooks/api";
import { useSelectionBridge } from "../../hooks/useSelectionBridge";
import { Spinner } from "../common/Skeleton";
import { AIRPORT_BY_ICAO } from "../../data/airportsData";

function formatTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const inputStyle = {
  flex: 1, padding: "4px 6px", borderRadius: "4px", fontSize: "11px",
  background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.1)",
  color: "white", outline: "none",
}

const btnStyle = {
  padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold",
  cursor: "pointer", border: "none", whiteSpace: "nowrap",
}

const sectionStyle = {
  background: "rgba(255,255,255,0.02)", borderRadius: "4px", padding: "6px",
  border: "1px solid rgba(255,255,255,0.04)",
}

const TrackingPanel = ({ sessionId }) => {
  const { setTrackedRoute, clearTrackedRoute, trackedRoute, dispatchMapCommand } = useSelectionBridge();

  const [bagId, setBagId] = useState("")
  const [bagHops, setBagHops] = useState(null)
  const [bagLoading, setBagLoading] = useState(false)
  const [bagError, setBagError] = useState(null)
  const [bagSearched, setBagSearched] = useState(false)

  const [shipCode, setShipCode] = useState("")
  const [shipHops, setShipHops] = useState(null)
  const [shipLoading, setShipLoading] = useState(false)
  const [shipError, setShipError] = useState(null)
  const [shipSearched, setShipSearched] = useState(false)

  const [displayHops, setDisplayHops] = useState(null)
  const [displayLabel, setDisplayLabel] = useState("")

  const searchBag = useCallback(async () => {
    const q = bagId.trim()
    if (!q || !sessionId) return
    setBagLoading(true)
    setBagError(null)
    setBagHops(null)
    setBagSearched(true)
    try {
      const res = await apiFetch(`/api/shipments/${sessionId}/bag/${q}/hops`)
      if (res.ok) {
        setBagHops(await res.json())
      } else {
        const text = await res.text()
        setBagError(text || "Maleta no encontrada")
      }
    } catch {
      setBagError("Error de conexión")
    } finally {
      setBagLoading(false)
    }
  }, [bagId, sessionId])

  const showBagRoute = useCallback(() => {
    if (!bagHops || bagHops.length === 0) return
    setTrackedRoute({
      shipmentId: bagId.trim(),
      hops: bagHops.map(h => ({
        from: h.origenIcao,
        to: h.destinoIcao,
        flightId: String(h.vueloId || h.flightInstanceKey || ""),
        status: "normal",
      })),
    })
    setDisplayHops(bagHops)
    setDisplayLabel(`Maleta ${bagId.trim()}`)
    const coords = bagHops.flatMap(h => {
      const a = AIRPORT_BY_ICAO[h.origenIcao]
      const b = AIRPORT_BY_ICAO[h.destinoIcao]
      return [a, b].filter(Boolean).map(x => x.coordinates)
    })
    if (coords.length > 0) {
      const sum = coords.reduce(([ax, ay], [bx, by]) => [ax + bx, ay + by], [0, 0])
      dispatchMapCommand("flyTo", { coordinates: [sum[0] / coords.length, sum[1] / coords.length], zoom: 3 })
    }
  }, [bagHops, bagId, setTrackedRoute, dispatchMapCommand])

  const searchShip = useCallback(async () => {
    const q = shipCode.trim()
    if (!q || !sessionId) return
    setShipLoading(true)
    setShipError(null)
    setShipHops(null)
    setShipSearched(true)
    try {
      const res = await apiFetch(`/api/shipments/${sessionId}/shipment/${q}/hops`)
      if (res.ok) {
        setShipHops(await res.json())
      } else {
        setShipError("Envío no encontrado")
      }
    } catch {
      setShipError("Error de conexión")
    } finally {
      setShipLoading(false)
    }
  }, [shipCode, sessionId])

  const showShipRoute = useCallback(() => {
    if (!shipHops) return
    const entries = Object.entries(shipHops)
    if (entries.length === 0) return
    const hops = entries[0][1]
    if (!hops || hops.length === 0) return
    setTrackedRoute({
      shipmentId: shipCode.trim(),
      hops: hops.map(h => ({
        from: h.origenIcao,
        to: h.destinoIcao,
        flightId: String(h.vueloId || h.flightInstanceKey || ""),
        status: "normal",
      })),
    })
    setDisplayHops(hops)
    setDisplayLabel(`Envío ${shipCode.trim()}`)
    const coords = hops.flatMap(h => {
      const a = AIRPORT_BY_ICAO[h.origenIcao]
      const b = AIRPORT_BY_ICAO[h.destinoIcao]
      return [a, b].filter(Boolean).map(x => x.coordinates)
    })
    if (coords.length > 0) {
      const sum = coords.reduce(([ax, ay], [bx, by]) => [ax + bx, ay + by], [0, 0])
      dispatchMapCommand("flyTo", { coordinates: [sum[0] / coords.length, sum[1] / coords.length], zoom: 3 })
    }
  }, [shipHops, shipCode, setTrackedRoute, dispatchMapCommand])

  const clearAll = useCallback(() => {
    clearTrackedRoute()
    setDisplayHops(null)
    setDisplayLabel("")
  }, [clearTrackedRoute])

  const clearBagResults = useCallback(() => {
    setBagHops(null)
    setBagError(null)
    setBagSearched(false)
    if (displayLabel?.startsWith("Maleta")) clearAll()
  }, [displayLabel, clearAll])

  const clearShipResults = useCallback(() => {
    setShipHops(null)
    setShipError(null)
    setShipSearched(false)
    if (displayLabel?.startsWith("Envío")) clearAll()
  }, [displayLabel, clearAll])

  const renderHops = (hops) => {
    if (!hops || hops.length === 0) return null
    return hops.map((h, i) => (
      <div key={i} style={{
        display: "flex", justifyContent: "space-between", fontSize: "9px",
        color: "#9ca3af", padding: "2px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <span>
          <span style={{ color: "#64748b", marginRight: 4 }}>{i + 1}.</span>
          ✈ {h.vueloId || "—"}: {h.origenIcao} → {h.destinoIcao}
        </span>
        <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {formatTime(h.departureTime)} → {formatTime(h.arrivalTime)}
        </span>
      </div>
    ))
  }

  return (
    <div style={{ padding: "8px", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: "8px", height: "100%", fontSize: "11px" }}>
      <h3 style={{ margin: 0, fontSize: "12px", color: "#f8fafc" }}>Seguimiento de Rutas</h3>

      {/* ── Ruta activa ── */}
      {(trackedRoute || displayHops) && (
        <div style={{ background: "rgba(167,139,250,0.08)", borderRadius: "4px", padding: "6px", border: "1px solid rgba(167,139,250,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#a78bfa" }}>
              Ruta activa: {displayLabel || trackedRoute?.shipmentId || "—"}
            </span>
            <button
              onClick={clearAll}
              style={{ background: "transparent", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", cursor: "pointer", borderRadius: "4px", padding: "2px 8px", fontSize: "10px" }}
            >
              Limpiar
            </button>
          </div>
          {displayHops ? (
            <>
              <div style={{ fontSize: "9px", color: "#c4b5fd", marginBottom: 2 }}>{displayHops.length} escala(s)</div>
              {renderHops(displayHops)}
            </>
          ) : trackedRoute?.hops && (
            <>
              <div style={{ fontSize: "9px", color: "#c4b5fd", marginBottom: 2 }}>{trackedRoute.hops.length} escala(s)</div>
              {trackedRoute.hops.map((h, i) => (
                <div key={i} style={{
                  display: "flex", fontSize: "9px", color: "#9ca3af", padding: "1px 0",
                }}>
                  <span style={{ color: "#64748b", marginRight: 4 }}>{i + 1}.</span>
                  {h.from} → {h.to}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Sección Maleta ── */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: "bold", fontSize: "10px", color: "#38bdf8", marginBottom: 4 }}>Rastrear Maleta</div>
        <div style={{ display: "flex", gap: "4px", marginBottom: 4 }}>
          <input
            placeholder="ID de maleta (ej: LIM_C001-1)"
            value={bagId}
            onChange={e => setBagId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchBag()}
            style={inputStyle}
          />
          <button onClick={searchBag} disabled={bagLoading} style={{ ...btnStyle, background: bagLoading ? "#334155" : "#0ea5e9", color: "white" }}>
            {bagLoading ? "..." : "Buscar"}
          </button>
        </div>
        {bagError && <div style={{ fontSize: "10px", color: "#fca5a5", padding: "2px 0" }}>{bagError}</div>}
        {bagLoading && <Spinner size={10} label="Buscando maleta…" />}
        {!bagLoading && bagSearched && bagHops !== null && (
          bagHops.length === 0
            ? <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>Sin ruta registrada.</div>
            : <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "4px", padding: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: "9px", color: "#64748b" }}>Escalas ({bagHops.length})</span>
                  <span onClick={clearBagResults} style={{ cursor: "pointer", color: "#64748b", fontSize: "11px", lineHeight: 1, padding: "0 2px" }} title="Limpiar búsqueda">×</span>
                </div>
                {renderHops(bagHops)}
                <button onClick={showBagRoute} style={{ ...btnStyle, background: "#7c3aed", color: "white", marginTop: 4, width: "100%" }}>
                  Mostrar en mapa
                </button>
              </div>
        )}
      </div>

      {/* ── Sección Envío ── */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: "bold", fontSize: "10px", color: "#10b981", marginBottom: 4 }}>Rastrear Envío</div>
        <div style={{ display: "flex", gap: "4px", marginBottom: 4 }}>
          <input
            placeholder="Código de envío (ej: LIM_C001)"
            value={shipCode}
            onChange={e => setShipCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchShip()}
            style={inputStyle}
          />
          <button onClick={searchShip} disabled={shipLoading} style={{ ...btnStyle, background: shipLoading ? "#334155" : "#10b981", color: "white" }}>
            {shipLoading ? "..." : "Buscar"}
          </button>
        </div>
        {shipError && <div style={{ fontSize: "10px", color: "#fca5a5", padding: "2px 0" }}>{shipError}</div>}
        {shipLoading && <Spinner size={10} label="Buscando envío…" />}
        {!shipLoading && shipSearched && shipHops !== null && (
          Object.keys(shipHops).length === 0
            ? <div style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>Sin envíos registrados.</div>
            : <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "4px", padding: "4px", maxHeight: 200, overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "9px", color: "#64748b" }}>Maletas ({Object.keys(shipHops).length})</span>
                  <span onClick={clearShipResults} style={{ cursor: "pointer", color: "#64748b", fontSize: "11px", lineHeight: 1, padding: "0 2px" }} title="Limpiar búsqueda">×</span>
                </div>
                {Object.entries(shipHops).map(([bagId, hops]) => (
                  <div key={bagId} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "bold", marginBottom: 2 }}>{bagId}</div>
                    {hops.length === 0
                      ? <div style={{ fontSize: "9px", color: "#64748b", fontStyle: "italic", paddingLeft: 8 }}>Sin ruta.</div>
                      : renderHops(hops)
                    }
                  </div>
                ))}
                <button onClick={showShipRoute} style={{ ...btnStyle, background: "#7c3aed", color: "white", marginTop: 4, width: "100%" }}>
                  Mostrar ruta en mapa
                </button>
              </div>
        )}
      </div>
    </div>
  )
}

export default TrackingPanel
