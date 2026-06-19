import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Suppliers() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data States
    const [suppliers, setSuppliers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All'); // All, Active, Inactive, Top Rated, Recently Added

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    // Form Fields
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [status, setStatus] = useState('Active');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch Supplier Data
    const fetchSuppliers = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = '/api/suppliers';
            const params = [];
            if (activeFilter !== 'All') {
                params.push(`filter=${activeFilter}`);
            }
            if (searchQuery) {
                params.push(`search=${encodeURIComponent(searchQuery)}`);
            }
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to retrieve suppliers.');
            }
            const data = await res.json();
            setSuppliers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Analytics Data (Admins and Managers only)
    const fetchAnalytics = async () => {
        if (!['Admin', 'Manager'].includes(user?.role)) {
            setAnalyticsLoading(false);
            return;
        }
        setAnalyticsLoading(true);
        try {
            const res = await fetch('/api/suppliers-analytics');
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [activeFilter, searchQuery]);

    useEffect(() => {
        fetchAnalytics();
    }, [user]);

    // Handle Create Supplier
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!name || !contactPerson || !phone || !email || !address || !gstNumber) {
            setFormError('All fields are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, contactPerson, phone, email, address, gstNumber })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to create supplier.');
            }

            setIsCreateOpen(false);
            resetForm();
            fetchSuppliers();
            fetchAnalytics();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Open Edit Modal
    const handleEditClick = (supplier) => {
        setSelectedSupplier(supplier);
        setName(supplier.name);
        setContactPerson(supplier.contactPerson);
        setPhone(supplier.phone);
        setEmail(supplier.email);
        setAddress(supplier.address);
        setGstNumber(supplier.gstNumber);
        setStatus(supplier.status);
        setIsEditOpen(true);
    };

    // Handle Update Supplier
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!name || !contactPerson || !phone || !email || !address || !gstNumber) {
            setFormError('All fields are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/suppliers/${selectedSupplier._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, contactPerson, phone, email, address, gstNumber, status })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to update supplier.');
            }

            setIsEditOpen(false);
            setSelectedSupplier(null);
            resetForm();
            fetchSuppliers();
            fetchAnalytics();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Disable / Enable Supplier Toggle
    const handleToggleStatus = async (supplier) => {
        const targetStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
        const confirmMsg = `Are you sure you want to set supplier "${supplier.name}" to ${targetStatus}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/suppliers/${supplier._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatus })
            });
            if (!res.ok) throw new Error('Status transition failed.');
            fetchSuppliers();
            fetchAnalytics();
        } catch (err) {
            alert(err.message);
        }
    };

    // Handle Archive Supplier
    const handleArchiveSupplier = async (supplier) => {
        if (!window.confirm(`Archive supplier "${supplier.name}"? They will no longer appear in default searches.`)) return;

        try {
            const res = await fetch(`/api/suppliers/${supplier._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Archived' })
            });
            if (!res.ok) throw new Error('Archive operation failed.');
            fetchSuppliers();
            fetchAnalytics();
        } catch (err) {
            alert(err.message);
        }
    };

    const resetForm = () => {
        setName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setAddress('');
        setGstNumber('');
        setStatus('Active');
        setFormError('');
    };

    // Derived statistics calculations (KPI Cards)
    const totalSuppliersCount = suppliers.length;
    const activeSuppliersCount = suppliers.filter(s => s.status === 'Active').length;
    const pendingPurchaseOrders = analytics?.spendByMonth?.reduce((sum, item) => sum + (item.orderCount || 0), 0) || 0; // fallback summary pending count
    const completedPurchaseOrdersCount = suppliers.reduce((sum, s) => sum + (s.performanceMetrics?.completedOrders || 0), 0);
    const totalPurchaseValueSum = suppliers.reduce((sum, s) => sum + (s.performanceMetrics?.totalPurchaseValue || 0), 0);
    const averageRating = suppliers.length > 0 ? (suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(1) : '0.0';

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                        Procurement & Vendor relations
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none font-serif">
                        Supplier <span className="text-cyan-400">Management</span>
                    </h2>
                    <p className="text-xs text-slate-300">
                        Maintain suppliers directory, track order stats, evaluate vendor health scores, and configure catalog mappings.
                    </p>
                </div>
                {user?.role === 'Admin' && (
                    <button 
                        onClick={() => { resetForm(); setIsCreateOpen(true); }}
                        className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-900 text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/20 transition-all flex items-center gap-1.5 self-start md:self-auto"
                    >
                        <span className="material-symbols-rounded text-sm font-black">add_circle</span>
                        <span>Register Supplier</span>
                    </button>
                )}
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Suppliers', val: totalSuppliersCount, icon: 'groups', col: 'text-white' },
                    { label: 'Active Suppliers', val: activeSuppliersCount, icon: 'verified', col: 'text-emerald-400' },
                    { label: 'Completed Orders', val: completedPurchaseOrdersCount, icon: 'task_alt', col: 'text-cyan-400' },
                    { label: 'Pending PO Runs', val: suppliers.reduce((sum, s) => sum + (s.performanceMetrics?.pendingOrders || 0), 0), icon: 'hourglass_empty', col: 'text-amber-400' },
                    { label: 'Total Purchases', val: `₹${(totalPurchaseValueSum / 1000).toFixed(1)}k`, icon: 'payments', col: 'text-purple-400 font-mono' },
                    { label: 'Average Rating', val: `${averageRating} ★`, icon: 'grade', col: 'text-yellow-400' },
                ].map((k, i) => (
                    <div key={i} className="rounded-xl glass border border-white/5 p-4 flex flex-col gap-1 relative overflow-hidden card-shine">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider">{k.label}</span>
                            <span className="material-symbols-rounded text-base">{k.icon}</span>
                        </div>
                        <span className={`text-2xl font-black mt-1 leading-none ${k.col}`}>{k.val}</span>
                    </div>
                ))}
            </div>

            {/* Search, Filter & Table */}
            <div className="rounded-xl glass border border-white/5 p-5 flex flex-col gap-4">
                
                {/* Controls Bar */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-white/5 pb-4">
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-1.5">
                        {['All', 'Active', 'Inactive', 'Top Rated', 'Recently Added'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    activeFilter === f
                                        ? 'bg-cyan-400 text-slate-900 shadow-md shadow-cyan-400/10'
                                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md w-full md:w-72">
                        <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Search name, contact, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400/40"
                        />
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                            <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                            <span className="text-xs">Fetching active supplier catalog...</span>
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                            <span className="material-symbols-rounded text-4xl">hail</span>
                            <span className="text-xs font-medium">No suppliers match your search or filter configuration.</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="pb-3 pl-2">Supplier</th>
                                    <th className="pb-3">Contact Person</th>
                                    <th className="pb-3">Phone</th>
                                    <th className="pb-3">Email</th>
                                    <th className="pb-3 text-center">Health Rating</th>
                                    <th className="pb-3 text-center">Status</th>
                                    <th className="pb-3 pr-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map((sup) => {
                                    // Health Score Color
                                    let healthCol = 'text-emerald-400 bg-emerald-500/10';
                                    let healthIndicator = '🟢 Excellent';
                                    if (sup.healthScore < 50) {
                                        healthCol = 'text-red-400 bg-red-500/10';
                                        healthIndicator = '🔴 Poor';
                                    } else if (sup.healthScore < 80) {
                                        healthCol = 'text-amber-400 bg-amber-500/10';
                                        healthIndicator = '🟡 Average';
                                    }

                                    return (
                                        <tr key={sup._id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all group">
                                            <td className="py-3.5 pl-2">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                                                        {sup.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide font-mono">
                                                        GST: {sup.gstNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 text-xs text-slate-200">{sup.contactPerson}</td>
                                            <td className="py-3.5 text-xs text-slate-300 font-mono">{sup.phone}</td>
                                            <td className="py-3.5 text-xs text-slate-300">{sup.email}</td>
                                            <td className="py-3.5 text-center">
                                                <div className="inline-flex flex-col items-center gap-0.5">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${healthCol}`}>
                                                        {sup.healthScore} ({healthIndicator})
                                                    </span>
                                                    <span className="text-[11px] text-yellow-400">{sup.rating.toFixed(1)} ★</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 text-center">
                                                <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                                                    sup.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                                                }`}>
                                                    {sup.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 pr-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => navigate(`/suppliers/${sup._id}`)}
                                                        className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-[11px] font-bold text-white transition-colors cursor-pointer"
                                                    >
                                                        Profile
                                                    </button>
                                                    {user?.role === 'Admin' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEditClick(sup)}
                                                                className="p-1 rounded bg-[#00c2cc]/10 hover:bg-[#00c2cc]/20 text-[#00c2cc] cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <span className="material-symbols-rounded text-sm">edit</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleToggleStatus(sup)}
                                                                className={`p-1 rounded cursor-pointer ${
                                                                    sup.status === 'Active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                                }`}
                                                                title={sup.status === 'Active' ? 'Disable' : 'Enable'}
                                                            >
                                                                <span className="material-symbols-rounded text-sm">
                                                                    {sup.status === 'Active' ? 'block' : 'check_circle'}
                                                                </span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleArchiveSupplier(sup)}
                                                                className="p-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 cursor-pointer"
                                                                title="Archive"
                                                            >
                                                                <span className="material-symbols-rounded text-sm">archive</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Analytics Dashboard (Admin / Manager only) */}
            {['Admin', 'Manager'].includes(user?.role) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Spend Monthly & Spend Supplier */}
                    <div className="lg:col-span-8 rounded-xl glass border border-white/5 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="text-base font-bold text-white font-serif">Purchase Spend Analytics</h3>
                            <span className="text-[11px] text-slate-400 uppercase font-mono">Delivered Orders</span>
                        </div>
                        
                        {analyticsLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <span className="material-symbols-rounded animate-spin text-2xl text-cyan-400">sync</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Spend Monthly (Bar representation) */}
                                <div className="flex flex-col gap-4">
                                    <span className="text-xs font-semibold text-slate-300">Spend History (Last 6 Months)</span>
                                    <div className="h-48 flex items-end gap-3 justify-between border-b border-white/10 pb-2">
                                        {analytics?.spendByMonth?.length === 0 ? (
                                            <span className="text-xs text-slate-500 self-center w-full text-center">No spend logs available.</span>
                                        ) : (
                                            analytics?.spendByMonth?.map((item, idx) => {
                                                const maxSpend = Math.max(...analytics.spendByMonth.map(m => m.totalSpend), 1);
                                                const heightPct = (item.totalSpend / maxSpend) * 80 + 10;
                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                                                        {/* Tooltip */}
                                                        <span className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-slate-900 text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded border border-white/10 transition-all z-10 whitespace-nowrap">
                                                            ₹{item.totalSpend.toLocaleString()}
                                                        </span>
                                                        <div 
                                                            style={{ height: `${heightPct}%` }}
                                                            className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-[#00c2cc] group-hover:opacity-80 transition-all shadow-lg shadow-cyan-400/5"
                                                        />
                                                        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                                                            {item._id}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Spend By Supplier (Distribution rows) */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-xs font-semibold text-slate-300">Spend by Supplier (Top Vendors)</span>
                                    <div className="flex flex-col gap-2.5">
                                        {analytics?.spendBySupplier?.length === 0 ? (
                                            <span className="text-xs text-slate-500">No spend records found.</span>
                                        ) : (
                                            analytics?.spendBySupplier?.slice(0, 4).map((sup, idx) => {
                                                const totalSum = analytics.spendBySupplier.reduce((sum, s) => sum + s.totalSpend, 1);
                                                const pct = Math.round((sup.totalSpend / totalSum) * 100);
                                                return (
                                                    <div key={idx} className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-300 font-medium">{sup.name}</span>
                                                            <span className="text-slate-400 font-mono">₹{sup.totalSpend.toLocaleString()} ({pct}%)</span>
                                                        </div>
                                                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                            <div style={{ width: `${pct}%` }} className="h-full bg-cyan-400 rounded-full" />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Right: Most Purchased & Top Suppliers */}
                    <div className="lg:col-span-4 rounded-xl glass border border-white/5 p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="material-symbols-rounded text-cyan-400 text-base">grade</span>
                            <h3 className="text-base font-bold text-white font-serif">Most Purchased Items</h3>
                        </div>

                        {analyticsLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <span className="material-symbols-rounded animate-spin text-2xl text-cyan-400">sync</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3.5">
                                {analytics?.mostPurchased?.length === 0 ? (
                                    <span className="text-xs text-slate-500">No replenishment deliveries completed yet.</span>
                                ) : (
                                    analytics?.mostPurchased?.map((med, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/[0.01] border border-white/5">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-semibold text-white truncate">{med.name}</span>
                                                <span className="text-[11px] text-slate-400 mt-0.5">Quantity: <strong className="text-slate-300 font-mono">{med.totalQuantity} units</strong></span>
                                            </div>
                                            <span className="text-xs font-bold text-cyan-400 font-mono">₹{med.totalSpend.toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Create Supplier Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-lg rounded-2xl p-6 glass-elevated border border-white/10 shadow-2xl relative animate-slide-up">
                        
                        <button 
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">register</span>
                            <h3 className="text-lg font-bold text-white font-serif">Register New Supplier Branch</h3>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Supplier Name</label>
                                    <input 
                                        type="text" required placeholder="E.g., Cipla Distributors"
                                        value={name} onChange={(e) => setName(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Contact Person</label>
                                    <input 
                                        type="text" required placeholder="Full Name"
                                        value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Phone Number</label>
                                    <input 
                                        type="text" required placeholder="E.g., +91 99887 76655"
                                        value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Email Address</label>
                                    <input 
                                        type="email" required placeholder="Email"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">GST Registration No.</label>
                                    <input 
                                        type="text" required placeholder="15-digit GSTIN"
                                        value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Status</label>
                                    <input 
                                        type="text" readOnly value="Active"
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Office Address</label>
                                <textarea 
                                    required rows="3" placeholder="Full Postal Address"
                                    value={address} onChange={(e) => setAddress(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button" onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-black cursor-pointer shadow-lg transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Registering...' : 'Register'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Supplier Modal */}
            {isEditOpen && selectedSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-lg rounded-2xl p-6 glass-elevated border border-white/10 shadow-2xl relative animate-slide-up">
                        
                        <button 
                            onClick={() => { setIsEditOpen(false); setSelectedSupplier(null); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">edit</span>
                            <h3 className="text-lg font-bold text-white font-serif">Modify Supplier Records</h3>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Supplier Name</label>
                                    <input 
                                        type="text" required
                                        value={name} onChange={(e) => setName(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Contact Person</label>
                                    <input 
                                        type="text" required
                                        value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Phone Number</label>
                                    <input 
                                        type="text" required
                                        value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Email Address</label>
                                    <input 
                                        type="email" required
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">GST Registration No.</label>
                                    <input 
                                        type="text" required
                                        value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Status</label>
                                    <select 
                                        value={status} onChange={(e) => setStatus(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Office Address</label>
                                <textarea 
                                    required rows="3"
                                    value={address} onChange={(e) => setAddress(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button" onClick={() => { setIsEditOpen(false); setSelectedSupplier(null); }}
                                    className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-black cursor-pointer shadow-lg transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
