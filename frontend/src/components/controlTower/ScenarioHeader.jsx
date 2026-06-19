import React from "react";
import { useNavigate } from "react-router-dom";

const ScenarioHeader = ({
  activeTab = "vivo",
  isCollapseScenario = false,
  onTabChange = () => {},
  tabs = [],
  systemClock = "--:--:--",
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
        {systemClock && systemClock !== "--:--:--" && (
          <div style={{ color: "#60a5fa", fontSize: "12px", fontWeight: "bold", fontFamily: "monospace", marginLeft: "10px" }}>
            🕒 {systemClock}
          </div>
        )}
      </div>
    </header>
  );
};

export default ScenarioHeader;
