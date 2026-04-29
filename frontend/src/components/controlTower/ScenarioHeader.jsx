const ScenarioHeader = ({
  activeTab = "vivo",
  isCollapseScenario = false,
  onTabChange = () => {},
  tabs = [],
}) => (
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
      <div
        className={`ct-session ${isCollapseScenario ? "ct-session--danger" : ""}`}
      >
        {isCollapseScenario ? "⚠ Modo Colapso" : "Sesión Activa"}
      </div>
      <button type="button" className="ct-icon-btn" aria-label="Métricas">
        <span className="ct-icon-bars" />
      </button>
      <button type="button" className="ct-icon-btn" aria-label="Bandeja">
        <span className="ct-icon-inbox" />
      </button>
      <button type="button" className="ct-icon-btn" aria-label="Perfil">
        <span className="ct-icon-user" />
      </button>
    </div>
  </header>
);

export default ScenarioHeader;
