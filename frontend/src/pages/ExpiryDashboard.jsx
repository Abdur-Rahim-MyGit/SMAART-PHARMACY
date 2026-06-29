import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BAND_CFG = {
    red: {
        label: 'Red Band (Urgent)',
        color: '#f87171',
        bg: 'rgba(248,113,113,0.06)',
        border: 'rgba(248,113,113,0.18)',
        desc: 'Expired or expiring in 30 days — immediate action required.'
    },
    amber: {
        label: 'Amber Band (Warning)',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.06)',
        border: 'rgba(245,158,11,0.18)',
        desc: 'Expiring in 31 to 60 days — plan clearance or supplier returns.'
    },
    green: {
        label: 'Green Band (Monitor)',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.06)',
        border: 'rgba(52,211,153,0.18)',
        desc: 'Expiring in 61 to 90 days — monitor sales velocity and stock.'
    }
};

export default function ExpiryDashboard() {
    const navigate = useNavigate();
    const { activeBranch } = useAuth();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeBand, setActiveBand] = useState('red');
    const [actionId, setActionId] = useState(null);
    const [actionType, setActionType] = useState(null); // 'return' or 'write-off'

    const fetchMedicines = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = activeBranch?.id ? `/api/medicines?branchId=${activeBranch.id}` : '/api/medicines';
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 401) {
                    navigate('/login');
                    return;
                }
                throw new Error('Failed to load medicine list.');
            }
            setMedicines(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedicines();
    }, [activeBranch]);

    // Calculate bands relative to current date
    const bandsData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDays = new Date();
        thirtyDays.setDate(today.getDate() + 30);
        thirtyDays.setHours(23, 59, 59, 999);

        const sixtyDays = new Date();
        sixtyDays.setDate(today.getDate() + 60);
        sixtyDays.setHours(23, 59, 59, 999);

        const ninetyDays = new Date();
        ninetyDays.setDate(today.getDate() + 90);
        ninetyDays.setHours(23, 59, 59, 999);

        const redList = [];
        const amberList = [];
        const greenList = [];

        let deadStockVal = 0;

        medicines.forEach(m => {
            if (!m.expiryDate || m.status === 'Archived') return;

            const expDate = new Date(m.expiryDate);
            const daysRemaining = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            const value = m.stock * m.price;

            const itemWithDetails = {
                ...m,
                daysRemaining,
                value
            };

            if (expDate <= thirtyDays) {
                redList.push(itemWithDetails);
                if (m.stock > 0) deadStockVal += value;
            } else if (expDate <= sixtyDays) {
                amberList.push(itemWithDetails);
                if (m.stock > 0) deadStockVal += value;
            } else if (expDate <= ninetyDays) {
                greenList.push(itemWithDetails);
                if (m.stock > 0) deadStockVal += value;
            }
        });

        // Group by category valuation for summary details
        const redVal = redList.reduce((acc, curr) => acc + (curr.stock > 0 ? curr.value : 0), 0);
        const amberVal = amberList.reduce((acc, curr) => acc + (curr.stock > 0 ? curr.value : 0), 0);
        const greenVal = greenList.reduce((acc, curr) => acc + (curr.stock > 0 ? curr.value : 0), 0);

        return {
            red: redList.sort((a, b) => a.daysRemaining - b.daysRemaining),
            amber: amberList.sort((a, b) => a.daysRemaining - b.daysRemaining),
            green: greenList.sort((a, b) => a.daysRemaining - b.daysRemaining),
            deadStockValue: deadStockVal,
            valuations: {
                red: redVal,
                amber: amberVal,
                green: greenVal
            }
        };
    }, [medicines]);

    // Handle One-Click Actions
    const handleAction = async (medicineId, type, currentStock, currentPrice) => {
        if (!medicineId || currentStock <= 0) return;
        setActionId(medicineId);
        setActionType(type);
        setError(null);

        let endpoint = '';
        let body = { medicineId };
        let method = 'POST';

        if (type === 'return') {
            // Return to Supplier -> Stock Out
            endpoint = activeBranch?.id ? `/api/inventory/stock-out?branchId=${activeBranch.id}` : '/api/inventory/stock-out';
            body = {
                ...body,
                quantity: currentStock,
                reason: 'Return to Supplier',
                notes: 'Disposed via Expiry Intelligence Dashboard quick-action'
            };
        } else if (type === 'write-off') {
            // Write Off -> Adjustment (Expired)
            endpoint = activeBranch?.id ? `/api/inventory/adjustment?branchId=${activeBranch.id}` : '/api/inventory/adjustment';
            body = {
                ...body,
                quantityChanged: -currentStock,
                transactionType: 'Expired',
                reason: 'Expired',
                notes: 'Disposed via Expiry Intelligence Dashboard quick-action'
            };
        } else if (type === 'discount') {
            // Discount stock by halving its catalog price
            endpoint = activeBranch?.id ? `/api/medicines/${medicineId}?branchId=${activeBranch.id}` : `/api/medicines/${medicineId}`;
            method = 'PUT';
            body = {
                price: Math.round(currentPrice * 0.5)
            };
        }

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Disposal action failed.');

            // Refresh medicine list from server to sync states
            await fetchMedicines();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionId(null);
            setActionType(null);
        }
    };

    const bandList = bandsData[activeBand] || [];
    const activeCfg = BAND_CFG[activeBand];

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in relative z-10 pb-12">
            
            {/* Header */}
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Inventory Quality Control
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none" style={{ fontFamily: "'Lora', serif" }}>
                    Expiry <span className="text-[var(--brand)]">Intelligence</span>
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Analyze upcoming shelf expirations and record quick disposals or supplier returns.
                </p>
            </div>

            {/* Error notifications */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-xs animate-fade-in"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                    <span className="material-symbols-rounded text-base flex-shrink-0" style={{ color: '#f87171' }}>error</span>
                    {error}
                </div>
            )}

            {/* ── KPI Summary Cards Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Dead Stock Card (Rupee Value) */}
                <div className="p-5 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md premium-card shadow-elevated">
                    <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full bg-[var(--brand-dim)] blur-[20px]" />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--brand-dim)] text-[var(--brand)]">
                        <span className="material-symbols-rounded text-xl">payments</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
                            ₹{bandsData.deadStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Dead Stock Value</span>
                        <span className="text-xs opacity-65 mt-0.5 text-zinc-500">Expired or expiring within 90 days</span>
                    </div>
                </div>

                {/* Red Band Card */}
                <div className={`p-5 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:-translate-y-0.5 premium-card ${activeBand === 'red' ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'hover:shadow-md'}`}
                    style={{ background: activeBand === 'red' ? 'rgba(239,68,68,0.08)' : 'var(--card-bg)', borderColor: activeBand === 'red' ? 'rgba(239,68,68,0.3)' : 'var(--card-border)' }}
                    onClick={() => setActiveBand('red')}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400">
                        <span className="material-symbols-rounded text-xl">event_busy</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
                                {bandsData.red.length}
                            </span>
                            <span className="text-xs font-semibold text-red-400">
                                ₹{bandsData.valuations.red.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wide mt-1 text-[var(--text-muted)]">Red Band (≤30 Days)</span>
                    </div>
                </div>

                {/* Amber Band Card */}
                <div className={`p-5 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:-translate-y-0.5 premium-card ${activeBand === 'amber' ? 'ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'hover:shadow-md'}`}
                    style={{ background: activeBand === 'amber' ? 'rgba(245,158,11,0.08)' : 'var(--card-bg)', borderColor: activeBand === 'amber' ? 'rgba(245,158,11,0.3)' : 'var(--card-border)' }}
                    onClick={() => setActiveBand('amber')}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                        <span className="material-symbols-rounded text-xl">warning</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
                                {bandsData.amber.length}
                            </span>
                            <span className="text-xs font-semibold text-amber-500">
                                ₹{bandsData.valuations.amber.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wide mt-1 text-[var(--text-muted)]">Amber Band (31-60 Days)</span>
                    </div>
                </div>

                {/* Green Band Card */}
                <div className={`p-5 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md cursor-pointer transition-all hover:-translate-y-0.5 premium-card ${activeBand === 'green' ? 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'hover:shadow-md'}`}
                    style={{ background: activeBand === 'green' ? 'rgba(16,185,129,0.08)' : 'var(--card-bg)', borderColor: activeBand === 'green' ? 'rgba(16,185,129,0.3)' : 'var(--card-border)' }}
                    onClick={() => setActiveBand('green')}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                        <span className="material-symbols-rounded text-xl">watch_later</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
                                {bandsData.green.length}
                            </span>
                            <span className="text-xs font-semibold text-emerald-400">
                                ₹{bandsData.valuations.green.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wide mt-1 text-[var(--text-muted)]">Green Band (61-90 Days)</span>
                    </div>
                </div>
            </div>

            {/* ── Action Recommendations ── */}
            {(() => {
                const recommendList = bandList.filter(m => m.stock > 0).slice(0, 3);
                if (recommendList.length === 0) return null;

                return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                                Decision Support Recommendations
                            </span>
                            <span className="text-xs text-[var(--text-secondary)] font-mono">Based on current return windows</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {recommendList.map(med => {
                                const days = med.daysRemaining;
                                const isExpired = days <= 0;
                                
                                let suggestedAction = 'Return to Supplier';
                                let recoveryVal = med.value;
                                let confidence = 'High';
                                let reason = 'Supplier return still possible before expiry.';
                                let borderCol = 'border-emerald-500/20 bg-emerald-500/[0.01]';
                                let actionColor = 'text-emerald-400';
                                
                                if (isExpired) {
                                    suggestedAction = 'Dispose Expired';
                                    recoveryVal = 0;
                                    confidence = 'High';
                                    reason = 'Supplier return window has closed. Safe write-off required.';
                                    borderCol = 'border-red-500/20 bg-red-500/[0.01]';
                                    actionColor = 'text-red-400';
                                } else if (days <= 14) {
                                    suggestedAction = 'Discount Clearance';
                                    recoveryVal = Math.round(med.value * 0.5);
                                    confidence = 'Medium';
                                    reason = 'Expiry window is too narrow for supplier return. Initiate clearance sale.';
                                    borderCol = 'border-amber-500/20 bg-amber-500/[0.01]';
                                    actionColor = 'text-amber-400';
                                }

                                return (
                                    <div key={med._id} className={`rounded-2xl p-5 backdrop-blur-md bg-[var(--card-bg)] shadow-card flex flex-col gap-4 relative overflow-hidden border ${borderCol}`}>
                                        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none rounded-full" style={{ background: `radial-gradient(circle, ${isExpired ? 'rgba(239,68,68,0.1)' : days <= 14 ? 'rgba(245,158,11,0.1)' : 'rgba(52,211,153,0.1)'} 0%, transparent 70%)`, filter: 'blur(15px)' }} />
                                        <div className="flex justify-between items-start z-10">
                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-[var(--text-primary)] truncate font-serif" style={{ fontFamily: "'Lora', serif" }}>
                                                    {med.name}
                                                </h4>
                                                <span className="text-xs text-[var(--text-secondary)]">
                                                    {isExpired ? 'Expired' : `Expires in ${days} days`}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-[var(--text-secondary)] uppercase font-mono">
                                                {med.category}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1 z-10">
                                            <span className="text-xs text-[var(--text-secondary)] uppercase font-extrabold tracking-wider">Suggested Action</span>
                                            <span className={`text-xs font-black uppercase ${actionColor}`}>
                                                {suggestedAction}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 border-t border-[var(--card-border)] pt-3 z-10">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold">Potential Recovery</span>
                                                <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                                                    ₹{recoveryVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold">Confidence</span>
                                                <span className="text-xs font-bold text-slate-700">
                                                    {confidence}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 border-t border-[var(--card-border)] pt-3 mt-0.5 z-10">
                                            <span className="text-xs text-[var(--text-secondary)] uppercase font-bold">Reason</span>
                                            <p className="text-xs text-[var(--text-secondary)] leading-normal">
                                                {reason}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── Band list & Actions ── */}
            <div className="rounded-3xl p-6 flex flex-col gap-6 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--card-border)] shadow-elevated">
                
                {/* Active Band Details Banner */}
                <div className="flex items-center gap-3 p-3.5 rounded-lg border"
                    style={{ background: activeCfg.bg, borderColor: activeCfg.border }}>
                    <span className="material-symbols-rounded text-lg" style={{ color: activeCfg.color }}>info</span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{activeCfg.label}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{activeCfg.desc}</span>
                    </div>
                </div>

                {/* Tab select row */}
                <div className="flex items-center rounded-lg p-1 gap-1 border border-[var(--card-border)] w-full max-w-lg bg-[var(--card-bg)] shadow-sm">
                    {Object.entries(BAND_CFG).map(([key, cfg]) => {
                        const isActive = activeBand === key;
                        return (
                            <button key={key} onClick={() => setActiveBand(key)}
                                className="flex-1 px-4 py-2 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer"
                                style={{
                                    background: isActive ? `${cfg.color}15` : 'transparent',
                                    color: isActive ? cfg.color : 'var(--text-secondary)',
                                    border: isActive ? `1px solid ${cfg.color}30` : '1px solid transparent',
                                }}>
                                {cfg.label.split(' ')[0]}
                            </button>
                        );
                    })}
                </div>

                {/* Expiry Risk Table */}
                <div className="overflow-x-auto w-full scrollable">
                    {loading ? (
                        <div className="flex flex-col gap-2 p-4 relative overflow-hidden min-w-[850px]">
                            <div className="absolute inset-0 animate-shimmer" />
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <div key={idx} className="grid items-center py-3.5 border-b border-[var(--card-border)]"
                                    style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1.5fr 2.5fr 1fr', gap: '16px' }}>
                                    <div className="w-44 h-4 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-16 h-4 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-12 h-4 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                    <div className="w-20 h-4 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                    <div className="w-56 h-4 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-16 h-6 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                </div>
                            ))}
                        </div>
                    ) : bandList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <span className="material-symbols-rounded text-4xl text-[#34d399]">check_circle</span>
                            <div>
                                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">No Expiry Risks</h4>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">All monitored medicines in this band have healthy expiry profiles.</p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="border-b border-[var(--card-border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <th className="pb-3 pl-2">Medicine Detail</th>
                                    <th className="pb-3">Days Remaining</th>
                                    <th className="pb-3 text-right">Stock</th>
                                    <th className="pb-3 text-right">Inventory Value At Risk (₹)</th>
                                    <th className="pb-3 pl-4">Recommended Action & Reason</th>
                                    <th className="pb-3 pr-2 text-right">Execute Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {bandList.map(med => {
                                    const days = med.daysRemaining;
                                    const isExpired = days <= 0;
                                    const isActionLoading = actionId === med._id;

                                    let suggestedAction = 'Return to Supplier';
                                    let reason = 'Supplier returns are still allowed before expiry.';
                                    let actType = 'return';
                                    let actionColor = 'text-emerald-400 bg-emerald-500/10';
                                    
                                    if (isExpired) {
                                        suggestedAction = 'Dispose Expired';
                                        reason = 'Medicine already expired and must be removed from inventory.';
                                        actType = 'write-off';
                                        actionColor = 'text-red-400 bg-red-500/10';
                                    } else if (days <= 14) {
                                        suggestedAction = 'Discount Stock';
                                        reason = 'Expiry window is too narrow for supplier return. Initiate clearance sale.';
                                        actType = 'discount';
                                        actionColor = 'text-amber-400 bg-amber-500/10';
                                    }

                                    return (
                                        <tr key={med._id} className="hover:bg-zinc-800/30 transition-colors group">
                                            {/* Info */}
                                            <td className="py-3.5 pl-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span onClick={() => navigate(`/medicines/${med._id}`)}
                                                        className="text-xs font-extrabold text-[var(--text-primary)] hover:text-[#00e5ff] cursor-pointer transition-colors leading-snug">
                                                        {med.name}
                                                    </span>
                                                    <span className="text-xs font-mono tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
                                                        NDC: {med.ndc} · {med.category}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Days remaining badge */}
                                            <td className="py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold" style={{ color: activeCfg.color }}>
                                                        {isExpired ? 'EXPIRED' : `${days} days`}
                                                    </span>
                                                    {isExpired ? (
                                                        <span className="text-xs font-bold px-1.5 py-0.2 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                                                            Overdue
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-medium opacity-60 text-[var(--text-secondary)]">
                                                            ({new Date(med.expiryDate).toLocaleDateString()})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Stock */}
                                            <td className="py-3.5 text-right font-semibold text-xs text-[var(--text-primary)]">
                                                {med.stock.toLocaleString('en-IN')} units
                                            </td>

                                            {/* Value */}
                                            <td className="py-3.5 text-right text-xs font-extrabold text-glow text-[var(--text-primary)]" style={{ fontFamily: "'Lora', serif" }}>
                                                ₹{med.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </td>

                                            {/* Recommended Action & Reason */}
                                            <td className="py-4 pl-4">
                                                <div className="flex flex-col gap-0.5 max-w-xs">
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded self-start ${actionColor}`}>
                                                        {suggestedAction}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                                                        {reason}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* disposal buttons */}
                                            <td className="py-4 pr-2 text-right">
                                                {med.stock <= 0 ? (
                                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--card-border)] px-2 py-1 rounded">
                                                        Stock Cleared
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {actType === 'return' && (
                                                            <button
                                                                disabled={isActionLoading}
                                                                onClick={() => handleAction(med._id, 'return', med.stock, med.price)}
                                                                className="px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all duration-200 border border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 disabled:opacity-50"
                                                            >
                                                                {isActionLoading && actionType === 'return' ? 'Processing...' : 'Return to Supplier'}
                                                            </button>
                                                        )}
                                                        {actType === 'discount' && (
                                                            <button
                                                                disabled={isActionLoading}
                                                                onClick={() => handleAction(med._id, 'discount', med.stock, med.price)}
                                                                className="px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all duration-200 border border-amber-500/20 bg-amber-500/[0.03] text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 disabled:opacity-50"
                                                            >
                                                                {isActionLoading && actionType === 'discount' ? 'Processing...' : 'Discount Stock (50%)'}
                                                            </button>
                                                        )}
                                                        {actType === 'write-off' && (
                                                            <button
                                                                disabled={isActionLoading}
                                                                onClick={() => handleAction(med._id, 'write-off', med.stock, med.price)}
                                                                className="px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all duration-200 border border-red-500/20 bg-red-500/[0.03] text-red-400 hover:bg-red-500/10 hover:border-red-500 disabled:opacity-50"
                                                            >
                                                                {isActionLoading && actionType === 'write-off' ? 'Processing...' : 'Dispose Expired'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
