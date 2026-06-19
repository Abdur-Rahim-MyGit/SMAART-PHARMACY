import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BranchComparison() {
    const { user, switchBranch } = useAuth();
    const navigate = useNavigate();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBranches = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics/admin/branches');
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('Access Denied: only system admins are permitted here.');
                }
                throw new Error('Failed to load branch comparisons.');
            }
            setBranches(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'Admin') {
            navigate('/dashboard');
        } else {
            fetchBranches();
        }
    }, [user, navigate]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-slate-400">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Aggregating branch intelligence matrix…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-md mx-auto text-center">
                <span className="material-symbols-rounded text-5xl text-red-400">gavel</span>
                <div>
                    <h3 className="text-lg font-bold text-white font-serif">Access Violation</h3>
                    <p className="text-xs mt-1 text-slate-400">{error}</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="px-5 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white cursor-pointer">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    // Calculations
    const systemValuation = branches.reduce((acc, curr) => acc + curr.totalValuation, 0);
    const systemDeadStock = branches.reduce((acc, curr) => acc + curr.deadStockValue, 0);
    const averageHealth = branches.length > 0 
        ? Math.round(branches.reduce((acc, curr) => acc + curr.healthScore, 0) / branches.length) 
        : 100;

    const handleInspectBranch = (pharmacyId, name) => {
        switchBranch(pharmacyId, name);
        navigate('/dashboard');
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    System Administration
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none font-serif">
                    Branch <span className="text-cyan-400">Comparison</span>
                </h2>
                <p className="text-xs text-slate-300">
                    Consolidated view of inventory valuations, operational health scores, and safety compliance across all branches.
                </p>
            </div>

            {/* Consolidated KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Consolidated Valuation */}
                <div className="rounded-lg p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-cyan-400/[0.04] text-cyan-400">
                        <span className="material-symbols-rounded text-base">domain</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-3xl font-extrabold text-white tracking-tight font-serif">
                            ₹{systemValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Total System Valuation</span>
                    </div>
                </div>

                {/* System Average Health */}
                <div className="rounded-lg p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-emerald-400/[0.04] text-emerald-400">
                        <span className="material-symbols-rounded text-base">health_and_safety</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-3xl font-extrabold text-emerald-400 tracking-tight font-serif">
                            {averageHealth}%
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Average Branch Health</span>
                    </div>
                </div>

                {/* Consolidated Dead Stock */}
                <div className="rounded-lg p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-red-400/[0.04] text-red-400">
                        <span className="material-symbols-rounded text-base">event_busy</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-3xl font-extrabold text-red-400 tracking-tight font-serif">
                            ₹{systemDeadStock.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">System Dead Stock Value</span>
                    </div>
                </div>
            </div>

            {/* Branches Table */}
            <div className="rounded-xl overflow-hidden glass border border-white/5 shadow-2xl">
                <div className="overflow-x-auto scrollable">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                                <th className="p-4 pl-6 text-center w-[70px]">Rank</th>
                                <th className="p-4">Branch Name</th>
                                <th className="p-4">Location Address</th>
                                <th className="p-4 text-center">Health Score</th>
                                <th className="p-4 text-right">Inventory Valuation</th>
                                <th className="p-4 text-right">Dead Stock (At Risk)</th>
                                <th className="p-4 text-center">Low Stock SKUs</th>
                                <th className="p-4 text-center">Active Users</th>
                                <th className="p-4 text-center">Unread Alerts</th>
                                <th className="p-4 pr-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-xs font-semibold text-slate-300">
                            {[...branches].sort((a, b) => b.healthScore - a.healthScore).map((b, idx) => {
                                const hColor = b.healthScore >= 90 ? 'text-emerald-400 bg-emerald-500/10' : b.healthScore >= 75 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10';
                                const medal = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`;
                                return (
                                    <tr key={b.pharmacyId} className="hover:bg-white/[0.01] transition-all">
                                        <td className="p-4 pl-6 text-center font-bold text-slate-300 font-mono text-xs">{medal}</td>
                                        <td className="p-4 text-white font-serif text-sm">{b.name}</td>
                                        <td className="p-4 text-[11px] text-slate-400 max-w-[200px] truncate" title={b.address}>{b.address || 'N/A'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-black ${hColor}`}>
                                                {b.healthScore}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-white font-mono">₹{b.totalValuation.toLocaleString('en-IN')}</td>
                                        <td className="p-4 text-right text-red-400 font-mono">₹{b.deadStockValue.toLocaleString('en-IN')}</td>
                                        <td className="p-4 text-center text-slate-400 font-mono">{b.lowStockCount}</td>
                                        <td className="p-4 text-center text-slate-400">{b.userCount}</td>
                                        <td className="p-4 text-center">
                                            {b.alertCount > 0 ? (
                                                <span className="bg-red-500/20 text-red-400 text-[11px] px-2 py-0.5 rounded-full font-bold">
                                                    {b.alertCount} Active
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-[11px]">None</span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-center">
                                            <button 
                                                onClick={() => handleInspectBranch(b.pharmacyId, b.name)}
                                                className="px-3 py-1.5 rounded bg-cyan-400 text-slate-900 hover:bg-cyan-300 text-[11px] font-black cursor-pointer shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 transition-all"
                                            >
                                                Inspect Branch
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
