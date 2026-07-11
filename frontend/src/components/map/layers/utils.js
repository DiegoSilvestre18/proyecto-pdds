export const hexToRgb = (hex, alpha = 255) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    alpha
  ] : [100, 116, 139, alpha];
};

export const getStrokeColorRgb = (status, ocupacion = 0, capacidadMax = 0, alpha = 255) => {
  switch (status) {
    case "cancelled": return hexToRgb("#f43f5e", alpha);
    case "critical": return hexToRgb("#f59e0b", alpha);
    case "blocked": return hexToRgb("#e11d48", alpha);
    case "rescued": return hexToRgb("#3b82f6", alpha);
    default: {
      if (ocupacion === 0) return hexToRgb("#64748b", alpha);
      const pct = capacidadMax > 0 ? (ocupacion / capacidadMax) * 100 : 0;
      if (pct >= 90) return hexToRgb("#ef4444", alpha);
      if (pct >= 70) return hexToRgb("#f59e0b", alpha);
      return hexToRgb("#10b981", alpha);
    }
  }
};

export const getAveriaColorRgb = (averiaType, alpha = 255) => {
  switch (parseInt(averiaType)) {
    case 1: return hexToRgb('#f59e0b', alpha);
    case 2: return hexToRgb('#f97316', alpha);
    case 3: return hexToRgb('#ef4444', alpha);
    case 4: return hexToRgb('#1e1b4b', alpha);
    default: return hexToRgb('#ef4444', alpha);
  }
};

export const getAirportLevelRgb = (level, alpha = 255) => {
  switch (level) {
    case "green": return hexToRgb("#10b981", alpha);
    case "amber": return hexToRgb("#f59e0b", alpha);
    case "red": return hexToRgb("#ef4444", alpha);
    case "empty": return hexToRgb("#64748b", alpha);
    default: return hexToRgb("#10b981", alpha);
  }
};

export const UNICODE_CHARACTERS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~áéíóúÁÉÍÓÚñÑüÜãÃ";

// Proyección a Web Mercator matemáticamente para calcular ángulos visuales en pantalla
export const projectToMercator = ([lng, lat]) => {
  const x = lng;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * (180 / Math.PI);
  return [x, y];
};

export const unprojectFromMercator = ([x, y]) => {
  const lng = x;
  const lat = (2 * Math.atan(Math.exp(y * Math.PI / 180)) - Math.PI / 2) * (180 / Math.PI);
  return [lng, lat];
};

// Calculates angle between two points on the projected screen space
export const getVisualBearing = (start, end) => {
  if (!start || !end) return 0;
  const m1 = projectToMercator(start);
  const m2 = projectToMercator(end);
  const dx = m2[0] - m1[0];
  const dy = m2[1] - m1[1];
  // Deck.gl TextLayer/IconLayer rotation expects degrees where 0 is upright, 90 is right.
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  return angle;
};

// Interpola directamente en el espacio de Mercator para que coincida 100% con el LineLayer
export const interpolateMercator = (fromLng, fromLat, toLng, toLat, progress) => {
  const start = projectToMercator([fromLng, fromLat]);
  const end = projectToMercator([toLng, toLat]);
  const currentX = start[0] + (end[0] - start[0]) * progress;
  const currentY = start[1] + (end[1] - start[1]) * progress;
  return unprojectFromMercator([currentX, currentY]);
};

// Genera un camino de 100 puntos interpolados linealmente
export const getStraightPath = (start, end) => {
  if (!start || !end) return [];
  const steps = 100;
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ]);
  }
  return path;
};
