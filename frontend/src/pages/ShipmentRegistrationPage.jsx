import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIRPORTS } from '../data/airportsData';
import { apiFetch } from '../hooks/api';

const ShipmentRegistrationPage = ({ hideBackButton = false }) => {
    const navigate = useNavigate();
    const [globalOrigenIcao, setGlobalOrigenIcao] = useState('');
    const [trayShipments, setTrayShipments] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    // Manual form state
    const [formData, setFormData] = useState({
        fecha: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD
        hora: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        destinoIcao: '',
        cantidadMaletas: 1,
        clienteId: ''
    });

    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddToTray = (e) => {
        e.preventDefault();
        if (!globalOrigenIcao || !formData.destinoIcao) {
            setStatus({ type: 'error', message: 'Debe seleccionar origen y destino.' });
            return;
        }
        if (globalOrigenIcao === formData.destinoIcao) {
            setStatus({ type: 'error', message: 'El origen y destino no pueden ser iguales.' });
            return;
        }

        const newShipment = {
            idTemp: Date.now() + Math.random().toString(36).substr(2, 9),
            ...formData,
            origenIcao: globalOrigenIcao,
            clienteId: formData.clienteId || Math.floor(1000000 + Math.random() * 9000000).toString()
        };
        setTrayShipments(prev => [...prev, newShipment]);
        setStatus({ type: '', message: '' });

        // Dejar listo para el siguiente
        setFormData(prev => ({ ...prev, cantidadMaletas: 1, destinoIcao: '' }));
    };

    const handleRemoveFromTray = (idTemp) => {
        setTrayShipments(prev => prev.filter(s => s.idTemp !== idTemp));
    };

    const handleClearTray = () => {
        setTrayShipments([]);
    };

    const handleBulkUpload = async () => {
        if (!selectedFile || !globalOrigenIcao) return;

        try {
            setLoading(true);

            const renamedFile = new File([selectedFile], `_envios_${globalOrigenIcao}_.txt`, { type: selectedFile.type });

            const formDataData = new FormData();
            formDataData.append("file", renamedFile);

            const res = await apiFetch(
                "/api/v1/envios/carga",
                {
                    method: "POST",
                    body: formDataData
                }
            );

            if (res.ok) {
                setStatus({
                    type: "success",
                    message: "Archivo procesado correctamente."
                });

                setSelectedFile(null);

                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } else {
                setStatus({
                    type: "error",
                    message: "Error al procesar el archivo."
                });
            }
        } catch (err) {
            setStatus({
                type: "error",
                message: "No se pudo conectar con el servidor."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTxtUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);

        setStatus({
            type: 'info',
            message: `Archivo seleccionado: ${file.name}`
        });
    };

    const handleUploadToLiveSystem = async () => {
        if (trayShipments.length === 0) return;

        setLoading(true);
        setStatus({ type: 'info', message: 'Subiendo envíos a la red en vivo...' });

        let successCount = 0;
        let failCount = 0;

        await Promise.all(trayShipments.map(async (shipment) => {
            try {

                const payload = {
                    fecha: shipment.fecha,
                    hora: shipment.hora,
                    origenIcao: shipment.origenIcao,
                    destinoIcao: shipment.destinoIcao,
                    cantidadMaletas: shipment.cantidadMaletas,
                    clienteId: shipment.clienteId
                };
                const res = await apiFetch('/api/v1/envios/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch (err) {
                failCount++;
            }
        }));

        setLoading(false);

        if (failCount === 0) {
            setStatus({
                type: 'success',
                message: `✅ ¡Los ${successCount} envíos entraron a la red logística exitosamente!`
            });
            setTrayShipments([]);
        } else {
            setStatus({
                type: 'error',
                message: `Hubo ${failCount} errores al subir. Solo subieron ${successCount} envíos.`
            });
        }
    }; // <--- AQUÍ SE CERRÓ CORRECTAMENTE LA FUNCIÓN ASÍNCRONA

    return (
        <div className="registration-page" style={{
            padding: hideBackButton ? '0' : '2rem',
            color: 'white',
            background: hideBackButton ? 'transparent' : '#080e1e',
            minHeight: hideBackButton ? 'auto' : '100vh',
            fontFamily: 'sans-serif'
        }}>
            {!hideBackButton && (
                <button
                    onClick={() => navigate('/registro-datos')}
                    style={{
                        marginBottom: '2rem', background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                    }}
                >
                    ← Volver al Panel Principal
                </button>
            )}

            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

                {/* GLOBAL ORIGIN SELECTION */}
                <div style={{ width: '100%', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '12px' }}>
                    <h2 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '20px' }}>📍 Seleccione el Aeropuerto de Origen</h2>
                    <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '13px' }}>Todos los envíos manuales y archivos TXT cargados a continuación se asignarán a este aeropuerto.</p>
                    <select value={globalOrigenIcao} onChange={(e) => setGlobalOrigenIcao(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #38bdf8', color: 'white', fontSize: '16px', outline: 'none' }}>
                        <option value="">-- Seleccione un aeropuerto --</option>
                        {[...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).map(a => (
                            <option key={`orig-global-${a.icao}`} value={a.icao}>{a.city} ({a.icao})</option>
                        ))}
                    </select>
                </div>

                {globalOrigenIcao && (
                    <>
                {/* PANEL IZQUIERDO: Ingreso Manual y Archivo */}
                <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <h1 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '24px' }}>Data Entry Aduanas</h1>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
                            Agrega envíos a tu bandeja temporal. Cuando estés listo, súbelos de golpe a la red global.
                        </p>
                    </div>

                    <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        padding: '1.5rem',
                        borderRadius: '12px'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8', fontSize: '14px' }}>✍️ Ingreso Manual</h3>
                        <form onSubmit={handleAddToTray} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: 'span 1' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8' }}>FECHA (LOCAL)</label>
                                <input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} required style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: 'span 1' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8' }}>
                                    <span>HORA (LOCAL)</span>
                                    {formData.hora && globalOrigenIcao && (
                                        <span style={{ color: '#38bdf8' }} title="Hora equivalente en el reloj del mapa de la matriz">
                                            Mapa: {
                                            (() => {
                                                const airport = AIRPORTS.find(a => a.icao === globalOrigenIcao);
                                                if (!airport) return '--:--';
                                                const [h, m] = formData.hora.split(':').map(Number);

                                                const dateObj = new Date(Date.UTC(2026, 0, 1, h, m, 0));

                                                dateObj.setUTCMinutes(
                                                    dateObj.getUTCMinutes() - (airport.gmtOffset * 60)
                                                );

                                                return dateObj.toISOString().split('T')[1].substring(0, 5);
                                            })()
                                        }
                                        </span>
                                    )}
                                </label>
                                <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8' }}>AEROPUERTO DESTINO</label>
                                <select name="destinoIcao" value={formData.destinoIcao} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }}>
                                    <option value="">Seleccione destino...</option>
                                    {[...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).map(a => (
                                        <option key={`dest-${a.icao}`} value={a.icao}>{a.city} ({a.icao})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8' }}>CANTIDAD DE MALETAS (SuperLote)</label>
                                <input type="number" name="cantidadMaletas" value={formData.cantidadMaletas} onChange={handleInputChange} min="1" required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '11px', color: '#94a3b8' }}>Código de Cliente (7 dígitos)</label>
                                <input type="text" name="clienteId" value={formData.clienteId} onChange={handleInputChange} maxLength="7" pattern="\d{7}" required placeholder="Ej: 0000001" style={{
                                    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box', fontSize: '12px', outline: 'none'
                                }} />
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                <button type="submit" style={{
                                    width: '100%', padding: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
                                }}>
                                    + Agregar a la Bandeja
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Carga por Archivo TXT */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px dashed rgba(148, 163, 184, 0.3)',
                        padding: '1.5rem',
                        borderRadius: '12px'
                    }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '14px' }}>📄 Carga desde archivo (.TXT)</h3>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '11px', color: '#64748b' }}>Formato: id_envío-aaaammdd-hh-mm-dest-###-IdClien</p>
                        <input type="file" accept=".txt,.csv" onChange={handleTxtUpload} ref={fileInputRef} style={{ width: '100%', color: '#94a3b8', fontSize: '12px' }} />
                        {selectedFile && (
                            <button
                                onClick={handleBulkUpload}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    marginTop: '1rem',
                                    padding: '10px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    borderRadius: '8px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {loading
                                    ? '⏳ PROCESANDO ARCHIVO...'
                                    : `📤 SUBIR ${selectedFile.name}`}
                            </button>
                        )}
                    </div>
                </div>

                {/* PANEL DERECHO: Bandeja Temporal */}
                <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Bandeja Temporal</h2>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{trayShipments.length} envíos listos para subir</span>
                            </div>
                            {trayShipments.length > 0 && (
                                <button onClick={handleClearTray} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Limpiar todo
                                </button>
                            )}
                        </div>

                        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', maxHeight: '400px' }}>
                            {trayShipments.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '3rem' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
                                    La bandeja está vacía.<br />Ingresa envíos a la izquierda para encolarlos aquí.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {trayShipments.map((s) => (
                                        <div key={s.idTemp} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px'
                                        }}>
                                            <div style={{ flexGrow: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>{s.origenIcao} ➔ {s.destinoIcao}</span>
                                                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                                        {s.cantidadMaletas} maletas
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    Salida: {s.fecha} a las {s.hora}
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveFromTray(s.idTemp)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mensajes de Estado */}
                        {status.message && (
                            <div style={{
                                padding: '12px 16px', margin: '0 1rem 1rem 1rem', borderRadius: '8px', fontSize: '12px',
                                background: status.type === 'success' ? 'rgba(16,185,129,0.1)' : status.type === 'error' ? 'rgba(239,68,68,0.1)' : status.type === 'amber' ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)',
                                border: `1px solid ${status.type === 'success' ? '#10b981' : status.type === 'error' ? '#ef4444' : status.type === 'amber' ? '#f59e0b' : '#38bdf8'}`,
                                color: status.type === 'success' ? '#34d399' : status.type === 'error' ? '#f87171' : status.type === 'amber' ? '#fbbf24' : '#7dd3fc'
                            }}>
                                {status.message}
                            </div>
                        )}

                        <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                                onClick={handleUploadToLiveSystem}
                                disabled={trayShipments.length === 0 || loading}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: trayShipments.length === 0 ? '#1e293b' : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: trayShipments.length === 0 ? '#475569' : 'white',
                                    border: 'none', borderRadius: '10px',
                                    cursor: trayShipments.length === 0 || loading ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold', fontSize: '14px',
                                    boxShadow: trayShipments.length > 0 ? '0 4px 15px rgba(16, 185, 129, 0.4)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loading ? '⏳ TRANSMITIENDO...' : `🚀 SUBIR AL SISTEMA EN VIVO (${trayShipments.length})`}
                            </button>
                        </div>
                    </div>
                </div>
                </>
                )}
            </div>
        </div>
    );
};

const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px',
    background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', boxSizing: 'border-box', fontSize: '12px', outline: 'none'
};

export default ShipmentRegistrationPage;