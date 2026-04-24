export const SCENARIO_TABS = [
  { key: "vivo", label: "Operación Día a Día" },
  { key: "periodo", label: "Simulación Periodo" },
  { key: "colapso", label: "Simulación Colapso" },
];

export const AIRPORT_ROWS = [
  { city: "Ottawa", capacity: "49.0%" },
  { city: "Washington", capacity: "46.5%" },
  { city: "Roma", capacity: "44.2%" },
  { city: "Tokio", capacity: "42.8%" },
  { city: "Nueva Delhi", capacity: "40.1%" },
  { city: "Berlín", capacity: "38.6%" },
  { city: "Lima", capacity: "38.0%" },
];

export const COLLAPSE_AIRPORT_ROWS = [
  { city: "Bogotá", capacity: "100.0%" },
  { city: "Lima", capacity: "100.0%" },
  { city: "C. de México", capacity: "100.0%" },
  { city: "Pekín", capacity: "100.0%" },
  { city: "Madrid", capacity: "98.3%" },
  { city: "París", capacity: "97.1%" },
  { city: "Roma", capacity: "96.5%" },
];

export const AIRCRAFT = [
  { id: 1, from: "IAD", to: "LHR", progress: 0.5, status: "normal" },
  { id: 2, from: "CDG", to: "DEL", progress: 0.42, status: "critical" },
  { id: 3, from: "MAD", to: "BOG", progress: 0.55, status: "normal" },
  { id: 4, from: "FCO", to: "DEL", progress: 0.4, status: "high" },
  { id: 5, from: "PEK", to: "HND", progress: 0.52, status: "normal" },
  { id: 6, from: "HND", to: "SCL", progress: 0.63, status: "high" },
  { id: 7, from: "BSB", to: "LIM", progress: 0.37, status: "normal" },
  { id: 8, from: "BOG", to: "MEX", progress: 0.62, status: "critical" },
  { id: 9, from: "RUH", to: "PEK", progress: 0.51, status: "normal" },
  { id: 10, from: "SCL", to: "EZE", progress: 0.58, status: "high" },
];

export const AIRPORT_NODES = [
  { code: "YOW", city: "Ottawa", country: "Canada", top: "26%", left: "23%" },
  {
    code: "IAD",
    city: "Washington",
    country: "EE.UU.",
    top: "33%",
    left: "19%",
  },
  {
    code: "MEX",
    city: "Ciudad de Mexico",
    country: "Mexico",
    top: "42%",
    left: "20%",
  },
  { code: "BOG", city: "Bogota", country: "Colombia", top: "53%", left: "24%" },
  { code: "LIM", city: "Lima", country: "Peru", top: "64%", left: "24%" },
  { code: "BSB", city: "Brasilia", country: "Brasil", top: "66%", left: "30%" },
  { code: "SCL", city: "Santiago", country: "Chile", top: "80%", left: "26%" },
  {
    code: "EZE",
    city: "Buenos Aires",
    country: "Argentina",
    top: "81%",
    left: "31%",
  },
  {
    code: "LHR",
    city: "Londres",
    country: "Reino Unido",
    top: "24%",
    left: "47%",
  },
  { code: "CDG", city: "Paris", country: "Francia", top: "26%", left: "48%" },
  { code: "MAD", city: "Madrid", country: "Espana", top: "29%", left: "46%" },
  { code: "BER", city: "Berlin", country: "Alemania", top: "24%", left: "50%" },
  { code: "FCO", city: "Roma", country: "Italia", top: "29%", left: "50%" },
  {
    code: "RUH",
    city: "Riad",
    country: "Arabia Saudi",
    top: "43%",
    left: "56%",
  },
  {
    code: "DEL",
    city: "Nueva Delhi",
    country: "India",
    top: "40%",
    left: "63%",
  },
  { code: "PEK", city: "Pekin", country: "China", top: "33%", left: "72%" },
  { code: "HND", city: "Tokio", country: "Japon", top: "36%", left: "79%" },
];

const CAPACITY_THRESHOLDS = {
  amber: 70,
  red: 90,
};

const COLLAPSE_OCCUPANCIES = {
  YOW: 94,
  IAD: 92,
  MEX: 100,
  BOG: 100,
  LIM: 100,
  BSB: 96,
  SCL: 91,
  EZE: 93,
  LHR: 95,
  CDG: 97,
  MAD: 98,
  BER: 91,
  FCO: 96,
  RUH: 92,
  DEL: 94,
  PEK: 100,
  HND: 78,
};

const getCapacityLevel = (occupancy = 0) => {
  if (occupancy >= CAPACITY_THRESHOLDS.red) {
    return "red";
  }

  if (occupancy >= CAPACITY_THRESHOLDS.amber) {
    return "amber";
  }

  return "green";
};

const getCapacityLabel = (level = "green") => {
  if (level === "red") {
    return "Critico";
  }

  if (level === "amber") {
    return "Carga alta";
  }

  return "Operacion estable";
};

const buildAirportMetrics = (airportNodes = []) =>
  airportNodes.reduce((accumulator, airport, index) => {
    const warehouseCapacity = 500 + ((index * 37) % 301);
    const occupancy = 38 + ((index * 11) % 58);
    const storedBags = Math.round((warehouseCapacity * occupancy) / 100);
    const level = getCapacityLevel(occupancy);

    accumulator[airport.code] = {
      warehouseId: `ALM-${airport.code}`,
      warehouseCapacity,
      storedBags,
      occupancy,
      level,
      status: getCapacityLabel(level),
    };

    return accumulator;
  }, {});

