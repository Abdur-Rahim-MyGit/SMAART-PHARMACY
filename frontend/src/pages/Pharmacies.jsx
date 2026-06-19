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
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-slate-400">
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
                    <h3 className="text-lg font-bold text-white font-serif">Access Violation</h3>
                    <p className="text-xs mt-1 text-slate-400">{error}</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="px-5 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white cursor-pointer">
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                        System Administration
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none font-serif">
                        Pharmacy <span className="text-cyan-400">Branches</span>
                    </h2>
                    <p className="text-xs text-slate-300">
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
                        background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)',
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
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-400/[0.04] text-cyan-400">
                        <span className="material-symbols-rounded text-base">domain</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-white tracking-tight font-serif">{kpis.totalPharmacies}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Total Branches</span>
                    </div>
                </div>

                {/* Active branches */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-400/[0.04] text-emerald-400">
                        <span className="material-symbols-rounded text-base">check_circle</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-emerald-400 tracking-tight font-serif">{kpis.activeBranches}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Active</span>
                    </div>
                </div>

                {/* Inactive branches */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-400/[0.04] text-amber-400">
                        <span className="material-symbols-rounded text-base">pause_circle</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-amber-400 tracking-tight font-serif">{kpis.inactiveBranches}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Inactive</span>
                    </div>
                </div>

                {/* Total staff */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-400/[0.04] text-violet-400">
                        <span className="material-symbols-rounded text-base">badge</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-violet-400 tracking-tight font-serif">{kpis.totalStaff}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Total Staff</span>
                    </div>
                </div>

                {/* Total Inventory Value */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-400/[0.04] text-cyan-400">
                        <span className="material-symbols-rounded text-base">payments</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-white tracking-tight font-serif">
                            ₹{kpis.totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Total Inventory</span>
                    </div>
                </div>

                {/* Average Health Score */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden glass border border-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-400/[0.04] text-emerald-400">
                        <span className="material-symbols-rounded text-base">health_and_safety</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-emerald-400 tracking-tight font-serif">
                            {kpis.averageBranchHealthScore || 100}%
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide mt-0.5 text-slate-400">Avg Health Score</span>
                    </div>
                </div>
            </div>

            {/* Search and Table Container */}
            <div className="rounded-xl overflow-hidden glass border border-white/5 shadow-2xl flex flex-col">
                {/* Search & Filters */}
                <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div className="flex items-center gap-3 w-full md:max-w-md">
                        <span className="material-symbols-rounded text-slate-400 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, coordinator, GSTIN, code..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 font-medium"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    
                    {/* Select Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase font-black text-slate-400">Status:</span>
                            <select
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                            >
                                <option value="All" className="bg-[#0f1420]">All Statuses</option>
                                <option value="Active" className="bg-[#0f1420]">Active</option>
                                <option value="Inactive" className="bg-[#0f1420]">Inactive</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase font-black text-slate-400">Sort By:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                            >
                                <option value="Name" className="bg-[#0f1420]">Branch Name</option>
                                <option value="Highest Health" className="bg-[#0f1420]">Highest Health</option>
                                <option value="Lowest Health" className="bg-[#0f1420]">Lowest Health</option>
                                <option value="Recently Added" className="bg-[#0f1420]">Recently Added</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto scrollable">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                                <th className="p-4 pl-6">Branch Name / Code / Address</th>
                                <th className="p-4">Coordinator & Manager</th>
                                <th className="p-4 text-center">Staff Count</th>
                                <th className="p-4 text-center">Health Score</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4">Joined Date</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-xs font-semibold text-slate-300">
                            {processedPharmacies.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-slate-500">
                                        No pharmacy branches found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                processedPharmacies.map(p => {
                                    const statusColor = p.status === 'Active' 
                                        ? 'text-emerald-400 bg-emerald-500/10' 
                                        : p.status === 'Inactive' 
                                        ? 'text-amber-400 bg-amber-500/10' 
                                        : 'text-slate-400 bg-slate-500/10';

                                    const healthColor = (p.healthScore || 100) >= 90 
                                        ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/20' 
                                        : (p.healthScore || 100) >= 75 
                                        ? 'text-amber-400 bg-amber-500/5 border border-amber-500/20' 
                                        : 'text-red-400 bg-red-500/5 border border-red-500/20';

                                    return (
                                        <tr key={p._id} className="hover:bg-white/[0.01] transition-all">
                                            <td className="p-4 pl-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-serif text-sm font-bold">{p.name}</span>
                                                        <span className="text-[11px] bg-white/5 border border-white/10 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                                            {p.branchCode || 'NO-CODE'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">{p.address || 'No address logged'}</span>
                                                    {(p.gstin || p.drugLicence) && (
                                                        <span className="text-[11px] text-slate-400 mt-1 font-mono">
                                                            {p.gstin && `GST: ${p.gstin}`} {p.drugLicence && ` | DL: ${p.drugLicence}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-300 font-medium">
                                                <div className="flex flex-col">
                                                    <span className="text-white">{p.coordinator || 'No Coordinator'}</span>
                                                    <span className="text-[11px] text-slate-400 mt-0.5">
                                                        Manager: <span className="text-cyan-400">{p.assignedManager?.fullName || 'Unassigned'}</span>
                                                    </span>
                                                    {p.email && <span className="text-[11px] text-slate-500 mt-0.5 font-mono">{p.email}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-slate-400 font-mono">{p.staffCount}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${healthColor}`}>
                                                    {p.healthScore || 100}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase ${statusColor}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 font-mono text-[11px]">
                                                {p.joinedDate ? new Date(p.joinedDate).toLocaleDateString('en-GB') : 'N/A'}
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => navigate(`/pharmacies/${p._id}`)}
                                                        className="p-1.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                                                        title="View Branch Profile"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(p)}
                                                        className="p-1.5 rounded bg-[#00c2cc]/10 border border-[#00c2cc]/20 text-[#00c2cc] hover:bg-[#00c2cc]/20 cursor-pointer"
                                                        title="Edit branch"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleArchive(p._id, p.name)}
                                                        className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer"
                                                        title="Archive branch"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">archive</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Pharmacy Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden glass-elevated border border-white/[0.08] shadow-2xl p-6 relative my-8">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <h3 className="text-base font-bold text-white font-serif">Create Pharmacy Branch</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                                <label className="text-[11px] uppercase font-bold text-slate-400">Pharmacy Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter branch name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Branch Code</label>
                                    <input
                                        type="text"
                                        placeholder="(Auto Generated)"
                                        value={branchCode}
                                        onChange={e => setBranchCode(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Coordinator Name</label>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={coordinator}
                                        onChange={e => setCoordinator(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Address</label>
                                <input
                                    type="text"
                                    placeholder="Enter branch address"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Contact Number</label>
                                    <input
                                        type="text"
                                        placeholder="Phone"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Branch Email</label>
                                    <input
                                        type="email"
                                        placeholder="branch@smaartpharmacy.in"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">GSTIN</label>
                                    <input
                                        type="text"
                                        placeholder="GSTIN"
                                        value={gstin}
                                        onChange={e => setGstin(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Drug Licence</label>
                                    <input
                                        type="text"
                                        placeholder="DL Number"
                                        value={drugLicence}
                                        onChange={e => setDrugLicence(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Assigned Manager</label>
                                    <select
                                        value={assignedManager}
                                        onChange={e => setAssignedManager(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[#0f1420] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                    >
                                        <option value="">Unassigned</option>
                                        {managers.map(m => (
                                            <option key={m._id} value={m._id}>{m.fullName} ({m.username})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Status</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[#0f1420] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Opening Hours</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 9:00 AM - 10:00 PM"
                                    value={openingHours}
                                    onChange={e => setOpeningHours(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Registering branch…' : 'Create Branch'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Pharmacy Modal */}
            {isEditOpen && selectedPharmacy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden glass-elevated border border-white/[0.08] shadow-2xl p-6 relative my-8">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <h3 className="text-base font-bold text-white font-serif">Edit Pharmacy Branch</h3>
                            <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                                <label className="text-[11px] uppercase font-bold text-slate-400">Pharmacy Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Branch Code</label>
                                    <input
                                        type="text"
                                        value={branchCode}
                                        onChange={e => setBranchCode(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Coordinator Name</label>
                                    <input
                                        type="text"
                                        value={coordinator}
                                        onChange={e => setCoordinator(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Address</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Contact Number</label>
                                    <input
                                        type="text"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Branch Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">GSTIN</label>
                                    <input
                                        type="text"
                                        value={gstin}
                                        onChange={e => setGstin(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Drug Licence</label>
                                    <input
                                        type="text"
                                        value={drugLicence}
                                        onChange={e => setDrugLicence(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Assigned Manager</label>
                                    <select
                                        value={assignedManager}
                                        onChange={e => setAssignedManager(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[#0f1420] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                    >
                                        <option value="">Unassigned</option>
                                        {managers.map(m => (
                                            <option key={m._id} value={m._id}>{m.fullName} ({m.username})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] uppercase font-bold text-slate-400">Status</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[#0f1420] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Opening Hours</label>
                                <input
                                    type="text"
                                    value={openingHours}
                                    onChange={e => setOpeningHours(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)' }}
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
