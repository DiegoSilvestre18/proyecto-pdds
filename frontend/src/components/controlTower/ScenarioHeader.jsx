import React from "react";
import { useNavigate } from "react-router-dom";

const ScenarioHeader = ({
  activeTab = "vivo",
  isCollapseScenario = false,
  onTabChange = () => {},
  tabs = [],
  systemClock = "--:--",
  realClock = "--:--",
}) => {
  const navigate = useNavigate();

  return (
    <header className="ct-header">
      <div className="ct-brand">
        <p className="ct-title">Control Tower</p>
        <nav className="ct-tabs" aria-label="Escenarios de operación">
          <button
            className="ct-tab"
            type="button"
            onClick={() => navigate('/registrar-envio')}
            style={{ color: '#38bdf8', fontWeight: 'bold', marginRight: '10px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '15px' }}
          >
            📥 Registrar envío
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`ct-tab ${activeTab === tab.key ? "ct-tab--active" : ""} ${tab.key === "colapso" ? "ct-tab--danger" : ""}`}
              type="button"
              onClick={() => onTabChange(tab.key)}
            >
              {tab.key === "colapso" && "⚠ "}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="ct-header-actions">
        <div className={`ct-session ${isCollapseScenario ? "ct-session--danger" : ""}`}>
          {isCollapseScenario ? "⚠ Modo Colapso" : "Sesión Activa"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {realClock && realClock !== "--:--" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>Hora actual:</span>
              <span style={{ 
                color: "#0f172a", 
                fontWeight: 700, 
                fontVariantNumeric: "tabular-nums", 
                fontFamily: "monospace, monospace", 
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                display: "inline-block"
              }}>
                {realClock}
              </span>
            </div>
          )}
          {systemClock && systemClock !== "--:--" && systemClock !== "--:--:--" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              <span style={{ color: "#0284c7", fontWeight: 600, whiteSpace: "nowrap" }}>Hora actual simulada:</span>
              <span style={{ 
                color: "#0c4a6e", 
                fontWeight: 700, 
                fontVariantNumeric: "tabular-nums", 
                fontFamily: "monospace, monospace", 
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                display: "inline-block"
              }}>
                {systemClock}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ScenarioHeader;
