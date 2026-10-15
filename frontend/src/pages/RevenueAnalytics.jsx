import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RevenueAnalytics() {
    const { user, activeBranch, switchBranch } = useAuth();
    const navigate = useNavigate();

    // Data States
    const [analytics, setAnalytics] = useState(null);
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal Guide state
    const [isExplModalOpen, setIsExplModalOpen] = useState(false);

    // Filter selector (Admin only)
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [hoveredTrend, setHoveredTrend] = useState(null);

    // Sync selectedBranchId with activeBranch when activeBranch changes
    useEffect(() => {
        if (activeBranch?.id) {
            setSelectedBranchId(activeBranch.id);
        }
    }, [activeBranch]);

    // Role verification
    useEffect(() => {
        if (user && user.role === 'Pharmacist') {
            setError('Access Denied: Pharmacists are restricted from viewing financial revenue data.');
            setLoading(false);
            return;
        }
        fetchInitialData();
    }, [user, selectedBranchId]);

    const fetchInitialData = async () => {
        if (!user || user.role === 'Pharmacist') return;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Revenue Analytics
            let url = '/api/revenue/analytics';
            if (user.role === 'Admin' && selectedBranchId) {
                url += `?branchId=${selectedBranchId}`;
            }
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('Access Denied: You do not have permissions to access revenue analytics.');
                }
                throw new Error('Failed to retrieve revenue metrics.');
            }
            const data = await res.json();
            setAnalytics(data);

            // 2. Fetch Pharmacies list for Admin dropdown comparison
            if (user.role === 'Admin') {
                const branchesRes = await fetch('/api/admin/pharmacies');
                if (branchesRes.ok) {
                    const branchesData = await branchesRes.json();
                    setPharmacies(branchesData.pharmacies || []);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // CSV Report Export Handler
    const handleExportReport = async () => {
        try {
            let url = '/api/revenue/export';
            if (user.role === 'Admin' && selectedBranchId) {
                url += `?branchId=${selectedBranchId}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('CSV generation failed.');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            alert(err.message);
        }
    };

    if (user?.role === 'Pharmacist' || error?.includes('Access Denied')) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-center max-w-md mx-auto animate-fade-in">
                <span className="material-symbols-rounded text-6xl text-red-500 bg-red-500/10 p-3 rounded-full border border-red-500/20">lock</span>
                <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] font-serif">Security Restriction</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                        Your account credentials (Pharmacist) do not permit viewing branch financials, profit margins, or invoice valuations.
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00B4D8]/5 border border-[#00B4D8]/15 text-[#00B4D8] cursor-pointer hover:bg-[#00B4D8]/10 transition-all"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-[var(--text-secondary)] animate-fade-in">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Calculating branch profit margins & aggregation feeds…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center max-w-md mx-auto animate-fade-in">
                <span className="material-symbols-rounded text-5xl text-red-400">error</span>
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Aggregation Error</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{error}</p>
                </div>
                <button 
                    onClick={fetchInitialData} 
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00B4D8]/5 border border-[#00B4D8]/15 text-[#00B4D8] cursor-pointer hover:bg-[#00B4D8]/10"
                >
                    Retry Diagnostics
                </button>
            </div>
        );
    }

    const { metrics, monthlyTrends, topMedicines, categoryBreakdown = [], branchPerformance } = analytics;
    const maxTrendVal = Math.max(...monthlyTrends.map(t => Math.max(t.revenue, t.profit, 100)), 1000);

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header / Top Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Financial Administration
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none font-serif">
                        Revenue <span className="text-cyan-400">Analytics</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Secure access to gross sales margins, transactional profit sheets, and branch-wide financial breakdowns.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                    {/* Admin Branch Selector */}
                    {user?.role === 'Admin' ? (
                        <select
                            value={selectedBranchId}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedBranchId(val);
                                if (val) {
                                    const selected = pharmacies.find(p => p._id === val);
                                    if (selected) {
                                        switchBranch(selected._id, selected.name);
                                    }
                                }
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                        >
                            <option value="">All Branches</option>
                            {pharmacies.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)]">
                            Assigned Branch Scope
                        </div>
                    )}

                    <button
                        onClick={() => setIsExplModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-secondary)] cursor-pointer flex items-center gap-1.5 transition-all"
                        title="Understand Metrics & Charts"
                    >
                        <span className="material-symbols-rounded text-sm">menu_book</span>
                        <span>Explain Charts</span>
                    </button>

                    <button
                        onClick={handleExportReport}
                        className="px-5 py-2.5 rounded-xl bg-cyan-400 text-[var(--text-primary)] text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/20 transition-all flex items-center gap-1.5"
                    >
                        <span className="material-symbols-rounded text-sm font-black">download</span>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', val: `₹${(metrics.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'payments', col: 'text-[var(--text-primary)]' },
                    { label: 'Net Profit', val: `₹${(metrics.totalProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'savings', col: 'text-emerald-400' },
                    { label: 'Profit Margin', val: `${(metrics.profitMargin || 0).toFixed(1)}%`, icon: 'query_stats', col: 'text-cyan-400' },
                    { label: 'Total Units Sold', val: metrics.totalUnitsSold || 0, icon: 'shopping_bag', col: 'text-purple-400 font-mono' },
                ].map((card, idx) => (
                    <div key={idx} className="rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-1 relative overflow-hidden card-shine">
                        <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span className="text-xs font-bold uppercase tracking-wider">{card.label}</span>
                            <span className="material-symbols-rounded text-base">{card.icon}</span>
                        </div>
                        <span className={`text-2xl font-black mt-2 leading-none ${card.col}`}>{card.val}</span>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Monthly Revenue vs Profit (Lines/Bars combo) */}
                <div className="lg:col-span-8 rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Revenue & Net Profit Trends</h3>
                            <span className="text-xs text-[var(--text-secondary)] font-mono uppercase">Last 6 Months (INR)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                                <span className="text-xs text-[var(--text-secondary)]">Revenue</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                                <span className="text-xs text-[var(--text-secondary)]">Net Profit</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="relative w-full h-56 pt-2">
                        {monthlyTrends.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-xs">
                                No sales data logged in this range.
                            </div>
                        ) : (
                            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                                {/* Horizontal grid lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                    const y = 10 + p * 150;
                                    const labelVal = Math.round(maxTrendVal * (1 - p));
                                    return (
                                        <g key={i}>
                                            <line x1="55" y1={y} x2="590" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                            <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="9" className="font-mono">
                                                ₹{(labelVal / 1000).toFixed(1)}k
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Plot bars side by side */}
                                {monthlyTrends.map((t, idx) => {
                                    const w = 600 - 55;
                                    const colWidth = w / monthlyTrends.length;
                                    const colX = 55 + idx * colWidth;
                                    const centerX = colX + colWidth / 2;

                                    const revHeight = (t.revenue / maxTrendVal) * 150;
                                    const profHeight = (t.profit / maxTrendVal) * 150;

                                    const revY = 160 - revHeight;
                                    const profY = 160 - profHeight;

                                    const barWidth = 14;
                                    const padding = 2;

                                    return (
                                        <g key={t.month}>
                                            {/* Revenue Bar */}
                                            <rect
                                                x={centerX - barWidth - padding}
                                                y={revY}
                                                width={barWidth}
                                                height={Math.max(revHeight, 1)}
                                                rx="2"
                                                fill="#22d3ee"
                                                opacity={hoveredTrend === `${idx}-rev` ? '1' : '0.75'}
                                                className="transition-all duration-200 cursor-pointer"
                                                onMouseEnter={() => setHoveredTrend(`${idx}-rev`)}
                                                onMouseLeave={() => setHoveredTrend(null)}
                                            />

                                            {/* Profit Bar */}
                                            <rect
                                                x={centerX + padding}
                                                y={profY}
                                                width={barWidth}
                                                height={Math.max(profHeight, 1)}
                                                rx="2"
                                                fill="#34d399"
                                                opacity={hoveredTrend === `${idx}-prof` ? '1' : '0.75'}
                                                className="transition-all duration-200 cursor-pointer"
                                                onMouseEnter={() => setHoveredTrend(`${idx}-prof`)}
                                                onMouseLeave={() => setHoveredTrend(null)}
                                            />

                                            {/* Monthly labels */}
                                            <text x={centerX} y="180" fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontWeight="bold">
                                                {t.month}
                                            </text>

                                            {/* Tooltips */}
                                            {hoveredTrend === `${idx}-rev` && (
                                                <g>
                                                    <rect x={centerX - 55} y={revY - 25} width={110} height={20} rx="4" fill="rgba(8,10,16,0.95)" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
                                                    <text x={centerX} y={revY - 12} fill="#22d3ee" fontSize="9" textAnchor="middle" fontWeight="bold">
                                                        Rev: ₹{t.revenue.toLocaleString()}
                                                    </text>
                                                </g>
                                            )}
                                            {hoveredTrend === `${idx}-prof` && (
                                                <g>
                                                    <rect x={centerX - 55} y={profY - 25} width={110} height={20} rx="4" fill="rgba(8,10,16,0.95)" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />
                                                    <text x={centerX} y={profY - 12} fill="#34d399" fontSize="9" textAnchor="middle" fontWeight="bold">
                                                        Prof: ₹{t.profit.toLocaleString()}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                                
                                <line x1="55" y1="160" x2="590" y2="160" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="lg:col-span-4 rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                        <span className="material-symbols-rounded text-cyan-400 text-base font-bold">trending_up</span>
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Top Selling Medicines</h3>
                    </div>

                    <div className="flex flex-col gap-3.5 flex-1 justify-center">
                        {topMedicines.length === 0 ? (
                            <span className="text-xs text-[var(--text-secondary)]">No units sold registered yet.</span>
                        ) : (
                            topMedicines.map((med, idx) => (
                                <div key={idx} className="flex flex-col gap-1.5 p-2 rounded bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[var(--text-primary)] font-semibold truncate">{med.name}</span>
                                        <span className="text-[var(--text-secondary)] font-mono">{med.totalQuantity} units</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-[var(--text-secondary)] leading-none">
                                        <span>Revenue: <strong className="text-cyan-400">₹{med.revenue.toLocaleString()}</strong></span>
                                        <span>Profit: <strong className="text-emerald-400">₹{med.profit.toLocaleString()}</strong></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Category Breakdown & Financial Glossary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Category Breakdown */}
                <div className="lg:col-span-6 rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                        <span className="material-symbols-rounded text-cyan-400 text-base font-bold">pie_chart</span>
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Category Performance Breakdown</h3>
                    </div>

                    <div className="flex flex-col gap-3.5 flex-1 justify-center">
                        {categoryBreakdown.length === 0 ? (
                            <span className="text-xs text-[var(--text-secondary)]">No category data recorded.</span>
                        ) : (
                            categoryBreakdown.slice(0, 5).map((cat, idx) => {
                                const totalRevenueSum = categoryBreakdown.reduce((sum, c) => sum + c.revenue, 0) || 1;
                                const pct = ((cat.revenue / totalRevenueSum) * 100).toFixed(0);
                                
                                const colors = [
                                    { bar: 'bg-cyan-400', text: 'text-cyan-400' },
                                    { bar: 'bg-emerald-400', text: 'text-emerald-400' },
                                    { bar: 'bg-purple-400', text: 'text-purple-400' },
                                    { bar: 'bg-amber-400', text: 'text-amber-400' },
                                    { bar: 'bg-pink-400', text: 'text-pink-400' }
                                ];
                                const colorScheme = colors[idx % colors.length];

                                return (
                                    <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--text-primary)] font-semibold truncate">{cat.category}</span>
                                            <span className="text-[var(--text-secondary)] font-mono">{cat.unitsSold} units sold</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                                            <div style={{ width: `${pct}%` }} className={`h-full ${colorScheme.bar} rounded-full`} />
                                        </div>
                                        <div className="flex justify-between text-xs text-[var(--text-secondary)] leading-none mt-1">
                                            <span>Revenue: <strong className="text-slate-700">₹{cat.revenue.toLocaleString()}</strong></span>
                                            <span>Profit: <strong className={colorScheme.text}>₹{cat.profit.toLocaleString()} ({pct}%)</strong></span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Financial Overview/Glossary */}
                <div className="lg:col-span-6 rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                        <span className="material-symbols-rounded text-cyan-400 text-base font-bold">receipt</span>
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Quick Accounting Definitions</h3>
                    </div>

                    <div className="flex flex-col gap-4 flex-1 justify-center text-xs text-[var(--text-secondary)]">
                        <div className="flex gap-3">
                            <span className="material-symbols-rounded text-cyan-400 text-base flex-shrink-0 mt-0.5">attach_money</span>
                            <div>
                                <strong className="text-[var(--text-primary)] block">Gross Revenue</strong>
                                <span className="text-xs text-[var(--text-secondary)]">Total transaction sales value without deductions. Represented as Cyan bars in the trend chart.</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <span className="material-symbols-rounded text-emerald-400 text-base flex-shrink-0 mt-0.5">savings</span>
                            <div>
                                <strong className="text-[var(--text-primary)] block">Net Profit & COGS</strong>
                                <span className="text-xs text-[var(--text-secondary)]">Revenue remaining after deducting COGS (wholesale costs). COGS is Cost of Goods Sold. Represented as Emerald bars.</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <span className="material-symbols-rounded text-purple-400 text-base flex-shrink-0 mt-0.5">percent</span>
                            <div>
                                <strong className="text-[var(--text-primary)] block">Profit Margin</strong>
                                <span className="text-xs text-[var(--text-secondary)]">The efficiency ratio: <code>(Profit / Revenue) * 100</code>. Indicates how much of every rupee received represents actual profit.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Performance Comparison (Admin Only) */}
            {user?.role === 'Admin' && !selectedBranchId && (
                <div className="rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-cyan-400">compare</span>
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Branch Performance Comparison</h3>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] uppercase font-mono">Real-time ledger matching</span>
                    </div>

                    <div className="overflow-x-auto">
                        {branchPerformance.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-secondary)]">
                                <span className="text-xs">No active branch sales registered.</span>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--card-border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        <th className="pb-3 pl-2">Branch Location</th>
                                        <th className="pb-3 text-right">Revenue</th>
                                        <th className="pb-3 text-right">Net Profit</th>
                                        <th className="pb-3 text-center">Profit Margin</th>
                                        <th className="pb-3 text-center">Units Sold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchPerformance.map((branch) => (
                                        <tr key={branch.pharmacyId} className="border-b border-[var(--card-border)] hover:bg-[var(--bg-secondary)] transition-all group">
                                            <td className="py-3.5 pl-2 font-semibold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                                                {branch.name}
                                            </td>
                                            <td className="py-3.5 text-right font-mono text-xs font-bold text-[var(--text-primary)]">
                                                ₹{branch.revenue.toLocaleString()}
                                            </td>
                                            <td className="py-3.5 text-right font-mono text-xs font-bold text-emerald-400">
                                                ₹{branch.profit.toLocaleString()}
                                            </td>
                                            <td className="py-3.5 text-center text-xs text-cyan-400 font-bold font-mono">
                                                {branch.margin.toFixed(1)}%
                                            </td>
                                            <td className="py-3.5 text-center font-mono text-xs text-[var(--text-secondary)]">
                                                {branch.unitsSold}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

        {/* Explanation Modal */}
        {isExplModalOpen && (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4 animate-fade-in"
                onClick={() => setIsExplModalOpen(false)}
            >
                <div 
                    className="w-full max-w-xl rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative animate-slide-up"
                    style={{ background: 'rgba(20, 25, 41, 0.96)' }}
                    onClick={e => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setIsExplModalOpen(false)}
                        className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>

                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-rounded text-cyan-400">menu_book</span>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Revenue & Analytics Guide</h3>
                    </div>

                    <div className="flex flex-col gap-4 text-xs text-[var(--text-secondary)] leading-relaxed overflow-y-auto max-h-[70vh] scrollable pr-1">
                        <div className="flex flex-col gap-1 border-b border-[var(--card-border)] pb-2">
                            <span className="font-bold text-[var(--text-primary)] uppercase text-xs tracking-wider text-cyan-400">1. Revenue vs Profit Chart</span>
                            <p>
                                This chart represents your monthly sales performance. 
                                The <strong className="text-cyan-300">cyan bars</strong> show the total cash received from transactions (Gross Revenue).
                                The <strong className="text-emerald-300">emerald bars</strong> show the Net Profit, which is the revenue remaining after subtracting COGS (Cost of Goods Sold).
                            </p>
                        </div>

                        <div className="flex flex-col gap-1 border-b border-[var(--card-border)] pb-2">
                            <span className="font-bold text-[var(--text-primary)] uppercase text-xs tracking-wider text-cyan-400">2. Net Profit Margin</span>
                            <p>
                                Calculated as <code>(Net Profit / Gross Revenue) * 100</code>. It shows what percentage of your retail sales is retained as pure earnings. Higher margins reflect optimized supplier procurement and stable pricing power.
                            </p>
                        </div>

                        <div className="flex flex-col gap-1 border-b border-[var(--card-border)] pb-2">
                            <span className="font-bold text-[var(--text-primary)] uppercase text-xs tracking-wider text-cyan-400">3. Category Breakdown Gauges</span>
                            <p>
                                Visualizes sales contributions across drug classes. It helps identify which therapeutic categories (e.g. Antibiotics, Pain Relievers, or Cardiological) drive the largest volume and cash returns, indicating where catalog focus is most profitable.
                            </p>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-[var(--text-primary)] uppercase text-xs tracking-wider text-cyan-400">4. COGS Calculation logic</span>
                            <p>
                                Cost of Goods Sold (COGS) uses actual supplier wholesale costs recorded when stock is received. If a medicine record has no supplier cost entered, the system applies a standard 70% threshold fallback estimate of its current retail price.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button 
                            onClick={() => setIsExplModalOpen(false)}
                            className="w-full py-2.5 rounded-xl bg-cyan-400 text-[var(--text-primary)] font-black text-xs hover:bg-cyan-300 cursor-pointer transition-all"
                        >
                            Got it, Thanks!
                        </button>
                    </div>
                </div>
            </div>
        )}

        </div>
    );
}
