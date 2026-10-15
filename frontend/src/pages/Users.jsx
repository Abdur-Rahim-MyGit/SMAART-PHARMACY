import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Users() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data states
    const [users, setUsers] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);
    const [kpis, setKpis] = useState({
        totalUsers: 0,
        activeUsers: 0,
        managers: 0,
        pharmacists: 0,
        inactiveUsers: 0,
        recentlyAddedUsers: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);
    
    const [selectedUser, setSelectedUser] = useState(null);

    // Form inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [qualification, setQualification] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [shiftType, setShiftType] = useState('Day');
    const [role, setRole] = useState('Pharmacist');
    const [pharmacyId, setPharmacyId] = useState('');
    const [status, setStatus] = useState('Active');
    
    const [newPassword, setNewPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch users list and user KPIs
            const usersRes = await fetch('/api/admin/users');
            if (!usersRes.ok) {
                if (usersRes.status === 403) {
                    throw new Error('Access Denied: Only system administrators can view this page.');
                }
                throw new Error('Failed to load user data.');
            }
            const usersData = await usersRes.json();
            setUsers(usersData.users || []);
            setKpis(usersData.kpis || {
                totalUsers: 0,
                activeUsers: 0,
                managers: 0,
                pharmacists: 0,
                inactiveUsers: 0,
                recentlyAddedUsers: 0
            });

            // Fetch branches for dropdown lists
            const pharmaciesRes = await fetch('/api/admin/pharmacies');
            if (pharmaciesRes.ok) {
                const pharmaciesData = await pharmaciesRes.json();
                setPharmacies(pharmaciesData.pharmacies || []);
            }
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
            fetchData();
        }
    }, [user, navigate]);

    // Handle Create User Submission
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!username.trim() || !password.trim() || !role || !pharmacyId) {
            setFormError('Username, password, role, and branch assignment are required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, fullName, phone, email, qualification, registrationNumber, shiftType, role, pharmacyId, status })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to create user account.');
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

    // Handle Edit User Submission
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!username.trim() || !role || !pharmacyId) {
            setFormError('Username, role, and branch assignment are required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, fullName, phone, email, qualification, registrationNumber, shiftType, role, pharmacyId, status })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to update user account.');
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

    // Handle Password Reset Submission
    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!newPassword.trim()) {
            setFormError('New password is required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser._id}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to reset password.');
            }
            setIsResetOpen(false);
            setNewPassword('');
            setSelectedUser(null);
            alert('Password reset successfully.');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Quick Action: Toggle user status (Active / Disabled)
    const handleToggleStatus = async (targetUser) => {
        const newStatus = targetUser.status === 'Active' ? 'Disabled' : 'Active';
        const actionStr = newStatus === 'Disabled' ? 'disable' : 'enable';
        
        if (!window.confirm(`Are you sure you want to ${actionStr} the account for "${targetUser.fullName || targetUser.username}"?`)) {
            return;
        }

        try {
            const url = newStatus === 'Disabled' 
                ? `/api/admin/users/${targetUser._id}/disable`
                : `/api/admin/users/${targetUser._id}`; // use generic update for enabling

            const method = 'PUT';
            const headers = { 'Content-Type': 'application/json' };
            const body = newStatus === 'Active' ? JSON.stringify({ status: 'Active' }) : null;

            const res = await fetch(url, { method, headers, body });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || `Failed to ${actionStr} account.`);
            }
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setFullName('');
        setPhone('');
        setEmail('');
        setQualification('');
        setRegistrationNumber('');
        setShiftType('Day');
        setRole('Pharmacist');
        setPharmacyId(pharmacies[0]?._id || '');
        setStatus('Active');
        setFormError('');
        setSelectedUser(null);
    };

    const openEdit = (u) => {
        setSelectedUser(u);
        setUsername(u.username);
        setFullName(u.fullName || '');
        setPhone(u.phone || '');
        setEmail(u.email || '');
        setQualification(u.qualification || '');
        setRegistrationNumber(u.registrationNumber || '');
        setShiftType(u.shiftType || 'Day');
        setRole(u.role || 'Pharmacist');
        setPharmacyId(u.pharmacyId?._id || u.pharmacyId || '');
        setStatus(u.status || 'Active');
        setIsEditOpen(true);
    };

    const openReset = (u) => {
        setSelectedUser(u);
        setNewPassword('');
        setFormError('');
        setIsResetOpen(true);
    };

    // Filtered users list
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.phone && u.phone.includes(searchQuery)) ||
            (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.registrationNumber && u.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.pharmacyId?.name && u.pharmacyId.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesRole = roleFilter === 'All' || u.role === roleFilter;

        let matchesStatus = true;
        if (statusFilter !== 'All') {
            if (statusFilter === 'Inactive') {
                matchesStatus = u.status === 'Inactive' || u.status === 'Disabled';
            } else {
                matchesStatus = u.status === statusFilter;
            }
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-[var(--text-secondary)]">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Fetching system user logs…</span>
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
                        User <span className="text-cyan-400">Management</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Provision new accounts, assign branch nodes, reset user credentials, and toggle system roles.
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsCreateOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-950 hover:bg-cyan-300"
                    style={{
                        background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)',
                        boxShadow: '0 4px 24px rgba(0,194,204,0.2)'
                    }}
                >
                    <span className="material-symbols-rounded text-sm">person_add</span>
                    Create User
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Total users */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-400/[0.04] text-cyan-400">
                        <span className="material-symbols-rounded text-base">group</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-serif">{kpis.totalUsers}</span>
                        <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Total Users</span>
                    </div>
                </div>

                {/* Active users */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-400/[0.04] text-emerald-400">
                        <span className="material-symbols-rounded text-base">how_to_reg</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-emerald-400 tracking-tight font-serif">{kpis.activeUsers}</span>
                        <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Active</span>
                    </div>
                </div>

                {/* Managers count */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-400/[0.04] text-violet-400">
                        <span className="material-symbols-rounded text-base">manage_accounts</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-violet-400 tracking-tight font-serif">{kpis.managers}</span>
                        <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Managers</span>
                    </div>
                </div>

                {/* Pharmacists count */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-400/[0.04] text-teal-400">
                        <span className="material-symbols-rounded text-base">medication</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-teal-400 tracking-tight font-serif">{kpis.pharmacists}</span>
                        <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Pharmacists</span>
                    </div>
                </div>

                {/* Inactive accounts */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-400/[0.04] text-red-400">
                        <span className="material-symbols-rounded text-base">block</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-red-400 tracking-tight font-serif">{kpis.inactiveUsers}</span>
                        <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Inactive</span>
                    </div>
                </div>

                {/* Recently Added Users */}
                <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-400/[0.04] text-amber-400">
                        <span className="material-symbols-rounded text-base">person_add</span>
                    </div>
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl font-extrabold text-amber-400 tracking-tight font-serif">{kpis.recentlyAddedUsers}</span>
                        <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Recently Added</span>
                    </div>
                </div>
            </div>

            {/* Search and Table Container */}
            <div className="rounded-xl overflow-hidden premium-card border border-[var(--card-border)] shadow-2xl flex flex-col">
                {/* Search Bar & Filters */}
                <div className="p-4 border-b border-[var(--card-border)] bg-[var(--bg-secondary)] flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <span className="material-symbols-rounded text-[var(--text-secondary)] text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Search users by name, role, phone, email, registration ID or branch..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xs mr-2"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    
                    {/* Role Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Role:</span>
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 cursor-pointer"
                        >
                            <option value="All">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Pharmacist">Pharmacist</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive / Disabled</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto scrollable">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                <th className="p-4 pl-6">Name & Credentials</th>
                                <th className="p-4">Contact Info & Shift</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Assigned Branch</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4">Joined Date</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-xs font-semibold text-[var(--text-secondary)]">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-[var(--text-secondary)]">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => {
                                    const roleColor = u.role === 'Admin'
                                        ? 'text-cyan-400 bg-cyan-500/10'
                                        : u.role === 'Manager'
                                        ? 'text-violet-400 bg-violet-500/10'
                                        : 'text-teal-400 bg-teal-500/10';

                                    const statusColor = u.status === 'Active'
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-red-400 bg-red-500/10';

                                    return (
                                        <tr key={u._id} className="hover:bg-[var(--bg-secondary)] transition-all">
                                            <td className="p-4 pl-6">
                                                <div className="flex flex-col">
                                                    <span 
                                                        onClick={() => navigate(`/users/${u._id}`)}
                                                        className="text-[var(--text-primary)] font-serif text-sm font-bold hover:text-cyan-400 cursor-pointer transition-colors"
                                                    >
                                                        {u.fullName || 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">@{u.username}</span>
                                                    {u.qualification && (
                                                        <span className="text-xs text-[var(--text-secondary)] mt-1">
                                                            Qual: <span className="font-extrabold text-[#00B4D8]">{u.qualification}</span>
                                                            {u.registrationNumber && ` | Reg: ${u.registrationNumber}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] font-mono text-xs">
                                                <div className="flex flex-col">
                                                    <span>{u.phone || 'N/A'}</span>
                                                    {u.email && <span className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans lowercase">{u.email}</span>}
                                                    <span className="text-xs text-violet-400 mt-1 font-sans font-bold capitalize">Shift: {u.shiftType || 'Day'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-0.5 rounded text-xs font-black tracking-wider uppercase ${roleColor}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] font-serif font-bold">
                                                {u.pharmacyId?.name || 'Unassigned'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase ${statusColor}`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] font-mono text-xs">
                                                {u.joinedDate ? new Date(u.joinedDate).toLocaleDateString('en-GB') : 'N/A'}
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => navigate(`/users/${u._id}`)}
                                                        className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                                                        title="View User Profile"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(u)}
                                                        className="p-1.5 rounded bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#00B4D8] hover:bg-[#00B4D8]/20 cursor-pointer"
                                                        title="Edit user details"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openReset(u)}
                                                        className="p-1.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 cursor-pointer"
                                                        title="Reset Password"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">lock_reset</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={`p-1.5 rounded cursor-pointer ${
                                                            u.status === 'Active'
                                                                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                                                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                                        }`}
                                                        title={u.status === 'Active' ? 'Disable Account' : 'Enable Account'}
                                                    >
                                                        <span className="material-symbols-rounded text-sm">
                                                            {u.status === 'Active' ? 'block' : 'check_circle'}
                                                        </span>
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

            {/* Create User Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative my-8">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Create User Account</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"><span className="material-symbols-rounded">close</span></button>
                        </div>
                        {formError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Username *</label>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Password *</label>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter full name"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Phone</label>
                                    <input
                                        type="text"
                                        placeholder="Phone number"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Email</label>
                                    <input
                                        type="email"
                                        placeholder="user@smaartpharmacy.in"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Council Reg ID</label>
                                    <input
                                        type="text"
                                        placeholder="State Council ID"
                                        value={registrationNumber}
                                        onChange={e => setRegistrationNumber(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Qualification</label>
                                    <select
                                        value={qualification}
                                        onChange={e => setQualification(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="">-- Select Qualification --</option>
                                        <option value="D.Pharm">D.Pharm</option>
                                        <option value="B.Pharm">B.Pharm</option>
                                        <option value="M.Pharm">M.Pharm</option>
                                        <option value="Pharm.D">Pharm.D</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">User Role *</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Pharmacist">Pharmacist</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Shift Assignment</label>
                                    <select
                                        value={shiftType}
                                        onChange={e => setShiftType(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Day">Day Shift</option>
                                        <option value="Night">Night Shift</option>
                                        <option value="Rotational">Rotational</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Assign Branch *</label>
                                    <select
                                        value={pharmacyId}
                                        onChange={e => setPharmacyId(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-serif font-bold"
                                    >
                                        <option value="">-- Branch --</option>
                                        {pharmacies.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
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
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Provisioning user…' : 'Create User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative my-8">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Edit User Account</h3>
                            <button onClick={() => setIsEditOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"><span className="material-symbols-rounded">close</span></button>
                        </div>
                        {formError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleEditSubmit} className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Username *</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Phone Contact</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Contact Email</label>
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
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Council Reg ID</label>
                                    <input
                                        type="text"
                                        value={registrationNumber}
                                        onChange={e => setRegistrationNumber(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Qualification</label>
                                    <select
                                        value={qualification}
                                        onChange={e => setQualification(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="">-- Qualification --</option>
                                        <option value="D.Pharm">D.Pharm</option>
                                        <option value="B.Pharm">B.Pharm</option>
                                        <option value="M.Pharm">M.Pharm</option>
                                        <option value="Pharm.D">Pharm.D</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">User Role *</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Pharmacist">Pharmacist</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Shift Assignment</label>
                                    <select
                                        value={shiftType}
                                        onChange={e => setShiftType(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Day">Day Shift</option>
                                        <option value="Night">Night Shift</option>
                                        <option value="Rotational">Rotational</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Assign Branch *</label>
                                    <select
                                        value={pharmacyId}
                                        onChange={e => setPharmacyId(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-serif font-bold"
                                    >
                                        <option value="">-- Branch --</option>
                                        {pharmacies.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
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

            {/* Reset Password Modal */}
            {isResetOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Reset User Password</h3>
                            <button onClick={() => setIsResetOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"><span className="material-symbols-rounded">close</span></button>
                        </div>
                        {formError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleResetSubmit} className="mt-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Reset password for: @{selectedUser.username}</label>
                                <input
                                    type="password"
                                    placeholder="Enter new secure password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Resetting password…' : 'Reset Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
