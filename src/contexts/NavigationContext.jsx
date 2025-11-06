import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const currentPath = location.pathname + location.search;

        setHistory(prev => {
            const lastPath = prev[prev.length - 1];
            if (lastPath !== currentPath) {
                const newHistory = [...prev, currentPath];
                return newHistory.slice(-10);
            }
            return prev;
        });
    }, [location]);

    const goBack = () => {
        if (history.length > 1) {
            const previousPath = history[history.length - 2];
            setHistory(prev => prev.slice(0, -1));
            navigate(previousPath);
        } else {
            navigate(-1);
        }
    };

    const canGoBack = history.length > 1;

    return (
        <NavigationContext.Provider value={{ goBack, canGoBack, history }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within NavigationProvider');
    }
    return context;
}
