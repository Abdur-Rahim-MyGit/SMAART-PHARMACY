import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-[var(--text-secondary)] font-medium">
                <span className="material-symbols-rounded animate-spin mr-2">sync</span>
                Verifying Session...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to={user?.role === 'Pharmacist' ? '/medicines' : '/dashboard'} replace />;
    }

    return <Outlet />;
}
