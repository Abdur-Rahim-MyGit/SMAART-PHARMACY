import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TodaysPriorities({ branchId }) {
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
                        className="rounded-xl h-[120px] relative overflow-hidden border border-white/[0.04] bg-white/[0.02] flex items-center justify-between p-5"
                    >
                        <div className="absolute inset-0 animate-shimmer" />
                        <div className="flex flex-col gap-2.5 w-2/3">
                            <div className="w-1/4 h-3 rounded bg-white/5" />
                            <div className="w-3/4 h-5 rounded bg-white/5" />
                            <div className="w-1/2 h-3 rounded bg-white/5" />
                        </div>
                        <div className="w-24 h-9 rounded bg-white/5" />
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
                    <span className="text-xs font-bold text-white">{toast.message}</span>
                </div>
            )}

            {priorities.length === 0 ? (
                <div className="rounded-xl p-8 flex flex-col items-center justify-center text-center bg-emerald-500/[0.02] border border-emerald-500/15 shadow-md gap-2">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                        <span className="material-symbols-rounded text-2xl">check_circle</span>
                    </div>
                    <h4 className="text-sm font-bold text-white font-serif" style={{ fontFamily: "'Lora', serif" }}>All Systems Healthy</h4>
                    <p className="text-xs text-slate-400 max-w-sm">All clear — no critical issues today.</p>
                </div>
            ) : (
                priorities.map((priority, index) => {
                    const borderColors = {
                        critical: 'border-l-4 border-l-red-500',
                        warning: 'border-l-4 border-l-amber-500',
                        watch: 'border-l-4 border-l-yellow-500'
                    };
                    const bgColors = {
                        critical: 'bg-red-500/[0.02] border-red-500/10',
                        warning: 'bg-amber-500/[0.02] border-amber-500/10',
                        watch: 'bg-yellow-500/[0.02] border-yellow-500/10'
                    };
                    const textColors = {
                        critical: 'text-red-400',
                        warning: 'text-amber-400',
                        watch: 'text-yellow-400'
                    };
                    const icons = {
                        expiry: 'hourglass_empty',
                        reorder: 'shopping_cart',
                        branch_health: 'storefront'
                    };

                    return (
                        <div 
                            key={index} 
                            className={`rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start gap-4 border backdrop-blur-md transition-all duration-200 hover:bg-white/[0.02] ${borderColors[priority.severity]} ${bgColors[priority.severity]}`}
                        >
                            <div className="flex gap-3.5 items-start min-w-0 flex-1">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5 ${textColors[priority.severity]}`}>
                                    <span className="material-symbols-rounded text-lg">{icons[priority.type] || 'info'}</span>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${textColors[priority.severity]}`}>
                                            {priority.severity} Alert
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300">
                                            Role: {priority.role}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                                        {priority.title}
                                    </h4>
                                    
                                    {/* Impact Info */}
                                    <p className="text-xs font-semibold text-slate-300 mt-2 flex items-center gap-1.5">
                                        <span className="text-amber-400/90 text-sm">💡</span>
                                        <span>{priority.impact}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Action Button - Teal accent #00B4D8 */}
                            <button
                                id={`priority-${priority.type}-cta`}
                                onClick={() => handleActionClick(priority)}
                                className="w-full sm:w-auto self-stretch sm:self-center flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer text-slate-950 hover:opacity-90"
                                style={{ background: '#00B4D8' }}
                            >
                                <span>{priority.action}</span>
                                <span className="material-symbols-rounded text-sm">arrow_forward</span>
                            </button>
                        </div>
                    );
                })
            )}
        </div>
    );
}
