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
            type="button"
            onClick={() => navigate('/')}
            style={{ 
                background: '#f8fbff', 
                color: '#1a3556', 
                border: '1px solid #a8b8cb', 
                borderRadius: '6px', 
                padding: '6px 14px', 
                marginRight: '16px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Volver al panel para inyectar más vuelos o envíos mientras corre la simulación"
          >
            Añadir Data Adicional
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
