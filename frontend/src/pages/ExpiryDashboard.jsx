import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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
            const res = await fetch('/api/medicines');
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
    }, []);

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
    const handleAction = async (medicineId, type, currentStock) => {
        if (!medicineId || currentStock <= 0) return;
        setActionId(medicineId);
        setActionType(type);
        setError(null);

        let endpoint = '';
        let body = { medicineId };

        if (type === 'return') {
            // Return to Supplier -> Stock Out
            endpoint = '/api/inventory/stock-out';
            body = {
                ...body,
                quantity: currentStock,
                reason: 'Return to Supplier',
                notes: 'Disposed via Expiry Intelligence Dashboard quick-action'
            };
        } else if (type === 'write-off') {
            // Write Off -> Adjustment (Expired)
            endpoint = '/api/inventory/adjustment';
            body = {
                ...body,
                quantityChanged: -currentStock,
                transactionType: 'Expired',
                reason: 'Expired',
                notes: 'Disposed via Expiry Intelligence Dashboard quick-action'
            };
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
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
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Inventory Quality Control
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none" style={{ fontFamily: "'Lora', serif" }}>
                    Expiry <span className="text-sky-400">Intelligence</span>
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
                <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md"
                    style={{
                        background: 'linear-gradient(135deg, rgba(11, 24, 46, 0.6) 0%, rgba(20, 46, 82, 0.4) 100%)',
                        border: '1px solid rgba(0, 229, 255, 0.15)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)'
                    }}>
                    <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 70%)', filter: 'blur(15px)' }} />
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#00e5ff]/[0.08] text-[#00e5ff] border border-[#00e5ff]/20">
                        <span className="material-symbols-rounded text-base">payments</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-3xl font-black text-white tracking-tight text-glow" style={{ fontFamily: "'Lora', serif" }}>
                            ₹{bandsData.deadStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Dead Stock Value</span>
                        <span className="text-[11px] opacity-65 mt-0.5" style={{ color: 'var(--text-muted)' }}>Expired or expiring within 90 days</span>
                    </div>
                </div>

                {/* Red Band Card */}
                <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md cursor-pointer border border-white/[0.03]"
                    style={{ background: activeBand === 'red' ? 'rgba(248,113,113,0.08)' : 'rgba(15,20,32,0.3)', borderColor: activeBand === 'red' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.03)' }}
                    onClick={() => setActiveBand('red')}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#f87171]/[0.06] text-[#f87171]">
                        <span className="material-symbols-rounded text-base">event_busy</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                                {bandsData.red.length}
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: '#f87171' }}>
                                ₹{bandsData.valuations.red.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Red Band (≤30 Days)</span>
                    </div>
                </div>

                {/* Amber Band Card */}
                <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md cursor-pointer border border-white/[0.03]"
                    style={{ background: activeBand === 'amber' ? 'rgba(245,158,11,0.08)' : 'rgba(15,20,32,0.3)', borderColor: activeBand === 'amber' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.03)' }}
                    onClick={() => setActiveBand('amber')}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#f59e0b]/[0.06] text-[#f59e0b]">
                        <span className="material-symbols-rounded text-base">warning</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                                {bandsData.amber.length}
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: '#f59e0b' }}>
                                ₹{bandsData.valuations.amber.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Amber Band (31-60 Days)</span>
                    </div>
                </div>

                {/* Green Band Card */}
                <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md cursor-pointer border border-white/[0.03]"
                    style={{ background: activeBand === 'green' ? 'rgba(52,211,153,0.08)' : 'rgba(15,20,32,0.3)', borderColor: activeBand === 'green' ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.03)' }}
                    onClick={() => setActiveBand('green')}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#34d399]/[0.06] text-[#34d399]">
                        <span className="material-symbols-rounded text-base">watch_later</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                                {bandsData.green.length}
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: '#34d399' }}>
                                ₹{bandsData.valuations.green.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Green Band (61-90 Days)</span>
                    </div>
                </div>
            </div>

            {/* ── Band list & Actions ── */}
            <div className="rounded-xl p-5 flex flex-col gap-5 backdrop-blur-xl border border-white/[0.03]"
                style={{ background: 'rgba(15,20,32,0.25)' }}>
                
                {/* Active Band Details Banner */}
                <div className="flex items-center gap-3 p-3.5 rounded-lg border"
                    style={{ background: activeCfg.bg, borderColor: activeCfg.border }}>
                    <span className="material-symbols-rounded text-lg" style={{ color: activeCfg.color }}>info</span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{activeCfg.label}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{activeCfg.desc}</span>
                    </div>
                </div>

                {/* Tab select row */}
                <div className="flex items-center rounded-lg p-1 gap-1 border border-white/[0.03] w-full max-w-lg"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {Object.entries(BAND_CFG).map(([key, cfg]) => {
                        const isActive = activeBand === key;
                        return (
                            <button key={key} onClick={() => setActiveBand(key)}
                                className="flex-1 px-4 py-2 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer"
                                style={{
                                    background: isActive ? `${cfg.color}15` : 'transparent',
                                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                    border: isActive ? `1px solid ${cfg.color}30` : '1px solid transparent',
                                }}>
                                {cfg.label.split(' ')[0]}
                            </button>
                        );
                    })}
                </div>

                {/* Expiry Risk Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
                            <span className="material-symbols-rounded animate-spin text-2xl" style={{ color: '#00e5ff' }}>sync</span>
                            <span className="text-xs">Analyzing catalog channels…</span>
                        </div>
                    ) : bandList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <span className="material-symbols-rounded text-4xl text-[#34d399]">check_circle</span>
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Expiry Risks</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">All monitored medicines in this band have healthy expiry profiles.</p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.04] text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    <th className="pb-3 pl-2">Medicine Detail</th>
                                    <th className="pb-3">Days Remaining</th>
                                    <th className="pb-3 text-right">Stock</th>
                                    <th className="pb-3 text-right">Value (₹)</th>
                                    <th className="pb-3 pr-2 text-right">Disposal Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {bandList.map(med => {
                                    const days = med.daysRemaining;
                                    const isExpired = days <= 0;
                                    const isActionLoading = actionId === med._id;

                                    return (
                                        <tr key={med._id} className="hover:bg-white/[0.01] transition-colors group">
                                            {/* Info */}
                                            <td className="py-3.5 pl-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span onClick={() => navigate(`/medicines/${med._id}`)}
                                                        className="text-xs font-extrabold text-white hover:text-[#00e5ff] cursor-pointer transition-colors leading-snug">
                                                        {med.name}
                                                    </span>
                                                    <span className="text-[11px] font-mono tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
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
                                                        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                                                            Overdue
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-medium opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                                            ({new Date(med.expiryDate).toLocaleDateString()})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Stock */}
                                            <td className="py-3.5 text-right font-semibold text-xs text-white">
                                                {med.stock.toLocaleString('en-IN')} units
                                            </td>

                                            {/* Value */}
                                            <td className="py-3.5 text-right text-xs font-extrabold text-glow text-white" style={{ fontFamily: "'Lora', serif" }}>
                                                ₹{med.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </td>

                                            {/* disposal buttons */}
                                            <td className="py-3.5 pr-2 text-right">
                                                {med.stock <= 0 ? (
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white/[0.02] border border-white/[0.04] px-2 py-1 rounded">
                                                        Stock Cleared
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Return to Supplier button */}
                                                        <button
                                                            disabled={isActionLoading}
                                                            onClick={() => handleAction(med._id, 'return', med.stock)}
                                                            className="px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all duration-200 border border-white/[0.04] bg-white/[0.02] text-white/80 hover:text-[#00e5ff] hover:bg-[#00e5ff]/10 hover:borderColor-[#00e5ff]/30 disabled:opacity-50"
                                                        >
                                                            {isActionLoading && actionType === 'return' ? (
                                                                <span className="material-symbols-rounded animate-spin text-xs">sync</span>
                                                            ) : (
                                                                'Return to Supplier'
                                                            )}
                                                        </button>

                                                        {/* Dispose Expired button */}
                                                        <button
                                                            disabled={isActionLoading}
                                                            onClick={() => handleAction(med._id, 'write-off', med.stock)}
                                                            className="px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all duration-200 border border-[#f87171]/20 bg-[#f87171]/[0.03] text-[#f87171] hover:bg-[#f87171]/10 hover:borderColor-[#f87171]/40 disabled:opacity-50"
                                                        >
                                                            {isActionLoading && actionType === 'write-off' ? (
                                                                <span className="material-symbols-rounded animate-spin text-xs">sync</span>
                                                            ) : (
                                                                'Dispose Expired'
                                                            )}
                                                        </button>
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
