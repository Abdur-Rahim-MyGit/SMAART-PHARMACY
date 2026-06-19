import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CAT_COLORS = {
    Cardiovascular: '#f87171', 'Anti-infective': '#34d399', Endocrine: '#60a5fa',
    Emergency: '#f59e0b', Analgesic: '#a78bfa', Neurological: '#e879f9',
    Gastrointestinal: '#22d3ee', General: '#00c2cc',
};
const CAT_ICONS = {
    Cardiovascular: 'favorite', 'Anti-infective': 'coronavirus', Endocrine: 'opacity',
    Emergency: 'emergency', Analgesic: 'healing', Neurological: 'psychology',
    Gastrointestinal: 'bubble_chart', General: 'medication',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const { activeBranch, user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredBar, setHoveredBar] = useState(null);
    const [showHealthBreakdown, setShowHealthBreakdown] = useState(false);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = activeBranch ? `/api/analytics/dashboard?branchId=${activeBranch.id}` : '/api/analytics/dashboard';
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 401) {
                    navigate('/login');
                    return;
                }
                throw new Error('Failed to load dashboard metrics.');
            }
            setData(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [activeBranch]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3" style={{ color: 'var(--text-muted)' }}>
                <span className="material-symbols-rounded animate-spin text-3xl" style={{ color: '#00c2cc' }}>sync</span>
                <span className="text-sm">Assembling intelligence metrics…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-md mx-auto text-center">
                <span className="material-symbols-rounded text-5xl text-red-400">error</span>
                <div>
                    <h3 className="text-lg font-bold text-white font-serif">Aggregation Fault</h3>
                    <p className="text-xs mt-1 text-slate-400">{error}</p>
                </div>
                <button onClick={fetchDashboard} className="px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                    Retry Query
                </button>
            </div>
        );
    }

    const { metrics, expiryAlerts, lowStockAlerts, recentTransactions, categoryData, dailyMovements, dbAlerts, briefing } = data;

    // Destructure criticalActionCenter with defaults
    const {
        delayedOrdersCount = 0,
        delayedOrdersValue = 0,
        delayedOrders = [],
        complianceIssues = { medicinesMissingInfo: 0, medicinesMissingExpiry: 0, transactionsMissingBatch: 0 },
        lowHealthBranches = []
    } = data?.criticalActionCenter || {};

    // Collect active alerts
    const alerts = [];

    // 1. Expiring Soon
    if (metrics.nearExpiry > 0) {
        alerts.push({
            id: 'expiring-soon',
            title: 'Medicines Expiring Soon',
            count: `${metrics.nearExpiry} SKU(s)`,
            subtitle: `Estimated value at risk: ₹${metrics.atRiskValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            severity: 'critical',
            reason: 'Medicines are expiring within the next 30 days, causing dead stock valuation loss.',
            actionLabel: 'View Expiry Ledger',
            onAction: () => navigate('/expiry-dashboard'),
            icon: 'hourglass_empty',
            badge: '🔴 Critical'
        });
    }

    // 2. Low Stock
    if (metrics.lowStock > 0) {
        alerts.push({
            id: 'low-stock',
            title: 'Low Stock Medicines',
            count: `${metrics.lowStock} SKU(s)`,
            subtitle: 'Levels are below safety limits',
            severity: 'warning',
            reason: 'Active inventory items are below safety thresholds, risking out-of-stock situations.',
            actionLabel: 'Open Reorder Center',
            onAction: () => navigate('/reorder-intelligence'),
            icon: 'warning',
            badge: 'orange'
        });
    }

    // 3. Delayed Supplier Orders
    if (delayedOrdersCount > 0) {
        alerts.push({
            id: 'delayed-orders',
            title: 'Pending Supplier Orders',
            count: `${delayedOrdersCount} delayed PO(s)`,
            subtitle: `Purchase value delayed: ₹${delayedOrdersValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            severity: 'critical',
            reason: 'Supplier orders are overdue compared to their expected delivery dates.',
            actionLabel: 'Procurement Center',
            onAction: () => navigate('/purchase-orders'),
            icon: 'local_shipping',
            badge: '🔴 Delayed'
        });
    }

    // 4. Compliance Issues
    const hasCompliance = (complianceIssues?.medicinesMissingInfo || 0) > 0 || 
                          (complianceIssues?.medicinesMissingExpiry || 0) > 0 || 
                          (complianceIssues?.transactionsMissingBatch || 0) > 0;
    if (hasCompliance) {
        let details = [];
        if ((complianceIssues?.medicinesMissingInfo || 0) > 0) details.push(`${complianceIssues.medicinesMissingInfo} items missing info`);
        if ((complianceIssues?.medicinesMissingExpiry || 0) > 0) details.push(`${complianceIssues.medicinesMissingExpiry} items missing expiry dates`);
        if ((complianceIssues?.transactionsMissingBatch || 0) > 0) details.push(`${complianceIssues.transactionsMissingBatch} stock-in items missing batch numbers (last 30d)`);

        alerts.push({
            id: 'compliance-issues',
            title: 'Compliance Warnings',
            count: `${(complianceIssues?.medicinesMissingInfo || 0) + (complianceIssues?.medicinesMissingExpiry || 0) + (complianceIssues?.transactionsMissingBatch || 0)} issues`,
            subtitle: details.join(', '),
            severity: 'alert',
            reason: 'Missing item metadata or transaction batch numbers violate compliance trace policies.',
            actionLabel: 'Download Compliance Audit',
            onAction: () => window.open('/api/compliance/export'),
            icon: 'gavel',
            badge: 'yellow'
        });
    }

    // 5. Branches Requiring Attention (Admin only)
    if (user?.role === 'Admin' && lowHealthBranches.length > 0) {
        alerts.push({
            id: 'low-health-branches',
            title: 'Branches Requiring Attention',
            count: `${lowHealthBranches.length} locations`,
            subtitle: lowHealthBranches.map(b => `${b.name} (${b.healthScore}%)`).join(', '),
            severity: 'info',
            reason: 'Branch health scores dropped below 85% due to high expiry and stock-outs.',
            actionLabel: 'Compare Branches',
            onAction: () => navigate('/branch-comparison'),
            icon: 'storefront',
            badge: 'blue'
        });
    }

    // Calculate maximum movement volume for chart scaling
    const maxMovement = Math.max(
        ...dailyMovements.map(d => Math.max(d.stockIn, d.stockOut, 10)),
        100
    );

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in relative z-10 pb-12">
            
            {/* ── Dashboard Hero Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Operational Intelligence
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none" style={{ fontFamily: "'Lora', serif" }}>
                        Pharmacy <span className="text-sky-400">Overview</span>
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Real-time ledger value, category spreads, and expiry indicators.
                    </p>
                </div>

                {user?.role !== 'Admin' && (
                    <div className="flex items-center gap-2">
                        {user?.role === 'Manager' && (
                            <button onClick={() => navigate('/medicines/add')}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-slate-900"
                                style={{ background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)' }}>
                                <span className="material-symbols-rounded text-sm">add</span>
                                <span>Add Med</span>
                            </button>
                        )}
                        <button onClick={() => navigate('/inventory/transaction-new')}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer bg-white/[0.03] border border-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.06]">
                            <span className="material-symbols-rounded text-sm">swap_horiz</span>
                            <span>Post Movement</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ── Operational Workflows Quick-Start Banner ── */}
            <div className="rounded-xl p-4 overflow-hidden glass border border-[#f472b6]/15 shadow-lg shadow-[#f472b6]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
                {/* Glowing pink highlight */}
                <div className="absolute -left-12 -top-12 w-28 h-28 rounded-full bg-[#f472b6]/10 pointer-events-none filter blur-xl animate-pulse" />
                <div className="flex items-start gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f472b6]/10 text-[#f472b6] border border-[#f472b6]/20 flex-shrink-0">
                        <span className="material-symbols-rounded text-sm">route</span>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-xs font-bold text-white font-serif" style={{ fontFamily: "'Lora', serif" }}>Need Help with the System Flow?</h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-normal max-w-2xl">
                            We've created step-by-step lifecycles for <span className="text-[#60a5fa] font-bold">Pharmacists</span>, <span className="text-[#f59e0b] font-bold">Managers</span>, and <span className="text-[#10b981] font-bold">Admins</span>. Learn what pages to open, what actions to perform, and what to do from first to last.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-system-guide', { detail: 'workflow' }));
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-[#f472b6] bg-[#f472b6]/10 border border-[#f472b6]/20 hover:bg-[#f472b6]/20 hover:border-[#f472b6]/40 relative z-10 self-end sm:self-center"
                >
                    <span>Open Flow Guide</span>
                    <span className="material-symbols-rounded text-xs">arrow_forward</span>
                </button>
            </div>

            {/* ── Critical Action Center ── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#ef4444]">
                            Urgent Actions
                        </span>
                        <h3 className="text-lg font-bold text-white font-serif">Critical Action Center</h3>
                    </div>
                </div>

                {alerts.length === 0 ? (
                    <div className="rounded-xl p-6 flex items-center gap-4 bg-emerald-500/[0.03] border border-emerald-500/15 shadow-md">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                            <span className="material-symbols-rounded text-xl">check_circle</span>
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-white">All Systems Operational</h4>
                            <p className="text-xs text-slate-400 mt-0.5">No critical issues or compliance warnings detected at this branch today.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                        {alerts.map(alert => {
                            const colors = {
                                critical: { bg: 'bg-red-500/[0.03]', border: 'border-red-500/15', text: 'text-red-400', button: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20', badge: '🔴 Critical' },
                                warning: { bg: 'bg-amber-500/[0.03]', border: 'border-amber-500/15', text: 'text-amber-400', button: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20', badge: '🟠 Warning' },
                                alert: { bg: 'bg-yellow-500/[0.03]', border: 'border-yellow-500/15', text: 'text-yellow-400', button: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20', badge: '🟡 Compliance' },
                                info: { bg: 'bg-sky-500/[0.03]', border: 'border-sky-500/15', text: 'text-sky-400', button: 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20', badge: '🔵 Attention' },
                            };
                            const c = colors[alert.severity] || colors.info;

                            let recommendedAction = '';
                            if (alert.id === 'expiring-soon') {
                                recommendedAction = 'Process returns, markdowns, or dispose of expired items.';
                            } else if (alert.id === 'low-stock') {
                                recommendedAction = 'Create a replenishment order immediately.';
                            } else if (alert.id === 'delayed-orders') {
                                recommendedAction = 'Contact the supplier coordinator to expedite delivery.';
                            } else if (alert.id === 'compliance-issues') {
                                recommendedAction = 'Update missing values or export compliance CSV to review logs.';
                            } else {
                                recommendedAction = 'Compare branch performances and inspect inventory gaps.';
                            }

                            return (
                                <div key={alert.id} className={`rounded-xl p-5 flex flex-col gap-4 glass border shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.01] ${c.bg} ${c.border}`}>
                                    {/* Top Info */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-black uppercase tracking-wider ${c.text}`}>
                                                    {c.badge}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-white mt-1 font-serif truncate" title={alert.title}>
                                                {alert.title}
                                            </h4>
                                            <p className={`text-base font-extrabold tracking-tight mt-0.5 ${c.text}`}>
                                                {alert.count}
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5" title={alert.subtitle}>
                                                {alert.subtitle}
                                            </p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5 ${c.text}`}>
                                            <span className="material-symbols-rounded text-base">
                                                {alert.icon}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Action Button */}
                                    <button
                                        onClick={alert.onAction}
                                        className={`mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${c.button}`}
                                    >
                                        <span>{alert.actionLabel}</span>
                                        <span className="material-symbols-rounded text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Today's Briefing Widget ── */}
            {briefing && briefing.length > 0 && (
                <div className="relative rounded-xl p-4 overflow-hidden glass border border-[#00c2cc]/15 shadow-lg shadow-[#00c2cc]/5">
                    {/* Glowing highlight */}
                    <div className="absolute -left-16 -top-16 w-32 h-32 rounded-full bg-[#00c2cc]/10 pointer-events-none filter blur-xl" />
                    
                    <div className="flex items-start gap-3 relative z-10">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#00c2cc]/10 text-[#00c2cc]">
                            <span className="material-symbols-rounded text-sm">auto_awesome</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400 leading-none">Today's Executive Briefing</h4>
                            <ul className="flex flex-col gap-1 text-[11px] text-slate-300 list-none font-medium">
                                {briefing.map((line, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00c2cc]" />
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Operational KPIs Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Valuation */}
                <div className="rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(0, 194, 204, 0.03) 0%, transparent 70%)', filter: 'blur(15px)' }} />
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#00c2cc]/[0.04] text-[#00c2cc]">
                        <span className="material-symbols-rounded text-base">payments</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                            ₹{metrics.totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Inventory Valuation</span>
                    </div>
                </div>

                {/* Inventory Health Score Card */}
                <div 
                    onClick={() => setShowHealthBreakdown(true)}
                    className="rounded-lg p-4 flex items-center justify-between relative overflow-hidden backdrop-blur-md cursor-pointer transition-all duration-300 select-none group"
                    style={{ 
                        background: 'rgba(15,20,32,0.3)', 
                        border: '1px solid rgba(255,255,255,0.03)' 
                    }}
                    title="Click to explain score calculation"
                >
                    <div className="flex flex-col">
                        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                            {metrics.healthScore || 0}%
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Branch Health Score</span>
                        <span className="text-[11px] font-bold text-cyan-400 opacity-80 group-hover:opacity-100 group-hover:text-cyan-300 mt-1.5 flex items-center gap-0.5 transition-all">
                            <span>Explain Why?</span>
                            <span className="material-symbols-rounded text-[11px]">info</span>
                        </span>
                    </div>
                    {/* SVG Circle Gauge */}
                    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.03)" strokeWidth="3" fill="transparent" />
                            <circle cx="24" cy="24" r="20" 
                                stroke={
                                    (metrics.healthScore || 0) >= 90 ? '#10b981' : 
                                    (metrics.healthScore || 0) >= 75 ? '#f59e0b' : '#ef4444'
                                } 
                                strokeWidth="3" fill="transparent"
                                strokeDasharray={2 * Math.PI * 20} 
                                strokeDashoffset={2 * Math.PI * 20 - ((metrics.healthScore || 0) / 100) * 2 * Math.PI * 20} 
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-out" />
                        </svg>
                        <span className="absolute text-[11px] font-black text-white">{(metrics.healthScore || 0)}</span>
                    </div>
                </div>

                {/* Dead Stock Counter */}
                <div className="rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-red-400/[0.04] text-red-400">
                        <span className="material-symbols-rounded text-base">event_busy</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl md:text-3xl font-extrabold text-red-400 tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                            ₹{(metrics.deadStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            <span>Dead Stock Counter</span>
                            {metrics.atRiskValue > 0 && (
                                <span className="text-[11px] text-amber-400 font-extrabold pl-1 select-none">
                                    (₹{metrics.atRiskValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} risk)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Catalog Channels */}
                <div className="rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(96, 165, 250, 0.03) 0%, transparent 70%)', filter: 'blur(15px)' }} />
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-blue-400/[0.04] text-blue-400">
                        <span className="material-symbols-rounded text-base">medication</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
                            {metrics.activeChannels}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>Catalog Channels</span>
                    </div>
                </div>
            </div>

            {/* ── Analytics Visual Graphs ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Daily Stock Movements SVG Chart */}
                <div className="lg:col-span-8 rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Transaction Activity</span>
                            <h3 className="text-base font-bold text-white font-serif">Daily Stock Movements (Units)</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" />
                                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Inbound</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#60a5fa]" />
                                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Outbound</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Chart Area */}
                    <div className="relative w-full h-56 pt-2">
                        <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                            {/* Horizontal grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                const y = 10 + p * 150;
                                const labelVal = Math.round(maxMovement * (1 - p));
                                return (
                                    <g key={i}>
                                        <line x1="45" y1={y} x2="590" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                        <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="9" className="font-mono">
                                            {labelVal.toLocaleString()}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Draw Bars */}
                            {dailyMovements.map((day, idx) => {
                                const w = 600 - 45;
                                const colWidth = w / 7;
                                const colX = 45 + idx * colWidth;
                                const centerX = colX + colWidth / 2;

                                const inHeight = (day.stockIn / maxMovement) * 150;
                                const outHeight = (day.stockOut / maxMovement) * 150;

                                const inY = 160 - inHeight;
                                const outY = 160 - outHeight;

                                const barWidth = 10;
                                const padding = 2;

                                return (
                                    <g key={day.date}>
                                        {/* Grid vertical label lines */}
                                        <line x1={centerX} y1="10" x2={centerX} y2="160" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />

                                        {/* Inbound Bar */}
                                        <rect
                                            x={centerX - barWidth - padding}
                                            y={inY}
                                            width={barWidth}
                                            height={Math.max(inHeight, 1)}
                                            rx="2"
                                            fill="#34d399"
                                            opacity={hoveredBar === `${idx}-in` ? '1' : '0.75'}
                                            className="transition-all duration-200 cursor-pointer"
                                            onMouseEnter={() => setHoveredBar(`${idx}-in`)}
                                            onMouseLeave={() => setHoveredBar(null)}
                                        />

                                        {/* Outbound Bar */}
                                        <rect
                                            x={centerX + padding}
                                            y={outY}
                                            width={barWidth}
                                            height={Math.max(outHeight, 1)}
                                            rx="2"
                                            fill="#60a5fa"
                                            opacity={hoveredBar === `${idx}-out` ? '1' : '0.75'}
                                            className="transition-all duration-200 cursor-pointer"
                                            onMouseEnter={() => setHoveredBar(`${idx}-out`)}
                                            onMouseLeave={() => setHoveredBar(null)}
                                        />

                                        {/* X-axis date labels */}
                                        <text x={centerX} y="180" fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontWeight="bold">
                                            {day.label}
                                        </text>

                                        {/* Hover Tooltips */}
                                        {hoveredBar === `${idx}-in` && (
                                            <g>
                                                <rect x={centerX - 45} y={inY - 25} width={90} height={20} rx="4" fill="rgba(8,10,16,0.9)" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />
                                                <text x={centerX} y={inY - 12} fill="#34d399" fontSize="9" textAnchor="middle" fontWeight="bold">
                                                    +{day.stockIn.toLocaleString()} units
                                                </text>
                                            </g>
                                        )}
                                        {hoveredBar === `${idx}-out` && (
                                            <g>
                                                <rect x={centerX - 45} y={outY - 25} width={90} height={20} rx="4" fill="rgba(8,10,16,0.9)" stroke="rgba(96,165,250,0.3)" strokeWidth="1" />
                                                <text x={centerX} y={outY - 12} fill="#60a5fa" fontSize="9" textAnchor="middle" fontWeight="bold">
                                                    -{day.stockOut.toLocaleString()} units
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}
                            
                            {/* X-axis line */}
                            <line x1="45" y1="160" x2="590" y2="160" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                        </svg>
                    </div>
                </div>

                {/* Category Valuation Spread */}
                <div className="lg:col-span-4 rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Portfolio Distribution</span>
                        <h3 className="text-base font-bold text-white font-serif">Valuation by Category</h3>
                    </div>

                    {/* Progress bars list */}
                    <div className="flex flex-col gap-4 flex-1 justify-center pt-2">
                        {categoryData.length === 0 ? (
                            <span className="text-xs text-center block" style={{ color: 'var(--text-muted)' }}>No catalog items registered.</span>
                        ) : (
                            categoryData
                                .sort((a, b) => b.valuation - a.valuation)
                                .slice(0, 5)
                                .map(cat => {
                                    const percent = metrics.totalValuation > 0 
                                        ? (cat.valuation / metrics.totalValuation) * 100 
                                        : 0;
                                    const color = CAT_COLORS[cat.category] || '#00c2cc';
                                    const icon = CAT_ICONS[cat.category] || 'medication';

                                    return (
                                        <div key={cat.category} className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-rounded text-sm" style={{ color }}>{icon}</span>
                                                    <span className="text-xs font-semibold text-white">{cat.category}</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xs font-extrabold text-white">
                                                        ₹{cat.valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                                        ({percent.toFixed(0)}%)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-white/[0.02] overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percent}%`, background: color }} />
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Operational Warnings & Audit lists ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Expiry Alerts list widget */}
                <div className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md h-[340px]"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-base text-amber-400">event_busy</span>
                            <span className="text-xs font-bold uppercase tracking-wide text-white">Expiry Warnings ({expiryAlerts.length})</span>
                        </div>
                        <button onClick={() => navigate('/expiry-dashboard')} className="text-[11px] font-bold hover:underline" style={{ color: '#00c2cc' }}>
                            View Expiries
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollable flex flex-col gap-2">
                        {expiryAlerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
                                <span className="material-symbols-rounded text-3xl">check_circle</span>
                                <span className="text-xs font-medium text-slate-400">All channels expiration healthy</span>
                            </div>
                        ) : (
                            expiryAlerts.map(med => {
                                const color = med.status === 'Expired' ? '#f87171' : '#f59e0b';
                                return (
                                    <div key={med._id} onClick={() => navigate(`/medicines/${med._id}`)}
                                        className="p-2.5 rounded-lg flex items-center justify-between border border-transparent hover:border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all duration-200">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-semibold text-white truncate">{med.name}</span>
                                            <span className="text-[11px] mt-0.5 text-slate-400">
                                                Val: ₹{(med.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · Exp: {new Date(med.expiryDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex-shrink-0 pl-2">
                                            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded"
                                                style={{ background: `${color}10`, color }}>
                                                {med.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts widget */}
                <div className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md h-[340px]"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-base text-red-400">warning</span>
                            <span className="text-xs font-bold uppercase tracking-wide text-white">Low Stock Warning ({lowStockAlerts.length})</span>
                        </div>
                        <button onClick={() => navigate('/reorder-intelligence')} className="text-[11px] font-bold hover:underline" style={{ color: '#00c2cc' }}>
                            Restock Queue
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollable flex flex-col gap-2">
                        {lowStockAlerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
                                <span className="material-symbols-rounded text-3xl">check_circle</span>
                                <span className="text-xs font-medium text-slate-400">All channels stock optimal</span>
                            </div>
                        ) : (
                            lowStockAlerts.map(med => {
                                const isZero = med.stock === 0;
                                return (
                                    <div key={med._id} onClick={() => navigate(`/medicines/${med._id}`)}
                                        className="p-2.5 rounded-lg flex items-center justify-between border border-transparent hover:border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all duration-200">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-semibold text-white truncate">{med.name}</span>
                                            <span className="text-[11px] mt-0.5 text-slate-400">
                                                Stock: {med.stock} · Reorder point: {med.reorderPoint !== undefined ? med.reorderPoint : 20}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0 text-right pl-2">
                                            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded"
                                                style={{
                                                    background: isZero ? 'rgba(248,113,113,0.08)' : 'rgba(245,158,11,0.08)',
                                                    color: isZero ? '#f87171' : '#f59e0b'
                                                }}>
                                                {isZero ? 'Depleted' : 'Low Stock'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Critical Alerts Feed Widget */}
                <div className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md h-[340px]"
                    style={{ background: 'rgba(15,20,32,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-base text-cyan-400">notifications_active</span>
                            <span className="text-xs font-bold uppercase tracking-wide text-white">Critical Alerts Feed ({dbAlerts?.length || 0})</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollable flex flex-col gap-2">
                        {!dbAlerts || dbAlerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4" style={{ color: 'var(--text-muted)' }}>
                                <span className="material-symbols-rounded text-3xl">task_alt</span>
                                <span className="text-xs font-medium text-slate-400">No active branch compliance or temperature alerts logged.</span>
                            </div>
                        ) : (
                            dbAlerts.map(alert => {
                                const alertColors = {
                                    critical: 'rgba(239, 68, 68, 0.15)',
                                    warning: 'rgba(245, 158, 11, 0.15)',
                                    info: 'rgba(59, 130, 246, 0.15)'
                                };
                                const alertBorders = {
                                    critical: 'rgba(239, 68, 68, 0.4)',
                                    warning: 'rgba(245, 158, 11, 0.4)',
                                    info: 'rgba(59, 130, 246, 0.4)'
                                };
                                const textColors = {
                                    critical: '#ef4444',
                                    warning: '#f59e0b',
                                    info: '#3b82f6'
                                };
                                const iconMap = {
                                    Expiry: 'event_busy',
                                    Stock: 'warning',
                                    Health: 'trending_down',
                                    General: 'info'
                                };

                                return (
                                    <div key={alert._id} 
                                        className="p-2.5 rounded-lg border flex flex-col gap-1.5 transition-all duration-200"
                                        style={{ 
                                            background: alertColors[alert.severity] || 'rgba(255,255,255,0.02)',
                                            borderColor: alertBorders[alert.severity] || 'rgba(255,255,255,0.05)'
                                        }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-rounded text-sm" style={{ color: textColors[alert.severity] }}>
                                                    {iconMap[alert.alertType] || 'info'}
                                                </span>
                                                <span className="text-xs font-bold text-white">{alert.title}</span>
                                            </div>
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        const res = await fetch(`/api/alerts/${alert._id}/read`, { method: 'PUT' });
                                                        if (res.ok) fetchDashboard();
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                className="text-[11px] font-black text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-300 font-medium leading-normal">
                                            {alert.message}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Health Score Explanation Modal ── */}
            {showHealthBreakdown && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowHealthBreakdown(false)}
                >
                    <div 
                        className="bg-[#0f1420] border border-white/10 rounded-2xl w-full max-w-xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden animate-scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Glow backdrop effect */}
                        <div 
                            className="absolute -left-16 -top-16 w-40 h-40 rounded-full pointer-events-none filter blur-2xl" 
                            style={{ 
                                background: (metrics.healthScore || 0) >= 90 ? 'rgba(16,185,129,0.1)' : 
                                            (metrics.healthScore || 0) >= 75 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)' 
                            }} 
                        />

                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>System Diagnostic Audit</span>
                                <h3 className="text-xl font-black text-white font-serif">Inventory Health Explanation</h3>
                            </div>
                            <button 
                                onClick={() => setShowHealthBreakdown(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                            >
                                <span className="material-symbols-rounded text-sm">close</span>
                            </button>
                        </div>

                        {/* Visual Gauge + Layperson Summary */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            {/* Large Gauge */}
                            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                                    <circle cx="48" cy="48" r="42" 
                                        stroke={
                                            (metrics.healthScore || 0) >= 90 ? '#10b981' : 
                                            (metrics.healthScore || 0) >= 75 ? '#f59e0b' : '#ef4444'
                                        } 
                                        strokeWidth="6" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 42} 
                                        strokeDashoffset={2 * Math.PI * 42 - ((metrics.healthScore || 0) / 100) * 2 * Math.PI * 42} 
                                        strokeLinecap="round"
                                        className="transition-all duration-700 ease-out" 
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-white leading-none">{(metrics.healthScore || 0)}%</span>
                                    <span className="text-[11px] font-bold text-slate-400 mt-1">Health Score</span>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span 
                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ 
                                            background: (metrics.healthScore || 0) >= 90 ? 'rgba(16,185,129,0.1)' : 
                                                        (metrics.healthScore || 0) >= 75 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                            color: (metrics.healthScore || 0) >= 90 ? '#10b981' : 
                                                   (metrics.healthScore || 0) >= 75 ? '#f59e0b' : '#ef4444'
                                        }}
                                    >
                                        {(metrics.healthScore || 0) >= 90 ? 'Excellent' : 
                                         (metrics.healthScore || 0) >= 75 ? 'Needs Attention' : 'Critical Action Required'}
                                    </span>
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    Your branch inventory stands at <strong>{(metrics.healthScore || 0)}%</strong> health. We start at a perfect <strong>100%</strong> and subtract points for operational risks (like expired products or empty shelves). Fixing the issues below will bring your score back to 100%.
                                </p>
                            </div>
                        </div>

                        {/* Calculations Breakdown */}
                        <div className="flex flex-col gap-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Score Audit Math</span>
                            <div className="flex flex-col gap-2 text-xs bg-slate-950/45 rounded-xl p-4 border border-white/5 font-medium">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Starting Base Score</span>
                                    <span className="font-mono text-emerald-400 font-bold">+100 pts</span>
                                </div>
                                
                                {/* Expired Deduction */}
                                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 font-semibold">Expired Stock Deduction</span>
                                        <span className="text-[11px] text-slate-400 font-normal">-{metrics.expiredWithStock > 0 ? 15 : 0} points per item on shelves (max -45)</span>
                                    </div>
                                    <span className="font-mono text-red-400">
                                        -{metrics.expiredDeduction || 0} pts <span className="text-[11px] text-slate-400">({metrics.expiredWithStock || 0} items)</span>
                                    </span>
                                </div>

                                {/* Near Expiry Deduction */}
                                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 font-semibold">Near-Expiry Stock Deduction</span>
                                        <span className="text-[11px] text-slate-400 font-normal">-{metrics.nearExpiryWithStock > 0 ? 5 : 0} points per item expiring soon (max -25)</span>
                                    </div>
                                    <span className="font-mono text-amber-500">
                                        -{metrics.nearExpiryDeduction || 0} pts <span className="text-[11px] text-slate-400 font-normal">({metrics.nearExpiryWithStock || 0} items)</span>
                                    </span>
                                </div>

                                {/* Out of Stock Deduction */}
                                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 font-semibold">Out of Stock Deduction</span>
                                        <span className="text-[11px] text-slate-400 font-normal">-{metrics.outOfStock > 0 ? 10 : 0} points per depleted active item (max -20)</span>
                                    </div>
                                    <span className="font-mono text-red-400">
                                        -{metrics.outOfStockDeduction || 0} pts <span className="text-[11px] text-slate-400 font-normal">({metrics.outOfStock || 0} items)</span>
                                    </span>
                                </div>

                                {/* Low Stock Deduction */}
                                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 font-semibold">Low Stock Deduction</span>
                                        <span className="text-[11px] text-slate-400 font-normal">-{metrics.lowStock > 0 ? 5 : 0} points per low-stock item (max -20)</span>
                                    </div>
                                    <span className="font-mono text-[#60a5fa]">
                                        -{metrics.lowStockDeduction || 0} pts <span className="text-[11px] text-slate-400 font-normal">({metrics.lowStock || 0} items)</span>
                                    </span>
                                </div>

                                {/* Grand Total */}
                                <div className="flex justify-between items-center border-t border-white/10 pt-2.5 font-bold text-white text-sm">
                                    <span>Final Inventory Health Score</span>
                                    <span className="font-mono" style={{ color: (metrics.healthScore || 0) >= 90 ? '#10b981' : (metrics.healthScore || 0) >= 75 ? '#f59e0b' : '#ef4444' }}>
                                        {(metrics.healthScore || 0)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Checklist */}
                        <div className="flex flex-col gap-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Action Plan to Restore Score</span>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollable pr-1">
                                {metrics.expiredWithStock > 0 && (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-base text-red-400">delete_forever</span>
                                            <span className="text-xs text-slate-300 font-medium">Dispose of <strong>{metrics.expiredWithStock} expired</strong> products with active stock.</span>
                                        </div>
                                        <button 
                                            onClick={() => { setShowHealthBreakdown(false); navigate('/expiry-dashboard'); }} 
                                            className="text-[11px] font-extrabold text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0"
                                        >
                                            <span>Go to Disposal</span>
                                            <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                )}

                                {metrics.outOfStock > 0 && (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-base text-orange-400">shopping_cart_checkout</span>
                                            <span className="text-xs text-slate-300 font-medium">Replenish <strong>{metrics.outOfStock} out-of-stock</strong> medicines immediately.</span>
                                        </div>
                                        <button 
                                            onClick={() => { setShowHealthBreakdown(false); navigate('/reorder-intelligence'); }} 
                                            className="text-[11px] font-extrabold text-orange-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0"
                                        >
                                            <span>Order Stock</span>
                                            <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                )}

                                {metrics.nearExpiryWithStock > 0 && (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-base text-amber-400">sell</span>
                                            <span className="text-xs text-slate-300 font-medium">Clear or return <strong>{metrics.nearExpiryWithStock} items</strong> expiring in 30 days.</span>
                                        </div>
                                        <button 
                                            onClick={() => { setShowHealthBreakdown(false); navigate('/expiry-dashboard'); }} 
                                            className="text-[11px] font-extrabold text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0"
                                        >
                                            <span>Inspect Expiries</span>
                                            <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                )}

                                {metrics.lowStock > 0 && (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-base text-blue-400">trending_up</span>
                                            <span className="text-xs text-slate-300 font-medium">Restock <strong>{metrics.lowStock} items</strong> that are running below safety threshold.</span>
                                        </div>
                                        <button 
                                            onClick={() => { setShowHealthBreakdown(false); navigate('/reorder-intelligence'); }} 
                                            className="text-[11px] font-extrabold text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0"
                                        >
                                            <span>Restock Queue</span>
                                            <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                )}

                                {metrics.expiredWithStock === 0 && metrics.outOfStock === 0 && metrics.nearExpiryWithStock === 0 && metrics.lowStock === 0 && (
                                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                        <span className="material-symbols-rounded text-2xl text-emerald-400">task_alt</span>
                                        <span className="text-xs font-bold text-white">Perfect Health Condition!</span>
                                        <span className="text-[11px]">Your branch inventory has no critical quality, stockout, or low stock warnings.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
