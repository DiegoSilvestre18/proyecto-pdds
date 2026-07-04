import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../../hooks/api';

function fmt(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

const COL = '60px 110px 110px 80px 80px 90px 28px';

function HeaderRow() {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: COL, gap: '0',
            padding: '6px 12px', fontSize: '10px', fontWeight: 'bold',
            color: '#64748b', background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            position: 'sticky', top: 0, zIndex: 1,
        }}>
            <span>ID Vuelo</span>
            <span>Hora Salida</span>
            <span>Hora Llegada</span>
            <span>Origen</span>
            <span>Destino</span>
            <span style={{ textAlign: 'right' }}>Maletas</span>
            <span />
        </div>
    );
}

export default function FinalPlanPanel({ plan = [], sessionId }) {
    const [search, setSearch]       = useState('');
    const [expandedKey, setExpandedKey] = useState(null);
    const [showBagsFor, setShowBagsFor] = useState(null);
    const [localPlan, setLocalPlan] = useState(plan);
    const [fetching, setFetching]   = useState(false);

    // Sincronizar cuando el prop cambia (al terminar la simulación)
    useEffect(() => { if (plan.length > 0) setLocalPlan(plan); }, [plan]);

    // Botón de diagnóstico: carga el plan actual sin esperar que termine
    const fetchCurrentPlan = useCallback(async () => {
        if (!sessionId) return;
        setFetching(true);
        try {
            const res = await apiFetch(`/api/v1/simulation/current-plan/${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) setLocalPlan(data);
                else alert('El plan aún está vacío. Espera al menos un ciclo de planificación.');
            }
        } catch (e) { console.error(e); }
        finally { setFetching(false); }
    }, [sessionId]);

    const filtered = useMemo(() => {
        if (!search) return localPlan;
        const q = search.toLowerCase();
        return localPlan.filter(f =>
            String(f.vueloId ?? '').includes(q) ||
            (f.from ?? '').toLowerCase().includes(q) ||
            (f.to  ?? '').toLowerCase().includes(q)
        );
    }, [localPlan, search]);

    const totals = useMemo(() => ({
        flights: localPlan.length,
        bags: localPlan.reduce((s, f) => s + (f.totalBags || 0), 0),
    }), [localPlan]);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            height: '100%', fontSize: '12px', color: '#e2e8f0',
        }}>

            {/* ── Barra superior ────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
            }}>
                {/* Resumen */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
          <span style={{ color: '#94a3b8' }}>
            Vuelos: <strong style={{ color: '#60a5fa' }}>{totals.flights}</strong>
          </span>
                    <span style={{ color: '#94a3b8' }}>
            Maletas: <strong style={{ color: '#10b981' }}>{totals.bags.toLocaleString()}</strong>
          </span>
                </div>

                {/* Búsqueda */}
                <input
                    placeholder="Filtrar por ID, origen o destino..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1, padding: '5px 10px', fontSize: '11px',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', borderRadius: '6px', outline: 'none',
                    }}
                />

                {/* Botón diagnóstico */}
                {sessionId && (
                    <button
                        onClick={fetchCurrentPlan}
                        disabled={fetching}
                        title="Carga el plan actual sin esperar que termine la simulación"
                        style={{
                            padding: '5px 12px', fontSize: '11px', fontWeight: 'bold',
                            border: '1px solid rgba(96,165,250,0.4)', borderRadius: '6px',
                            background: 'rgba(96,165,250,0.1)', color: '#60a5fa',
                            cursor: fetching ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        {fetching ? '...' : '↻ Cargar plan actual'}
                    </button>
                )}
            </div>

            {/* ── Cabecera de columnas ───────────────────────────── */}
            <div style={{ flexShrink: 0 }}>
                <HeaderRow />
            </div>

            {/* ── Lista ─────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

                {localPlan.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
                        {sessionId
                            ? 'Pulsa "↻ Cargar plan actual" para ver la planificación en curso.'
                            : 'La planificación final aparecerá al terminar la simulación.'}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#475569' }}>
                        Sin resultados para "{search}"
                    </div>
                ) : (
                    filtered.map(f => {
                        const key      = `${f.vueloId}-${f.departureTime}`;
                        const isExp    = expandedKey === key;
                        const bagList  = f.bagIds || [];
                        const showBags = showBagsFor === key;

                        return (
                            <div key={key} style={{
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                background: isExp ? 'rgba(96,165,250,0.04)' : 'transparent',
                            }}>
                                {/* Fila principal */}
                                <div
                                    onClick={() => { setExpandedKey(isExp ? null : key); if (isExp) setShowBagsFor(null); }}
                                    style={{
                                        display: 'grid', gridTemplateColumns: COL,
                                        gap: '0', padding: '8px 12px',
                                        cursor: 'pointer', alignItems: 'center',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                  <span style={{
                      fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold',
                      color: '#60a5fa',
                  }}>#{f.vueloId}</span>

                                    <span style={{ fontSize: '11px', color: '#34d399' }}>{fmt(f.departureTime)}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(f.arrivalTime)}</span>

                                    <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{f.from}</span>

                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#475569', fontSize: '10px' }}>→</span>
                    <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{f.to}</span>
                  </span>

                                    <span style={{
                                        textAlign: 'right', fontWeight: 'bold',
                                        color: (f.totalBags || 0) > 0 ? '#10b981' : '#64748b',
                                    }}>
                    {(f.totalBags || 0).toLocaleString()}
                  </span>

                                    <span style={{ textAlign: 'center', color: '#475569', fontSize: '11px' }}>
                    {isExp ? '▴' : '▾'}
                  </span>
                                </div>

                                {/* Detalle expandido */}
                                {isExp && (
                                    <div style={{
                                        padding: '8px 12px 10px 12px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderTop: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {bagList.length.toLocaleString()} maletas registradas en este vuelo
                      </span>
                                            {bagList.length > 0 && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setShowBagsFor(showBags ? null : key); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        color: '#60a5fa', borderRadius: '4px',
                                                        padding: '2px 10px', fontSize: '10px', cursor: 'pointer',
                                                    }}
                                                >
                                                    {showBags ? 'Ocultar maletas' : 'Ver maletas exactas'}
                                                </button>
                                            )}
                                        </div>

                                        {showBags && (
                                            <div style={{
                                                maxHeight: '140px', overflowY: 'auto',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                                gap: '2px', marginTop: '4px',
                                                padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
                                            }}>
                                                {bagList.map(bagId => (
                                                    <span key={bagId} style={{
                                                        fontSize: '9px', fontFamily: 'monospace', color: '#94a3b8',
                                                        padding: '2px 4px', background: 'rgba(255,255,255,0.03)',
                                                        borderRadius: '3px', overflow: 'hidden',
                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                            {bagId}
                          </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}