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

        <div className={`ct-session ${isCollapseScenario ? "ct-session--danger" : ""}`} role="status">
          {isCollapseScenario ? "⚠ Modo Colapso" : "● Sesión Activa"}
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

        <button
          onClick={() => {
            sessionStorage.removeItem('userRole');
            navigate('/');
          }}
          style={{
            background: 'transparent',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s',
            marginLeft: '12px'
          }}
          onMouseEnter={(e) => {
            e.target.style.color = '#ffffff';
            e.target.style.background = '#ef4444';
            e.target.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = '#ef4444';
            e.target.style.background = 'transparent';
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

export default ScenarioHeader;
