import React, { useState, useEffect, useMemo } from 'react';
import { useAirports } from '../../hooks/useAirports';
import { apiFetch } from '../../hooks/api';

const FlightManagement = ({ flights, setFlights }) => {
    const [status, setStatus] = useState({ type: '', message: '' });
    const [sessionLogs, setSessionLogs] = useState(() => {
        try {
            const saved = localStorage.getItem('flightSessionLogs');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('flightSessionLogs', JSON.stringify(sessionLogs));
    }, [sessionLogs]);

    const handleRemoveLog = (indexToRemove) => {
        setSessionLogs(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const { airports } = useAirports();

    const [entryMode, setEntryMode] = useState('manual');
    const [loading, setLoading] = useState(false);

    const [flightData, setFlightData] = useState({
        origenIcao: '',
        destinoIcao: '',
        capacity: '',
        departureTime: '',
        arrivalTime: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        origen: '',
        destino: '',
        minCapacity: '',
        maxCapacity: '',
        minTime: '',
        maxTime: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const formatTime = (minutes) => {
        const validMinutes = minutes || 0;
        return `${Math.floor(validMinutes / 60).toString().padStart(2, '0')}:${(validMinutes % 60).toString().padStart(2, '0')}`;
    };

    const filteredFlights = useMemo(() => {
        if (!flights) return [];
        return flights.filter(f => {
            const matchesSearch = !searchTerm || (f.id && f.id.toString().includes(searchTerm));

            if (!matchesSearch) return false;

            if (advancedFilters.origen && !f.origenIcao?.toLowerCase().includes(advancedFilters.origen.toLowerCase())) return false;
            if (advancedFilters.destino && !f.destinoIcao?.toLowerCase().includes(advancedFilters.destino.toLowerCase())) return false;
            
            if (advancedFilters.minCapacity && f.capacity < Number(advancedFilters.minCapacity)) return false;
            if (advancedFilters.maxCapacity && f.capacity > Number(advancedFilters.maxCapacity)) return false;

            if (advancedFilters.minTime) {
                const [h, m] = advancedFilters.minTime.split(':').map(Number);
                if (f.departureMinute < (h * 60 + m)) return false;
            }
            if (advancedFilters.maxTime) {
                const [h, m] = advancedFilters.maxTime.split(':').map(Number);
                if (f.departureMinute > (h * 60 + m)) return false;
            }

            return true;
        });
    }, [flights, searchTerm, advancedFilters]);

    const totalPages = Math.ceil(filteredFlights.length / itemsPerPage) || 1;

    const currentFlights = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredFlights.slice(start, start + itemsPerPage);
    }, [filteredFlights, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, advancedFilters, entryMode]);

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
                const data = await res.json();
                setStatus({ type: 'success', message: `Se insertaron ${data.length} vuelos masivamente en vivo.` });
                // Añadir al log (con marca isTxt para saber de donde viene si queremos)
                setSessionLogs(prev => [...data.map(v => ({...v, source: 'TXT'})), ...prev]);
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

    const handleCreateFlight = () => {
        if (
            !flightData.origenIcao ||
            !flightData.destinoIcao ||
            !flightData.capacity ||
            !flightData.departureTime ||
            !flightData.arrivalTime
        ) {
            setStatus({ type: 'error', message: 'Complete todos los campos.' });
            return;
        }

        const newFlight = {
            idTemp: Date.now() + Math.random().toString(36).substr(2, 9),
            origenIcao: flightData.origenIcao,
            destinoIcao: flightData.destinoIcao,
            capacity: Number(flightData.capacity),
            departureMinute: timeToMinutes(flightData.departureTime),
            arrivalMinute: timeToMinutes(flightData.arrivalTime)
        };

        setSessionLogs(prev => [{...newFlight, source: 'Manual'}, ...prev]);
        setStatus({ type: 'success', message: 'Vuelo añadido a la bandeja.' });

        setFlightData({
            origenIcao: '',
            destinoIcao: '',
            capacity: '',
            departureTime: '',
            arrivalTime: ''
        });
    };

    const handleUploadToLiveSystem = async () => {
        if (sessionLogs.length === 0) return;
        setLoading(true);
        setStatus({ type: 'info', message: 'Enviando a la red base de datos...' });

        let successCount = 0;
        let failCount = 0;

        await Promise.all(sessionLogs.map(async (flight) => {
            // Ignore items uploaded via TXT since they might be already processed
            // Wait, in handleUpload we pushed TXT files to sessionLogs.
            // If they are from TXT, they were already uploaded to backend. So we only upload manual ones!
            if (flight.source === 'TXT') return;

            try {
                const payload = {
                    origenIcao: flight.origenIcao,
                    destinoIcao: flight.destinoIcao,
                    capacity: flight.capacity,
                    departureMinute: flight.departureMinute,
                    arrivalMinute: flight.arrivalMinute
                };

                const res = await apiFetch('/api/v1/vuelos/create', {
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

        // Remove only manual sources, keep TXT if they want, or clear all?
        // Let's clear all since it's a batch save.
        if (failCount === 0) {
            setStatus({ type: 'success', message: `¡Los vuelos se registraron exitosamente!` });
            setSessionLogs([]);
            await fetchFlights();
        } else {
            setStatus({ type: 'error', message: `Hubo ${failCount} errores al subir vuelos manuales.` });
            await fetchFlights();
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
            
            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                {/* Lado Izquierdo: Formularios */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>

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

                                {[...airports]
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

                                {[...airports]
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
            </div> {/* Cierra columna izquierda */}

            {/* Columna Derecha: LOG DE SESIÓN */}
            {entryMode !== 'list' && (
                <div style={{ width: '300px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '14px' }}>Vuelos recién agregados</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sessionLogs.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center' }}>No hay vuelos registrados en esta sesión.</p>
                        ) : (
                            sessionLogs.map((log, idx) => {
                                const origen = airports.find(a => a.icao === log.origenIcao);
                                const gmt = origen ? origen.gmtOffset : 0;
                                let localMin = (log.departureMinute + (gmt * 60)) % 1440;
                                if (localMin < 0) localMin += 1440;
                                
                                return (
                                    <div key={idx} style={{ position: 'relative', background: 'rgba(30, 41, 59, 0.8)', padding: '0.75rem', borderRadius: '8px', borderLeft: `3px solid ${log.source === 'TXT' ? '#10b981' : '#38bdf8'}`, fontSize: '12px' }}>
                                        <button 
                                            onClick={() => handleRemoveLog(idx)}
                                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 5px' }}
                                            title="Quitar log"
                                        >
                                            ×
                                        </button>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', paddingRight: '15px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>ID: {log.id}</span>
                                            <span style={{ color: '#94a3b8' }}>{log.origenIcao} ✈️ {log.destinoIcao}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '0.5rem' }}>
                                            <div style={{ color: '#94a3b8' }}>Local: <strong style={{ color: '#fff' }}>{formatTime(localMin)}</strong></div>
                                            <div style={{ color: '#94a3b8' }}>UTC: <strong style={{ color: '#fff' }}>{formatTime(log.departureMinute)}</strong></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <button 
                            onClick={handleUploadToLiveSystem} 
                            disabled={sessionLogs.length === 0 || loading}
                            style={{
                                ...btnStylePrimary,
                                background: sessionLogs.length === 0 ? '#1e293b' : 'rgba(56, 189, 248, 0.15)',
                                color: sessionLogs.length === 0 ? '#475569' : '#38bdf8',
                                cursor: sessionLogs.length === 0 || loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'GUARDANDO...' : 'GUARDAR TODO AL SISTEMA'}
                        </button>
                    </div>
                </div>
            )}
            
            </div> {/* Cierra layout flex principal */}

            {entryMode === 'list' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '16px' }}>Listado General de Vuelos</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input 
                                type="text"
                                placeholder="Búsqueda por ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ ...inputStyle, padding: '6px 12px', width: '200px' }}
                            />
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                style={{
                                    ...btnStyleSecondary, 
                                    background: showFilters ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                                    borderColor: showFilters ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255,255,255,0.1)',
                                    color: showFilters ? '#38bdf8' : '#dbe6f2'
                                }}
                            >
                                ⚙ Filtros
                            </button>
                            <button onClick={fetchFlights} style={btnStyleSecondary}>↻ Actualizar</button>
                        </div>
                    </div>

                    {showFilters && (
                        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '10px' }}>ORIGEN</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: SKBO" 
                                    value={advancedFilters.origen} 
                                    onChange={(e) => setAdvancedFilters(p => ({ ...p, origen: e.target.value }))}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }} 
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '10px' }}>DESTINO</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: SEQM" 
                                    value={advancedFilters.destino} 
                                    onChange={(e) => setAdvancedFilters(p => ({ ...p, destino: e.target.value }))}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }} 
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '10px' }}>CAPACIDAD MIN</label>
                                <input 
                                    type="number" 
                                    placeholder="Min" 
                                    value={advancedFilters.minCapacity} 
                                    onChange={(e) => setAdvancedFilters(p => ({ ...p, minCapacity: e.target.value }))}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }} 
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '10px' }}>CAPACIDAD MAX</label>
                                <input 
                                    type="number" 
                                    placeholder="Max" 
                                    value={advancedFilters.maxCapacity} 
                                    onChange={(e) => setAdvancedFilters(p => ({ ...p, maxCapacity: e.target.value }))}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }} 
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '10px' }}>SALIDA DESDE</label>
                                <input 
                                    type="time" 
                                    value={advancedFilters.minTime} 
                                    onChange={(e) => setAdvancedFilters(p => ({ ...p, minTime: e.target.value }))}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }} 
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '10px' }}>SALIDA HASTA</label>
                                <input 
                                    type="time" 
                                    value={advancedFilters.maxTime} 
                                    onChange={(e) => setAdvancedFilters(p => ({ ...p, maxTime: e.target.value }))}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }} 
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => setAdvancedFilters({ origen: '', destino: '', minCapacity: '', maxCapacity: '', minTime: '', maxTime: '' })} 
                                    style={{ ...btnStyleSecondary, color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)', background: 'transparent' }}
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        </div>
                    )}

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
                                {currentFlights.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay vuelos que coincidan con la búsqueda.</td></tr>
                                ) : (
                                    currentFlights.map((vuelo, idx) => (
                                        <tr key={vuelo.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '12px', color: '#94a3b8' }}>{vuelo.id || 'N/A'}</td>
                                            <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 'bold' }}>{vuelo.origenIcao}</td>
                                            <td style={{ padding: '12px', color: '#34d399', fontWeight: 'bold' }}>{vuelo.destinoIcao}</td>
                                            <td style={{ padding: '12px' }}>{formatTime(vuelo.departureMinute)}</td>
                                            <td style={{ padding: '12px' }}>{formatTime(vuelo.arrivalMinute)}</td>
                                            <td style={{ padding: '12px' }}>{vuelo.capacity}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredFlights.length)} de {filteredFlights.length} vuelos
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{ ...btnStyleSecondary, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                >
                                    Anterior
                                </button>
                                <span style={{ color: '#e2e8f0', fontSize: '13px', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{ ...btnStyleSecondary, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
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
