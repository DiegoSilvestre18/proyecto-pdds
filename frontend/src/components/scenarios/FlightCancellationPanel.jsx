import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiFetch } from '../../hooks/api'

export default function FlightCancellationPanel({ sessionId, isRunning, startEpoch, currentEpochTime }) {
  const [query, setQuery] = useState('')
  const [vuelos, setVuelos] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [localState, setLocalState] = useState({}) // { [id]: 'cancelled' | 'deferred' }

  // Minuto del DÍA actual (0-1439) — necesario para comparar contra departureMinute,
  // que siempre es relativo a un día (los vuelos son recurrentes diarios).
  const minuteOfDay = useMemo(() => {
    if (!startEpoch || !currentEpochTime) return 0;
    const absoluteMinutes = Math.floor((currentEpochTime - startEpoch) / 60000);
    return ((absoluteMinutes % 1440) + 1440) % 1440;
  }, [startEpoch, currentEpochTime]);

  useEffect(() => {
    if (!isRunning) return;
    const fetchVuelos = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/v1/vuelos/search?query=${query}`);
        if (res.ok) setVuelos(await res.json());
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
      const deferred = data.deferred === 'true' || data.deferred === true;

      setResultado({ ok: res.ok, deferred, message: data.message || (res.ok ? 'Vuelo cancelado' : 'Error al cancelar') })

      if (res.ok) {
        setLocalState(prev => ({ ...prev, [id]: deferred ? 'deferred' : 'cancelled' }));
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
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px 16px', marginTop: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#ef4444', letterSpacing: '0.5px' }}>
            ✈️ CONTROL DE CANCELACIONES
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <input
              type="text"
              placeholder="Buscar origen o destino (ej: SPIM)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(100, 116, 139, 0.4)', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
          />
        </div>

        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
          {loading && vuelos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '12px' }}>Cargando vuelos...</div>
          ) : vuelos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '12px' }}>No se encontraron vuelos</div>
          ) : (
              vuelos.map(v => {
                const minutesUntilDeparture = ((v.departureMinute - minuteOfDay) + 1440) % 1440;
                const willDefer = minutesUntilDeparture < 60;
                const state = localState[v.id]; // 'cancelled' | 'deferred' | undefined

                return (
                    <div key={v.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: '3px',
                      background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '11px', minWidth: '75px' }}>
                          {v.origenIcao} ➝ {v.destinoIcao}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {formatMinute(v.departureMinute)} ({Math.floor(minutesUntilDeparture / 60)}h)
                        </div>
                        {!state && willDefer && (
                            <span style={{ fontSize: '10px', color: '#f59e0b' }} title="Menos de 1h — se cancelará el vuelo de mañana">⏱</span>
                        )}
                      </div>

                      <button
                          onClick={() => handleCancel(v.id)}
                          disabled={!!state || cancellingId === v.id}
                          style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, border: 'none',
                            cursor: (state || cancellingId === v.id) ? 'not-allowed' : 'pointer',
                            background: state === 'cancelled' ? 'rgba(100, 116, 139, 0.2)'
                                : state === 'deferred' ? 'rgba(245, 158, 11, 0.2)'
                                    : 'transparent',
                            border: `1px solid ${state === 'cancelled' ? 'rgba(100, 116, 139, 0.3)' : state === 'deferred' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: state === 'cancelled' ? '#94a3b8' : state === 'deferred' ? '#f59e0b' : '#ef4444',
                            transition: 'all 0.2s ease',
                          }}
                      >
                        {cancellingId === v.id ? '...' : state === 'cancelled' ? 'Cancelado' : state === 'deferred' ? 'Mañana' : 'Cancelar'}
                      </button>
                    </div>
                );
              })
          )}
        </div>

        {resultado && (
            <div style={{
              marginTop: '10px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
              background: !resultado.ok ? 'rgba(239, 68, 68, 0.15)' : resultado.deferred ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: !resultado.ok ? '#ef4444' : resultado.deferred ? '#f59e0b' : '#10b981',
              border: `1px solid ${!resultado.ok ? 'rgba(239, 68, 68, 0.3)' : resultado.deferred ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}>
              {!resultado.ok ? '⚠️' : resultado.deferred ? '⏱️' : '✅'} {resultado.message}
            </div>
        )}
      </div>
  )
}