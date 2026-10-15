import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function EmergencySupport() {
    const { user, activeBranch } = useAuth();
    
    // State lists
    const [outOfStockMeds, setOutOfStockMeds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [requests, setRequests] = useState([]);
    
    // Loading states
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [submittingRequest, setSubmittingRequest] = useState(false);
    
    // Modal & Toast states
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [requestQty, setRequestQty] = useState(10);
    const [requestUrgency, setRequestUrgency] = useState('High');
    const [requestNotes, setRequestNotes] = useState('');
    const [requestPhone, setRequestPhone] = useState('');
    const [toast, setToast] = useState(null);

    // Fetch local out-of-stock medicines
    const fetchLocalOutOfStock = async () => {
        try {
            const url = activeBranch?.id ? `/api/medicines?branchId=${activeBranch.id}` : '/api/medicines';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                // Filter for medicines that are out of stock (stock === 0)
                const zeroStock = data.filter(m => m.stock === 0 && m.status === 'Active');
                setOutOfStockMeds(zeroStock);
            }
        } catch (err) {
            console.error('Failed to load local stock:', err);
        }
    };

    // Fetch sent/received requests
    const fetchRequests = async () => {
        setLoadingRequests(true);
        try {
            const url = activeBranch?.id ? `/api/emergency/requests?branchId=${activeBranch.id}` : '/api/emergency/requests';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (err) {
            console.error('Failed to fetch emergency requests:', err);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchLocalOutOfStock();
            fetchRequests();
        }
    }, [user, activeBranch]);

    // Handle searching the network
    const handleSearch = async (queryStr) => {
        const val = queryStr !== undefined ? queryStr : searchQuery;
        if (!val.trim()) {
            setSearchResults([]);
            return;
        }
        
        setLoadingSearch(true);
        try {
            const baseUrl = `/api/emergency/search?query=${encodeURIComponent(val)}`;
            const url = activeBranch?.id ? `${baseUrl}&branchId=${activeBranch.id}` : baseUrl;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error('Network search failed:', err);
            showToast('Search failed. Please try again.', 'error');
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Show temporary toast notification
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Open request dialog
    const openRequestModal = (item) => {
        setSelectedItem(item);
        setRequestQty(10);
        setRequestUrgency('High');
        setRequestNotes('');
        setRequestPhone(user?.phone || '');
        setShowModal(true);
    };

    // Send emergency request to target pharmacy
    const submitRequest = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;

        setSubmittingRequest(true);
        try {
            const url = activeBranch?.id ? `/api/emergency/requests?branchId=${activeBranch.id}` : '/api/emergency/requests';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetPharmacyId: selectedItem.pharmacy.id,
                    medicineName: selectedItem.name,
                    ndc: selectedItem.ndc,
                    quantityRequested: Number(requestQty),
                    urgency: requestUrgency,
                    notes: requestNotes,
                    contactPhone: requestPhone
                })
            });

            if (res.ok) {
                showToast(`Emergency request sent to ${selectedItem.pharmacy.name}!`);
                setShowModal(false);
                setSelectedItem(null);
                setSearchQuery('');
                setSearchResults([]);
                fetchRequests();
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Failed to submit request', 'error');
            }
        } catch (err) {
            console.error('Submit request error:', err);
            showToast('Submission error. Please try again.', 'error');
        } finally {
            setSubmittingRequest(false);
        }
    };

    // Approve/Reject incoming requests
    const handleStatusUpdate = async (reqId, newStatus) => {
        try {
            const url = activeBranch?.id ? `/api/emergency/requests/${reqId}?branchId=${activeBranch.id}` : `/api/emergency/requests/${reqId}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                showToast(`Request successfully ${newStatus.toLowerCase()}!`);
                fetchRequests();
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Failed to update status', 'error');
            }
        } catch (err) {
            console.error('Status update error:', err);
            showToast('Action failed. Please try again.', 'error');
        }
    };

    // Filter requests
    const sentRequests = requests.filter(r => {
        const sourceId = r.sourcePharmacyId?._id || r.sourcePharmacyId?.id || r.sourcePharmacyId;
        const activeId = activeBranch?.id || activeBranch?._id;
        return String(sourceId) === String(activeId);
    });
    const receivedRequests = requests.filter(r => {
        const targetId = r.targetPharmacyId?._id || r.targetPharmacyId?.id || r.targetPharmacyId;
        const activeId = activeBranch?.id || activeBranch?._id;
        return String(targetId) === String(activeId);
    });

    return (
        <div className="space-y-6 relative max-w-5xl mx-auto">
            {/* Toast Alerts */}
            {toast && (
                <div 
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border animate-toast-slide"
                    style={{
                        background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                        borderColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                        color: '#ffffff'
                    }}
                >
                    <span className="material-symbols-rounded text-lg">
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span className="text-xs font-bold">{toast.message}</span>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-serif italic" style={{ fontFamily: "'Lora', serif" }}>
                        Emergency Network Support
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Lookup medication stock in nearby branches and coordinate life-saving transfers.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Local Branch:</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] font-bold">
                        {activeBranch?.name || 'Loading branch...'}
                    </span>
                </div>
            </div>

            {/* Search Box & Out-Of-Stock Quick Actions */}
            <div className="rounded-2xl p-5 premium-card border border-[var(--card-border)] space-y-4">
                <div className="flex flex-col md:flex-row items-stretch gap-2.5">
                    <div className="flex-1 relative">
                        <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-primary)]/40 text-lg">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Type medication name or NDC code..."
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl py-3 pl-11 pr-4 text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyPress}
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={loadingSearch}
                        className="px-6 py-3 rounded-xl bg-[var(--brand)] text-[#0a0d14] font-bold text-xs hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        {loadingSearch ? (
                            <span className="w-3.5 h-3.5 border-2 border-[#0a0d14] border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-rounded text-sm font-bold">wifi_tethering</span>
                        )}
                        <span>Scan Network</span>
                    </button>
                </div>

                {/* Local stock shortage shortcuts */}
                {outOfStockMeds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--card-border)]">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            Local Out-of-Stock:
                        </span>
                        {outOfStockMeds.map(med => (
                            <button
                                key={med._id}
                                onClick={() => {
                                    setSearchQuery(med.name);
                                    handleSearch(med.name);
                                }}
                                className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                                {med.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search results container */}
            {searchResults.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
                        Network Stock Availability
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {searchResults.map((item, idx) => (
                            <div 
                                key={idx} 
                                className="rounded-xl p-4 premium-card-elevated border border-[var(--card-border)] flex flex-col justify-between gap-3 relative hover:border-[var(--brand)]/30 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                                            {item.pharmacy.name}
                                        </h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                            {item.pharmacy.address || 'Address not listed'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <span className="text-xs font-mono text-[var(--brand)] font-bold">
                                            {item.distance} away
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] mt-0.5">
                                            Branch Code: {item.pharmacy.branchCode || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-[#090d16]/60 rounded-lg p-2.5 border border-[var(--card-border)]">
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                            Availability
                                        </div>
                                        <div className="text-xs font-black text-emerald-400 mt-0.5">
                                            {item.stock} Units
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                            Coordinator
                                        </div>
                                        <div className="text-xs font-bold text-[var(--text-primary)] truncate mt-0.5">
                                            {item.pharmacy.coordinator || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <a
                                        href={`tel:${item.pharmacy.contactPhone}`}
                                        className="flex-1 py-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--bg-secondary)] active:scale-95 text-center text-xs font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-rounded text-xs">phone</span>
                                        <span>Call ({item.pharmacy.contactPhone || 'N/A'})</span>
                                    </a>
                                    <button
                                        onClick={() => openRequestModal(item)}
                                        className="flex-1 py-2 rounded-lg bg-[var(--brand)] text-[#0a0d14] font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-rounded text-xs font-bold">local_shipping</span>
                                        <span>Request Stock</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Split Incoming & Outgoing Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Outgoing requests list */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Sent Requests (Stock Needed)
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--card-border)] font-bold text-[var(--text-muted)]">
                            {sentRequests.length} Total
                        </span>
                    </div>

                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollable pr-1">
                        {loadingRequests ? (
                            <div className="text-center py-10 text-[var(--text-muted)] text-xs">Loading requests...</div>
                        ) : sentRequests.length === 0 ? (
                            <div className="rounded-xl p-8 border border-dashed border-[var(--card-border)] text-center text-[var(--text-muted)] text-xs">
                                No outgoing emergency requests.
                            </div>
                        ) : (
                            sentRequests.map((req) => (
                                <div key={req._id} className="rounded-xl p-3.5 premium-card border border-[var(--card-border)] space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                                                {req.medicineName}
                                            </h4>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                Requested from: {req.targetPharmacyId?.name || 'Unknown Branch'}
                                            </p>
                                        </div>
                                        <span 
                                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                background: req.urgency === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : req.urgency === 'High' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                                border: `1px solid ${req.urgency === 'Critical' ? 'rgba(239, 68, 68, 0.3)' : req.urgency === 'High' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                                color: req.urgency === 'Critical' ? '#f87171' : req.urgency === 'High' ? '#fbbf24' : '#60a5fa'
                                            }}
                                        >
                                            {req.urgency}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--card-border)] pt-2.5">
                                        <div>
                                            Qty: <span className="font-bold text-[var(--text-primary)]">{req.quantityRequested}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <span>Status:</span>
                                            <span 
                                                style={{
                                                    color: req.status === 'Approved' ? '#34d399' : req.status === 'Rejected' ? '#f87171' : req.status === 'Fulfilled' ? '#60a5fa' : '#fbbf24'
                                                }}
                                            >
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {req.notes && (
                                        <p className="text-xs italic text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded p-1.5">
                                            "{req.notes}"
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Incoming requests list */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Received Requests (Stock Requested)
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--card-border)] font-bold text-[var(--text-muted)]">
                            {receivedRequests.length} Total
                        </span>
                    </div>

                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollable pr-1">
                        {loadingRequests ? (
                            <div className="text-center py-10 text-[var(--text-muted)] text-xs">Loading requests...</div>
                        ) : receivedRequests.length === 0 ? (
                            <div className="rounded-xl p-8 border border-dashed border-[var(--card-border)] text-center text-[var(--text-muted)] text-xs">
                                No incoming emergency requests.
                            </div>
                        ) : (
                            receivedRequests.map((req) => (
                                <div key={req._id} className="rounded-xl p-3.5 premium-card border border-[var(--card-border)] space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                                                {req.medicineName}
                                            </h4>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                Requested by: {req.sourcePharmacyId?.name || 'Unknown Branch'}
                                            </p>
                                        </div>
                                        <span 
                                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                background: req.urgency === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : req.urgency === 'High' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                                border: `1px solid ${req.urgency === 'Critical' ? 'rgba(239, 68, 68, 0.3)' : req.urgency === 'High' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                                color: req.urgency === 'Critical' ? '#f87171' : req.urgency === 'High' ? '#fbbf24' : '#60a5fa'
                                            }}
                                        >
                                            {req.urgency}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--card-border)] pt-2.5">
                                        <div>
                                            Quantity: <span className="font-bold text-[var(--text-primary)]">{req.quantityRequested}</span>
                                        </div>
                                        <div className="font-bold">
                                            Status: <span style={{
                                                color: req.status === 'Approved' ? '#34d399' : req.status === 'Rejected' ? '#f87171' : req.status === 'Fulfilled' ? '#60a5fa' : '#fbbf24'
                                            }}>{req.status}</span>
                                        </div>
                                    </div>
                                    
                                    {req.notes && (
                                        <p className="text-xs italic text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded p-1.5">
                                            "{req.notes}"
                                        </p>
                                    )}

                                    {/* Action buttons for pending incoming requests */}
                                    {req.status === 'Pending' && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                onClick={() => handleStatusUpdate(req._id, 'Rejected')}
                                                className="flex-1 py-1.5 rounded-lg border border-red-500/25 hover:bg-red-500/10 active:scale-95 text-xs font-bold text-red-400 transition-all cursor-pointer"
                                            >
                                                Decline
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(req._id, 'Approved')}
                                                className="flex-1 py-1.5 rounded-lg bg-[#34d399] text-[#0a0d14] font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    )}
                                    
                                    {/* Approve status, allow Fulfilling */}
                                    {req.status === 'Approved' && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                onClick={() => handleStatusUpdate(req._id, 'Fulfilled')}
                                                className="w-full py-1.5 rounded-lg bg-[var(--brand)] text-[#0a0d14] font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                            >
                                                <span className="material-symbols-rounded text-xs">done_all</span>
                                                <span>Mark as Transferred</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Request Modal */}
            {showModal && selectedItem && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--card-bg)]/60 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div 
                        className="w-full max-w-md rounded-2xl border border-[var(--card-border)] p-5 shadow-2xl animate-slide-up space-y-4"
                        style={{ background: 'rgba(20, 25, 41, 0.95)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] font-serif italic" style={{ fontFamily: "'Lora', serif" }}>
                                    Send Emergency Transfer Request
                                </h3>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition cursor-pointer"
                                >
                                    <span className="material-symbols-rounded text-base">close</span>
                                </button>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Target branch: <span className="font-bold text-[var(--text-secondary)]">{selectedItem.pharmacy.name}</span>
                            </p>
                        </div>

                        <form onSubmit={submitRequest} className="space-y-3.5">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
                                    Medicine
                                </label>
                                <div className="text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl px-3.5 py-2.5">
                                    {selectedItem.name} <span className="font-mono text-[var(--text-primary)]/50 text-xs ml-1.5">(NDC: {selectedItem.ndc})</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
                                        Quantity Needed
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedItem.stock}
                                        required
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl py-2.5 px-3 text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--brand)] transition-all"
                                        value={requestQty}
                                        onChange={e => setRequestQty(e.target.value)}
                                    />
                                    <span className="text-xs text-emerald-400 mt-1 block">
                                        Max: {selectedItem.stock} units
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
                                        Urgency
                                    </label>
                                    <select
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl py-2.5 px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-all cursor-pointer"
                                        value={requestUrgency}
                                        onChange={e => setRequestUrgency(e.target.value)}
                                    >
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
                                    Your Contact Phone
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter your phone number..."
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl py-2.5 px-3 text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--brand)] transition-all"
                                    value={requestPhone}
                                    onChange={e => setRequestPhone(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
                                    Emergency Notes / Case Detail
                                </label>
                                <textarea
                                    placeholder="Provide brief details about patient urgency..."
                                    rows="2"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl py-2 px-3 text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--brand)] transition-all resize-none"
                                    value={requestNotes}
                                    onChange={e => setRequestNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--card-border)] hover:bg-[var(--bg-secondary)] active:scale-95 text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest}
                                    className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-[#0a0d14] font-bold text-xs hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    {submittingRequest ? (
                                        <span className="w-3.5 h-3.5 border-2 border-[#0a0d14] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-rounded text-sm font-bold">send</span>
                                            <span>Send Request</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
