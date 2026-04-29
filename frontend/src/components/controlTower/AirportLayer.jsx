const AirportLayer = ({
  activeMetrics = {},
  airportNodes = [],
  isCollapseScenario = false,
  onAirportSelect = () => {},
  selectedAirportCode = "",
}) => (
  <div className="ct-airport-layer" aria-label="Aeropuertos de la red">
    {airportNodes.map((node) => {
      const nodeMetrics = activeMetrics[node.code];
      const nodeLevel = nodeMetrics?.level ?? "green";
      const isSaturated = isCollapseScenario && nodeMetrics?.isSaturated;

      return (
        <button
          key={node.code}
          type="button"
          className={`ct-airport-node ct-airport-node--${nodeLevel} ${
            selectedAirportCode === node.code ? "ct-airport-node--selected" : ""
          } ${isSaturated ? "ct-airport-node--saturated" : ""}`}
          style={{ top: node.top, left: node.left }}
          aria-label={`Aeropuerto ${node.code} en ${node.city}`}
          onClick={() => onAirportSelect(node.code)}
        >
          {isSaturated ? (
            <span className="ct-airport-pin ct-airport-pin--saturated">
              SAT
            </span>
          ) : (
            <span className="ct-airport-pin">AEP</span>
          )}
          <span className="ct-airport-code">{node.code}</span>
          <span className="ct-airport-city">{node.city}</span>
        </button>
      );
    })}
  </div>
);

export default AirportLayer;
