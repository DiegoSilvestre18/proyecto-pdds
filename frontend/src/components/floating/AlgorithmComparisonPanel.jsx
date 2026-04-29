const COMPARISON_DATA = {
  hga: {
    name: 'HGA (Genético Híbrido)',
    execTime: '4m 32s',
    deliveredOnTime: 2118,
    totalDeliveries: 2268,
    slaPercent: 93.4,
    avgRouteLength: 2.4,
    replanifications: 12,
  },
  alns: {
    name: 'ALNS (Vecindario Adaptivo)',
    execTime: '3m 48s',
    deliveredOnTime: 2145,
    totalDeliveries: 2268,
    slaPercent: 94.6,
    avgRouteLength: 2.2,
    replanifications: 9,
  },
}

function AlgorithmComparisonPanel({ isVisible, onHide }) {
  if (!isVisible) {
    return null
  }

  const hga = COMPARISON_DATA.hga
  const alns = COMPARISON_DATA.alns

  const handleExport = () => {
    const text = [
      'REPORTE COMPARATIVO DE ALGORITMOS — Tasf.B2B',
      `Fecha: ${new Date().toISOString()}`,
      '',
      `Algoritmo,Tiempo Ejecución,Entregas a Tiempo,Total Entregas,SLA %,Long. Promedio Ruta,Replanificaciones`,
      `${hga.name},${hga.execTime},${hga.deliveredOnTime},${hga.totalDeliveries},${hga.slaPercent}%,${hga.avgRouteLength},${hga.replanifications}`,
      `${alns.name},${alns.execTime},${alns.deliveredOnTime},${alns.totalDeliveries},${alns.slaPercent}%,${alns.avgRouteLength},${alns.replanifications}`,
    ].join('\n')

    const blob = new Blob([text], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'comparativa_algoritmos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="ct-panel ct-panel--comparison" aria-label="Comparativa de algoritmos">
      <div className="ct-panel-header">
        <p>COMPARATIVA DE ALGORITMOS</p>
        <button type="button" className="ct-panel-close" onClick={onHide}>
          Ocultar
        </button>
      </div>

      <div className="ct-comparison-table-wrap">
        <table className="ct-comparison-table">
          <thead>
            <tr>
              <th>Métrica</th>
              <th>HGA</th>
              <th>ALNS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tiempo de ejecución</td>
              <td>{hga.execTime}</td>
              <td className="ct-cell-best">{alns.execTime}</td>
            </tr>
            <tr>
              <td>Entregas a tiempo</td>
              <td>{hga.deliveredOnTime.toLocaleString('es-PE')}</td>
              <td className="ct-cell-best">{alns.deliveredOnTime.toLocaleString('es-PE')}</td>
            </tr>
            <tr>
              <td>SLA cumplido</td>
              <td>{hga.slaPercent}%</td>
              <td className="ct-cell-best">{alns.slaPercent}%</td>
            </tr>
            <tr>
              <td>Long. promedio ruta</td>
              <td>{hga.avgRouteLength} escalas</td>
              <td className="ct-cell-best">{alns.avgRouteLength} escalas</td>
            </tr>
            <tr>
              <td>Replanificaciones</td>
              <td>{hga.replanifications}</td>
              <td className="ct-cell-best">{alns.replanifications}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ct-comparison-footer">
        <span className="ct-comparison-verdict">
          ✓ ALNS superior en este escenario
        </span>
        <button type="button" className="ct-comparison-export" onClick={handleExport}>
          📥 Exportar CSV
        </button>
      </div>
    </aside>
  )
}

export default AlgorithmComparisonPanel
