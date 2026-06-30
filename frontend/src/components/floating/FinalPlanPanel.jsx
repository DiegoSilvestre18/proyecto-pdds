import React, { useMemo, useState } from 'react';

const STATUS_COLORS = { normal: '#10b981', critical: '#f59e0b', cancelled: '#ef4444', rescued: '#3b82f6' };

function formatTime(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FinalPlanPanel({ plan = [] }) {
    const [search, setSearch] = useState('');
    const [expandedLot, setExpandedLot] = useState(null);

    const filtered = useMemo(() => {
        if (!search) return plan;
        const q = search.toLowerCase();
        return plan.filter(r =>
            String(r.lotId).includes(q) ||
            r.origin?.toLowerCase().includes(q) ||
            r.destination?.toLowerCase().includes(q)
        );
    }, [plan, search]);

    if (!plan || plan.length === 0) {
        return <div style={{ fontSize: '12px', color: '#64748b', padding: '12px' }}>No hay plan final disponible para esta sesión.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>{filtered.length} lotes en el plan final</span>
                <input
                    placeholder="Buscar lote, origen o destino..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', width: '220px' }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
                {filtered.map((r) => {
                    const isExpanded = expandedLot === r.lotId;
                    const pct = r.totalBags > 0 ? Math.round((r.assignedBags / r.totalBags) * 100) : 0;
                    return (
                        <div key={r.lotId} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: `1px solid ${STATUS_COLORS[r.status] || 'rgba(255,255,255,0.08)'}` }}>
                            <div
                                onClick={() => setExpandedLot(isExpanded ? null : r.lotId)}
                                style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{r.origin} ➔ {r.destination} <span style={{ color: '#64748b', fontWeight: 'normal' }}>· Lote {r.lotId}</span></div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Llegada: {formatTime(r.arrivalTime)} · Deadline: {formatTime(r.deadline)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: pct === 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#ef4444' }}>{r.assignedBags}/{r.totalBags}</div>
                                    <div style={{ fontSize: '10px', color: '#64748b' }}>{pct}% asignado</div>
                                </div>
                            </div>
                            {isExpanded && (
                                <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    {(r.hops || []).length === 0 ? (
                                        <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>Sin vuelos asignados</div>
                                    ) : (
                                        r.hops.map((h, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '3px 0', color: '#9ca3af', borderBottom: i < r.hops.length - 1 ? '1px dashed rgba(255,255,255,0.06)' : 'none' }}>
                                                <span>✈ Vuelo {h.vueloId}: {h.from} → {h.to}</span>
                                                <span>{formatTime(h.departureTime)} → {formatTime(h.arrivalTime)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}