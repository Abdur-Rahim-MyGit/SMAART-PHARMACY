import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SplashScreen from './SplashScreen';

export default function RouteChangeSplash({ children }) {
    const location = useLocation();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Trigger splash screen on every route change
        setShowSplash(true);
    }, [location.pathname]);

    return (
        <>
            {/* The splash screen overlays everything when active */}
            {showSplash && (
                <SplashScreen onComplete={() => setShowSplash(false)} />
            )}
            
            {/* The underlying app is always rendered, but hidden by the splash z-index */}
            {children}
        </>
    );
}
