import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell
} from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const { activeBranch, user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            <div className="flex flex-col gap-6 p-6 animate-pulse">
                <div className="h-10 w-64 rounded-lg bg-[var(--card-border)]"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="h-28 rounded-2xl bg-[var(--card-border)]"></div>
                    <div className="h-28 rounded-2xl bg-[var(--card-border)]"></div>
                    <div className="h-28 rounded-2xl bg-[var(--card-border)]"></div>
                    <div className="h-28 rounded-2xl bg-[var(--card-border)]"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-red-500 font-bold bg-red-500/10 px-8 py-5 rounded-xl border border-red-500/20">{error}</div>
            </div>
        );
    }

    // Extract real data mapping
    const { 
        metrics = {}, 
        recentTransactions = [], 
        dailyMovements = [], 
        categoryData = [],
        lowStockAlerts = [],
        expiryAlerts = []
    } = data;

    // Use a color palette for categories
    const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

    const todayDateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="p-4 lg:p-8 bg-transparent min-h-screen font-sans">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl text-[var(--text-primary)] flex items-center gap-3 font-playfair italic font-medium">
                        Welcome back, <span className="text-[var(--brand)] font-bold">{user?.name || 'Admin'}</span>! 👋
                        <span className="text-xs bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-1 rounded-full uppercase tracking-widest font-black border border-[var(--brand)]/20 not-italic font-sans">
                            {user?.role || 'User'}
                        </span>
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 font-medium">Here's your real-time pharmacy intelligence brief.</p>
                </div>
                <div className="flex items-center gap-5">
                    <div className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                        <span className="material-symbols-rounded text-[20px]">calendar_today</span>
                        {todayDateStr}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* LEFT MAIN AREA (2/3 width) */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Card 1: Active Medicines */}
                        <div className="premium-card p-5 rounded-3xl flex flex-col gap-3 group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="absolute inset-x-0 bottom-0 h-12 opacity-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-blue-500" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M0,10 Q25,20 50,10 T100,10" />
                                </svg>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <span className="material-symbols-rounded text-xl">medication</span>
                            </div>
                            <div className="z-10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Active Medicines</p>
                                <h3 className="text-2xl font-black mt-1 text-[var(--text-primary)]">{metrics.activeChannels || 0}</h3>
                            </div>
                        </div>

                        {/* Card 2: Low Stock */}
                        <div className="premium-card p-5 rounded-3xl flex flex-col gap-3 group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="absolute inset-x-0 bottom-0 h-12 opacity-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-orange-500" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M0,15 Q25,5 50,15 T100,5" />
                                </svg>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                <span className="material-symbols-rounded text-xl">warning</span>
                            </div>
                            <div className="z-10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Low Stock Items</p>
                                <h3 className="text-2xl font-black mt-1 text-[var(--text-primary)]">{metrics.lowStock || 0}</h3>
                            </div>
                        </div>

                        {/* Card 3: Out of Stock */}
                        <div className="premium-card p-5 rounded-3xl flex flex-col gap-3 group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="absolute inset-x-0 bottom-0 h-12 opacity-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M0,10 Q25,0 50,10 T100,10" />
                                </svg>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                <span className="material-symbols-rounded text-xl">error</span>
                            </div>
                            <div className="z-10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Out of Stock</p>
                                <h3 className="text-2xl font-black mt-1 text-[var(--text-primary)]">{metrics.outOfStock || 0}</h3>
                            </div>
                        </div>

                        {/* Card 4: Expiring Soon */}
                        <div className="premium-card p-5 rounded-3xl flex flex-col gap-3 group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="absolute inset-x-0 bottom-0 h-12 opacity-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-purple-500" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M0,15 Q25,15 50,5 T100,15" />
                                </svg>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <span className="material-symbols-rounded text-xl">hourglass_empty</span>
                            </div>
                            <div className="z-10">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Expiring Soon</p>
                                <h3 className="text-2xl font-black mt-1 text-[var(--text-primary)]">{metrics.nearExpiry || 0}</h3>
                            </div>
                        </div>
                    </div>

                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        
                        {/* Daily Stock Movements Line Chart */}
                        <div className="md:col-span-3 premium-card p-6 rounded-3xl flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Daily Stock Movements</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Stock in vs out over the last 7 days</p>
                                </div>
                            </div>
                            <div className="h-64 w-full mt-auto">
                                {dailyMovements.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dailyMovements} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 600 }} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                                            <Line type="monotone" dataKey="stockIn" name="Stock In" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="stockOut" name="Stock Out" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm font-medium bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--card-border)]">
                                        No stock movements in the last 7 days.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Category Distribution Donut */}
                        <div className="md:col-span-2 premium-card p-6 rounded-3xl flex flex-col">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">Medicines by Category</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Distribution of active stock</p>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center mt-4">
                                {categoryData.length > 0 ? (
                                    <>
                                        <div className="h-44 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={categoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={3}
                                                        dataKey="count"
                                                        stroke="none"
                                                    >
                                                        {categoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        
                                        <div className="w-full mt-4 flex flex-col gap-2 max-h-36 overflow-y-auto pr-2 scrollable">
                                            {categoryData.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm px-2 py-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors cursor-default">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                                        <span className="text-[var(--text-secondary)] font-medium">{item.category || 'Uncategorized'}</span>
                                                    </div>
                                                    <span className="font-bold text-[var(--text-primary)]">{item.count} items</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full w-full text-[var(--text-secondary)] text-sm font-medium bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--card-border)]">
                                        No categories available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expiring Soon Section */}
                    <div className="premium-card p-6 rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
                                    <span className="material-symbols-rounded text-xl">event_upcoming</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Expiring Soon</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Critical stock to clear</p>
                                </div>
                            </div>
                            <button className="text-[var(--brand)] font-bold text-sm hover:underline cursor-pointer px-4 py-2 hover:bg-[var(--brand)]/10 rounded-xl transition-colors" onClick={() => navigate('/expiry-dashboard')}>
                                View Ledger
                            </button>
                        </div>
                        
                        {expiryAlerts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {expiryAlerts.slice(0, 4).map((med, idx) => (
                                    <div key={idx} className="flex flex-col gap-3 p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
                                        <div className="flex items-center justify-between">
                                            <div className="w-10 h-10 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] flex items-center justify-center flex-shrink-0 text-purple-500 shadow-sm">
                                                <span className="material-symbols-rounded text-xl">medication</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-[var(--card-bg)] border border-[var(--card-border)] px-2 py-1 rounded-md text-[var(--text-secondary)]">Stock: {med.stock}</span>
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{med.name}</span>
                                            <span className="text-xs text-purple-500 font-bold mt-1">EXP: {new Date(med.expiryDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 border border-dashed border-[var(--card-border)] rounded-2xl text-center text-[var(--text-secondary)] font-medium bg-[var(--bg-secondary)]">
                                No medicines are expiring soon! Everything is fresh.
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT SIDEBAR AREA (1/3 width) */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    
                    {/* Low Stock Alert */}
                    <div className="premium-card rounded-3xl overflow-hidden flex flex-col max-h-[380px]">
                        <div className="p-5 flex items-center gap-4 border-b border-[var(--card-border)]">
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center z-10 relative">
                                    <span className="material-symbols-rounded text-xl">notifications_active</span>
                                </div>
                                {lowStockAlerts.length > 0 && (
                                    <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-30"></div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Low Stock Alert</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{lowStockAlerts.length} items require reordering</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 scrollable">
                            {lowStockAlerts.length > 0 ? (
                                lowStockAlerts.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-[var(--bg-secondary)] rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-[var(--card-border)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)]">
                                                <span className="material-symbols-rounded text-lg">medication</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[130px]">{item.name}</span>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">{item.category}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg">Stock: {item.stock}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm font-medium text-center p-4">
                                    All inventory is adequately stocked!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="premium-card rounded-3xl flex flex-col flex-1 min-h-[380px]">
                        <div className="p-5 flex justify-between items-center border-b border-[var(--card-border)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-full flex items-center justify-center">
                                    <span className="material-symbols-rounded text-lg">swap_horiz</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Recent Activity</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Live stock adjustments</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-3 flex flex-col gap-1 scrollable">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.slice(0, 6).map((tx, idx) => {
                                    const isStockIn = tx.transactionType === 'Stock In';
                                    const medicineName = tx.medicineId?.name || 'Unknown Medicine';
                                    const operatorName = tx.userId?.username || 'Operator';
                                    
                                    return (
                                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-[var(--bg-secondary)] rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-[var(--card-border)]">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[150px]">{medicineName}</span>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-black ${
                                                        isStockIn ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                                    }`}>
                                                        {tx.transactionType}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate max-w-[90px]">
                                                        by {operatorName}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-base font-black ${isStockIn ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                    {isStockIn ? '+' : '-'}{Math.abs(tx.quantityChanged || 0)}
                                                </span>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-bold bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md">
                                                    {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm font-medium text-center p-4 border border-dashed border-[var(--card-border)] m-4 rounded-2xl bg-[var(--bg-secondary)]">
                                    No recent stock movements.
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-[var(--card-border)] text-center">
                            <button className="text-[var(--text-secondary)] font-bold text-sm hover:text-[var(--text-primary)] cursor-pointer py-1.5 hover:bg-[var(--bg-secondary)] w-full rounded-xl transition-colors" onClick={() => navigate('/inventory/history')}>
                                View Full Action Log
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
