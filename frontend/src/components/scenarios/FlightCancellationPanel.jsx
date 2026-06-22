import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiFetch } from '../../hooks/api'

/**
 * Panel para cancelar vuelos manualmente durante una simulación en curso.
 * Muestra una lista de vuelos futuros y permite buscarlos por origen/destino.
 */
export default function FlightCancellationPanel({ sessionId, isRunning, startEpoch, currentEpochTime }) {
  const [query, setQuery] = useState('')
  const [vuelos, setVuelos] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [resultado, setResultado] = useState(null)

  // Calcular el minuto actual del día en la simulación
  const currentSimMinute = useMemo(() => {
    if (!startEpoch || !currentEpochTime) return 0;
    return Math.floor(((currentEpochTime - startEpoch) % 86400000) / 60000);
  }, [startEpoch, currentEpochTime]);

  // Cargar vuelos cuando cambia la query o se monta
  useEffect(() => {
    if (!isRunning) return;
    
    const fetchVuelos = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/v1/vuelos/search?query=${query}`);
        if (res.ok) {
          const data = await res.json();
          setVuelos(data);
        }
      } catch (err) {
        console.error("Error fetching flights:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchVuelos, 300);
    return () => clearTimeout(timer);
  }, [query, isRunning]);

  const handleCancel = useCallback(async (id) => {
    if (!sessionId || !id) return;
    setCancellingId(id);
    setResultado(null);

    try {
      const res = await apiFetch(
        `/api/v1/simulation/cancel-flight/${id}?sessionId=${sessionId}`,
        { method: 'POST' }
      )
      const data = await res.json()
      setResultado({
        ok: res.ok,
        message: data.message || (res.ok ? 'Vuelo cancelado' : 'Error al cancelar'),
      })
      
      if (res.ok) {
        // Marcar como cancelado localmente para feedback inmediato
        setVuelos(prev => prev.map(v => v.id === id ? { ...v, cancelled: true } : v));
      }
    } catch (err) {
      setResultado({ ok: false, message: err.message })
    } finally {
      setCancellingId(null);
    }
  }, [sessionId]);

  const formatMinute = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      padding: '14px 16px',
      marginTop: '10px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#ef4444',
          letterSpacing: '0.5px',
        }}>
          ✈️ CONTROL DE CANCELACIONES
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Buscar origen o destino (ej: SPIM)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(100, 116, 139, 0.4)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ 
        maxHeight: '200px', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        paddingRight: '4px'
      }}>
        {loading && vuelos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '12px' }}>Cargando vuelos...</div>
        ) : vuelos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '12px' }}>No se encontraron vuelos</div>
        ) : (
          vuelos.map(v => {
            const isFuture = v.departureMinute > currentSimMinute;
            const isCancelled = v.cancelled;
            
            return (
              <div key={v.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                opacity: isFuture ? 1 : 0.5
              }}>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0' }}>
                    {v.origenIcao} → {v.destinoIcao}
                    <span style={{ marginLeft: '8px', fontWeight: 400, color: '#94a3b8' }}>ID: {v.id}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Salida: {formatMinute(v.departureMinute)}
                  </div>
                </div>
                
                <button
                  onClick={() => handleCancel(v.id)}
                  disabled={!isFuture || isCancelled || cancellingId === v.id}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: (!isFuture || isCancelled || cancellingId === v.id) ? 'not-allowed' : 'pointer',
                    background: isCancelled 
                      ? 'rgba(100, 116, 139, 0.2)' 
                      : !isFuture 
                        ? 'transparent'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: isCancelled ? '#94a3b8' : !isFuture ? '#64748b' : '#fff',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cancellingId === v.id ? '...' : isCancelled ? 'Cancelado' : !isFuture ? 'Ya salió' : 'Cancelar'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {resultado && (
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          background: resultado.ok
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(239, 68, 68, 0.15)',
          color: resultado.ok ? '#10b981' : '#ef4444',
          border: `1px solid ${resultado.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}>
          {resultado.ok ? '✅' : '⚠️'} {resultado.message}
        </div>
      )}
    </div>
  )
}
