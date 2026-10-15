import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Suppliers() {
    const { user, activeBranch } = useAuth();
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

    // Low stock procurement states
    const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'procurement'
    const [lowStockMeds, setLowStockMeds] = useState([]);
    const [medsLoading, setMedsLoading] = useState(false);
    const [poModalMed, setPoModalMed] = useState(null);
    const [poModalQty, setPoModalQty] = useState(100);
    const [poModalSupplierId, setPoModalSupplierId] = useState('');
    const [poSubmitting, setPoSubmitting] = useState(false);

    const fetchLowStockMeds = async () => {
        setMedsLoading(true);
        try {
            const url = activeBranch?.id ? `/api/medicines?branchId=${activeBranch.id}` : '/api/medicines';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const filtered = data.filter(m => m.stock <= (m.reorderPoint !== undefined ? m.reorderPoint : 20));
                setLowStockMeds(filtered);
            }
        } catch (err) {
            console.error('Error fetching low stock meds:', err);
        } finally {
            setMedsLoading(false);
        }
    };

    const handleOpenPoModal = (med) => {
        const reorderLimit = med.reorderPoint !== undefined ? med.reorderPoint : 20;
        const suggestedQty = reorderLimit * 2 - med.stock;
        setPoModalMed(med);
        setPoModalQty(suggestedQty > 0 ? suggestedQty : 100);
        setPoModalSupplierId(med.primarySupplier?._id || med.primarySupplier || '');
    };

    const handleConfirmPO = async (e) => {
        e.preventDefault();
        if (!poModalMed) return;
        if (!poModalSupplierId) {
            alert('Please select a supplier to generate the order.');
            return;
        }

        setPoSubmitting(true);
        try {
            const url = activeBranch?.id ? `/api/reorders/generate-po?branchId=${activeBranch.id}` : '/api/reorders/generate-po';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicineId: poModalMed._id,
                    quantityNeeded: Number(poModalQty),
                    supplierId: poModalSupplierId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to generate supplier order.');
            }

            alert(`Draft Supplier Order successfully generated for ${poModalMed.name}!`);
            setPoModalMed(null);
            fetchLowStockMeds();
        } catch (err) {
            alert(err.message);
        } finally {
            setPoSubmitting(false);
        }
    };

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
            if (activeBranch?.id) {
                params.push(`branchId=${activeBranch.id}`);
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
            const url = activeBranch?.id ? `/api/suppliers-analytics?branchId=${activeBranch.id}` : '/api/suppliers-analytics';
            const res = await fetch(url);
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
    }, [activeFilter, searchQuery, activeBranch]);

    useEffect(() => {
        fetchAnalytics();
    }, [user, activeBranch]);

    useEffect(() => {
        if (activeTab === 'procurement') {
            fetchLowStockMeds();
        }
    }, [activeBranch, activeTab]);

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
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Procurement & Vendor relations
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none font-serif">
                        Supplier <span className="text-cyan-400">Management</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Maintain suppliers directory, track order stats, evaluate vendor health scores, and configure catalog mappings.
                    </p>
                </div>
                {user?.role === 'Admin' && (
                    <button 
                        onClick={() => { resetForm(); setIsCreateOpen(true); }}
                        className="px-5 py-2.5 rounded-xl bg-cyan-400 text-[var(--text-primary)] text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/20 transition-all flex items-center gap-1.5 self-start md:self-auto"
                    >
                        <span className="material-symbols-rounded text-sm font-black">add_circle</span>
                        <span>Register Supplier</span>
                    </button>
                )}
            </div>

            {/* Command Tabs */}
            <div className="flex border-b border-[var(--card-border)] pb-2 mt-2 gap-6">
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`pb-2 text-sm font-bold transition-all cursor-pointer border-b-2 ${
                        activeTab === 'directory' ? 'border-cyan-400 text-cyan-400 font-extrabold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    Supplier Directory
                </button>
                <button
                    onClick={() => {
                        setActiveTab('procurement');
                        fetchLowStockMeds();
                    }}
                    className={`pb-2 text-sm font-bold transition-all cursor-pointer border-b-2 ${
                        activeTab === 'procurement' ? 'border-cyan-400 text-cyan-400 font-extrabold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    Low Stock Procurement Workflow
                </button>
            </div>

            {activeTab === 'directory' && (
                <>
                    {/* Recommended Supplier for Reordering */}
                    {(() => {
                        const activeSuppliers = suppliers.filter(s => s.status === 'Active');
                        const recommendedSupplier = activeSuppliers.length > 0 
                            ? activeSuppliers.reduce((best, curr) => (curr.healthScore > best.healthScore ? curr : best), activeSuppliers[0])
                            : null;

                        if (!recommendedSupplier) return null;

                        return (
                            <div className="rounded-2xl p-5 border border-emerald-500/25 bg-emerald-500/[0.02] backdrop-blur-md premium-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 70%)', filter: 'blur(15px)' }} />
                                <div className="flex gap-4 items-start z-10">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                                        <span className="material-symbols-rounded text-2xl">verified</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Recommended Supplier for Reordering</span>
                                        <h3 className="text-xl font-black text-[var(--text-primary)] font-serif tracking-tight leading-tight">{recommendedSupplier.name}</h3>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            Chosen based on high reliability score ({recommendedSupplier.healthScore}%), fast average delivery ({recommendedSupplier.performanceMetrics?.averageDeliveryTime}d), and optimal order completion history.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/reorder-intelligence')}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-[var(--text-primary)] text-xs font-black hover:bg-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5 z-10 flex-shrink-0 self-end md:self-auto"
                                >
                                    <span className="material-symbols-rounded text-sm font-black">shopping_cart</span>
                                    <span>Reorder Stock Now</span>
                                </button>
                            </div>
                        );
                    })()}

                    {/* KPI Section */}
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Total Suppliers', val: totalSuppliersCount, icon: 'groups', col: 'text-[var(--text-primary)]' },
                            { label: 'Active Suppliers', val: activeSuppliersCount, icon: 'verified', col: 'text-emerald-400' },
                            { label: 'Completed Orders', val: completedPurchaseOrdersCount, icon: 'task_alt', col: 'text-cyan-400' },
                            { label: 'Pending Orders', val: suppliers.reduce((sum, s) => sum + (s.performanceMetrics?.pendingOrders || 0), 0), icon: 'hourglass_empty', col: 'text-amber-400' },
                            { label: 'Total Purchases', val: `₹${(totalPurchaseValueSum / 1000).toFixed(1)}k`, icon: 'payments', col: 'text-purple-400 font-mono' },
                            { label: 'Average Rating', val: `${averageRating} ★`, icon: 'grade', col: 'text-yellow-400' },
                        ].map((k, i) => (
                            <div key={i} className="rounded-xl premium-card border border-[var(--card-border)] p-4 flex flex-col gap-1 relative overflow-hidden card-shine">
                                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">{k.label}</span>
                                    <span className="material-symbols-rounded text-base">{k.icon}</span>
                                </div>
                                <span className={`text-2xl font-black mt-1 leading-none ${k.col}`}>{k.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Search, Filter & Table */}
                    <div className="rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                        
                        {/* Controls Bar */}
                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-[var(--card-border)] pb-4">
                            
                            {/* Filters */}
                            <div className="flex flex-wrap gap-1.5">
                                {['All', 'Active', 'Inactive', 'Top Rated', 'Recently Added'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeFilter === f
                                                ? 'bg-cyan-400 text-[var(--text-primary)] shadow-md shadow-cyan-400/10'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--card-bg)]/10'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative max-w-md w-full md:w-72">
                                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">
                                    search
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search name, contact, email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-cyan-400/40"
                                />
                            </div>
                        </div>

                        {/* Table Container */}
                        <div className="overflow-x-auto w-full scrollable">
                            {loading ? (
                                <div className="flex flex-col gap-2 p-4 relative overflow-hidden min-w-[850px]">
                                    <div className="absolute inset-0 animate-shimmer" />
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <div key={idx} className="grid items-center py-4 border-b border-[var(--card-border)]"
                                            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 1fr', gap: '16px' }}>
                                            <div className="w-40 h-4 rounded bg-[var(--bg-secondary)]" />
                                            <div className="w-16 h-4 rounded bg-[var(--bg-secondary)] mx-auto" />
                                            <div className="w-16 h-4 rounded bg-[var(--bg-secondary)] mx-auto" />
                                            <div className="w-16 h-4 rounded bg-[var(--bg-secondary)] mx-auto" />
                                            <div className="w-16 h-4 rounded bg-[var(--bg-secondary)] mx-auto" />
                                            <div className="w-36 h-4 rounded bg-[var(--bg-secondary)]" />
                                            <div className="w-12 h-6 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                        </div>
                                    ))}
                                </div>
                            ) : suppliers.length === 0 ? (
                                (searchQuery || activeFilter !== 'All') ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center min-w-[850px]">
                                        <span className="material-symbols-rounded text-4xl text-amber-500 opacity-60">search_off</span>
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">No matching suppliers</h4>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
                                                No suppliers match your search or filter configuration. Try adjusting your query or filters.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                                            className="px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-[var(--text-primary)] border border-[var(--card-border)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mt-1"
                                        >
                                            <span className="material-symbols-rounded text-sm">clear_all</span>
                                            <span>Clear Search & Filters</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center min-w-[850px]">
                                        <span className="material-symbols-rounded text-4xl text-cyan-400 opacity-60">hail</span>
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">No suppliers registered yet</h4>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
                                                No suppliers registered yet. Register your suppliers to map medicines and manage orders.
                                            </p>
                                        </div>
                                        {user?.role === 'Admin' && (
                                            <button
                                                onClick={() => { resetForm(); setIsCreateOpen(true); }}
                                                className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-extrabold hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 transition-all flex items-center gap-1.5 mt-1"
                                            >
                                                <span className="material-symbols-rounded text-sm">add_circle</span>
                                                <span>Register Supplier</span>
                                            </button>
                                        )}
                                    </div>
                                )
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[850px]">
                                    <thead>
                                        <tr className="border-b border-[var(--card-border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                            <th className="pb-3 pl-2">Supplier</th>
                                            <th className="pb-3 text-center">Reliability Score</th>
                                            <th className="pb-3 text-center">Avg Delivery Time</th>
                                            <th className="pb-3 text-center">Delayed Orders</th>
                                            <th className="pb-3 text-center">Total Orders</th>
                                            <th className="pb-3">Top Supplied Medicines</th>
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
                                                <tr key={sup._id} className="border-b border-[var(--card-border)] hover:bg-[var(--bg-secondary)] transition-all group">
                                                    <td className="py-3.5 pl-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                                                                {sup.name}
                                                            </span>
                                                            <span className="text-xs text-[var(--text-secondary)] mt-0.5 uppercase tracking-wide font-mono">
                                                                GST: {sup.gstNumber}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 text-center">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${healthCol}`}>
                                                            {sup.healthScore}% ({healthIndicator})
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 text-center text-xs font-mono text-[var(--text-secondary)]">
                                                        {sup.performanceMetrics?.averageDeliveryTime || 0} days
                                                    </td>
                                                    <td className="py-3.5 text-center text-xs font-mono font-bold text-red-400">
                                                        {sup.performanceMetrics?.delayedOrders || 0} orders
                                                    </td>
                                                    <td className="py-3.5 text-center text-xs font-mono text-[var(--text-secondary)]">
                                                        {sup.performanceMetrics?.totalOrders || 0}
                                                    </td>
                                                    <td className="py-3.5 text-xs text-[var(--text-secondary)]">
                                                        <div className="flex flex-wrap gap-1">
                                                            {sup.mostSuppliedMedicines && sup.mostSuppliedMedicines.length > 0 ? (
                                                                sup.mostSuppliedMedicines.map((m, idx) => (
                                                                    <span key={idx} className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-secondary)]">
                                                                        {m}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-[var(--text-secondary)]">None</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 pr-2 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button 
                                                                onClick={() => navigate(`/suppliers/${sup._id}`)}
                                                                className="px-2.5 py-1.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                                                            >
                                                                Profile
                                                            </button>
                                                            {user?.role === 'Admin' && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleEditClick(sup)}
                                                                        className="p-1 rounded bg-[#00B4D8]/10 hover:bg-[#00B4D8]/20 text-[#00B4D8] cursor-pointer"
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
                                                                        className="p-1 rounded bg-[var(--bg-secondary)]0/10 hover:bg-[var(--bg-secondary)]0/20 text-[var(--text-secondary)] cursor-pointer"
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
                </>
            )}



            {/* Create Supplier Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-lg rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative animate-slide-up">
                        
                        <button 
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">register</span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Register New Supplier Branch</h3>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Supplier Name</label>
                                    <input 
                                        type="text" required placeholder="E.g., Cipla Distributors"
                                        value={name} onChange={(e) => setName(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Person</label>
                                    <input 
                                        type="text" required placeholder="Full Name"
                                        value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Phone Number</label>
                                    <input 
                                        type="text" required placeholder="E.g., +91 99887 76655"
                                        value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Email Address</label>
                                    <input 
                                        type="email" required placeholder="Email"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">GST Registration No.</label>
                                    <input 
                                        type="text" required placeholder="15-digit GSTIN"
                                        value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Status</label>
                                    <input 
                                        type="text" readOnly value="Active"
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)]/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Office Address</label>
                                <textarea 
                                    required rows="3" placeholder="Full Postal Address"
                                    value={address} onChange={(e) => setAddress(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button" onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-secondary)] border border-[var(--card-border)] cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[var(--text-primary)] text-xs font-black cursor-pointer shadow-lg transition-all disabled:opacity-50"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-lg rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative animate-slide-up">
                        
                        <button 
                            onClick={() => { setIsEditOpen(false); setSelectedSupplier(null); }}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-5">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">edit</span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Modify Supplier Records</h3>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Supplier Name</label>
                                    <input 
                                        type="text" required
                                        value={name} onChange={(e) => setName(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Person</label>
                                    <input 
                                        type="text" required
                                        value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Phone Number</label>
                                    <input 
                                        type="text" required
                                        value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Email Address</label>
                                    <input 
                                        type="email" required
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">GST Registration No.</label>
                                    <input 
                                        type="text" required
                                        value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Status</label>
                                    <select 
                                        value={status} onChange={(e) => setStatus(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Office Address</label>
                                <textarea 
                                    required rows="3"
                                    value={address} onChange={(e) => setAddress(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button" onClick={() => { setIsEditOpen(false); setSelectedSupplier(null); }}
                                    className="flex-1 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-secondary)] border border-[var(--card-border)] cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[var(--text-primary)] text-xs font-black cursor-pointer shadow-lg transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Low Stock Procurement Workflow Tab View */}
            {activeTab === 'procurement' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                    <div className="rounded-2xl p-5 border border-amber-500/25 bg-amber-500/[0.02] backdrop-blur-md premium-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', filter: 'blur(15px)' }} />
                        <div className="flex gap-4 items-start z-10">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                                <span className="material-symbols-rounded text-2xl">shopping_cart</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Low Stock Procurement Workflow</span>
                                <h3 className="text-xl font-black text-[var(--text-primary)] font-serif tracking-tight leading-tight">Safety Limit Replenishment</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    The following medicines are below configured safety levels. Place orders immediately with recommended high-performance vendors.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                        <div className="overflow-x-auto">
                            {medsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-secondary)]">
                                    <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                                    <span className="text-xs">Analyzing low stock runouts...</span>
                                </div>
                            ) : lowStockMeds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-secondary)] text-center">
                                    <span className="material-symbols-rounded text-4xl text-emerald-400">verified</span>
                                    <span className="text-xs font-medium">All medicines are above reorder safety limits. No procurement required.</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--card-border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                            <th className="pb-3 pl-2">Medicine Detail</th>
                                            <th className="pb-3 text-center">Current Stock / Margin</th>
                                            <th className="pb-3">Recommended Supplier & Metrics</th>
                                            <th className="pb-3 pr-2 text-right">Execute Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockMeds.map(med => {
                                            const primarySupId = med.primarySupplier?._id || med.primarySupplier;
                                            const recommendedVendor = suppliers.find(s => String(s._id) === String(primarySupId));
                                            const reorderLimit = med.reorderPoint !== undefined ? med.reorderPoint : 20;

                                            return (
                                                <tr key={med._id} className="border-b border-[var(--card-border)] hover:bg-[var(--bg-secondary)] transition-all group">
                                                    <td className="py-3.5 pl-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                                                                {med.name}
                                                            </span>
                                                            <span className="text-xs text-[var(--text-secondary)] mt-0.5 uppercase tracking-wide font-mono">
                                                                NDC: {med.ndc} · {med.category}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-mono text-red-400 font-bold">
                                                                {med.stock} units
                                                            </span>
                                                            <span className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                                                                Reorder Limit: {reorderLimit}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 font-medium">
                                                        {recommendedVendor ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs font-bold text-slate-700">
                                                                    {recommendedVendor.name}
                                                                </span>
                                                                <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] mt-0.5 flex-wrap">
                                                                    <span className="text-emerald-400 font-bold">
                                                                        Reliability: {recommendedVendor.healthScore}%
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>
                                                                        Avg Delivery: {recommendedVendor.performanceMetrics?.averageDeliveryTime || 0}d
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>
                                                                        Order Success: {recommendedVendor.performanceMetrics?.totalOrders 
                                                                            ? ((recommendedVendor.performanceMetrics.completedOrders / recommendedVendor.performanceMetrics.totalOrders) * 100).toFixed(0)
                                                                            : 100}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-[var(--text-secondary)] italic">
                                                                No recommended vendor configured for this item.
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 pr-2 text-right">
                                                        <button 
                                                            onClick={() => handleOpenPoModal(med)}
                                                            className="px-3.5 py-1.5 rounded-lg bg-cyan-400 text-[var(--text-primary)] text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg transition-all"
                                                        >
                                                            Draft Order
                                                        </button>
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
            )}

            {/* Draft Supplier Order Modal */}
            {poModalMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-md rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative">
                        <button 
                            onClick={() => setPoModalMed(null)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer font-bold"
                        >
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-cyan-400 font-variation-fill">shopping_cart</span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Command Supplier Order</h3>
                        </div>

                        <form onSubmit={handleConfirmPO} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Medicine</label>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={poModalMed.name} 
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)]/60 outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-mono">Order Quantity</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1"
                                    value={poModalQty} 
                                    onChange={(e) => setPoModalQty(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50 font-mono font-bold"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Select Supplier</label>
                                <select
                                    required
                                    value={poModalSupplierId}
                                    onChange={(e) => setPoModalSupplierId(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                >
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => {
                                        const successRate = s.performanceMetrics?.totalOrders 
                                            ? ((s.performanceMetrics.completedOrders / s.performanceMetrics.totalOrders) * 100).toFixed(0)
                                            : 100;
                                        return (
                                            <option key={s._id} value={s._id}>
                                                {s.name} (Reliability: {s.healthScore}%, Avg Delivery: {s.performanceMetrics?.averageDeliveryTime}d, Success: {successRate}%)
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button"
                                    onClick={() => setPoModalMed(null)}
                                    className="flex-1 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-secondary)] border border-[var(--card-border)] cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={poSubmitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[var(--text-primary)] text-xs font-black cursor-pointer shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    {poSubmitting ? 'Creating Order...' : 'Confirm & Create Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
