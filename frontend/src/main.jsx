import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import NumericExperimentDashboard from './experiment/NumericExperimentDashboard.jsx'
import ShipmentRegistrationPage from './pages/ShipmentRegistrationPage.jsx'
import DataManagementDashboard from './pages/DataManagementDashboard.jsx'
import RoleSelection from './pages/RoleSelection.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import { SelectionBridgeProvider } from './hooks/useSelectionBridge.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SelectionBridgeProvider>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          
          {/* Rutas protegidas para Empleado Registrador */}
          <Route 
            path="/registro-datos" 
            element={
              <ProtectedRoute allowedRole="REGISTRADOR" fallbackPath="/">
                <DataManagementDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/registrar-envio" 
            element={
              <ProtectedRoute allowedRole="REGISTRADOR" fallbackPath="/">
                <ShipmentRegistrationPage />
              </ProtectedRoute>
            } 
          />

          {/* Rutas protegidas para Encargado de Logística */}
          <Route 
            path="/map" 
            element={
              <ProtectedRoute allowedRole="LOGISTICA" fallbackPath="/">
                <App />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/experiment" 
            element={
              <ProtectedRoute allowedRole="LOGISTICA" fallbackPath="/">
                <NumericExperimentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback genérico */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SelectionBridgeProvider>
    </BrowserRouter>
  </StrictMode>,
)
