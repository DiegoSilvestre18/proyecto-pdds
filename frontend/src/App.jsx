import WorldMap from "./components/map/WorldMap";
import AirportDetailPanel from "./components/controlTower/AirportDetailPanel";

import ControlDock from "./components/controlTower/ControlDock";
import ScenarioHeader from "./components/controlTower/ScenarioHeader";
import TelemetryPanel from "./components/floating/TelemetryPanel";
import CapacityLegendPanel from "./components/floating/CapacityLegendPanel";
import TopAirportsPanel from "./components/floating/TopAirportsPanel";
import TransitInventoryPanel from "./components/floating/TransitInventoryPanel";
import AlgorithmComparisonPanel from "./components/floating/AlgorithmComparisonPanel";
import ShipmentDetailPanel from "./components/floating/ShipmentDetailPanel";
import KpiStrip from "./components/kpi/KpiStrip";
import KpiControls from "./components/kpi/KpiControls";
import SimulationControls from "./components/kpi/SimulationControls";
import DayToDayConfig from "./components/scenarios/DayToDayConfig";
import PeriodSimConfig from "./components/scenarios/PeriodSimConfig";
import CollapseSimConfig from "./components/scenarios/CollapseSimConfig";
import { useControlTowerController } from "./hooks/useControlTowerController";
import "./App.css";

// Patron Container-Presenter: App solo compone UI y delega estado/reglas de negocio al hook.
// Esto reduce acoplamiento, facilita testing y mantiene componentes visuales enfocados.
const App = () => {
  const {
    activeAircraft,
    activeAirportRows,
    activeMetrics,
    activeTab,
    airportByCode,
    airportNodes,
    elapsedOperationTime,
    handleTabChange,
    hideAirportDetail,
    isAirportDetailOpen,
    isCollapseScenario,
    isDockCollapsed,
    isKpiCollapsed,
    isScenarioConfigOpen,
    isSimScenario,
    kpiCards,
    panelVisibility,
    selectedAircraftId,
    selectedAirport,
    selectedAirportCode,
    selectedAirportLevel,
    selectedAirportMetrics,
    selectedAlgorithm,
    selectedFromAirport,
    selectedToAirport,
    setSelectedAircraftId,
    setSelectedAlgorithm,
    setSimSpeed,
    setSimState,
    showAirportDetail,
    simSpeed,
    simState,
    summary,
    tabs,
    toggleDock,
    toggleKpiStrip,
    togglePanel,
    toggleScenarioConfig,
  } = useControlTowerController();

  return (
    <div
      className={`control-tower ${isCollapseScenario ? "control-tower--collapse" : ""}`}
    >
      <ScenarioHeader
        tabs={tabs}
        activeTab={activeTab}
        isCollapseScenario={isCollapseScenario}
        onTabChange={handleTabChange}
      />

      <div className="ct-kpi-region">
        <KpiStrip isCollapsed={isKpiCollapsed} kpiCards={kpiCards} />
        <SimulationControls
          isVisible={isSimScenario}
          simState={isCollapseScenario ? "collapsed" : simState}
          simulatedClock={summary.systemClock}
          elapsedReal={elapsedOperationTime}
          speed={simSpeed}
          onStart={() => setSimState("running")}
          onPause={() => setSimState("paused")}
          onStop={() => setSimState("idle")}
          onSpeedChange={setSimSpeed}
        />
        <KpiControls isCollapsed={isKpiCollapsed} onToggle={toggleKpiStrip} />
      </div>

      <main className="ct-main">
        <section className="ct-map-area" aria-label="Mapa de operaciones">
          <WorldMap
            airports={airportNodes}
            activeMetrics={activeMetrics}
            activeAircraft={activeAircraft}
            airportByIcao={airportByCode}
            isCollapseScenario={isCollapseScenario}
            selectedAirportCode={selectedAirportCode}
            selectedFromAirport={selectedFromAirport}
            selectedToAirport={selectedToAirport}
            onAirportSelect={showAirportDetail}
            selectedAircraftId={selectedAircraftId}
            onAircraftSelect={setSelectedAircraftId}
          />

          <DayToDayConfig
            isOpen={isScenarioConfigOpen && activeTab === "vivo"}
            onClose={toggleScenarioConfig}
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={setSelectedAlgorithm}
          />
          <PeriodSimConfig
            isOpen={isScenarioConfigOpen && activeTab === "periodo"}
            onClose={toggleScenarioConfig}
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={setSelectedAlgorithm}
          />
          <CollapseSimConfig
            isOpen={isScenarioConfigOpen && activeTab === "colapso"}
            onClose={toggleScenarioConfig}
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={setSelectedAlgorithm}
          />

          <div className="ct-floating-rail ct-floating-rail--left">
            <TelemetryPanel
              isVisible={panelVisibility.telemetry}
              summary={summary}
              elapsedOperationTime={elapsedOperationTime}
              onHide={() => togglePanel("telemetry")}
            />
            <TransitInventoryPanel
              isVisible={panelVisibility.transitInventory}
              transitByContinent={summary.transitByContinent}
              onHide={() => togglePanel("transitInventory")}
            />
          </div>

          <div className="ct-panel-stack ct-panel-stack--right">
            <AirportDetailPanel
              isOpen={isAirportDetailOpen}
              selectedAirport={selectedAirport}
              selectedAirportMetrics={selectedAirportMetrics}
              selectedAirportLevel={selectedAirportLevel}
              isCollapseScenario={isCollapseScenario}
              onClose={hideAirportDetail}
            />

            <div className="ct-floating-rail ct-floating-rail--right">
              <CapacityLegendPanel
                isVisible={panelVisibility.legend}
                onHide={() => togglePanel("legend")}
              />
              <TopAirportsPanel
                isVisible={panelVisibility.occupancy}
                airportRows={activeAirportRows}
                onHide={() => togglePanel("occupancy")}
              />
              <AlgorithmComparisonPanel
                isVisible={panelVisibility.comparison}
                onHide={() => togglePanel("comparison")}
              />
              <ShipmentDetailPanel
                isVisible={panelVisibility.shipmentDetail}
                onHide={() => togglePanel("shipmentDetail")}
              />
            </div>
          </div>

          <div className="ct-side-controls" aria-hidden="true">
            <button type="button">+</button>
            <button type="button">-</button>
            <button type="button">◎</button>
            <button type="button">✋</button>
          </div>
        </section>
      </main>

      <ControlDock
        isCollapsed={isDockCollapsed}
        isScenarioConfigOpen={isScenarioConfigOpen}
        panelVisibility={panelVisibility}
        onToggleScenarioConfig={toggleScenarioConfig}
        onTogglePanel={togglePanel}
        onToggleDock={toggleDock}
      />

      <footer
        className={`ct-footer ${isCollapseScenario ? "ct-footer--collapse" : ""}`}
      >
        <p>HORA DEL SISTEMA: {summary.systemClock}</p>
        <p>CAPACIDAD GLOBAL: {summary.globalCapacity}</p>
        <p>LATENCIA DE RED: {summary.networkLatency}</p>
        {isCollapseScenario ? (
          <p className="ct-footer-collapse-badge">
            ⚠ SISTEMA EN COLAPSO — 14/17 almacenes saturados
          </p>
        ) : (
          <p className="ct-footer-active">
            {summary.flightsInCourse.value} VUELOS EN CURSO
          </p>
        )}
      </footer>
    </div>
  );
};

export default App;
