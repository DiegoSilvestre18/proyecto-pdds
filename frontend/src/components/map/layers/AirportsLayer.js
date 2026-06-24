import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { getAirportLevelRgb, UNICODE_CHARACTERS } from './utils';

const nearbyOffsets = {
  "EKCH": "top", "EDDI": "left", "LOWW": "topRight", "LDZA": "right",
  "OJAI": "left", "OSDI": "right", "SABE": "left", "SUAA": "right",
  "EHAM": "top", "EBCI": "bottomLeft",
};

export const createAirportsLayers = ({
  airports,
  activeMetrics,
  isCollapseScenario,
  selectedAirportCode,
  focusedEntity,
  highlightedId,
  airportPassesFilter,
  hasAnySelection,
}) => {

  const data = airports.map(airport => {
    const metrics = activeMetrics[airport.icao];
    const stockBags = metrics?.storedBags ?? metrics?.load ?? 0;
    const maxCap = metrics?.warehouseCapacity ?? metrics?.capacity ?? "—";
    const level = stockBags === 0 && metrics ? "empty" : (metrics?.level ?? "green");
    const isSaturated = isCollapseScenario && metrics?.isSaturated;
    const isAirportSelected = selectedAirportCode === airport.icao;
    const isSelected = isAirportSelected || (focusedEntity?.type === 'airport' && focusedEntity?.id === airport.icao);
    const isHighlighted = highlightedId === airport.icao;
    const passesFilter = airportPassesFilter(airport.icao);
    const isDimmed = hasAnySelection && !isSelected;

    const offset = nearbyOffsets[airport.icao];
    let pixelOffset = [0, -13];
    let alignment = ['middle', 'bottom'];
    
    if (offset === 'left') { alignment = ['end', 'center']; pixelOffset = [-10, -4]; }
    else if (offset === 'right') { alignment = ['start', 'center']; pixelOffset = [10, -4]; }
    else if (offset === 'top') { alignment = ['middle', 'bottom']; pixelOffset = [0, -28]; }
    else if (offset === 'bottom') { alignment = ['middle', 'top']; pixelOffset = [0, 14]; }
    else if (offset === 'topRight') { alignment = ['start', 'bottom']; pixelOffset = [8, -18]; }
    else if (offset === 'topLeft') { alignment = ['end', 'bottom']; pixelOffset = [-8, -18]; }
    else if (offset === 'bottomRight') { alignment = ['start', 'top']; pixelOffset = [8, 8]; }
    else if (offset === 'bottomLeft') { alignment = ['end', 'top']; pixelOffset = [-8, 8]; }

    return {
      ...airport,
      stockBags,
      maxCap,
      level,
      isSaturated,
      isSelected,
      isHighlighted,
      passesFilter,
      isDimmed,
      pixelOffset,
      alignment
    };
  });

  const visibleData = data.filter(d => d.passesFilter);

  return [
    // Base dot
    new ScatterplotLayer({
      id: 'airports-layer',
      data: visibleData,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      lineWidthMinPixels: 2,
      getPosition: d => d.coordinates,
      getFillColor: d => getAirportLevelRgb(d.level, d.isDimmed ? 80 : 255),
      getLineColor: d => d.isSelected ? [255, 255, 255, 255] : [0, 0, 0, 255],
      getFilterValue: d => d.isDimmed ? 0.3 : 1, // Si quisieramos usar opacidad dinámica por filter
      updateTriggers: {
        getFillColor: [activeMetrics, hasAnySelection],
        getLineColor: [selectedAirportCode, focusedEntity]
      }
    }),
    
    // Selection Ring
    new ScatterplotLayer({
      id: 'airports-selection-ring',
      data: visibleData.filter(d => d.isSelected),
      pickable: false,
      opacity: 0.7,
      stroked: true,
      filled: false,
      radiusScale: 16,
      radiusMinPixels: 10,
      radiusMaxPixels: 24,
      lineWidthMinPixels: 2,
      getPosition: d => d.coordinates,
      getLineColor: d => [255, 255, 255, 200]
    }),

    // Label Layer: ICAO + City + Inventory
    new TextLayer({
      id: 'airports-text-layer',
      data: visibleData,
      pickable: false,
      getPosition: d => d.coordinates,
      getText: d => `${d.icao}\n${d.city}\n${d.stockBags}/${d.maxCap}`,
      getSize: d => 10,
      getColor: d => d.isDimmed ? [150, 150, 150, 100] : [255, 255, 255, 255],
      getAngle: 0,
      getTextAnchor: d => d.alignment[0],
      getAlignmentBaseline: d => d.alignment[1],
      getPixelOffset: d => d.pixelOffset,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'bold',
      lineHeight: 1.2,
      outlineWidth: 2,
      outlineColor: [6, 24, 40, 255],
      characterSet: UNICODE_CHARACTERS,
      updateTriggers: {
        getText: [activeMetrics],
        getColor: [hasAnySelection, selectedAirportCode]
      }
    })
  ];
};
