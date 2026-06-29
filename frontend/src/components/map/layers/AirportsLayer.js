import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
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
  relatedAirportCodes,
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
    const isDimmed = hasAnySelection && !isSelected && !relatedAirportCodes?.has(airport.icao);

    const offset = nearbyOffsets[airport.icao];
    // Icon is 30px centered at coordinate (±15px). Ring radius ~18px. Text clears ring.
    let pixelOffset = [0, -22];
    let alignment = ['middle', 'bottom'];

    if (offset === 'left')        { alignment = ['end', 'center'];   pixelOffset = [-22,   0]; }
    else if (offset === 'right')  { alignment = ['start', 'center']; pixelOffset = [ 22,   0]; }
    else if (offset === 'top')    { alignment = ['middle', 'bottom']; pixelOffset = [  0, -26]; }
    else if (offset === 'bottom') { alignment = ['middle', 'top'];    pixelOffset = [  0,  22]; }
    else if (offset === 'topRight')    { alignment = ['start', 'bottom']; pixelOffset = [ 16, -22]; }
    else if (offset === 'topLeft')     { alignment = ['end', 'bottom'];   pixelOffset = [-16, -22]; }
    else if (offset === 'bottomRight') { alignment = ['start', 'top'];    pixelOffset = [ 16,  20]; }
    else if (offset === 'bottomLeft')  { alignment = ['end', 'top'];      pixelOffset = [-16,  20]; }

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
    // Tower icon
    new IconLayer({
      id: 'airports-layer',
      data: visibleData,
      pickable: true,
      billboard: true,
      getPosition: d => d.coordinates,
      getIcon: d => ({
        url: '/tower-icon.svg',
        width: 512,
        height: 512,
        anchorX: 256,
        anchorY: 256,
        mask: true,
      }),
      sizeScale: 1,
      getSize: 30,
      getColor: d => getAirportLevelRgb(d.level, d.isDimmed ? 80 : 255),
      updateTriggers: {
        getColor: [activeMetrics, hasAnySelection, relatedAirportCodes],
      }
    }),
    
    // Selection Ring — centered on icon (anchorY=256 centers icon at coordinate)
    new ScatterplotLayer({
      id: 'airports-selection-ring',
      data: visibleData.filter(d => d.isSelected),
      pickable: false,
      opacity: 0.85,
      stroked: true,
      filled: false,
      radiusMinPixels: 18,
      radiusMaxPixels: 22,
      lineWidthMinPixels: 2,
      getPosition: d => d.coordinates,
      getLineColor: d => getAirportLevelRgb(d.level, 220),
      updateTriggers: {
        getLineColor: [activeMetrics]
      }
    }),

    // Label Layer: ICAO + City + Inventory
    new TextLayer({
      id: 'airports-text-layer',
      data: visibleData,
      pickable: false,
      getPosition: d => d.coordinates,
      getText: d => `${d.icao}\n${d.city}\n${d.stockBags}/${d.maxCap}`,
      getSize: d => 10,
      getColor: d => d.isDimmed ? [150, 150, 150, 100] : [6, 24, 40, 255],
      getAngle: 0,
      getTextAnchor: d => d.alignment[0],
      getAlignmentBaseline: d => d.alignment[1],
      getPixelOffset: d => d.pixelOffset,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'bold',
      lineHeight: 1.2,
      outlineWidth: 2,
      outlineColor: [255, 255, 255, 255],
      characterSet: UNICODE_CHARACTERS,
      updateTriggers: {
        getText: [activeMetrics],
        getColor: [hasAnySelection, selectedAirportCode, relatedAirportCodes]
      }
    })
  ];
};
