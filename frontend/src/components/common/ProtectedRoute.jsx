import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRole, fallbackPath }) => {
    const userRole = sessionStorage.getItem('userRole');
    const location = useLocation();

    if (userRole !== allowedRole) {
        // Redirige si no tiene el rol correcto, pero preservando los query params (ej. ?session=...)
        return <Navigate to={`${fallbackPath}${location.search}`} replace />;
    }

    return children;
};

export default ProtectedRoute;
