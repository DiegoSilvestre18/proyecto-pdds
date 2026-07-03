import { IconLayer, TextLayer } from '@deck.gl/layers';
import { getStrokeColorRgb, getVisualBearing } from './utils';
import { interpolateCoordinates, AIRPORT_BY_ICAO } from '../../../data/airportsData';

export const createFlightsLayer = ({
  activeAircraft,
  airportByIcao,
  selectedAircraftId,
  highlightedId,
  trackedRoute,
  flightPassesFilter,
  showFlightsWithoutShipments,
  showFlightsWithShipments,
  hasAnySelection,
  selectedAirportCode
}) => {
  
  const planeData = [];
  const textData = [];

  activeAircraft.forEach(plane => {
    const isEmpty = !plane.ocupacionReal || plane.ocupacionReal === 0;
    if (isEmpty && !showFlightsWithoutShipments) return;
    if (!isEmpty && !showFlightsWithShipments) return;
    
    const from = airportByIcao[plane.from] || AIRPORT_BY_ICAO[plane.from];
    const to = airportByIcao[plane.to] || AIRPORT_BY_ICAO[plane.to];
    if (!from || !to) return;

    const progress = plane.progress ?? 0;
    const position = interpolateCoordinates(from, to, progress);
    const isBlocked = plane.status === "blocked";
    const isCancelled = plane.status === "cancelled";
    const isRescued = plane.status === "rescued";
    
    const isSelected = selectedAircraftId === plane.id;
    const isHighlighted = highlightedId === plane.id;
    const isWarehouseFlight = selectedAirportCode && (plane.from === selectedAirportCode || plane.to === selectedAirportCode);
    const passesFilter = flightPassesFilter(plane.capacityPercent, plane.from, plane.to, plane.ocupacionReal);
    
    if (!passesFilter) return;

    const isOnGround = progress <= 0.01 || progress >= 0.99;
    const isPreDeparture = progress <= 0.01;

    let nextProgress = Math.min(1, progress + 0.001);
    if (progress >= 0.999) nextProgress = 1;
    const nextPosition = interpolateCoordinates(from, to, nextProgress);
    const bearing = getVisualBearing(position, nextPosition);

    const isAircraftSelected = selectedAircraftId != null;
    const isTrackingActive = trackedRoute?.hops?.length > 0;
    const isDimmed = isAircraftSelected || isTrackingActive;
    const baseOpacity = isDimmed ? (isSelected ? 255 : 60) : 255;
    const color = isSelected && isAircraftSelected
      ? [129, 140, 248, baseOpacity]
      : isCancelled 
        ? [239, 68, 68, baseOpacity] 
        : isRescued 
          ? [59, 130, 246, baseOpacity] 
          : getStrokeColorRgb(plane.status, plane.ocupacionReal, plane.capacidadMax, baseOpacity);

    const baseProps = { ...plane, position, color, isSelected, isHighlighted };

    if (isBlocked || isCancelled || isOnGround) {
      let icon = "✖";
      if (isOnGround && !isBlocked && !isCancelled) {
        icon = isPreDeparture ? "⏳" : "🛬";
      }
      textData.push({ ...baseProps, text: icon, size: 14, angle: 0 });
    } else {
      planeData.push({ ...baseProps, size: 20, angle: bearing });
    }
  });

  return [
    new IconLayer({
      id: 'flights-icon-layer',
      data: planeData,
      pickable: true,
      billboard: false,
      getIcon: d => ({
        url: '/airplane.svg',
        width: 24,
        height: 24,
        anchorY: 12,
        mask: true
      }),
      sizeScale: 1,
      getPosition: d => d.position,
      getSize: d => d.size,
      getColor: d => d.color,
      getAngle: d => -d.angle,
      updateTriggers: {
        getPosition: [activeAircraft],
        getColor: [activeAircraft, selectedAircraftId, hasAnySelection, selectedAirportCode, trackedRoute],
        getAngle: [activeAircraft]
      }
    }),
    new TextLayer({
      id: 'flights-text-layer',
      data: textData,
      pickable: true,
      getPosition: d => d.position,
      getText: d => d.text,
      getSize: d => d.size,
      getColor: d => d.color,
      getAngle: d => d.angle,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'system-ui, sans-serif',
      characterSet: "✖⏳🛬",
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 200],
      updateTriggers: {
        getPosition: [activeAircraft],
        getColor: [activeAircraft, selectedAircraftId, hasAnySelection, selectedAirportCode, trackedRoute]
      }
    })
  ];
};
