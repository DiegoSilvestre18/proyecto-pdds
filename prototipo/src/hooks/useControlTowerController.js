import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AIRCRAFT,
  AIRPORT_METRICS,
  AIRPORT_NODES,
  AIRPORT_ROWS,
  COLLAPSE_AIRPORT_METRICS,
  COLLAPSE_AIRPORT_ROWS,
  SCENARIO_TABS,
  SUMMARY_BY_SCENARIO,
  getCollapseAircraftStatus,
} from "../data/controlTowerData";

const PANEL_VISIBILITY_DEFAULT = {
  telemetry: true,
  legend: true,
  occupancy: true,
  transitInventory: false,
  comparison: false,
  shipmentDetail: false,
};

const KPI_COLLAPSED_STORAGE_KEY = "ct-kpi-collapsed";

const readStoredKpiCollapsed = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const storedValue = window.localStorage.getItem(KPI_COLLAPSED_STORAGE_KEY);
  return storedValue ? storedValue === "true" : false;
};

export const useControlTowerController = () => {
  const [activeTab, setActiveTab] = useState("vivo");
  const [panelVisibility, setPanelVisibility] = useState(
    PANEL_VISIBILITY_DEFAULT,
  );
  const [isKpiCollapsed, setIsKpiCollapsed] = useState(readStoredKpiCollapsed);
  const [selectedAircraftId, setSelectedAircraftId] = useState(1);
  const [selectedAirportCode, setSelectedAirportCode] = useState(null);
  const [isAirportDetailOpen, setIsAirportDetailOpen] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isScenarioConfigOpen, setIsScenarioConfigOpen] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("hga");
  const [simState, setSimState] = useState("idle");
  const [simSpeed, setSimSpeed] = useState(1);

  const isCollapseScenario = activeTab === "colapso";
  const isSimScenario = activeTab === "periodo" || activeTab === "colapso";

  const togglePanel = useCallback((panelName = "") => {
    if (!panelName) {
      return;
    }

    setPanelVisibility((current) => ({
      ...current,
      [panelName]: !current[panelName],
    }));
  }, []);

  const handleTabChange = useCallback((tabKey = "vivo") => {
    setActiveTab(tabKey);
    setIsScenarioConfigOpen(false);
  }, []);

  const toggleScenarioConfig = useCallback(() => {
    setIsScenarioConfigOpen((current) => !current);
  }, []);

  const toggleKpiStrip = useCallback(() => {
    setIsKpiCollapsed((current) => !current);
  }, []);

  const toggleDock = useCallback(() => {
    setIsDockCollapsed((current) => !current);
  }, []);

  const hideAirportDetail = useCallback(() => {
    setIsAirportDetailOpen(false);
  }, []);

  const showAirportDetail = useCallback((airportCode = "") => {
    if (!airportCode) {
      return;
    }

    setSelectedAirportCode(airportCode);
    setIsAirportDetailOpen(true);
  }, []);

  const airportByCode = useMemo(
    () =>
      AIRPORT_NODES.reduce((accumulator, airport) => {
        accumulator[airport.code] = airport;
        return accumulator;
      }, {}),
    [],
  );

  const activeMetrics = isCollapseScenario
    ? COLLAPSE_AIRPORT_METRICS
    : AIRPORT_METRICS;
  const activeAirportRows = isCollapseScenario
    ? COLLAPSE_AIRPORT_ROWS
    : AIRPORT_ROWS;

  const activeAircraft = useMemo(
    () =>
      AIRCRAFT.map((plane) => {
        if (!isCollapseScenario) {
          return plane;
        }

        return {
          ...plane,
          status: getCollapseAircraftStatus(plane, COLLAPSE_AIRPORT_METRICS),
        };
      }),
    [isCollapseScenario],
  );

  const selectedAircraft = useMemo(
    () =>
      activeAircraft.find((plane) => plane.id === selectedAircraftId) ?? null,
    [activeAircraft, selectedAircraftId],
  );

  const selectedFromAirport = selectedAircraft
    ? (airportByCode[selectedAircraft.from] ?? null)
    : null;

  const selectedToAirport = selectedAircraft
    ? (airportByCode[selectedAircraft.to] ?? null)
    : null;

  const selectedAirport = selectedAirportCode
    ? (airportByCode[selectedAirportCode] ?? null)
    : null;

  const selectedAirportMetrics = selectedAirport
    ? (activeMetrics[selectedAirport.code] ?? null)
    : null;

  const selectedAirportLevel = selectedAirportMetrics?.level ?? "green";

  const summary = SUMMARY_BY_SCENARIO[activeTab] ?? SUMMARY_BY_SCENARIO.vivo;
  const elapsedOperationTime = summary.progress.simulatedTime.replace(
    " simulado",
    "",
  );

  const kpiCards = useMemo(
    () => [
      {
        key: "flights",
        title: "Vuelos en curso",
        value: summary.flightsInCourse.value,
        subtitle: summary.flightsInCourse.delta,
        status: summary.flightsInCourse.status,
      },
      {
        key: "occupancy",
        title: "Ocupación global almacenes",
        value: `${summary.storageOccupancy.value}%`,
        subtitle: summary.storageOccupancy.subtitle,
        status: summary.storageOccupancy.status,
      },
      {
        key: "sla",
        title: "Entregas a tiempo (SLA)",
        value: `${summary.sla.value}%`,
        subtitle: summary.sla.subtitle,
        status: summary.sla.status,
      },
      {
        key: "critical",
        title: "Nodos críticos",
        value: summary.criticalNodes.value,
        subtitle: summary.criticalNodes.subtitle,
        status: summary.criticalNodes.status,
      },
      {
        key: "progress",
        title: isCollapseScenario ? "Estado de colapso" : "Progreso simulación",
        value: `${summary.progress.label} · ${summary.progress.percent}%`,
        subtitle: summary.progress.simulatedTime,
        status: summary.progress.status,
        progress: summary.progress.percent,
      },
    ],
    [isCollapseScenario, summary],
  );

  useEffect(() => {
    if (!isAirportDetailOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsAirportDetailOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAirportDetailOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      KPI_COLLAPSED_STORAGE_KEY,
      String(isKpiCollapsed),
    );
  }, [isKpiCollapsed]);

  return {
    activeAircraft,
    activeAirportRows,
    activeMetrics,
    activeTab,
    airportByCode,
    airportNodes: AIRPORT_NODES,
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
    selectedAirportCode,
    selectedAirport,
    selectedAirportLevel,
    selectedAirportMetrics,
    selectedAlgorithm,
    selectedFromAirport,
    selectedToAirport,
    simSpeed,
    simState,
    summary,
    tabs: SCENARIO_TABS,
    toggleDock,
    toggleKpiStrip,
    togglePanel,
    toggleScenarioConfig,
    setSelectedAircraftId,
    setSelectedAlgorithm,
    setSimSpeed,
    setSimState,
    showAirportDetail,
  };
};
