import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data states
    const [profile, setProfile] = useState(null);
    const [metrics, setMetrics] = useState({ medicinesAdded: 0, transactionsCreated: 0 });
    const [activities, setActivities] = useState([]);
    const [audits, setAudits] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('activity');

    // Modal states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Form inputs
    const [username, setUsername] = useState('');
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

    const fetchProfileData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/${id}`);
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('Access Denied: You do not have permission to view this profile.');
                }
                throw new Error('Failed to load user profile details.');
            }
            const data = await res.json();
            setProfile(data.user);
            setMetrics(data.metrics || { medicinesAdded: 0, transactionsCreated: 0 });
            setActivities(data.activities || []);
            setAudits(data.audits || []);

            // Populate form values
            if (data.user) {
                setUsername(data.user.username || '');
                setFullName(data.user.fullName || '');
                setPhone(data.user.phone || '');
                setEmail(data.user.email || '');
                setQualification(data.user.qualification || '');
                setRegistrationNumber(data.user.registrationNumber || '');
                setShiftType(data.user.shiftType || 'Day');
                setRole(data.user.role || 'Pharmacist');
                setPharmacyId(data.user.pharmacyId?._id || data.user.pharmacyId || '');
                setStatus(data.user.status || 'Active');
            }

            // Fetch branches if Admin
            if (user?.role === 'Admin') {
                const branchRes = await fetch('/api/admin/pharmacies');
                if (branchRes.ok) {
                    const branchData = await branchRes.json();
                    setBranches(branchData.pharmacies || []);
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
            fetchProfileData();
        }
    }, [id, user]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!username.trim() || !role || !pharmacyId) {
            setFormError('Username, role, and branch assignment are required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, fullName, phone, email, qualification, registrationNumber, shiftType, role, pharmacyId, status })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to update user account details.');
            }
            setIsEditOpen(false);
            fetchProfileData();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!newPassword.trim()) {
            setFormError('New password is required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${id}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to reset user password.');
            }
            setIsResetOpen(false);
            setNewPassword('');
            alert('Password reset successfully.');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        const toggleTo = status === 'Active' ? 'Inactive' : 'Active';
        if (!window.confirm(`Are you sure you want to change status to "${toggleTo}" for this user?`)) {
            return;
        }
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: toggleTo })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to change user status.');
            }
            setStatus(toggleTo);
            fetchProfileData();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-[var(--text-secondary)]">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Retrieving user profile register…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-md mx-auto text-center animate-fade-in">
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

    if (!profile) return null;

    const statusColors = profile.status === 'Active' 
        ? 'text-emerald-400 bg-emerald-500/10' 
        : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]0/10';

    const roleColors = profile.role === 'Admin'
        ? 'text-red-400 bg-red-500/10 border border-red-500/20'
        : profile.role === 'Manager'
        ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
        : 'text-violet-400 bg-violet-500/10 border border-violet-500/20';

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl premium-card border border-[var(--card-border)] relative overflow-hidden">
                <div className="flex items-start gap-4 z-10">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-cyan-400/[0.04] text-cyan-400 border border-cyan-400/10">
                        <span className="material-symbols-rounded text-3xl">account_circle</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-2xl font-black text-[var(--text-primary)] font-serif tracking-tight">{profile.fullName || profile.username}</h2>
                            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${statusColors}`}>
                                {profile.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                            <span>@{profile.username}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${roleColors}`}>{profile.role}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 z-10 flex-wrap">
                    {/* Admin Action Buttons */}
                    {user?.role === 'Admin' && (
                        <>
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#00B4D8] hover:bg-[#00B4D8]/20 cursor-pointer transition-colors"
                            >
                                <span className="material-symbols-rounded text-sm">edit</span>
                                Edit Details
                            </button>
                            <button
                                onClick={() => setIsResetOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                            >
                                <span className="material-symbols-rounded text-sm">lock_reset</span>
                                Reset Password
                            </button>
                            <button
                                onClick={handleToggleStatus}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${status === 'Active' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                            >
                                <span className="material-symbols-rounded text-sm">power_settings_new</span>
                                {status === 'Active' ? 'Disable Account' : 'Enable Account'}
                            </button>
                        </>
                    )}

                    {user?.role === 'Admin' && (
                        <button 
                            onClick={() => navigate('/users')}
                            className="flex items-center justify-center p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/10 cursor-pointer"
                            title="Back to Accounts"
                        >
                            <span className="material-symbols-rounded text-sm">arrow_back</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Basic Details Card */}
                <div className="rounded-xl p-5 flex flex-col gap-4 premium-card border border-[var(--card-border)] shadow-lg h-fit">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--card-border)]">
                        <span className="material-symbols-rounded text-cyan-400 text-sm">info</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Basic Information</h3>
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Username</span><span className="text-[var(--text-primary)] font-mono font-bold">@{profile.username}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Full Name</span><span className="text-[var(--text-primary)] font-bold">{profile.fullName || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Email</span><span className="text-cyan-400 font-mono">{profile.email || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Phone Number</span><span className="text-[var(--text-primary)]">{profile.phone || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Role</span><span className="text-[var(--text-primary)] font-bold">{profile.role}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Assigned Branch</span><span className="text-cyan-400 font-bold">{profile.pharmacyId?.name || 'Unassigned'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Account Status</span><span className={`px-2 py-0.5 rounded text-xs font-black ${statusColors}`}>{profile.status}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Qualification</span><span className="text-[var(--text-primary)]">{profile.qualification || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Registration No.</span><span className="text-[var(--text-primary)] font-mono">{profile.registrationNumber || 'N/A'}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Shift Type</span><span className="text-[var(--text-primary)]">{profile.shiftType}</span></div>
                        <div className="flex justify-between py-1 border-b border-[var(--card-border)]"><span className="text-[var(--text-secondary)] font-medium">Joined Date</span><span className="text-[var(--text-secondary)] font-mono">{profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString('en-GB') : 'N/A'}</span></div>
                        <div className="flex justify-between py-1"><span className="text-[var(--text-secondary)] font-medium">Last Login Timestamp</span><span className="text-emerald-400 font-mono">{profile.lastLogin ? new Date(profile.lastLogin).toLocaleString('en-GB') : 'Never'}</span></div>
                    </div>
                </div>

                {/* Operations & Activities */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Medicines Added */}
                        <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)] shadow-md">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-400/[0.04] text-cyan-400">
                                <span className="material-symbols-rounded text-base">layers</span>
                            </div>
                            <div className="flex flex-col mt-1">
                                <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-serif">{metrics.medicinesAdded}</span>
                                <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Medicines Added</span>
                            </div>
                        </div>

                        {/* Transactions Created */}
                        <div className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden premium-card border border-[var(--card-border)] shadow-md">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-400/[0.04] text-emerald-400">
                                <span className="material-symbols-rounded text-base">swap_vert</span>
                            </div>
                            <div className="flex flex-col mt-1">
                                <span className="text-2xl font-extrabold text-emerald-400 tracking-tight font-serif">{metrics.transactionsCreated}</span>
                                <span className="text-xs font-bold uppercase tracking-wide mt-0.5 text-[var(--text-secondary)]">Transactions Recorded</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Logs Section */}
                    <div className="rounded-xl overflow-hidden premium-card border border-[var(--card-border)] shadow-2xl flex flex-col">
                        <div className="flex border-b border-[var(--card-border)] bg-[var(--bg-secondary)] px-4">
                            <button
                                onClick={() => setActiveTab('activity')}
                                className={`flex items-center gap-2 py-3.5 px-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'activity' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            >
                                <span className="material-symbols-rounded text-sm">history</span>
                                Recent Activity Timeline
                            </button>
                            {user?.role === 'Admin' && (
                                <button
                                    onClick={() => setActiveTab('audit')}
                                    className={`flex items-center gap-2 py-3.5 px-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'audit' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    <span className="material-symbols-rounded text-sm">admin_panel_settings</span>
                                    Account Audit Trail
                                </button>
                            )}
                        </div>

                        {/* Recent Activity Timeline Tab */}
                        {activeTab === 'activity' && (
                            <div className="flex flex-col gap-3.5 p-5">
                                {activities.length === 0 ? (
                                    <div className="p-8 text-center text-[var(--text-secondary)] text-xs font-medium bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)]">
                                        No recent operations recorded for this user.
                                    </div>
                                ) : (
                                    <div className="relative border-l-2 border-[var(--card-border)] pl-4 ml-2 flex flex-col gap-6">
                                        {activities.map((act, index) => {
                                            const isMed = act.type === 'Medicine';
                                            const icon = isMed ? 'layers' : 'swap_vert';
                                            const iconColor = isMed ? 'text-cyan-400 bg-cyan-500/10' : 'text-emerald-400 bg-emerald-500/10';

                                            return (
                                                <div key={index} className="relative flex gap-3.5 items-start">
                                                    <span className={`absolute -left-[27px] w-6 h-6 rounded-full flex items-center justify-center border border-[#0f1420] text-xs ${iconColor}`}>
                                                        <span className="material-symbols-rounded text-xs">{icon}</span>
                                                    </span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[var(--text-primary)] text-xs font-semibold">{act.action}</span>
                                                        <span className="text-xs text-[var(--text-secondary)] font-mono mt-1">
                                                            {new Date(act.date).toLocaleString('en-GB')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Account Audit Trail Tab */}
                        {activeTab === 'audit' && user?.role === 'Admin' && (
                            <div className="overflow-x-auto scrollable">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[var(--bg-secondary)] text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)]">
                                            <th className="p-4 pl-6 w-[160px]">Timestamp</th>
                                            <th className="p-4 w-[110px]">Operator</th>
                                            <th className="p-4 w-[130px]">Action</th>
                                            <th className="p-4">Previous Value</th>
                                            <th className="p-4">New Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02] text-[var(--text-secondary)] font-semibold">
                                        {audits.length === 0 ? (
                                            <tr><td colSpan="5" className="p-10 text-center text-[var(--text-secondary)]">No account updates logged in audit registry.</td></tr>
                                        ) : (
                                            audits.map(a => (
                                                <tr key={a._id} className="hover:bg-[var(--bg-secondary)] text-xs">
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
                                                        <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${a.action.includes('Create') ? 'text-emerald-400 bg-emerald-500/10' : a.action.includes('Disable') ? 'text-red-400 bg-red-500/10' : 'text-cyan-400 bg-cyan-500/10'}`}>
                                                            {a.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono text-[var(--text-secondary)] max-w-[150px] truncate" title={JSON.stringify(a.previousValue)}>
                                                        {a.previousValue ? JSON.stringify(a.previousValue) : 'N/A'}
                                                    </td>
                                                    <td className="p-4 font-mono text-emerald-400 max-w-[150px] truncate" title={JSON.stringify(a.newValue)}>
                                                        {a.newValue ? JSON.stringify(a.newValue) : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative my-8 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Edit User Details</h3>
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
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Username *</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Phone Number</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Email Address</label>
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
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Qualification</label>
                                    <select
                                        value={qualification}
                                        onChange={e => setQualification(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="">Unspecified</option>
                                        <option value="D.Pharm">D.Pharm</option>
                                        <option value="B.Pharm">B.Pharm</option>
                                        <option value="M.Pharm">M.Pharm</option>
                                        <option value="Pharm.D">Pharm.D</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Registration No.</label>
                                    <input
                                        type="text"
                                        value={registrationNumber}
                                        onChange={e => setRegistrationNumber(e.target.value)}
                                        className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Assigned Role *</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="Pharmacist">Pharmacist</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">System Admin</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Assigned Branch *</label>
                                    <select
                                        value={pharmacyId}
                                        onChange={e => setPharmacyId(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"
                                    >
                                        <option value="">Choose Branch</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Shift Type</label>
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
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-sans">Account Status</label>
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
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Saving changes…' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {isResetOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-sm rounded-2xl overflow-hidden premium-card-elevated border border-[var(--card-border)] shadow-2xl p-6 relative animate-fade-in">
                        <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Reset Password</h3>
                            <button onClick={() => setIsResetOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        {formError && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold font-mono">
                                {formError}
                            </div>
                        )}
                        <form onSubmit={handleResetSubmit} className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">New Password *</label>
                                <input
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full px-3.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400 font-mono"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)' }}
                            >
                                {submitting ? 'Resetting…' : 'Reset Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
