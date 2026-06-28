import { useState } from 'react'
import { apiFetch } from '../../hooks/api'
import { useToast } from '../../hooks/useToast'
import { Spinner } from '../common/Skeleton'

/**
 * Panel de desempeño de ALNS.
 *
 * @param {boolean} isVisible     - si el panel está visible
 * @param {Function} onHide       - callback para ocultar el panel
 * @param {string|null} sessionId - UUID de sesión activa (null → usa datos estáticos)
 * @param {Object|null} comparisonData - datos reales de desempeño
 */
function AlgorithmComparisonPanel({ isVisible, onHide, sessionId = null, comparisonData = null }) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)

  if (!isVisible) {
    return null
  }

  const hasData = !!comparisonData && !!comparisonData.alns

  /**
   * Exporta el CSV de la sesión activa desde el backend.
   */
  const handleExport = async () => {
    if (!sessionId) {
      toast.warning('La simulación aún no se ha ejecutado. No hay datos para exportar.')
      return
    }
    if (exporting) return

    setExporting(true)
    try {
      const res = await apiFetch(`/api/v1/simulation/export/${sessionId}`)

      if (res.status === 409) {
        toast.info('La simulación aún está en curso. Espere a que finalice.')
        return
      }
      if (!res.ok) {
        toast.error('No se encontró la sesión. Inicia una simulación primero.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tasf_simulation_${sessionId.substring(0, 8)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Tasf.B2B] Error al descargar CSV:', err)
      toast.error('Error de red al descargar el CSV. Intente de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  const isLiveData = !!sessionId

  return (
    <aside className="ct-panel ct-panel--comparison" aria-label="Desempeño Metaheurística">
      <div className="ct-panel-header">
        <p>
          DESEMPEÑO ALNS
          {isLiveData && (
            <span style={{ fontSize: '10px', color: '#4ade80', marginLeft: '6px' }}>
              ● DATOS REALES
            </span>
          )}
        </p>
        <button type="button" className="ct-panel-close" onClick={onHide}>
          Ocultar
        </button>
      </div>

      <div className="ct-comparison-table-wrap">
        {!hasData ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            Sin datos de ejecución
          </div>
        ) : (
          <table className="ct-comparison-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>ALNS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tiempo de ejecución</td>
                <td className="ct-cell-best">{comparisonData.alns?.execTime ?? '-'}</td>
              </tr>
              <tr>
                <td>Entregas a tiempo</td>
                <td className="ct-cell-best">{comparisonData.alns?.deliveredOnTime ?? '-'}</td>
              </tr>
              <tr>
                <td>Total entregas</td>
                <td className="ct-cell-best">{comparisonData.alns?.totalDeliveries ?? '-'}</td>
              </tr>
              <tr>
                <td>SLA cumplido</td>
                <td className="ct-cell-best">{comparisonData.alns?.slaPercent ? `${comparisonData.alns.slaPercent}%` : '-'}</td>
              </tr>
              <tr>
                <td>Long. promedio ruta</td>
                <td className="ct-cell-best">{comparisonData.alns?.avgRouteLength ? `${comparisonData.alns.avgRouteLength} escalas` : '-'}</td>
              </tr>
              <tr>
                <td>Replanificaciones</td>
                <td className="ct-cell-best">{comparisonData.alns?.replanifications ?? '-'}</td>
              </tr>
              {comparisonData.alns?.rescuedFlights > 0 && (
                <tr>
                  <td>Vuelos Rescatados</td>
                  <td className="ct-cell-best">{comparisonData.alns?.rescuedFlights ?? '-'}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="ct-comparison-footer">
        <button
          type="button"
          className="ct-comparison-export"
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: !sessionId || exporting ? 0.5 : 1,
            cursor: sessionId && !exporting ? 'pointer' : 'not-allowed',
          }}
        >
          {exporting
            ? (<><Spinner size={14} label="Exportando…" /> Exportando…</>)
            : `📥 ${sessionId ? 'Exportar CSV real' : 'Exportar CSV'}`}
        </button>
      </div>
    </aside>
  )
}

export default AlgorithmComparisonPanel

