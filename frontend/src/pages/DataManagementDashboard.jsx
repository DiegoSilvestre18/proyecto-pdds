import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import WarehouseManagement from '../components/management/WarehouseManagement';
import FlightManagement from '../components/management/FlightManagement';
import ShipmentManagement from '../components/management/ShipmentManagement';

const DataManagementDashboard = () => {
    const [activeTab, setActiveTab] = useState('envios');
    const navigate = useNavigate();
    const [flights, setFlights] = useState([]);
    const toast = useToast();

    const handleLogout = () => {
        sessionStorage.removeItem('userRole');
        navigate('/');
    };

    const handleIntegration = () => {
        // Aquí se dispara la petición al Backend H2 para consolidar las adiciones
        console.log("Iniciando integración de datos extra (sin navegar al mapa)...");
        toast.success("Datos integrados exitosamente.");
    };

    return (
        <div className="control-tower" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* 1. HEADER & GLOBAL ACTIONS (Siempre visible) */}
            <header className="ct-header" style={{ padding: '12px 24px', borderBottom: '1px solid #1e3f5f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="ct-brand">
                    <h1 className="ct-title" style={{ fontSize: '1.2rem', margin: 0, color: '#1c2b3a' }}>
                        Tasf.B2B
                    </h1>
                </div>

                {/* BOTONES DE ACCIÓN GLOBALES (Arriba para no perderse) */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #94a3b8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Salir / Volver al Inicio
                    </button>
                    
                    <button 
                        onClick={handleIntegration}
                        style={{
                            padding: '8px 16px',
                            background: '#38bdf8',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        + Integrar Datos Extra
                    </button>
                </div>
            </header>

            {/* 2. MAIN LAYOUT (Scrollable si es necesario) */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#0F172A', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '1200px', width: '100%', padding: '2rem 1rem' }}>
                    
                    {/* TÍTULO DEL CONTEXTO */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ color: '#f8fafc', fontSize: '24px', margin: '0 0 8px 0' }}>Registro de Excepciones y Datos Adicionales</h2>
                        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                            Si no tienes carga adicional para esta sesión, puedes omitir este paso desde el menú superior.
                        </p>
                    </div>

                    {/* TABS NAVEGACIÓN */}
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
                        <button 
                            onClick={() => setActiveTab('envios')}
                            style={activeTab === 'envios' ? tabStyleActive : tabStyle}
                        >
                            Envíos Extra
                        </button>
                        <button
                            onClick={() => setActiveTab('vuelos')}
                            style={activeTab === 'vuelos' ? tabStyleActive : tabStyle}
                        >
                            Vuelos Extra
                        </button>
                        <button 
                            onClick={() => setActiveTab('almacenes')}
                            style={activeTab === 'almacenes' ? tabStyleActive : tabStyle}
                        >
                            Almacenes / Auxiliares
                        </button>
                    </div>

                    {/* CONTENIDO DE GESTIÓN */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', minHeight: '400px' }}>
                        {activeTab === 'almacenes' && <WarehouseManagement />}
                        {activeTab === 'vuelos' && (
                            <FlightManagement
                                flights={flights}
                                setFlights={setFlights}
                            />
                        )}
                        {activeTab === 'envios' && <ShipmentManagement />}
                    </div>

                </div>
            </div>
        </div>
    );
};

const tabStyle = {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    fontWeight: '500',
    transition: 'color 0.2s'
};

const tabStyleActive = {
    ...tabStyle,
    color: '#38bdf8',
    borderBottom: '3px solid #38bdf8',
    fontWeight: 'bold'
};

export default DataManagementDashboard;
