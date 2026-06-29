import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BranchProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data states
    const [data, setData] = useState(null);
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'staff', 'audit', 'alerts'

    const fetchBranchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch branch details & performance
            const res = await fetch(`/api/branches/${id}`);
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('Access Denied: You do not have permissions to view this branch.');
                }
                throw new Error('Failed to load branch details.');
            }
            const details = await res.json();
            setData(details);

            // Fetch branch audits (Admin or Manager only)
            if (user && user.role !== 'Pharmacist') {
                const auditRes = await fetch(`/api/branches/${id}/audit-trail`);
                if (auditRes.ok) {
                    setAudits(await auditRes.json());
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchBranchData();
        }
    }, [id, user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-[var(--text-secondary)]">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Retrieving branch profiling index…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-md mx-auto text-center animate-fade-in">
                <span className="material-symbols-rounded text-5xl text-red-400">gavel</span>
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Security Restriction</h3>
                    <p className="text-xs mt-1 text-[var(--text-secondary)]">{error}</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] cursor-pointer">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (!data) return null;

    const { pharmacy, performance, staff, inventory } = data;

    const healthColor = performance.healthScore >= 90 
        ? 'text-emerald-400 bg-emerald-500/10' 
        : performance.healthScore >= 75 
        ? 'text-amber-400 bg-amber-500/10' 
        : 'text-red-400 bg-red-500/10';

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header / Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--card-bg)] shadow-elevated border border-[var(--card-border)] relative overflow-hidden backdrop-blur-xl">
                <div className="flex flex-col gap-1.5 z-10">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                            Pharmacy Node Overview
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${pharmacy.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                            {pharmacy.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-3xl font-black text-[var(--text-primary)] font-serif tracking-tight">{pharmacy.name}</h2>
                        <span className="text-xs px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] rounded-lg font-mono">
                            {pharmacy.branchCode || 'BR-XXX'}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] max-w-xl">{pharmacy.address || 'No address logged'}</p>
                </div>

                <div className="flex items-center gap-4 z-10 flex-wrap">
                    {/* Health Score Gauge */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                        <span className="material-symbols-rounded text-[var(--text-secondary)] text-lg">health_and_safety</span>
                        <div className="flex flex-col">
                            <span className={`text-xl font-bold font-mono leading-none ${healthColor}`}>
                                {performance.healthScore}%
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1">Health Score</span>
                        </div>
                    </div>

                    {/* Valuation Card */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                        <span className="material-symbols-rounded text-cyan-400 text-lg">payments</span>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold font-mono text-[var(--text-primary)] leading-none">
                                ₹{performance.inventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1">Valuation</span>
                        </div>
                    </div>
                    
                    {user?.role === 'Admin' && (
                        <button 
                            onClick={() => navigate('/pharmacies')}
                            className="flex items-center justify-center p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/10 cursor-pointer"
                            title="Back to Branches"
                        >
                            <span className="material-symbols-rounded text-sm">arrow_back</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Branch Status Summary ── */}
            {(() => {
                const isHealthy = performance.healthScore >= 90;
                const isWarning = performance.healthScore >= 75 && performance.healthScore < 90;
                
                let statusLabel = 'Healthy';
                let statusColor = 'text-emerald-400';
                let statusBg = 'border-emerald-500/25 bg-emerald-500/[0.02]';
                let statusIndicator = '🟢';
                
                if (performance.healthScore < 75) {
                    statusLabel = 'Critical Attention Required';
                    statusColor = 'text-red-400';
                    statusBg = 'border-red-500/25 bg-red-500/[0.02]';
                    statusIndicator = '🔴';
                } else if (isWarning) {
                    statusLabel = 'Needs Action';
                    statusColor = 'text-amber-400';
                    statusBg = 'border-amber-500/25 bg-amber-500/[0.02]';
                    statusIndicator = '🟠';
                }

                return (
                    <div className={`rounded-3xl p-6 border backdrop-blur-md flex flex-col md:flex-row justify-between gap-5 relative overflow-hidden shadow-elevated ${statusBg}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full" style={{ background: `radial-gradient(circle, ${isHealthy ? 'rgba(52,211,153,0.1)' : isWarning ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'} 0%, transparent 70%)`, filter: 'blur(15px)' }} />
                        <div className="flex flex-col gap-3.5 z-10 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-[var(--text-secondary)] text-sm">analytics</span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Operations Decision Support</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-[var(--text-secondary)]">Branch Status</span>
                                <h3 className={`text-xl font-black font-serif ${statusColor}`}>
                                    {statusIndicator} {statusLabel}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Current Issues</span>
                                    <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                        {performance.lowStockCount > 0 && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="text-amber-400">•</span> {performance.lowStockCount} low stock medicine{performance.lowStockCount !== 1 ? 's' : ''}
                                            </li>
                                        )}
                                        {performance.expiredStockCount > 0 && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="text-red-400">•</span> {performance.expiredStockCount} expiry alert{performance.expiredStockCount !== 1 ? 's' : ''}
                                            </li>
                                        )}
                                        {performance.lowStockCount === 0 && performance.expiredStockCount === 0 && (
                                            <li className="flex items-center gap-1.5 text-emerald-400">
                                                <span>✓</span> No active inventory stock alerts
                                            </li>
                                        )}
                                    </ul>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Recommended Actions</span>
                                    <ul className="text-xs text-[var(--text-secondary)] space-y-1 font-semibold">
                                        {performance.expiredStockCount > 0 && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="text-[#00B4D8]">•</span> Review expiry queue
                                            </li>
                                        )}
                                        {performance.lowStockCount > 0 && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="text-[#00B4D8]">•</span> Reorder critical stock
                                            </li>
                                        )}
                                        {performance.lowStockCount === 0 && performance.expiredStockCount === 0 && (
                                            <li className="flex items-center gap-1.5">
                                                <span className="text-emerald-400">•</span> Monitor sales velocity
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-end items-start md:items-end gap-2 border-t md:border-t-0 md:border-l border-[var(--card-border)] pt-4 md:pt-0 md:pl-5 flex-shrink-0 min-w-[200px] z-10">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Business Impact</span>
                            <div className="flex flex-col md:items-end">
                                <span className="text-xl font-extrabold text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>
                                    ₹{performance.deadStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-xs text-red-400 font-bold uppercase mt-1">Dead Stock Value at Risk</span>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button 
                                    onClick={() => navigate('/expiry-dashboard')}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-[var(--text-primary)] border border-[var(--card-border)] text-center"
                                >
                                    Review Expiry
                                </button>
                                <button 
                                    onClick={() => navigate('/reorder-intelligence')}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer text-[var(--text-primary)] text-center"
                                    style={{ background: '#00B4D8' }}
                                >
                                    Reorder Stock
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Basic Details Card */}
                <div className="rounded-2xl p-6 flex flex-col gap-4 bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--card-border)]">
                        <span className="material-symbols-rounded text-cyan-400 text-sm">info</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Basic Information</h3>
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Branch Name</span><span className="text-[var(--text-primary)] font-bold">{pharmacy.name}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Branch Code</span><span className="text-[var(--text-primary)] font-mono">{pharmacy.branchCode}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Contact Phone</span><span className="text-[var(--text-primary)]">{pharmacy.contactPhone || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Branch Email</span><span className="text-cyan-400 font-mono">{pharmacy.email || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Coordinator</span><span className="text-[var(--text-primary)]">{pharmacy.coordinator || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Assigned Manager</span><span className="text-[var(--text-primary)] font-bold">{pharmacy.assignedManager?.fullName || 'Unassigned'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Joined Date</span><span className="text-[var(--text-secondary)] font-mono">{pharmacy.joinedDate ? new Date(pharmacy.joinedDate).toLocaleDateString('en-GB') : 'N/A'}</span></div>
                        <div className="flex justify-between py-1"><span className="text-[var(--text-secondary)] font-medium">Opening Hours</span><span className="text-[var(--text-primary)]">{pharmacy.openingHours}</span></div>
                    </div>
                </div>

                {/* Performance Metrics Card */}
                <div className="rounded-2xl p-6 flex flex-col gap-4 bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--card-border)]">
                        <span className="material-symbols-rounded text-emerald-400 text-sm">trending_up</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Performance Metrics</h3>
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Branch Health Score</span><span className={`px-2 py-0.5 rounded text-xs font-black ${healthColor}`}>{performance.healthScore}%</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Total Medicines</span><span className="text-[var(--text-primary)] font-mono">{performance.totalMedicines}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Inventory Valuation</span><span className="text-cyan-400 font-mono">₹{performance.inventoryValue.toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Low Stock Medicines</span><span className="text-amber-400 font-mono font-bold">{performance.lowStockCount}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Expired Medicines</span><span className="text-red-400 font-mono font-bold">{performance.expiredStockCount}</span></div>
                        <div className="flex justify-between py-1"><span className="text-[var(--text-secondary)] font-medium">Dead Stock Valuation</span><span className="text-red-400 font-mono font-bold">₹{performance.deadStockValue.toLocaleString('en-IN')}</span></div>
                    </div>
                </div>

                {/* Staff Information Card */}
                <div className="rounded-2xl p-6 flex flex-col gap-4 bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--card-border)]">
                        <span className="material-symbols-rounded text-violet-400 text-sm">group</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Staff Information</h3>
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Total Managers</span><span className="text-[var(--text-primary)] font-mono font-bold">{staff.totalManagers}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Total Pharmacists</span><span className="text-[var(--text-primary)] font-mono">{staff.totalPharmacists}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Active Users</span><span className="text-emerald-400 font-mono font-bold">{staff.activeUsers}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Inactive Users</span><span className="text-[var(--text-secondary)] font-mono">{staff.inactiveUsers}</span></div>
                        <div className="flex flex-col gap-1.5 mt-2">
                            <span className="text-xs text-[var(--text-secondary)] uppercase font-black">Active Team Roster</span>
                            <div className="flex flex-wrap gap-1">
                                {staff.users.slice(0, 4).map(u => (
                                    <span key={u._id} className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] font-medium font-sans">
                                        {u.fullName || u.username} ({u.role[0]})
                                    </span>
                                ))}
                                {staff.users.length > 4 && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 font-medium font-sans">
                                        +{staff.users.length - 4} more
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs for Details Tables */}
            <div className="flex flex-col gap-4">
                <div className="flex border-b border-[var(--card-border)] gap-2.5 overflow-x-auto scrollable">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'inventory' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <span className="material-symbols-rounded text-sm">inventory_2</span>
                        Inventory Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'staff' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <span className="material-symbols-rounded text-sm">badge</span>
                        Staff Directory
                    </button>
                    {user?.role !== 'Pharmacist' && (
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'audit' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            <span className="material-symbols-rounded text-sm">history</span>
                            Branch Audit Trail
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 cursor-pointer transition-all relative ${activeTab === 'alerts' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <span className="material-symbols-rounded text-sm">notifications</span>
                        Branch Alerts
                        {inventory.alerts.length > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-red-500 text-[var(--text-primary)] text-xs font-black w-3.5 h-3.5 flex items-center justify-center rounded-full">
                                {inventory.alerts.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Contents */}
                {activeTab === 'inventory' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Medicines */}
                        <div className="rounded-2xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)] flex flex-col">
                            <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)] flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-sm text-cyan-400">workspace_premium</span>
                                    Top Medicines by Valuation
                                </span>
                            </div>
                            <div className="overflow-x-auto scrollable">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                            <th className="p-3 pl-4">Medicine</th>
                                            <th className="p-3">NDC Code</th>
                                            <th className="p-3 text-center">Stock</th>
                                            <th className="p-3 text-right">Valuation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                        {inventory.topMedicines.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-[var(--text-secondary)]">No medicine inventory records found.</td></tr>
                                        ) : (
                                            inventory.topMedicines.map(m => (
                                                <tr key={m._id} className="hover:bg-zinc-800/30">
                                                    <td className="p-3 pl-4 text-[var(--text-primary)] font-serif">{m.name}</td>
                                                    <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">{m.ndc}</td>
                                                    <td className="p-3 text-center font-mono">{m.stock}</td>
                                                    <td className="p-3 text-right font-mono text-cyan-400">₹{m.valuation.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="rounded-2xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)] flex flex-col">
                            <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)] flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-sm text-cyan-400">timeline</span>
                                    Recent Branch Transactions
                                </span>
                            </div>
                            <div className="overflow-x-auto scrollable">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                            <th className="p-3 pl-4">Date & User</th>
                                            <th className="p-3">Medicine</th>
                                            <th className="p-3 text-center">Type</th>
                                            <th className="p-3 text-center">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                        {inventory.recentTransactions.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-[var(--text-secondary)]">No stock movements registered.</td></tr>
                                        ) : (
                                            inventory.recentTransactions.map(t => (
                                                <tr key={t._id} className="hover:bg-zinc-800/30">
                                                    <td className="p-3 pl-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-[var(--text-secondary)] font-mono">{new Date(t.createdAt).toLocaleDateString('en-GB')}</span>
                                                            <span className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans">@{t.userId?.username}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-[var(--text-primary)] font-serif">{t.medicineId?.name || 'Unknown'}</td>
                                                    <td className="p-3 text-center">
                                                        {(() => {
                                                            const displayType = t.transactionType === 'Stock In' ? 'Receive Stock' : t.transactionType === 'Stock Out' ? 'Dispense Stock' : t.transactionType;
                                                            const colorClass = displayType === 'Receive Stock' ? 'text-emerald-400 bg-emerald-500/10' : displayType === 'Dispense Stock' ? 'text-cyan-400 bg-cyan-500/10' : 'text-amber-400 bg-amber-500/10';
                                                            return (
                                                                <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${colorClass}`}>
                                                                    {displayType}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="p-3 text-center font-mono">{t.quantityChanged}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Low Stock Alerts */}
                        <div className="rounded-2xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)] flex flex-col">
                            <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)]">
                                <span className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-sm text-amber-400">warning</span>
                                    Low Stock Alerts (Reorder Center)
                                </span>
                            </div>
                            <div className="overflow-x-auto scrollable">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                            <th className="p-3 pl-4">Medicine</th>
                                            <th className="p-3">NDC Code</th>
                                            <th className="p-3 text-center">Current Stock</th>
                                            <th className="p-3 text-center">Threshold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                        {inventory.reorderAlerts.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-emerald-400 bg-emerald-500/[0.02]">All stock levels healthy.</td></tr>
                                        ) : (
                                            inventory.reorderAlerts.map(r => (
                                                <tr key={r._id} className="hover:bg-zinc-800/30">
                                                    <td className="p-3 pl-4 text-[var(--text-primary)] font-serif">{r.name}</td>
                                                    <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">{r.ndc}</td>
                                                    <td className="p-3 text-center text-amber-400 font-mono font-bold">{r.stock}</td>
                                                    <td className="p-3 text-center font-mono text-[var(--text-secondary)]">{r.reorderPoint}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Expiry Risk Alerts */}
                        <div className="rounded-2xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)] flex flex-col">
                            <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)]">
                                <span className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-sm text-red-400">hourglass_disabled</span>
                                    Expiry & Dead Stock Alerts
                                </span>
                            </div>
                            <div className="overflow-x-auto scrollable">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                            <th className="p-3 pl-4">Medicine</th>
                                            <th className="p-3">Expiry Date</th>
                                            <th className="p-3 text-center">Risk status</th>
                                            <th className="p-3 text-center">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                        {inventory.expiryAlerts.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-emerald-400 bg-emerald-500/[0.02]">No expiry risk items detected.</td></tr>
                                        ) : (
                                            inventory.expiryAlerts.map(e => (
                                                <tr key={e._id} className="hover:bg-zinc-800/30">
                                                    <td className="p-3 pl-4 text-[var(--text-primary)] font-serif">{e.name}</td>
                                                    <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">
                                                        {new Date(e.expiryDate).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${e.status === 'Expired' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                                            {e.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center font-mono">{e.stock}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="rounded-3xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-elevated border border-[var(--card-border)] flex flex-col">
                        <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Staff Member Directory</h3>
                        </div>
                        <div className="overflow-x-auto scrollable">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                        <th className="p-4 pl-6">Full Name / Username</th>
                                        <th className="p-4">Contact Detail</th>
                                        <th className="p-4">Shift Type</th>
                                        <th className="p-4 text-center">Account Status</th>
                                        <th className="p-4">Joined Date</th>
                                        <th className="p-4">Registration Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                    {staff.users.length === 0 ? (
                                        <tr><td colSpan="6" className="p-10 text-center text-[var(--text-secondary)]">No staff members currently assigned to this branch.</td></tr>
                                    ) : (
                                        staff.users.map(u => (
                                            <tr key={u._id} className="hover:bg-zinc-800/30">
                                                <td className="p-4 pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[var(--text-primary)] font-bold">{u.fullName || 'No Name'}</span>
                                                        <span className="text-xs text-cyan-400 mt-0.5">@{u.username} ({u.role})</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span>{u.phone || 'No phone'}</span>
                                                        <span className="text-xs text-[var(--text-secondary)] mt-0.5">{u.email || 'No email'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-medium text-[var(--text-secondary)]">{u.shiftType}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${u.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]'}`}>
                                                        {u.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-mono text-[var(--text-secondary)]">{u.joinedDate ? new Date(u.joinedDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                                                <td className="p-4 text-xs text-[var(--text-secondary)] font-mono">
                                                    {u.registrationNumber ? `${u.qualification} • Reg: ${u.registrationNumber}` : 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && user?.role !== 'Pharmacist' && (
                    <div className="rounded-3xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-elevated border border-[var(--card-border)] flex flex-col">
                        <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Branch Activity Audit Logs</h3>
                        </div>
                        <div className="overflow-x-auto scrollable">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                        <th className="p-4 pl-6 w-[160px]">Timestamp</th>
                                        <th className="p-4 w-[120px]">Operator</th>
                                        <th className="p-4 w-[150px]">Action Trigger</th>
                                        <th className="p-4">Previous State</th>
                                        <th className="p-4">New State</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                    {audits.length === 0 ? (
                                        <tr><td colSpan="5" className="p-10 text-center text-[var(--text-secondary)] font-medium">No branch modifications logged in audit registry.</td></tr>
                                    ) : (
                                        audits.map(a => (
                                            <tr key={a._id} className="hover:bg-zinc-800/30 text-xs">
                                                <td className="p-4 pl-6 font-mono text-[var(--text-secondary)]">
                                                    {new Date(a.timestamp).toLocaleString('en-GB')}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[var(--text-primary)]">@{a.username}</span>
                                                        <span className="text-xs text-[var(--text-secondary)] font-bold uppercase">{a.userId?.role || 'User'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${a.action === 'Branch Creation' ? 'text-emerald-400 bg-emerald-500/10' : a.action === 'Manager Assignment' ? 'text-cyan-400 bg-cyan-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                                        {a.action}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-mono text-[var(--text-secondary)] max-w-[200px] truncate" title={JSON.stringify(a.previousValue)}>
                                                    {a.previousValue ? JSON.stringify(a.previousValue) : 'Empty'}
                                                </td>
                                                <td className="p-4 font-mono text-emerald-400 max-w-[200px] truncate" title={JSON.stringify(a.newValue)}>
                                                    {a.newValue ? JSON.stringify(a.newValue) : 'Empty'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="rounded-3xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-elevated border border-[var(--card-border)] flex flex-col">
                        <div className="p-5 bg-[var(--bg-secondary)] border-b border-[var(--card-border)]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Active Branch Alerts</h3>
                        </div>
                        <div className="flex flex-col gap-3 p-4">
                            {inventory.alerts.length === 0 ? (
                                <div className="p-8 text-center text-emerald-400 bg-emerald-500/5 rounded-xl border border-emerald-500/10 font-bold text-xs flex items-center justify-center gap-2">
                                    <span className="material-symbols-rounded">check_circle</span>
                                    No active compliance warnings or health issues for this branch.
                                </div>
                            ) : (
                                inventory.alerts.map(a => {
                                    const alertColors = a.severity === 'critical' 
                                        ? 'bg-red-500/10 border-red-500/20 text-red-300' 
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300';
                                    const alertIcon = a.severity === 'critical' ? 'dangerous' : 'warning';
                                    return (
                                        <div key={a._id} className={`p-4 rounded-xl border flex gap-3.5 items-start ${alertColors} animate-fade-in`}>
                                            <span className="material-symbols-rounded text-lg mt-0.5">{alertIcon}</span>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-xs">{a.title}</span>
                                                <span className="text-xs leading-relaxed opacity-80 mt-1">{a.message}</span>
                                                <span className="text-xs opacity-65 font-mono mt-1">Logged on: {new Date(a.createdAt).toLocaleString('en-GB')}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
