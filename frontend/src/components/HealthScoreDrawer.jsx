import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HealthScoreDrawer({ isOpen, onClose, branchId }) {
    const navigate = useNavigate();
    const [breakdown, setBreakdown] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchBreakdown = async () => {
            setLoading(true);
            setError(null);
            try {
                const url = branchId 
                    ? `/api/dashboard/health-breakdown?branchId=${branchId}` 
                    : '/api/dashboard/health-breakdown';
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error('Failed to fetch health score breakdown.');
                }
                const data = await res.json();
                setBreakdown(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBreakdown();
    }, [isOpen, branchId]);

    // Manage drawer lifecycle with CSS transition classes
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
        } else {
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    const score = breakdown?.score ?? 100;
    const deductions = breakdown?.deductions ?? [];
    const band = breakdown?.band ?? 'excellent';
    const bandLabel = breakdown?.bandLabel ?? 'Excellent — branch is healthy';

    // Color definitions based on bands
    const bandColorText = {
        excellent: 'text-emerald-400',
        good: 'text-amber-400',
        warning: 'text-orange-400',
        critical: 'text-red-400'
    };

    const bandBgColor = {
        excellent: 'bg-emerald-500/10 border-emerald-500/25',
        good: 'bg-amber-500/10 border-amber-500/25',
        warning: 'bg-orange-500/10 border-orange-500/25',
        critical: 'bg-red-500/10 border-red-500/25'
    };

    const bandBulletColor = {
        excellent: 'bg-emerald-400',
        good: 'bg-amber-400',
        warning: 'bg-orange-400',
        critical: 'bg-red-400'
    };

    return (
        <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop Overlay */}
            <div 
                className="absolute inset-0 bg-[var(--card-bg)]/40 backdrop-blur-xs transition-opacity duration-300" 
                onClick={onClose}
            />

            {/* Sliding Panel */}
            <div 
                className={`relative w-full max-w-[420px] h-full bg-[var(--bg-primary)] border-l border-[var(--card-border)] flex flex-col shadow-2xl transition-transform duration-300 ease-out transform ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-[var(--card-border)]">
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                        <h3 className="text-lg font-black text-[var(--text-primary)] font-serif tracking-tight leading-tight">
                            Health Score Breakdown
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] leading-normal">
                            Why is your score <span className={`font-bold ${bandColorText[band]}`}>{score}/100</span>?
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--card-bg)]/[0.03] border border-white/[0.06] text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/[0.06] transition-all cursor-pointer flex-shrink-0"
                    >
                        <span className="material-symbols-rounded text-sm">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollable">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-secondary)]">
                            <span className="material-symbols-rounded animate-spin text-2xl text-[#00B4D8]">sync</span>
                            <span className="text-xs">Analyzing scores...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center text-center py-10 gap-3">
                            <span className="material-symbols-rounded text-3xl text-red-400">error</span>
                            <span className="text-xs text-[var(--text-secondary)]">{error}</span>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 1 — SCORE BREAKDOWN */}
                            <div className="flex flex-col gap-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Score Breakdown
                                </h4>
                                
                                <div className="flex flex-col gap-3 bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--card-border)]">
                                    <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)] pb-2 mb-1">
                                        <span>Component Category</span>
                                        <span>Allocated Points</span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2.5">
                                        {/* Inventory Compliance */}
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-[var(--text-secondary)] font-medium">Inventory Compliance</span>
                                            </div>
                                            <span className="font-mono text-emerald-400 font-bold">
                                                +{breakdown?.scoreBreakdown?.compliance ?? 50} pts
                                            </span>
                                        </div>

                                        {/* Availability */}
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-[var(--text-secondary)] font-medium">Availability</span>
                                            </div>
                                            <span className="font-mono text-emerald-400 font-bold">
                                                +{breakdown?.scoreBreakdown?.availability ?? 30} pts
                                            </span>
                                        </div>

                                        {/* Expiry Management */}
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-[var(--text-secondary)] font-medium">Expiry Management</span>
                                            </div>
                                            <span className="font-mono text-emerald-400 font-bold">
                                                +{breakdown?.scoreBreakdown?.expiry ?? 20} pts
                                            </span>
                                        </div>

                                        {/* Deductions - Low Stock */}
                                        {(breakdown?.scoreBreakdown?.lowStock ?? 0) < 0 && (
                                            <div className="flex justify-between items-center text-xs border-t border-[var(--card-border)] pt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    <span className="text-amber-400 font-medium">Low Stock Deductions</span>
                                                </div>
                                                <span className="font-mono text-red-400 font-bold">
                                                    {breakdown?.scoreBreakdown?.lowStock} pts
                                                </span>
                                            </div>
                                        )}

                                        {/* Deductions - Alerts */}
                                        {(breakdown?.scoreBreakdown?.alerts ?? 0) < 0 && (
                                            <div className="flex justify-between items-center text-xs border-t border-[var(--card-border)] pt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    <span className="text-red-400 font-medium">Pending Alert Deductions</span>
                                                </div>
                                                <span className="font-mono text-red-400 font-bold">
                                                    {breakdown?.scoreBreakdown?.alerts} pts
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-[var(--card-border)] pt-3 mt-1.5 flex justify-between items-center font-bold text-xs text-[var(--text-primary)]">
                                        <span>Current Health Score</span>
                                        <span className={`font-mono ${bandColorText[band]}`}>{score}/100</span>
                                    </div>
                                </div>

                                {/* Target reach guided instruction */}
                                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.02] flex flex-col gap-1 mt-1">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">Improvement Target</span>
                                    <span className="text-xs font-bold text-[var(--text-primary)]">To Reach 95:</span>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-normal">
                                        {breakdown?.toReachTarget ?? "Resolve active low stock and expired item alerts."}
                                    </p>
                                </div>
                            </div>

                            {/* SECTION 2 — WHAT THIS MEANS */}
                            <div className="flex flex-col gap-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                                    What This Means
                                </h4>

                                <div className="flex flex-col gap-2">
                                    {[
                                        { key: 'excellent', range: '90-100', label: 'Excellent — branch is healthy' },
                                        { key: 'good', range: '70-89', label: 'Good — minor issues to watch' },
                                        { key: 'warning', range: '50-69', label: 'Warning — action needed today' },
                                        { key: 'critical', range: '0-49', label: 'Critical — urgent intervention' }
                                    ].map(r => {
                                        const isCurrent = band === r.key;
                                        return (
                                            <div 
                                                key={r.key}
                                                className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                                                    isCurrent 
                                                        ? `${bandBgColor[r.key]} border-opacity-100 shadow-sm` 
                                                        : 'bg-[var(--card-bg)]/[0.01] border-transparent opacity-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-2 h-2 rounded-full ${bandBulletColor[r.key]}`} />
                                                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                                                        {r.label}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">
                                                    {r.range}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SECTION 3 — RECOMMENDED FIXES */}
                            {deductions.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Recommended Fixes
                                    </h4>

                                    <div className="flex flex-col gap-3.5">
                                        {deductions.map((d, index) => {
                                            let icon = 'info';
                                            let iconColor = 'text-[var(--text-secondary)]';
                                            let iconBg = 'bg-[var(--card-bg)]/[0.03] border-white/[0.06]';
                                            let actionText = '';

                                            if (d.type === 'expired') {
                                                icon = 'delete_forever';
                                                iconColor = 'text-red-400';
                                                iconBg = 'bg-red-400/10 border-red-400/20';
                                                actionText = `Dispose or return ${d.count} expired medicines`;
                                            } else if (d.type === 'low_stock') {
                                                icon = 'shopping_cart_checkout';
                                                iconColor = 'text-amber-500';
                                                iconBg = 'bg-amber-500/10 border-amber-500/20';
                                                actionText = `Reorder ${d.count} low-stock medicines`;
                                            } else {
                                                icon = 'gavel';
                                                iconColor = 'text-[var(--text-secondary)]';
                                                iconBg = 'bg-[var(--card-bg)]/[0.03] border-white/[0.06]';
                                                actionText = `Resolve ${d.count} open alert${d.count > 1 ? 's' : ''}`;
                                            }

                                            return (
                                                <div 
                                                    key={index}
                                                    className="p-4 rounded-xl bg-[var(--card-bg)]/[0.02] border border-white/5 flex flex-col gap-3.5"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconBg} ${iconColor} flex-shrink-0`}>
                                                            <span className="material-symbols-rounded text-sm">{icon}</span>
                                                        </div>
                                                        <div className="flex flex-col justify-center min-h-[32px]">
                                                            <span className="text-xs font-semibold text-[var(--text-primary)] leading-normal">
                                                                {actionText}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => {
                                                            onClose();
                                                            navigate(d.route);
                                                        }}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer bg-transparent hover:bg-[#00B4D8]/10 border border-[#00B4D8]/30 hover:border-[#00B4D8] text-[#00B4D8]"
                                                    >
                                                        <span>{d.action}</span>
                                                        <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
