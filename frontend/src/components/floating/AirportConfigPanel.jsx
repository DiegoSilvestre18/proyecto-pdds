import React, { useState, useEffect, useCallback } from 'react';
import { SkeletonList, EmptyState } from '../common/Skeleton';

const CONTINENTES = ['AMERICA', 'EUROPE', 'ASIA', 'AFRICA', 'OCEANIA'];

const fieldStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  color: '#f1f5f9',
  padding: '6px 10px',
  fontSize: '12px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle = {
  fontSize: '10px',
  color: '#94a3b8',
  textTransform: 'uppercase',
  marginBottom: '3px',
  display: 'block',
};

/** B02: Panel para ver y editar atributos de almacenes (aeropuertos) */
const AirportConfigPanel = () => {
  const [airports, setAirports] = useState([]);
  const [editing, setEditing] = useState(null); // { id, ...fields }
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/v1/aeropuertos');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAirports(await res.json());
      setStatus('ready');
    } catch (e) {
      // Antes el catch era silencioso: el panel quedaba vacío sin explicación.
      console.error('[AirportConfig] Error cargando aeropuertos:', e);
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (ap) => {
    setEditing({ ...ap });
    setMsg(null);
  };

  const handleChange = (field, value) => {
    setEditing(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editing) return;

    // Validación numérica: parseInt/parseFloat devuelven NaN con entrada vacía o
    // inválida; antes esos NaN llegaban al backend. Validamos rangos también.
    const storageCapacity = parseInt(editing.storageCapacity, 10);
    const gmtOffset = parseInt(editing.gmtOffset, 10);
    const latitude = parseFloat(editing.latitude);
    const longitude = parseFloat(editing.longitude);

    if (Number.isNaN(storageCapacity) || storageCapacity < 0) {
      setMsg({ type: 'err', text: '❌ Capacidad de almacén inválida (debe ser un número ≥ 0)' });
      return;
    }
    if (Number.isNaN(gmtOffset) || gmtOffset < -12 || gmtOffset > 14) {
      setMsg({ type: 'err', text: '❌ GMT Offset inválido (debe estar entre -12 y +14)' });
      return;
    }
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      setMsg({ type: 'err', text: '❌ Latitud inválida (debe estar entre -90 y 90)' });
      return;
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      setMsg({ type: 'err', text: '❌ Longitud inválida (debe estar entre -180 y 180)' });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const body = {
        icaoCode: editing.icaoCode,
        city: editing.city,
        country: editing.country,
        continent: editing.continent,
        storageCapacity,
        gmtOffset,
        latitude,
        longitude,
      };
      const res = await fetch(`/api/v1/aeropuertos/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg({ type: 'ok', text: `✅ ${editing.icaoCode} actualizado correctamente` });
        await load();
        setEditing(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ type: 'err', text: `❌ Error: ${err.message || res.status}` });
      }
    } catch (e) {
      setMsg({ type: 'err', text: `❌ Error de conexión` });
    } finally {
      setSaving(false);
    }
  };

  const filtered = airports.filter(a =>
    a.icaoCode.toLowerCase().includes(search.toLowerCase()) ||
    (a.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.country || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '16px', minWidth: '340px', maxWidth: '420px' }}>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
        B02 · Actualiza ubicación y capacidad de almacenes principales
      </div>

      {msg && (
        <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px',
          background: msg.type === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: msg.type === 'ok' ? '#34d399' : '#fca5a5',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {msg.text}
        </div>
      )}

      {!editing ? (
        <>
          <input
            placeholder="🔍 Buscar por ICAO, ciudad o país..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...fieldStyle, marginBottom: '10px' }}
          />
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {status === 'loading' && (
              <SkeletonList rows={6} rowHeight={48} label="Cargando almacenes…" />
            )}
            {status === 'error' && (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontSize: '26px', marginBottom: '8px' }} aria-hidden="true">⚠️</div>
                <div style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 600 }}>No se pudieron cargar los almacenes</div>
                <div style={{ color: '#64748b', fontSize: '11px', margin: '4px 0 12px' }}>Verifica la conexión con el servidor.</div>
                <button onClick={load}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(96,165,250,0.4)',
                    background: 'rgba(96,165,250,0.12)', color: '#93c5fd', fontSize: '12px', cursor: 'pointer' }}>
                  ↻ Reintentar
                </button>
              </div>
            )}
            {status === 'ready' && filtered.map(ap => (
              <div key={ap.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: '6px', marginBottom: '4px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '13px' }}>{ap.icaoCode}</span>
                  <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '8px' }}>{ap.city}, {ap.country}</span>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Cap: {ap.storageCapacity?.toLocaleString()} · GMT{ap.gmtOffset >= 0 ? '+' : ''}{ap.gmtOffset}
                  </div>
                </div>
                <button onClick={() => handleEdit(ap)}
                  style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid rgba(96,165,250,0.3)',
                    background: 'rgba(96,165,250,0.1)', color: '#93c5fd', fontSize: '11px', cursor: 'pointer' }}>
                  ✏️ Editar
                </button>
              </div>
            ))}
            {status === 'ready' && filtered.length === 0 && (
              <EmptyState
                icon="🔍"
                title={search ? 'Sin resultados' : 'No hay almacenes registrados'}
                hint={search ? 'Prueba con otro término de búsqueda.' : null}
              />
            )}
          </div>
        </>
      ) : (
        <div>
          <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px', fontSize: '13px' }}>
            ✏️ Editando: {editing.icaoCode}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Ciudad</label>
              <input style={fieldStyle} value={editing.city || ''} onChange={e => handleChange('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>País</label>
              <input style={fieldStyle} value={editing.country || ''} onChange={e => handleChange('country', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Capacidad Almacén</label>
              <input type="number" min="100" style={fieldStyle} value={editing.storageCapacity || ''} onChange={e => handleChange('storageCapacity', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>GMT Offset</label>
              <input type="number" min="-12" max="14" style={fieldStyle} value={editing.gmtOffset ?? ''} onChange={e => handleChange('gmtOffset', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Latitud</label>
              <input type="number" step="0.0001" style={fieldStyle} value={editing.latitude ?? ''} onChange={e => handleChange('latitude', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Longitud</label>
              <input type="number" step="0.0001" style={fieldStyle} value={editing.longitude ?? ''} onChange={e => handleChange('longitude', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Continente</label>
            <select style={fieldStyle} value={editing.continent || ''} onChange={e => handleChange('continent', e.target.value)}>
              {CONTINENTES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '9px', borderRadius: '7px', border: '1px solid rgba(16,185,129,0.4)',
                background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '12px',
                fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
            </button>
            <button onClick={() => { setEditing(null); setMsg(null); }}
              style={{ flex: 1, padding: '9px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AirportConfigPanel;
