import React, { useState, useEffect } from 'react';

const WarehouseManagement = () => {
    const [status, setStatus] = useState({ type: '', message: '' });
    const [entryMode, setEntryMode] = useState('manual');
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/aeropuertos');
            if (res.ok) {
                const data = await res.json();
                setWarehouses(data);
            } else {
                setStatus({ type: 'error', message: 'Error al obtener almacenes' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Error de conexión' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWarehouse = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este almacén?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/aeropuertos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setStatus({ type: 'success', message: 'Almacén eliminado exitosamente.' });
                fetchWarehouses();
            } else {
                const errData = await res.json().catch(() => ({}));
                setStatus({ type: 'error', message: errData.message || 'No se pudo eliminar el almacén. Puede que tenga datos asociados.' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Error de conexión' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entryMode === 'list') {
            fetchWarehouses();
        }
    }, [entryMode]);

    const [formData, setFormData] = useState({
        icaoCode: '',
        city: '',
        country: '',
        continent: 'AMERICA',
        storageCapacity: '',
        gmtOffset: '',
        latitude: '',
        longitude: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        setLoading(true);

        try {
            const payload = {
                icaoCode: formData.icaoCode,
                city: formData.city,
                country: formData.country,
                continent: formData.continent,
                storageCapacity: parseInt(formData.storageCapacity, 10),
                gmtOffset: parseInt(formData.gmtOffset, 10),
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude)
            };

            const response = await fetch('/api/v1/aeropuertos/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al crear el almacén');
            }

            setStatus({ type: 'success', message: 'Almacén añadido o actualizado exitosamente.' });
            
            // Resetear el formulario tras el éxito
            setFormData({
                icaoCode: '', city: '', country: '', continent: 'AMERICA',
                storageCapacity: '', gmtOffset: '', latitude: '', longitude: ''
            });

        } catch (error) {
            setStatus({ type: 'error', message: error.message || 'Ocurrió un error inesperado' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', color: '#dbe6f2' }}>
            
            {/* TOGGLE MANUAL / TXT / LIST */}
            <div style={toggleContainerStyle}>
                <button type="button" onClick={() => setEntryMode('manual')} style={toggleBtnStyle(entryMode === 'manual', 'manual')}>Ingreso Manual</button>
                <button type="button" onClick={() => setEntryMode('txt')} style={toggleBtnStyle(entryMode === 'txt', 'txt')}>Masivo por TXT</button>
                <button type="button" onClick={() => setEntryMode('list')} style={toggleBtnStyle(entryMode === 'list', 'list')}>Listado General</button>
            </div>

            {entryMode === 'manual' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56,189,248,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8', fontSize: '16px' }}>Ajuste de Almacenes (Aeropuertos)</h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: '#94a3b8' }}>Agrega o ajusta capacidades de los almacenes existentes de forma manual.</p>
                    
                    <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>CÓDIGO ICAO</label>
                            <input type="text" name="icaoCode" value={formData.icaoCode} onChange={handleInputChange} required placeholder="Ej: SPJC" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>CAPACIDAD MÁXIMA (Maletas)</label>
                            <input type="number" name="storageCapacity" value={formData.storageCapacity} onChange={handleInputChange} required min="100" placeholder="Ej: 800" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>CIUDAD</label>
                            <input type="text" name="city" value={formData.city} onChange={handleInputChange} required placeholder="Ej: Lima" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>PAÍS</label>
                            <input type="text" name="country" value={formData.country} onChange={handleInputChange} required placeholder="Ej: Peru" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>CONTINENTE</label>
                            <select name="continent" value={formData.continent} onChange={handleInputChange} style={inputStyle}>
                                <option value="AMERICA">América</option>
                                <option value="EUROPE">Europa</option>
                                <option value="ASIA">Asia</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>GMT OFFSET</label>
                            <input type="number" name="gmtOffset" value={formData.gmtOffset} onChange={handleInputChange} required placeholder="Ej: -5" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>LATITUD</label>
                            <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleInputChange} required placeholder="Ej: -12.01" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>LONGITUD</label>
                            <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleInputChange} required placeholder="Ej: -77.06" style={inputStyle} />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <button type="submit" disabled={loading} style={btnStylePrimary}>
                                {loading ? 'Procesando...' : '+ Añadir / Actualizar Almacén'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {entryMode === 'txt' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px dashed rgba(148, 163, 184, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '14px' }}>Carga Masiva de Almacenes (.TXT)</h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '11px', color: '#64748b' }}>Sube el archivo de configuración de capacidades de almacenes.</p>
                    <input type="file" accept=".txt" style={{ width: '100%', color: '#94a3b8', fontSize: '12px' }} />
                </div>
            )}

            {status.message && (
                <div style={getStatusStyle(status.type)}>
                    {status.message}
                </div>
            )}

            {entryMode === 'list' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '16px' }}>Listado General de Almacenes</h3>
                        <button onClick={fetchWarehouses} style={btnStyleSecondary}>↻ Actualizar</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>ID</th>
                                    <th style={{ padding: '12px' }}>ICAO</th>
                                    <th style={{ padding: '12px' }}>Ciudad / País</th>
                                    <th style={{ padding: '12px' }}>Continente</th>
                                    <th style={{ padding: '12px' }}>Capacidad</th>
                                    <th style={{ padding: '12px' }}>GMT</th>
                                    <th style={{ padding: '12px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && warehouses.length === 0 ? (
                                    <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Cargando almacenes...</td></tr>
                                ) : warehouses.length === 0 ? (
                                    <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay almacenes registrados.</td></tr>
                                ) : (
                                    warehouses.map((w) => (
                                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '12px', color: '#94a3b8' }}>{w.id}</td>
                                            <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 'bold' }}>{w.icaoCode}</td>
                                            <td style={{ padding: '12px' }}>{w.city}, {w.country}</td>
                                            <td style={{ padding: '12px' }}>{w.continent}</td>
                                            <td style={{ padding: '12px', color: '#34d399', fontWeight: 'bold' }}>{w.storageCapacity}</td>
                                            <td style={{ padding: '12px' }}>{w.gmtOffset}</td>
                                            <td style={{ padding: '12px' }}>
                                                <button 
                                                    onClick={() => handleDeleteWarehouse(w.id)}
                                                    disabled={loading}
                                                    style={{ ...btnStyleSecondary, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '11px', color: '#94a3b8' };

const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px',
    background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', boxSizing: 'border-box', fontSize: '13px', outline: 'none'
};

const btnStylePrimary = {
    width: '100%', padding: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
    border: '1px solid rgba(56,189,248,0.4)', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
};

const btnStyleSecondary = {
    width: 'auto', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: '#dbe6f2',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer',
    fontWeight: 'bold', fontSize: '12px', transition: 'all 0.2s'
};

const getStatusStyle = (type) => ({
    padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    border: `1px solid ${type === 'success' ? '#10b981' : '#ef4444'}`,
    color: type === 'success' ? '#34d399' : '#f87171',
    marginTop: '1rem'
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

export default WarehouseManagement;
