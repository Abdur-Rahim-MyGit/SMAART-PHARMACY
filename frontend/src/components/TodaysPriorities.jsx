import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TodaysPriorities({ branchId }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [priorities, setPriorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchPriorities = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = branchId ? `/api/dashboard/priorities?branchId=${branchId}` : '/api/dashboard/priorities';
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to load priorities feed.');
            }
            const data = await res.json();
            setPriorities(data.priorities || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPriorities();
    }, [branchId]);

    const handleActionClick = (priority) => {
        let msg = '';
        if (priority.type === 'expiry') {
            msg = `Navigating to Expiry Intelligence — ${priority.count} medicine${priority.count > 1 ? 's' : ''} need${priority.count === 1 ? 's' : ''} attention.`;
        } else if (priority.type === 'reorder') {
            msg = `Navigating to Reorder Center — ${priority.count} medicine${priority.count > 1 ? 's' : ''} need${priority.count === 1 ? 's' : ''} attention.`;
        } else {
            msg = `Navigating to Branch Overview — 1 branch needs attention.`;
        }

        setToast({ message: msg, severity: priority.severity });
        
        setTimeout(() => {
            setToast(null);
            navigate(priority.route);
        }, 1200);
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                    <div 
                        key={i} 
                        className="rounded-xl h-[120px] relative overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between p-5"
                    >
                        <div className="absolute inset-0 animate-shimmer" />
                        <div className="flex flex-col gap-2.5 w-2/3">
                            <div className="w-1/4 h-3 rounded bg-[var(--card-bg)]/5" />
                            <div className="w-3/4 h-5 rounded bg-[var(--card-bg)]/5" />
                            <div className="w-1/2 h-3 rounded bg-[var(--card-bg)]/5" />
                        </div>
                        <div className="w-24 h-9 rounded bg-[var(--card-bg)]/5" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl p-6 flex flex-col items-center justify-center text-center bg-red-500/[0.02] border border-red-500/15 gap-2 text-red-400">
                <span className="material-symbols-rounded text-2xl">error</span>
                <span className="text-xs">{error}</span>
                <button 
                    onClick={fetchPriorities}
                    className="mt-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                >
                    Retry Load
                </button>
            </div>
        );
    }

    const severityConfig = {
        critical: {
            border: 'border-l-red-500/80',
            bg: 'bg-red-500/[0.02]',
            borderOuter: 'border-[var(--card-border)]',
            text: 'text-red-400',
            glow: 'shadow-[0_4px_16px_rgba(239,68,68,0.05)]',
            dot: 'bg-red-400',
            icon: 'error',
            label: 'CRITICAL'
        },
        warning: {
            border: 'border-l-amber-500/80',
            bg: 'bg-amber-500/[0.02]',
            borderOuter: 'border-[var(--card-border)]',
            text: 'text-amber-400',
            glow: 'shadow-[0_4px_16px_rgba(245,158,11,0.05)]',
            dot: 'bg-amber-400',
            icon: 'warning',
            label: 'WARNING'
        },
        watch: {
            border: 'border-l-yellow-500/80',
            bg: 'bg-yellow-500/[0.02]',
            borderOuter: 'border-[var(--card-border)]',
            text: 'text-yellow-400',
            glow: 'shadow-[0_4px_16px_rgba(234,179,8,0.05)]',
            dot: 'bg-yellow-400',
            icon: 'visibility',
            label: 'WATCH'
        }
    };

    const typeIcons = {
        expiry: 'hourglass_empty',
        reorder: 'shopping_cart',
        branch_health: 'storefront'
    };

    const visiblePriorities = priorities.filter(p => {
        if (!user) return false;
        if (user.role === 'Pharmacist') {
            return p.role === 'Pharmacist';
        }
        if (user.role === 'Manager') {
            return ['Manager', 'Pharmacist'].includes(p.role);
        }
        return true; // Admin sees all
    });

    return (
        <div className="flex flex-col gap-3 relative">
            {/* Slide Toast notification */}
            {toast && (
                <div 
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border animate-toast-slide"
                    style={{ 
                        background: 'rgba(15, 20, 32, 0.95)',
                        borderColor: toast.severity === 'critical' ? '#ef4444' : toast.severity === 'warning' ? '#f59e0b' : '#fcd34d',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <span 
                        className="material-symbols-rounded text-base font-variation-fill"
                        style={{ color: toast.severity === 'critical' ? '#ef4444' : toast.severity === 'warning' ? '#f59e0b' : '#fcd34d' }}
                    >
                        {toast.severity === 'critical' ? 'error' : 'warning'}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{toast.message}</span>
                </div>
            )}

            {(() => {
                const activeExpiry = visiblePriorities.find(p => p.type === 'expiry');
                const activeReorder = visiblePriorities.find(p => p.type === 'reorder');
                const activeHealth = visiblePriorities.find(p => p.type === 'branch_health');

                const isExpiryApplicable = user?.role === 'Admin' || user?.role === 'Manager';
                const isReorderApplicable = user?.role === 'Admin' || user?.role === 'Manager';
                const isHealthApplicable = user?.role === 'Admin';

                const isAllClear = (!isExpiryApplicable || !activeExpiry) && 
                                    (!isReorderApplicable || !activeReorder) && 
                                    (!isHealthApplicable || !activeHealth);

                const renderPriorityCard = (priority, index) => {
                    const cfg = severityConfig[priority.severity] || severityConfig.watch;
                    return (
                        <div 
                            key={priority.type + '-' + index} 
                            className={`rounded-2xl overflow-hidden border border-l-2 backdrop-blur-md transition-all duration-200 hover:shadow-lg shadow-card bg-[var(--card-bg)] ${cfg.border} ${cfg.borderOuter} ${cfg.glow}`}
                        >
                            {/* Main Content Row */}
                            <div className="p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex gap-3.5 items-start min-w-0 flex-1">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--card-bg)]/5 ${cfg.text} relative`}>
                                        <span className="material-symbols-rounded text-lg">{typeIcons[priority.type] || 'info'}</span>
                                        {/* Pulse dot for critical */}
                                        {priority.severity === 'critical' && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-[#0f1420]" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        {/* Severity + Role badges */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-xs font-black uppercase tracking-wider ${cfg.text}`}>
                                                {cfg.label}
                                            </span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--card-bg)]/5 text-[var(--text-secondary)] flex items-center gap-1">
                                                <span className="material-symbols-rounded text-xs">person</span>
                                                {priority.responsibleRole || priority.role}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h4 className="text-sm font-bold text-[var(--text-primary)] mt-1.5 leading-snug">
                                            {priority.title}
                                        </h4>
                                        
                                        {/* Impact with cost badge */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                                                <span className="text-amber-400/90 text-sm">💰</span>
                                                <span>{priority.impact}</span>
                                            </p>
                                            {priority.costAtRisk > 0 && (
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} border ${cfg.borderOuter}`}>
                                                    ₹{priority.costAtRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })} AT RISK
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    id={`priority-${priority.type}-cta`}
                                    onClick={() => handleActionClick(priority)}
                                    className="w-full sm:w-auto self-stretch sm:self-center flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-[var(--text-primary)] hover:opacity-90 bg-cyan-600 hover:bg-cyan-500"
                                >
                                    <span>{priority.action}</span>
                                    <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                </button>
                            </div>

                            {/* Recommendation + Reason strip */}
                            {(priority.recommendation || priority.reasonWhy) && (
                                <div className="px-5 pb-4 pt-0 flex flex-col gap-2 border-t border-[var(--card-border)] mx-5 mt-0 pt-3">
                                    {priority.recommendation && (
                                        <div className="flex items-start gap-2">
                                            <span className="material-symbols-rounded text-xs text-[#00B4D8] mt-0.5 flex-shrink-0">lightbulb</span>
                                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                                                <span className="text-[#00B4D8] font-black uppercase text-xs mr-1.5">Recommended:</span>
                                                {priority.recommendation}
                                            </span>
                                        </div>
                                    )}
                                    {priority.reasonWhy && (
                                        <div className="flex items-start gap-2">
                                            <span className="material-symbols-rounded text-xs text-[var(--text-secondary)] mt-0.5 flex-shrink-0">info</span>
                                            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                                {priority.reasonWhy}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                };

                const renderClearLine = (label, key) => (
                    <div key={key} className="flex items-center gap-2 text-emerald-400 text-sm">
                        <span>✅</span>
                        <span>{label}</span>
                    </div>
                );

                if (isAllClear) {
                    return (
                        <div className="rounded-xl p-8 flex flex-col items-center justify-center text-center bg-emerald-500/[0.02] border border-emerald-500/15 shadow-md gap-2">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                                <span className="material-symbols-rounded text-2xl">check_circle</span>
                            </div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>All Systems Healthy</h4>
                            <p className="text-xs text-[var(--text-secondary)] max-w-sm">✅ All clear — no critical issues today. Your branch is operating smoothly.</p>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col gap-3">
                        {isExpiryApplicable && (activeExpiry ? renderPriorityCard(activeExpiry, 0) : renderClearLine("No expiry risk this month", "expiry-clear"))}
                        {isReorderApplicable && (activeReorder ? renderPriorityCard(activeReorder, 1) : renderClearLine("No low stock alert", "reorder-clear"))}
                        {isHealthApplicable && (activeHealth ? renderPriorityCard(activeHealth, 2) : renderClearLine("Branch health score is optimal", "health-clear"))}
                    </div>
                );
            })()}
        </div>
    );
}
