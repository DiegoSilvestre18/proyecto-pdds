import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRole, fallbackPath }) => {
    const userRole = sessionStorage.getItem('userRole');

    if (userRole !== allowedRole) {
        // Redirige si no tiene el rol correcto
        return <Navigate to={fallbackPath} replace />;
    }

    return children;
};

export default ProtectedRoute;
