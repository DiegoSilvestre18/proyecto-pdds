import React, { useState, useRef } from 'react';
import { AIRPORTS } from '../../data/airportsData';
import { apiFetch } from '../../hooks/api';

const ShipmentManagement = () => {
    const [globalOrigenIcao, setGlobalOrigenIcao] = useState('');
    const [trayShipments, setTrayShipments] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [entryMode, setEntryMode] = useState('manual');

    // Manual form state according to LEYENDA.md
    const [formData, setFormData] = useState({
        idPedido: '',
        fecha: new Date().toLocaleDateString('en-CA'), // aaaammdd representation
        hora: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        destinoIcao: '',
        cantidadMaletas: '001', // ### 3 positions
        clienteId: '' // 7 digits
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
            
            {/* ORIGIN SELECTION */}
            <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>AEROPUERTO DE ORIGEN (OBLIGATORIO PARA CUALQUIER CARGA)</label>
                <select value={globalOrigenIcao} onChange={(e) => setGlobalOrigenIcao(e.target.value)} style={inputStyle}>
                    <option value="">-- Seleccione un aeropuerto de origen --</option>
                    {[...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).map(a => (
                        <option key={`orig-global-${a.icao}`} value={a.icao}>{a.city} ({a.icao})</option>
                    ))}
                </select>
            </div>

            {globalOrigenIcao && (
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    
                    {/* LEFT PANEL: MANUAL & TXT ENTRY */}
                    <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* TOGGLE MANUAL / TXT */}
                        <div style={toggleContainerStyle}>
                            <button type="button" onClick={() => setEntryMode('manual')} style={toggleBtnStyle(entryMode === 'manual')}>Ingreso Manual</button>
                            <button type="button" onClick={() => setEntryMode('txt')} style={toggleBtnStyle(entryMode === 'txt')}>Masivo por TXT</button>
                        </div>
                        
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
                                        {[...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).map(a => (
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
                                    <h4 style={{ margin: 0, color: '#f8fafc' }}>Bandeja Temporal</h4>
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

const toggleContainerStyle = { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' };
const toggleBtnStyle = (active) => ({
    flex: 1, padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s',
    background: active ? '#38bdf8' : 'transparent',
    color: active ? '#0f172a' : '#94a3b8'
});

export default ShipmentManagement;
