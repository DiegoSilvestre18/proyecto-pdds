import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AIRPORTS as STATIC_AIRPORTS } from '../data/airportsData';

const AirportContext = createContext(null);

export const AirportProvider = ({ children }) => {
    const [airports, setAirports] = useState(STATIC_AIRPORTS);
    const [isLoading, setIsLoading] = useState(true);

    const refreshAirports = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/v1/aeropuertos');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const mappedAirports = data.map(ap => ({
                        icao: ap.icaoCode,
                        city: ap.city,
                        country: ap.country,
                        continent: (ap.continent || '').toLowerCase(),
                        gmtOffset: ap.gmtOffset,
                        warehouseCapacity: ap.storageCapacity,
                        coordinates: [ap.longitude, ap.latitude],
                    }));
                    setAirports(mappedAirports);
                }
            } else {
                console.warn('[AirportProvider] Fallback to static airports due to API error');
            }
        } catch (err) {
            console.error('[AirportProvider] Network error fetching airports', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshAirports();
    }, [refreshAirports]);

    const airportByIcao = useMemo(() => {
        return airports.reduce((acc, ap) => {
            acc[ap.icao] = ap;
            return acc;
        }, {});
    }, [airports]);

    const value = useMemo(() => ({
        airports,
        airportByIcao,
        isLoading,
        refreshAirports
    }), [airports, airportByIcao, isLoading, refreshAirports]);

    return (
        <AirportContext.Provider value={value}>
            {children}
        </AirportContext.Provider>
    );
};

export const useAirports = () => {
    const context = useContext(AirportContext);
    if (!context) {
        throw new Error('useAirports must be used within an AirportProvider');
    }
    return context;
};