const buildCollapseAirportMetrics = (airportNodes = [], occupancies = {}) =>
  airportNodes.reduce((accumulator, airport, index) => {
    const warehouseCapacity = 500 + ((index * 37) % 301);
    const occupancy = occupancies[airport.code] ?? 0;
    const storedBags = Math.round((warehouseCapacity * occupancy) / 100);
    const level = getCapacityLevel(occupancy);

    accumulator[airport.code] = {
      warehouseId: `ALM-${airport.code}`,
      warehouseCapacity,
      storedBags,
      occupancy,
      level,
      status: occupancy >= 100 ? "SATURADO" : getCapacityLabel(level),
      isSaturated: occupancy >= 100,
    };

    return accumulator;
  }, {});

export const AIRPORT_METRICS = buildAirportMetrics(AIRPORT_NODES);
export const COLLAPSE_AIRPORT_METRICS = buildCollapseAirportMetrics(
  AIRPORT_NODES,
  COLLAPSE_OCCUPANCIES,
);

export const getCollapseAircraftStatus = (
  plane = {},
  collapseAirportMetrics = {},
) => {
  const destinationCode = plane.to ?? "";
  const destinationMetrics = collapseAirportMetrics[destinationCode];

  if (!destinationMetrics) {
    return plane.status ?? "normal";
  }

  if (destinationMetrics.occupancy >= 100) {
    return "blocked";
  }

  if (destinationMetrics.occupancy >= 90) {
    return "critical";
  }

  if (destinationMetrics.occupancy >= 70) {
    return "high";
  }

  return "normal";
};

export const SUMMARY_BY_SCENARIO = {
  vivo: {
    scenarioLabel: "Operación día a día",
    operationStart: "12:28 AM",
    systemClock: "2026-04-09 14:28 UTC",
    globalCapacity: "68%",
    networkLatency: "12MS",
    flightsInCourse: {
      value: 142,
      delta: "+6 vs última hora",
      status: "green",
    },
    storageOccupancy: {
      value: 68,
      subtitle: "Promedio red · 17 aeropuertos",
      status: "green",
    },
    sla: {
      value: 93.4,
      subtitle: "2,118 / 2,268 entregas",
      status: "green",
    },
    criticalNodes: {
      value: 3,
      subtitle: "2 almacenes >90% · 1 ruta bloqueada",
      status: "red",
    },
    progress: {
      label: "Tiempo real",
      percent: 0,
      simulatedTime: "00:36:22 simulado",
      status: "green",
    },
    transitByContinent: {
      america: 5420,
      europe: 3870,
      asia: 4110,
    },
  },
  periodo: {
    scenarioLabel: "Simulación de periodo",
    operationStart: "12:28 AM",
    systemClock: "2026-04-12 09:16 UTC",
    globalCapacity: "74%",
    networkLatency: "16MS",
    flightsInCourse: {
      value: 167,
      delta: "+12 vs última hora",
      status: "amber",
    },
    storageOccupancy: {
      value: 74,
      subtitle: "Promedio red · 17 aeropuertos",
      status: "amber",
    },
    sla: {
      value: 89.8,
      subtitle: "2,984 / 3,323 entregas",
      status: "amber",
    },
    criticalNodes: {
      value: 5,
      subtitle: "4 almacenes >90% · 1 cancelación activa",
      status: "red",
    },
    progress: {
      label: "Día 4 / 5",
      percent: 78,
      simulatedTime: "00:49:10 simulado",
      status: "amber",
    },
    transitByContinent: {
      america: 6180,
      europe: 4460,
      asia: 4890,
    },
  },
  colapso: {
    scenarioLabel: "Simulación de colapso",
    operationStart: "12:28 AM",
    systemClock: "2026-04-14 03:42 UTC",
    globalCapacity: "92%",
    networkLatency: "25MS",
    flightsInCourse: {
      value: 214,
      delta: "+21 vs última hora",
      status: "red",
    },
    storageOccupancy: {
      value: 92,
      subtitle: "Promedio red · 17 aeropuertos",
      status: "red",
    },
    sla: {
      value: 73.6,
      subtitle: "3,112 / 4,228 entregas",
      status: "red",
    },
    criticalNodes: {
      value: 11,
      subtitle: "8 almacenes >90% · 3 rutas bloqueadas",
      status: "red",
    },
    progress: {
      label: "Punto de colapso",
      percent: 96,
      simulatedTime: "01:12:38 simulado",
      status: "red",
    },
    transitByContinent: {
      america: 8220,
      europe: 6090,
      asia: 7010,
    },
  },
};

export const interpolatePosition = (
  fromAirport = {},
  toAirport = {},
  progress = 0,
) => {
  const fromTop = Number.parseFloat(fromAirport.top ?? 0);
  const fromLeft = Number.parseFloat(fromAirport.left ?? 0);
  const toTop = Number.parseFloat(toAirport.top ?? 0);
  const toLeft = Number.parseFloat(toAirport.left ?? 0);

  return {
    top: `${fromTop + (toTop - fromTop) * progress}%`,
    left: `${fromLeft + (toLeft - fromLeft) * progress}%`,
  };
};
