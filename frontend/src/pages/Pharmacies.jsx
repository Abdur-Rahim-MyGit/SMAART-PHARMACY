import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Pharmacies() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data states
    const [pharmacies, setPharmacies] = useState([]);
    const [managers, setManagers] = useState([]);
    const [kpis, setKpis] = useState({
        totalPharmacies: 0,
        activeBranches: 0,
        inactiveBranches: 0,
        totalStaff: 0,
        totalInventoryValue: 0,
        averageBranchHealthScore: 100
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('All'); // 'All', 'Active', 'Inactive'
    const [sortBy, setSortBy] = useState('Name'); // 'Name', 'Highest Health', 'Lowest Health', 'Recently Added'

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);

    // Form inputs
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [coordinator, setCoordinator] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [gstin, setGstin] = useState('');
    const [drugLicence, setDrugLicence] = useState('');
    const [email, setEmail] = useState('');
    const [openingHours, setOpeningHours] = useState('9:00 AM - 10:00 PM');
    const [status, setStatus] = useState('Active');
    const [assignedManager, setAssignedManager] = useState('');
    const [branchCode, setBranchCode] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/pharmacies');
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('Access Denied: Only system administrators can view this page.');
                }
                throw new Error('Failed to load pharmacy data.');
            }
            const data = await res.json();
            setPharmacies(data.pharmacies || []);
            setKpis(data.kpis || {
                totalPharmacies: 0,
                activeBranches: 0,
                inactiveBranches: 0,
                totalStaff: 0,
                totalInventoryValue: 0,
                averageBranchHealthScore: 100
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchManagers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                const managerUsers = (data.users || []).filter(u => u.role === 'Manager' && u.status === 'Active');
                setManagers(managerUsers);
            }
        } catch (err) {
            console.error('Failed to load manager list:', err);
        }
    };

    useEffect(() => {
        if (user) {
            if (user.role !== 'Admin') {
                // Non-admins are redirected directly to their assigned branch details page
                navigate(`/pharmacies/${user?.pharmacy?.id || ''}`);
            } else {
                fetchData();
                fetchManagers();
            }
        }
    }, [user, navigate]);

    // Handle Create Submission
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!name.trim()) {
            setFormError('Pharmacy name is required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/pharmacies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    address, 
                    coordinator, 
                    contactPhone, 
                    gstin, 
                    drugLicence, 
                    email, 
                    openingHours, 
                    status,
                    assignedManager: assignedManager || undefined,
                    branchCode: branchCode.trim() || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to create pharmacy branch.');
            }
            setIsCreateOpen(false);
            resetForm();
            fetchData();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Edit Submission
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!name.trim()) {
            setFormError('Pharmacy name is required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/pharmacies/${selectedPharmacy._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    address, 
                    coordinator, 
                    contactPhone, 
                    gstin, 
                    drugLicence, 
                    email, 
                    openingHours, 
                    status,
                    assignedManager: assignedManager || null,
                    branchCode: branchCode.trim() || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to update pharmacy branch.');
            }
            setIsEditOpen(false);
            resetForm();
            fetchData();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Archive Action
    const handleArchive = async (id, pharmacyName) => {
        if (!window.confirm(`Are you sure you want to archive "${pharmacyName}"?`)) {
            return;
        }
        try {
            const res = await fetch(`/api/admin/pharmacies/${id}/archive`, {
                method: 'PUT'
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to archive pharmacy branch.');
            }
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const resetForm = () => {
        setName('');
        setAddress('');
        setCoordinator('');
        setContactPhone('');
        setGstin('');
        setDrugLicence('');
        setEmail('');
        setOpeningHours('9:00 AM - 10:00 PM');
        setStatus('Active');
        setAssignedManager('');
        setBranchCode('');
        setFormError('');
        setSelectedPharmacy(null);
    };

    const openEdit = (pharmacy) => {
        setSelectedPharmacy(pharmacy);
        setName(pharmacy.name);
        setAddress(pharmacy.address || '');
        setCoordinator(pharmacy.coordinator || '');
        setContactPhone(pharmacy.contactPhone || '');
        setGstin(pharmacy.gstin || '');
        setDrugLicence(pharmacy.drugLicence || '');
        setEmail(pharmacy.email || '');
        setOpeningHours(pharmacy.openingHours || '9:00 AM - 10:00 PM');
        setStatus(pharmacy.status || 'Active');
        setAssignedManager(pharmacy.assignedManager?._id || pharmacy.assignedManager || '');
        setBranchCode(pharmacy.branchCode || '');
        setIsEditOpen(true);
    };

    // Filtered & Sorted pharmacies list
    let processedPharmacies = pharmacies.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.coordinator && p.coordinator.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.gstin && p.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.branchCode && p.branchCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.drugLicence && p.drugLicence.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (filter === 'Active') return matchesSearch && p.status === 'Active';
        if (filter === 'Inactive') return matchesSearch && p.status === 'Inactive';
        return matchesSearch;
    });

    if (sortBy === 'Highest Health') {
        processedPharmacies.sort((a, b) => (b.healthScore || 100) - (a.healthScore || 100));
    } else if (sortBy === 'Lowest Health') {
        processedPharmacies.sort((a, b) => (a.healthScore || 100) - (b.healthScore || 100));
    } else if (sortBy === 'Recently Added') {
        processedPharmacies.sort((a, b) => new Date(b.joinedDate || 0) - new Date(a.joinedDate || 0));
    } else {
        processedPharmacies.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-[var(--text-secondary)]">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Fetching pharmacy registers…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-md mx-auto text-center">
                <span className="material-symbols-rounded text-5xl text-red-400">gavel</span>
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Access Violation</h3>
                    <p className="text-xs mt-1 text-[var(--text-secondary)]">{error}</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] cursor-pointer">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        System Administration
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none font-serif">
                        Pharmacy <span className="text-cyan-400">Branches</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Create, inspect, modify, and manage the active pharmacy branch nodes in your network.
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsCreateOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-950 hover:bg-cyan-300 animate-pulse-slow"
                    style={{
                        background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)',
                        boxShadow: '0 4px 24px rgba(0,194,204,0.2)'
                    }}
                >
                    <span className="material-symbols-rounded text-sm">add</span>
                    Create Branch
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Total branches */}
                <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400">
                        <span className="material-symbols-rounded text-xl">domain</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">{kpis.totalPharmacies}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Total Branches</span>
                    </div>
                </div>

                {/* Active branches */}
                <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                        <span className="material-symbols-rounded text-xl">check_circle</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-emerald-400 tracking-tight font-sans">{kpis.activeBranches}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Active</span>
                    </div>
                </div>

                {/* Inactive branches */}
                <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                        <span className="material-symbols-rounded text-xl">pause_circle</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-amber-500 tracking-tight font-sans">{kpis.inactiveBranches}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Inactive</span>
                    </div>
                </div>

                {/* Total staff */}
                <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-400">
                        <span className="material-symbols-rounded text-xl">badge</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-violet-400 tracking-tight font-sans">{kpis.totalStaff}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Total Staff</span>
                    </div>
                </div>

                {/* Total Inventory Value */}
                <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400">
                        <span className="material-symbols-rounded text-xl">payments</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
                            ₹{kpis.totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Total Inventory</span>
                    </div>
                </div>

                {/* Average Health Score */}
                <div className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden bg-[var(--card-bg)] backdrop-blur-md shadow-card border border-[var(--card-border)]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                        <span className="material-symbols-rounded text-xl">health_and_safety</span>
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-emerald-400 tracking-tight font-sans">
                            {kpis.averageBranchHealthScore || 100}%
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide mt-1 text-[var(--text-muted)]">Avg Health Score</span>
                    </div>
                </div>
            </div>

            {/* Search and Table Container */}
            <div className="rounded-3xl overflow-hidden bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--card-border)] shadow-elevated flex flex-col mt-4">
                {/* Search & Filters */}
                <div className="p-5 border-b border-[var(--card-border)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div className="flex items-center gap-3 w-full md:max-w-md">
                        <span className="material-symbols-rounded text-[var(--text-secondary)] text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, coordinator, GSTIN, code..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    
                    {/* Select Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase font-black text-[var(--text-secondary)]">Status:</span>
                            <select
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase font-black text-[var(--text-secondary)]">Sort By:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none cursor-pointer"
                            >
                                <option value="Name">Branch Name</option>
                                <option value="Highest Health">Highest Health</option>
                                <option value="Lowest Health">Lowest Health</option>
                                <option value="Recently Added">Recently Added</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Branch Health Profiles Grid */}
                {processedPharmacies.length === 0 ? (
                    <div className="p-16 text-center text-[var(--text-secondary)] font-semibold">
                        No pharmacy branches found matching filters.
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[var(--bg-secondary)]">
                        {processedPharmacies.map(p => {
                            const statusColor = p.status === 'Active' 
                                ? 'text-emerald-400 bg-emerald-500/10' 
                                : p.status === 'Inactive' 
                                ? 'text-amber-400 bg-amber-500/10' 
                                : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]0/10';

                            const healthColorText = (p.healthScore || 100) >= 90 
                                ? 'text-emerald-400' 
                                : (p.healthScore || 100) >= 75 
                                ? 'text-amber-400' 
                                : 'text-red-400';

                            // SVG Circle Calculations for gauge
                            const radius = 24;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - ((p.healthScore || 100) / 100) * circumference;

                            return (
                                <div key={p._id} className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] transition-all duration-200 p-5 flex flex-col gap-4 shadow-xl">
                                    
                                    {/* Card Top: Header & Action buttons */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-[var(--text-primary)] font-serif text-base font-bold truncate">{p.name}</h4>
                                                <span className="text-xs bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-mono">
                                                    {p.branchCode || 'NO-CODE'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            <span className="text-xs text-[var(--text-secondary)] mt-1 truncate">{p.address || 'No address logged'}</span>
                                            {(p.gstin || p.drugLicence) && (
                                                <span className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                                                    {p.gstin && `GST: ${p.gstin}`} {p.drugLicence && ` | DL: ${p.drugLicence}`}
                                                </span>
                                            )}
                                            <span className="text-xs text-[var(--text-secondary)] mt-1">
                                                Coordinator: <strong className="text-[var(--text-secondary)]">{p.coordinator || 'Unassigned'}</strong> · Manager: <strong className="text-[var(--text-secondary)]">{p.assignedManager?.fullName || 'Unassigned'}</strong>
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                onClick={() => navigate(`/pharmacies/${p._id}`)}
                                                className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/10 cursor-pointer transition-colors"
                                                title="View Branch Profile"
                                            >
                                                <span className="material-symbols-rounded text-sm">visibility</span>
                                            </button>
                                            <button
                                                onClick={() => openEdit(p)}
                                                className="p-2 rounded bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#00B4D8] hover:bg-[#00B4D8]/20 cursor-pointer transition-colors"
                                                title="Edit branch"
                                            >
                                                <span className="material-symbols-rounded text-sm">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleArchive(p._id, p.name)}
                                                className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors"
                                                title="Archive branch"
                                            >
                                                <span className="material-symbols-rounded text-sm">archive</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Mid: KPI metrics & circular health score */}
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center border-y border-[var(--card-border)] py-4">
                                        
                                        {/* Left Side: Circular Gauge */}
                                        <div className="sm:col-span-4 flex flex-col items-center gap-1.5 justify-center border-r border-[var(--card-border)] pr-2">
                                            <div className="relative flex items-center justify-center w-16 h-16">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="32" cy="32" r="24" className="stroke-white/5" strokeWidth="4.5" fill="transparent" />
                                                    <circle cx="32" cy="32" r="24" 
                                                            className={`stroke-current ${healthColorText}`} 
                                                            strokeWidth="4.5" 
                                                            fill="transparent"
                                                            strokeDasharray={circumference}
                                                            strokeDashoffset={strokeDashoffset}
                                                            strokeLinecap="round"
                                                    />
                                                </svg>
                                                <span className="absolute text-sm font-extrabold text-[var(--text-primary)] font-mono">{(p.healthScore || 100)}%</span>
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Branch Health</span>
                                        </div>

                                        {/* Right Side: Operational Counters */}
                                        <div className="sm:col-span-8 grid grid-cols-2 gap-3.5 pl-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400">
                                                    <span className="material-symbols-rounded text-base">warning</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Active Alerts</span>
                                                    <span className="text-sm font-black text-[var(--text-primary)] font-mono">{p.activeAlerts}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400">
                                                    <span className="material-symbols-rounded text-base">inventory_2</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Low Stock</span>
                                                    <span className="text-sm font-black text-[var(--text-primary)] font-mono">{p.lowStockCount}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400">
                                                    <span className="material-symbols-rounded text-base">event_busy</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Expiry Risks</span>
                                                    <span className="text-sm font-black text-[var(--text-primary)] font-mono">{p.expiryRisks}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-secondary)]0/10 text-[var(--text-secondary)]">
                                                    <span className="material-symbols-rounded text-base">money_off</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Dead Stock</span>
                                                    <span className="text-xs font-black text-slate-700 font-mono">
                                                        ₹{(p.deadStockRisk || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Bottom: What needs attention */}
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                                            <span className="material-symbols-rounded text-sm text-cyan-400">crisis_alert</span>
                                            <span>What needs attention?</span>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            {!p.attentionNeeded || p.attentionNeeded.length === 0 ? (
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs">
                                                    <span className="material-symbols-rounded text-sm">check_circle</span>
                                                    <span>Branch operating at optimal parameters. No issues requiring attention.</span>
                                                </div>
                                            ) : (
                                                p.attentionNeeded.map((item, idx) => (
                                                    <div key={idx} className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] border-l-2 border-l-amber-500/70 hover:bg-[var(--bg-secondary)] transition-all flex items-center justify-between gap-3 text-xs">
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <div className="flex items-center gap-1 text-[var(--text-primary)] font-bold text-xs">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                <span>{item.problem}</span>
                                                            </div>
                                                            <p className="text-[var(--text-secondary)] text-xs font-medium leading-relaxed truncate">{item.impact}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate(item.route)}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black tracking-tight cursor-pointer transition-all shadow-md shadow-cyan-400/5 hover:shadow-cyan-400/15 whitespace-nowrap self-center"
                                                        >
                                                            <span>Resolve</span>
                                                            <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Card Footer */}
                                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--card-border)] pt-2.5">
                                        <span>Joined: {p.joinedDate ? new Date(p.joinedDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                                        <span>Staff Scoped: {p.staffCount || 0} active</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Pharmacy Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative my-8">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Create Pharmacy Branch</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        {formError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Pharmacy Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter branch name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Branch Code</label>
                                    <input
                                        type="text"
                                        placeholder="(Auto Generated)"
                                        value={branchCode}
                                        onChange={e => setBranchCode(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Coordinator Name</label>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={coordinator}
                                        onChange={e => setCoordinator(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Address</label>
                                <input
                                    type="text"
                                    placeholder="Enter branch address"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Number</label>
                                    <input
                                        type="text"
                                        placeholder="Phone"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Branch Email</label>
                                    <input
                                        type="email"
                                        placeholder="branch@smaartpharmacy.in"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">GSTIN</label>
                                    <input
                                        type="text"
                                        placeholder="GSTIN"
                                        value={gstin}
                                        onChange={e => setGstin(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Drug Licence</label>
                                    <input
                                        type="text"
                                        placeholder="DL Number"
                                        value={drugLicence}
                                        onChange={e => setDrugLicence(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Assigned Manager</label>
                                    <select
                                        value={assignedManager}
                                        onChange={e => setAssignedManager(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="">Unassigned</option>
                                        {managers.map(m => (
                                            <option key={m._id} value={m._id}>{m.fullName} ({m.username})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Status</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Opening Hours</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 9:00 AM - 10:00 PM"
                                    value={openingHours}
                                    onChange={e => setOpeningHours(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Registering branch…' : 'Create Branch'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Pharmacy Modal */}
            {isEditOpen && selectedPharmacy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative my-8">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Edit Pharmacy Branch</h3>
                            <button onClick={() => setIsEditOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        {formError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleEditSubmit} className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Pharmacy Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Branch Code</label>
                                    <input
                                        type="text"
                                        value={branchCode}
                                        onChange={e => setBranchCode(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Coordinator Name</label>
                                    <input
                                        type="text"
                                        value={coordinator}
                                        onChange={e => setCoordinator(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Address</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Number</label>
                                    <input
                                        type="text"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Branch Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">GSTIN</label>
                                    <input
                                        type="text"
                                        value={gstin}
                                        onChange={e => setGstin(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Drug Licence</label>
                                    <input
                                        type="text"
                                        value={drugLicence}
                                        onChange={e => setDrugLicence(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Assigned Manager</label>
                                    <select
                                        value={assignedManager}
                                        onChange={e => setAssignedManager(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="">Unassigned</option>
                                        {managers.map(m => (
                                            <option key={m._id} value={m._id}>{m.fullName} ({m.username})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Status</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Opening Hours</label>
                                <input
                                    type="text"
                                    value={openingHours}
                                    onChange={e => setOpeningHours(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Saving changes…' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
