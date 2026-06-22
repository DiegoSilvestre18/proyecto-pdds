import React, { useState } from 'react';

const FlightManagement = () => {
    const [status, setStatus] = useState({ type: '', message: '' });

    const [entryMode, setEntryMode] = useState('manual');

    const handleUpload = (e) => {
        e.preventDefault();
        setStatus({ type: 'success', message: 'Archivo de vuelos cargado temporalmente.' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', color: '#dbe6f2' }}>
            
            {/* TOGGLE MANUAL / TXT */}
            <div style={toggleContainerStyle}>
                <button type="button" onClick={() => setEntryMode('manual')} style={toggleBtnStyle(entryMode === 'manual')}>Ingreso Manual</button>
                <button type="button" onClick={() => setEntryMode('txt')} style={toggleBtnStyle(entryMode === 'txt')}>Masivo por TXT</button>
            </div>

            {entryMode === 'manual' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56,189,248,0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#38bdf8', fontSize: '16px' }}>Registro Manual de Vuelo Excepcional</h3>
                    <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>ORIGEN (ICAO)</label>
                            <input type="text" placeholder="Ej: SPJC" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>DESTINO (ICAO)</label>
                            <input type="text" placeholder="Ej: SBGR" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>HORA SALIDA (HO:MO)</label>
                            <input type="time" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>HORA LLEGADA (HD:MD)</label>
                            <input type="time" style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>CAPACIDAD (####)</label>
                            <input type="number" placeholder="Ej: 250" style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <button type="button" style={{...btnStylePrimary, background: 'rgba(255,255,255,0.05)', color: '#dbe6f2', border: '1px solid rgba(255,255,255,0.2)'}}>
                                + Agregar Vuelo a la Bandeja
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {entryMode === 'txt' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px dashed rgba(148, 163, 184, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '14px' }}>Carga Masiva de Planes de Vuelo (.TXT)</h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '11px', color: '#64748b' }}>Formato esperado: ORIG-DEST-HO:MO-HD-MD ####</p>
                    <input type="file" accept=".txt" style={{ width: '100%', color: '#94a3b8', fontSize: '12px', marginBottom: '1rem' }} />
                    
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

const getStatusStyle = (type) => ({
    padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
    border: `1px solid ${type === 'success' ? '#10b981' : '#38bdf8'}`,
    color: type === 'success' ? '#34d399' : '#7dd3fc'
});

const toggleContainerStyle = { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' };
const toggleBtnStyle = (active) => ({
    flex: 1, padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s',
    background: active ? '#38bdf8' : 'transparent',
    color: active ? '#0f172a' : '#94a3b8'
});

export default FlightManagement;
