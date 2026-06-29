import React, { useState, useRef, useEffect } from 'react';
import { useAirports } from '../../hooks/useAirports';
import { apiFetch } from '../../hooks/api';

const ShipmentManagement = () => {
    const [globalOrigenIcao, setGlobalOrigenIcao] = useState('');
    const [trayShipments, setTrayShipments] = useState(() => {
        try {
            const saved = localStorage.getItem('shipmentTray');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('shipmentTray', JSON.stringify(trayShipments));
    }, [trayShipments]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [entryMode, setEntryMode] = useState('manual');
    const [shipmentsList, setShipmentsList] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const { refreshAirports, airports } = useAirports();
    const [status, setStatus] = useState({ type: '', message: '' });

    const fetchShipments = async (page = 0) => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/v1/envios?page=${page}&size=15`);
            if (res.ok) {
                const data = await res.json();
                setShipmentsList(data.content || []);
                setTotalPages(data.page?.totalPages || data.totalPages || 0);
                setCurrentPage(data.page?.number || data.number || 0);
            }
        } catch (err) {
            console.error("Error fetching shipments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entryMode === 'list') {
            fetchShipments(currentPage);
        }
    }, [entryMode, currentPage]);

    // Manual form state according to LEYENDA.md
    const [formData, setFormData] = useState({
        idPedido: '',
        fecha: new Date().toLocaleDateString('en-CA'), // aaaammdd representation
        hora: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        destinoIcao: '',
        cantidadMaletas: '001', // ### 3 positions
        clienteId: '' // 7 digits
    });

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

        // Validación LEYENDA.md manual check just in case (HTML5 also does this)
        if (!/^\d{7}$/.test(formData.clienteId)) {
            setStatus({ type: 'error', message: 'El Id de Cliente debe tener exactamente 7 posiciones numéricas.' });
            return;
        }

        if (!/^\d{3}$/.test(formData.cantidadMaletas) || parseInt(formData.cantidadMaletas) === 0) {
            setStatus({ type: 'error', message: 'La cantidad debe ser 3 posiciones numéricas (ej. 001, 089, 999).' });
            return;
        }

        const newShipment = {
            idTemp: Date.now() + Math.random().toString(36).substr(2, 9),
            ...formData,
            origenIcao: globalOrigenIcao,
            idPedido: formData.idPedido || `PED-${Date.now().toString().slice(-6)}`
        };
        
        setTrayShipments(prev => [...prev, newShipment]);
        setStatus({ type: '', message: '' });

        // Dejar listo para el siguiente
        setFormData(prev => ({ ...prev, idPedido: '', cantidadMaletas: '001', destinoIcao: '' }));
    };

    const handleRemoveFromTray = (idTemp) => {
        setTrayShipments(prev => prev.filter(s => s.idTemp !== idTemp));
    };

    const handleClearTray = () => {
        setTrayShipments([]);
    };

    const handleTxtUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setStatus({ type: 'info', message: `Archivo seleccionado: ${file.name}` });
    };

    const handleBulkUpload = async () => {
        if (!selectedFile || !globalOrigenIcao) return;

        try {
            setLoading(true);
            const renamedFile = new File([selectedFile], `_envios_${globalOrigenIcao}_.txt`, { type: selectedFile.type });
            const formDataData = new FormData();
            formDataData.append("file", renamedFile);

            const res = await apiFetch("/api/v1/envios/carga", { method: "POST", body: formDataData });

            if (res.ok) {
                setStatus({ type: "success", message: "Archivo procesado y cargado al sistema correctamente." });
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            } else {
                setStatus({ type: "error", message: "Error al procesar el archivo. Verifique el formato LEYENDA.md." });
            }
        } catch (err) {
            setStatus({ type: "error", message: "No se pudo conectar con el servidor." });
        } finally {
            setLoading(false);
        }
    };

    const handleUploadToLiveSystem = async () => {
        if (trayShipments.length === 0) return;
        setLoading(true);
        setStatus({ type: 'info', message: 'Enviando a la red base de datos...' });

        let successCount = 0;
        let failCount = 0;

        await Promise.all(trayShipments.map(async (shipment) => {
            try {
                // Adapt logic payload to what API expects based on old page
                const payload = {
                    fecha: shipment.fecha,
                    hora: shipment.hora,
                    origenIcao: shipment.origenIcao,
                    destinoIcao: shipment.destinoIcao,
                    cantidadMaletas: parseInt(shipment.cantidadMaletas),
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
            setStatus({ type: 'success', message: `¡Los ${successCount} envíos se registraron exitosamente!` });
            setTrayShipments([]);
        } else {
            setStatus({ type: 'error', message: `Hubo ${failCount} errores. Solo subieron ${successCount} envíos.` });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#dbe6f2' }}>
            
            {/* TOGGLE MANUAL / TXT / LIST */}
            <div style={toggleContainerStyle}>
                <button type="button" onClick={() => setEntryMode('manual')} style={toggleBtnStyle(entryMode === 'manual', 'manual')}>Ingreso Manual</button>
                <button type="button" onClick={() => setEntryMode('txt')} style={toggleBtnStyle(entryMode === 'txt', 'txt')}>Masivo por TXT</button>
                <button type="button" onClick={() => setEntryMode('list')} style={toggleBtnStyle(entryMode === 'list', 'list')}>Listado General</button>
            </div>

            {entryMode !== 'list' && (
                <>
                    {/* ORIGIN SELECTION */}
                    <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>AEROPUERTO DE ORIGEN (OBLIGATORIO PARA CUALQUIER CARGA)</label>
                        <select value={globalOrigenIcao} onChange={(e) => setGlobalOrigenIcao(e.target.value)} style={inputStyle}>
                            <option value="">-- Seleccione un aeropuerto de origen --</option>
                            {[...airports].sort((a, b) => a.city.localeCompare(b.city)).map(a => (
                                <option key={`orig-global-${a.icao}`} value={a.icao}>{a.city} ({a.icao})</option>
                            ))}
                        </select>
                    </div>

            {globalOrigenIcao && entryMode !== 'list' && (
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    
                    {/* LEFT PANEL: MANUAL & TXT ENTRY */}
                    <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* MANUAL ENTRY */}
                        {entryMode === 'manual' && (
                            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '14px' }}>Ingreso Manual</h3>
                            <form onSubmit={handleAddToTray} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>ID PEDIDO (Opcional, se autogenera si está vacío)</label>
                                    <input type="text" name="idPedido" value={formData.idPedido} onChange={handleInputChange} placeholder="Ej: PED-123456" style={inputStyle} />
                                </div>

                                <div>
                                    <label style={labelStyle}>FECHA (aaaammdd)</label>
                                    <input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>HORA (hh:mm)</label>
                                    <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} required style={inputStyle} />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>DESTINO (dest)</label>
                                    <select name="destinoIcao" value={formData.destinoIcao} onChange={handleInputChange} required style={inputStyle}>
                                        <option value="">Seleccione destino...</option>
                                        {[...airports].sort((a, b) => a.city.localeCompare(b.city)).map(a => (
                                            <option key={`dest-${a.icao}`} value={a.icao}>{a.city} ({a.icao})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={labelStyle}>CANTIDAD (###, ej: 001)</label>
                                    <input type="text" name="cantidadMaletas" value={formData.cantidadMaletas} onChange={handleInputChange} pattern="\d{3}" maxLength="3" required placeholder="001" style={inputStyle} />
                                </div>
                                
                                <div>
                                    <label style={labelStyle}>ID CLIENTE (7 dígitos)</label>
                                    <input type="text" name="clienteId" value={formData.clienteId} onChange={handleInputChange} maxLength="7" pattern="\d{7}" required placeholder="0000001" style={inputStyle} />
                                </div>

                                <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                    <button type="submit" style={btnStyleSecondary}>
                                        + Agregar a Bandeja de Preparación
                                    </button>
                                </div>
                            </form>
                            </div>
                        )}

                        {/* TXT UPLOAD */}
                        {entryMode === 'txt' && (
                            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px dashed rgba(148, 163, 184, 0.3)', padding: '1.2rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '14px' }}>Carga Masiva (.TXT)</h3>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '11px', color: '#94a3b8' }}>
                                Formato: <code>id_pedido-aaaammdd-hh-mm-dest-###-IdCliente</code>
                            </p>
                            <input type="file" accept=".txt,.csv" onChange={handleTxtUpload} ref={fileInputRef} style={{ width: '100%', color: '#94a3b8', fontSize: '12px', marginBottom: '1rem' }} />
                            {selectedFile && (
                                <button onClick={handleBulkUpload} disabled={loading} style={btnStylePrimary}>
                                    {loading ? 'PROCESANDO...' : `SUBIR ARCHIVO`}
                                </button>
                            )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: TRAY */}
                    <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            
                            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0, color: '#f8fafc' }}>Envíos recién agregados</h4>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{trayShipments.length} envíos preparados</span>
                                </div>
                                {trayShipments.length > 0 && (
                                    <button onClick={handleClearTray} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Limpiar</button>
                                )}
                            </div>

                            <div style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto', maxHeight: '350px' }}>
                                {trayShipments.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '3rem' }}>
                                        La bandeja está vacía.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {trayShipments.map(s => (
                                            <div key={s.idTemp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>{s.origenIcao} - {s.destinoIcao} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>| {s.cantidadMaletas} uds.</span></div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Pedido: {s.idPedido} | Cliente: {s.clienteId}</div>
                                                </div>
                                                <button onClick={() => handleRemoveFromTray(s.idTemp)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {status.message && (
                                <div style={{ ...getStatusStyle(status.type), margin: '0 1rem 1rem 1rem' }}>
                                    {status.message}
                                </div>
                            )}

                            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <button 
                                    onClick={handleUploadToLiveSystem} 
                                    disabled={trayShipments.length === 0 || loading}
                                    style={{
                                        ...btnStylePrimary,
                                        background: trayShipments.length === 0 ? '#1e293b' : 'rgba(56, 189, 248, 0.15)',
                                        color: trayShipments.length === 0 ? '#475569' : '#38bdf8',
                                        cursor: trayShipments.length === 0 || loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? 'GUARDANDO...' : 'GUARDAR BANDEJA AL SISTEMA'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}

            {entryMode === 'list' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '16px' }}>Listado General de Envíos Registrados</h3>
                        <button onClick={() => fetchShipments(currentPage)} style={btnStyleSecondary}>↻ Actualizar</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>ID Pedido</th>
                                    <th style={{ padding: '12px' }}>Origen</th>
                                    <th style={{ padding: '12px' }}>Destino</th>
                                    <th style={{ padding: '12px' }}>Fecha</th>
                                    <th style={{ padding: '12px' }}>Hora</th>
                                    <th style={{ padding: '12px' }}>Maletas</th>
                                    <th style={{ padding: '12px' }}>Cliente ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Cargando envíos...</td></tr>
                                ) : shipmentsList.length === 0 ? (
                                    <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay envíos registrados.</td></tr>
                                ) : (
                                    shipmentsList.map((envio) => (
                                        <tr key={envio.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '12px', color: '#94a3b8' }}>{envio.codigo}</td>
                                            <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 'bold' }}>{envio.origen}</td>
                                            <td style={{ padding: '12px', color: '#34d399', fontWeight: 'bold' }}>{envio.destino}</td>
                                            <td style={{ padding: '12px' }}>{envio.fecha}</td>
                                            <td style={{ padding: '12px' }}>{envio.hora}</td>
                                            <td style={{ padding: '12px' }}>{envio.cantidadMaletas}</td>
                                            <td style={{ padding: '12px', color: '#94a3b8' }}>{envio.clienteId}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} 
                                disabled={currentPage === 0 || loading}
                                style={{ ...btnStyleSecondary, width: 'auto', padding: '6px 12px', opacity: (currentPage === 0 || loading) ? 0.5 : 1 }}
                            >
                                ← Anterior
                            </button>
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                Página <strong style={{ color: 'white' }}>{currentPage + 1}</strong> de {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))} 
                                disabled={currentPage === totalPages - 1 || loading}
                                style={{ ...btnStyleSecondary, width: 'auto', padding: '6px 12px', opacity: (currentPage === totalPages - 1 || loading) ? 0.5 : 1 }}
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' };
const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px',
    background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', boxSizing: 'border-box', fontSize: '13px', outline: 'none'
};
const btnStylePrimary = {
    width: '100%', padding: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
    border: '1px solid rgba(16,185,129,0.4)', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
};
const btnStyleSecondary = {
    width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#dbe6f2',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
};
const getStatusStyle = (type) => ({
    padding: '12px 16px', borderRadius: '6px', fontSize: '12px',
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(56,189,248,0.1)',
    border: `1px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#38bdf8'}`,
    color: type === 'success' ? '#34d399' : type === 'error' ? '#f87171' : '#7dd3fc'
});

const toggleContainerStyle = { display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' };
const toggleBtnStyle = (active, type = 'manual') => {
    let activeBg = '#38bdf8'; // Blue
    if (type === 'txt') activeBg = '#10b981'; // Green
    if (type === 'list') activeBg = '#f59e0b'; // Amber
    return {
        flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s ease',
        background: active ? activeBg : 'rgba(30, 41, 59, 0.7)',
        color: active ? '#0f172a' : '#94a3b8',
        borderColor: active ? activeBg : 'rgba(255,255,255,0.1)',
        boxShadow: active ? `0 4px 15px ${activeBg}40` : 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };
};

export default ShipmentManagement;
