const fs = require('fs');

function projectToMercator([lng, lat]) {
  const x = lng;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * (180 / Math.PI);
  return [x, y];
}

function getVisualBearing(start, end) {
  if (!start || !end) return 0;
  const m1 = projectToMercator(start);
  const m2 = projectToMercator(end);
  const dx = m2[0] - m1[0];
  const dy = m2[1] - m1[1];
  return Math.atan2(dx, dy) * (180 / Math.PI);
}

function interpolateCoordinates(fromAirport, toAirport, progress) {
  const [fromLng, fromLat] = fromAirport;
  const [toLng, toLat] = toAirport;
  return [
    fromLng + (toLng - fromLng) * progress,
    fromLat + (toLat - fromLat) * progress,
  ];
}

// Test cases
const tests = [
  { name: 'North (Bogota to Miami)', from: [-74, 4], to: [-80, 25] },
  { name: 'East (Bogota to Madrid)', from: [-74, 4], to: [-3, 40] },
  { name: 'South (Bogota to Lima)', from: [-74, 4], to: [-77, -12] },
  { name: 'West (Madrid to NY)', from: [-3, 40], to: [-74, 40] },
];

tests.forEach(t => {
  const p1 = interpolateCoordinates(t.from, t.to, 0.5);
  const p2 = interpolateCoordinates(t.from, t.to, 0.501);
  const bearing = getVisualBearing(p1, p2);
  const finalAngle = bearing - 45;
  console.log(`${t.name}: Bearing = ${bearing.toFixed(2)}, FinalAngle = ${finalAngle.toFixed(2)}`);
});
