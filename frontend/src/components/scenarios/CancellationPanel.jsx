import { useState } from 'react'
import FlightCancellationPanel from './FlightCancellationPanel'
import CancelledFlightsPanel from './CancelledFlightsPanel'

const TABS = [
  { key: 'cancel', label: 'Cancelar', icon: '❌' },
  { key: 'cancelled', label: 'Cancelados', icon: '🚫' },
]

export default function CancellationPanel({ sessionId, isRunning, startEpoch, currentEpochTime, activeAircraft, cancelledFlights, onFlightCancelled }) {
  const [activeTab, setActiveTab] = useState('cancel')

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeTab === tab.key
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === tab.key ? '#ef4444' : '#94a3b8',
              borderBottom: activeTab === tab.key ? '2px solid #ef4444' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: activeTab === 'cancel' ? 'flex' : 'none', flexDirection: 'column', minHeight: '280px' }}>
        <FlightCancellationPanel
          sessionId={sessionId}
          isRunning={isRunning}
          startEpoch={startEpoch}
          currentEpochTime={currentEpochTime}
          onFlightCancelled={onFlightCancelled}
        />
      </div>

      <div style={{ display: activeTab === 'cancelled' ? 'flex' : 'none', flexDirection: 'column', minHeight: '280px' }}>
        <CancelledFlightsPanel
          cancelledFlights={cancelledFlights}
          activeAircraft={activeAircraft}
        />
      </div>
    </div>
  )
}
