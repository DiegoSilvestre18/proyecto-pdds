import React, { useState, useEffect } from 'react';
import { AIRPORTS } from '../../data/airportsData';
import { apiFetch } from '../../hooks/api';

const FlightManagement = ({ flights, setFlights }) => {
    const [status, setStatus] = useState({ type: '', message: '' });

    const [entryMode, setEntryMode] = useState('manual');

    const [flightData, setFlightData] = useState({
        origenIcao: '',
        destinoIcao: '',
        capacity: '',
        departureTime: '',
        arrivalTime: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const fetchFlights = async () => {
        try {
            const res = await apiFetch('/api/v1/vuelos/search');

            if (!res.ok) {
                setStatus({
                    type: 'error',
                    message: 'Error cargando vuelos'
                });
                return;
            }

            const data = await res.json();
            setFlights(data);

        } catch (err) {
            setStatus({
                type: 'error',
                message: 'Error de conexión al obtener vuelos'
            });
        }
    };
    useEffect(() => {
        if (entryMode === 'list') {
            fetchFlights();
        }
    }, [entryMode]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setStatus({ type: 'error', message: 'Seleccione un archivo TXT primero.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            setStatus({ type: 'success', message: 'Cargando archivo...' });
            const res = await apiFetch('/api/v1/vuelos/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const text = await res.text();
                setStatus({ type: 'success', message: text });
                setSelectedFile(null);
                await fetchFlights();
            } else {
                const errorText = await res.text();
                setStatus({ type: 'error', message: errorText || 'Error al procesar archivo.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión.' });
        }
    };
    const timeToMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFlightData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateFlight = async () => {

        try {

            if (
                !flightData.origenIcao ||
                !flightData.destinoIcao ||
                !flightData.capacity ||
                !flightData.departureTime ||
                !flightData.arrivalTime
            ) {
                setStatus({
                    type: 'error',
                    message: 'Complete todos los campos.'
                });
                return;
            }

            const payload = {
                origenIcao: flightData.origenIcao,
                destinoIcao: flightData.destinoIcao,
                capacity: Number(flightData.capacity),
                departureMinute: timeToMinutes(flightData.departureTime),
                arrivalMinute: timeToMinutes(flightData.arrivalTime)
            };

            const response = await apiFetch(
                '/api/v1/vuelos/create',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (response.ok) {
                setStatus({
                    type: 'success',
                    message: 'Vuelo creado correctamente.'
                });

                setFlightData({
                    origenIcao: '',
                    destinoIcao: '',
                    capacity: '',
                    departureTime: '',
                    arrivalTime: ''
                });
                await fetchFlights();

            } else {

                const errorText = await response.text();

                setStatus({
                    type: 'error',
                    message: errorText || 'No se pudo crear el vuelo.'
                });
            }

        } catch (error) {

            setStatus({
                type: 'error',
                message: 'Error de conexión con el servidor.'
            });
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
                    <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8', fontSize: '16px' }}>Registro Manual de Vuelo Excepcional</h3>
                    <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>ORIGEN (ICAO)</label>
                            <select
                                name="origenIcao"
                                value={flightData.origenIcao}
                                onChange={handleInputChange}
                                style={inputStyle}
                            >
                                <option value="">Seleccione origen...</option>

                                {[...AIRPORTS]
                                    .sort((a, b) => a.city.localeCompare(b.city))
                                    .map(a => (
                                        <option key={a.icao} value={a.icao}>
                                            {a.city} ({a.icao})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>DESTINO (ICAO)</label>
                            <select
                                name="destinoIcao"
                                value={flightData.destinoIcao}
                                onChange={handleInputChange}
                                style={inputStyle}
                            >
                                <option value="">Seleccione destino...</option>

                                {[...AIRPORTS]
                                    .sort((a, b) => a.city.localeCompare(b.city))
                                    .map(a => (
                                        <option key={a.icao} value={a.icao}>
                                            {a.city} ({a.icao})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>HORA SALIDA (HO:MO)</label>
                            <input
                                type="time"
                                name="departureTime"
                                value={flightData.departureTime}
                                onChange={handleInputChange}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>HORA LLEGADA (HD:MD)</label>
                            <input
                                type="time"
                                name="arrivalTime"
                                value={flightData.arrivalTime}
                                onChange={handleInputChange}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>CAPACIDAD (####)</label>
                            <input
                                type="number"
                                name="capacity"
                                value={flightData.capacity}
                                onChange={handleInputChange}
                                placeholder="Ej: 250"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <button
                                type="button"
                                onClick={handleCreateFlight}
                                style={{
                                    ...btnStylePrimary,
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#dbe6f2',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                Registrar Vuelo
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {entryMode === 'txt' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px dashed rgba(148, 163, 184, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '14px' }}>Carga Masiva de Planes de Vuelo (.TXT)</h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '11px', color: '#64748b' }}>Formato esperado: ORIG-DEST-HO:MO-HD-MD ####</p>
                    <input 
                        type="file" 
                        accept=".txt" 
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        style={{ width: '100%', color: '#94a3b8', fontSize: '12px', marginBottom: '1rem' }} 
                    />
                    
                    <button type="button" onClick={handleUpload} style={btnStylePrimary}>
                        Procesar Archivo de Vuelos
                    </button>
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
                        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '16px' }}>Listado General de Vuelos</h3>
                        <button onClick={fetchFlights} style={btnStyleSecondary}>↻ Actualizar</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>ID Vuelo</th>
                                    <th style={{ padding: '12px' }}>Origen</th>
                                    <th style={{ padding: '12px' }}>Destino</th>
                                    <th style={{ padding: '12px' }}>Salida</th>
                                    <th style={{ padding: '12px' }}>Llegada</th>
                                    <th style={{ padding: '12px' }}>Capacidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flights.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay vuelos registrados o no se pudieron cargar.</td></tr>
                                ) : (
                                    flights.map((vuelo, idx) => (
                                        <tr key={vuelo.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '12px', color: '#94a3b8' }}>{vuelo.id || 'N/A'}</td>
                                            <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 'bold' }}>{vuelo.origenIcao}</td>
                                            <td style={{ padding: '12px', color: '#34d399', fontWeight: 'bold' }}>{vuelo.destinoIcao}</td>
                                            <td style={{ padding: '12px' }}>
                                                {`${Math.floor((vuelo.departureMinute || 0) / 60).toString().padStart(2, '0')}:${((vuelo.departureMinute || 0) % 60).toString().padStart(2, '0')}`}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {`${Math.floor((vuelo.arrivalMinute || 0) / 60).toString().padStart(2, '0')}:${((vuelo.arrivalMinute || 0) % 60).toString().padStart(2, '0')}`}
                                            </td>
                                            <td style={{ padding: '12px' }}>{vuelo.capacity}</td>
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
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
    border: `1px solid ${type === 'success' ? '#10b981' : '#38bdf8'}`,
    color: type === 'success' ? '#34d399' : '#7dd3fc'
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

export default FlightManagement;
