import React, { useState, useEffect } from 'react';
import {apiFetch} from "../../hooks/api.js";
import { SkeletonList, Spinner } from "../common/Skeleton";

const PendingShipmentsPanel = ({ isOpen, onClose, sessionId }) => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let interval;
        let controller;
        if (isOpen && sessionId) {
            const fetchShipments = async () => {
                // Aborta la petición anterior si sigue en vuelo al refrescar/cerrar.
                controller?.abort();
                controller = new AbortController();
                try {
                    setLoading(true);
                    const response = await apiFetch(`/api/v1/simulation/active-shipments/${sessionId}`, { signal: controller.signal });
                    if (response.ok) {
                        const data = await response.json();
                        setShipments(data);
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error("Error fetching shipments:", error);
                    }
                } finally {
                    setLoading(false);
                }
            };

            fetchShipments();
            interval = setInterval(fetchShipments, 5000);
        }
        return () => {
            clearInterval(interval);
            controller?.abort();
        };
    }, [isOpen, sessionId]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            // Anclado junto al ControlDock pero responsive: nunca desborda en
            // pantallas estrechas (antes width fijo 450px + left 70px overflow).
            left: 'clamp(8px, 5vw, 52px)',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 'min(450px, calc(100vw - 70px))',
            maxHeight: '80vh',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 500,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(56, 189, 248, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📦</span>
                    <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        Envíos en Ventana Actual (4H)
                    </h3>
                    {loading && shipments.length > 0 && <Spinner size={14} label="Actualizando…" />}
                </div>
                <button onClick={onClose} aria-label="Cerrar panel de envíos pendientes" style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px'
                }}>✕</button>
            </div>

            {/* Body / Table — auto-refresco cada 5s, anunciado a lectores de pantalla */}
            <div
                style={{ flex: 1, overflowY: 'auto', padding: '12px' }}
                aria-live="polite"
                aria-busy={loading}
                aria-label="Envíos en la ventana actual"
            >
                {shipments.length === 0 && loading ? (
                    <SkeletonList rows={6} rowHeight={40} label="Cargando envíos…" />
                ) : shipments.length === 0 && !loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
                        No hay envíos programados para esta ventana horaria.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>ID Envío</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>Ruta</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'center' }}>Maletas</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>Asignación</th>
                        </tr>
                        </thead>
                        <tbody>
                        {shipments
                            .sort((a, b) => {
                                // 1. Primero por estado: En vuelo (asignados) primero, luego pendientes
                                const aAsignado = a.vueloAsignado !== 'En proceso';
                                const bAsignado = b.vueloAsignado !== 'En proceso';
                                if (aAsignado && !bAsignado) return -1;
                                if (!aAsignado && bAsignado) return 1;
                                
                                // 2. Luego por cantidad de maletas (Mayor a menor)
                                return b.cantidad - a.cantidad;
                            })
                            .map((s, idx) => (
                            <tr key={s.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '10px 4px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '11px' }}>
                                    {s.id ? s.id.split('-')[0] + '...' : 'N/A'}
                                </td>
                                <td style={{ padding: '10px 4px', color: '#38bdf8', fontWeight: 600 }}>
                                    {s.origen} <span style={{ color: '#64748b' }}>→</span> {s.destino}
                                </td>
                                <td style={{ padding: '10px 4px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>
                                    {s.cantidad}
                                </td>
                                <td style={{ padding: '10px 4px' }}>
                                    {s.vueloAsignado === 'En proceso' ? (
                                        <span style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            color: '#f59e0b',
                                            padding: '3px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 'bold'
                                        }}>⏳ Pendiente</span>
                                    ) : (
                                        <span style={{
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            color: '#38bdf8',
                                            padding: '3px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 'bold'
                                        }}>✈️ Vuelo {s.vueloAsignado}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer info */}
            <div style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0,0,0,0.2)',
                color: '#64748b',
                fontSize: '10px',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Mostrando hasta 200 envíos</span>
                <span>Auto-actualización: 5s</span>
            </div>
        </div>
    );
};

export default PendingShipmentsPanel;