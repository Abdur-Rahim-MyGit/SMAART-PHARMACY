import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
    'Receive Stock':    { icon: 'add_circle',            color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)'  },
    'Dispense Stock':   { icon: 'remove_circle',          color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)'  },
    'Adjustment':  { icon: 'published_with_changes', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)' },
    'Expired':     { icon: 'event_busy',             color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)'  },
    'Archived':    { icon: 'archive',                color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
};

function TransactionRow({ t, onView }) {
    const displayType = t.transactionType === 'Stock In' ? 'Receive Stock' : t.transactionType === 'Stock Out' ? 'Dispense Stock' : t.transactionType;
    const cfg = TYPE_CONFIG[displayType] || TYPE_CONFIG.Archived;
    const qty = t.quantityChanged;
    const isPositive = qty > 0;
    const isNegative = qty < 0;
    const qtyColor = isPositive ? '#34d399' : isNegative ? '#f87171' : 'var(--text-muted)';

    return (
        <div
            className="grid items-center px-6 py-3 rounded-lg transition-all duration-300 group cursor-pointer"
            style={{
                gridTemplateColumns: '1.8fr 1fr 1.1fr 90px 1fr 1.2fr 80px',
                gap: '16px',
                background: 'transparent',
            }}
            onMouseEnter={e => { 
                e.currentTarget.style.background = 'var(--table-row-hover)'; 
            }}
            onMouseLeave={e => { 
                e.currentTarget.style.background = 'transparent'; 
            }}
            onClick={() => onView(t._id)}
        >
            {/* Medicine */}
            <div className="flex flex-col min-w-0">
                {t.medicineId ? (
                    <>
                        <span
                            className="text-sm font-bold truncate transition-colors duration-200 group-hover:text-[#00B4D8]"
                            style={{ color: 'var(--text-primary)', fontFamily: "'Lora', serif" }}
                        >
                            {t.medicineId.name}
                        </span>
                        <span className="text-xs font-mono tracking-wider mt-0.5 opacity-60" style={{ color: 'var(--text-muted)' }}>
                            {t.medicineId.ndc}
                        </span>
                    </>
                ) : (
                    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Deleted medicine</span>
                )}
            </div>

            {/* Date */}
            <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {new Date(t.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>
                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Type badge */}
            <div>
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                >
                    <span className="material-symbols-rounded text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                    {displayType}
                </span>
            </div>

            {/* Qty */}
            <div>
                <span className="text-sm font-black" style={{ color: qtyColor, fontFamily: "'Lora', serif" }}>
                    {isPositive ? `+${qty.toLocaleString('en-IN')}` : qty.toLocaleString('en-IN')}
                </span>
            </div>

            {/* User */}
            <div className="flex flex-col min-w-0">
                <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit border border-[var(--card-border)]"
                    style={{ background: 'transparent', color: 'var(--text-secondary)' }}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00B4D8' }} />
                    {t.userId?.username || 'System'}
                </div>
                {t.pharmacyId && (
                    <span className="text-xs text-[var(--text-secondary)] font-bold mt-1 truncate" title={t.pharmacyId.name}>
                        {t.pharmacyId.name}
                    </span>
                )}
            </div>

            {/* Reason / notes */}
            <div className="min-w-0">
                {t.reason && (
                    <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-secondary)' }}>
                        {t.reason}
                    </span>
                )}
                {t.notes && (
                    <span className="text-xs block truncate opacity-60" style={{ color: 'var(--text-muted)' }}>
                        {t.notes}
                    </span>
                )}
            </div>

            {/* Action */}
            <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => onView(t._id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100 bg-[var(--card-bg)] hover:bg-[var(--brand-dim)] text-[var(--text-secondary)] hover:text-[var(--brand)] border border-[var(--card-border)]"
                >
                    <span className="material-symbols-rounded text-xs">receipt_long</span>
                    <span>Detail</span>
                </button>
            </div>
        </div>
    );
}

export default function InventoryHistory() {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeBranch } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [activeToast, setActiveToast] = useState(null);

    useEffect(() => {
        if (location.state?.toast) {
            setActiveToast(location.state.toast);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    useEffect(() => {
        if (activeToast) {
            const timer = setTimeout(() => {
                setActiveToast(null);
            }, 4200);
            return () => clearTimeout(timer);
        }
    }, [activeToast]);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = '/api/inventory/history';
            const params = [];
            if (typeFilter !== 'All') {
                const mappedType = typeFilter === 'Receive Stock' ? 'Stock In' : typeFilter === 'Dispense Stock' ? 'Stock Out' : typeFilter;
                params.push(`transactionType=${mappedType}`);
            }
            if (activeBranch?.id) {
                params.push(`branchId=${activeBranch.id}`);
            }
            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 401) { navigate('/login'); return; }
                throw new Error('Failed to load action log.');
            }
            setTransactions(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, [typeFilter, activeBranch]);

    const filtered = useMemo(() => transactions.filter(t => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            (t.medicineId?.name || '').toLowerCase().includes(q) ||
            (t.medicineId?.ndc || '').includes(q) ||
            (t.userId?.username || '').toLowerCase().includes(q) ||
            (t.notes || '').toLowerCase().includes(q) ||
            (t.batchNumber || '').toLowerCase().includes(q) ||
            (t.supplier || '').toLowerCase().includes(q) ||
            (t.reason || '').toLowerCase().includes(q)
        );
    }), [transactions, searchQuery]);

    // Summary metrics
    const stockIn = transactions.filter(t => t.transactionType === 'Stock In' || t.transactionType === 'Receive Stock').reduce((a, t) => a + t.quantityChanged, 0);
    const stockOut = transactions.filter(t => t.transactionType === 'Stock Out' || t.transactionType === 'Dispense Stock').reduce((a, t) => a + Math.abs(t.quantityChanged), 0);
    const adjustments = transactions.filter(t => t.transactionType === 'Adjustment').length;

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto animate-fade-in relative z-10">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>Inventory Ledger</span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--text-primary)] mt-0.5" style={{ fontFamily: "'Lora', serif" }}>
                        Action Log
                    </h2>
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        Audit trail of every stock action and manual correction.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => {
                            const url = activeBranch?.id ? `/api/compliance/export?branchId=${activeBranch.id}` : '/api/compliance/export';
                            window.open(url, '_blank');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer bg-[var(--card-bg)] shadow-sm border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                        <span className="material-symbols-rounded text-base">download</span>
                        <span>Compliance Export</span>
                    </button>
                    <button
                        onClick={() => navigate('/inventory/transaction-new')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                        style={{
                            background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)',
                            color: '#0a0d14',
                        }}
                    >
                        <span className="material-symbols-rounded text-base">add</span>
                        <span>Record Action</span>
                    </button>
                </div>
            </div>

            {/* Summary KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                    { label: 'Received', value: `+${stockIn.toLocaleString('en-IN')}`, color: '#34d399', icon: 'add_circle', desc: 'Added units across pharmacy' },
                    { label: 'Dispensed', value: `-${stockOut.toLocaleString('en-IN')}`, color: '#60a5fa', icon: 'remove_circle', desc: 'Deducted/dispensed units' },
                    { label: 'Adjustments', value: adjustments.toLocaleString('en-IN'), color: '#a78bfa', icon: 'published_with_changes', desc: 'Manual stock rectifications' },
                ].map(m => (
                    <div
                        key={m.label}
                        className="p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-md premium-card shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${m.color}08` }}>
                               <span className="material-symbols-rounded text-base" style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                            </div>
                        </div>

                        <div className="flex flex-col mt-3">
                            <span className="text-3xl md:text-[38px] font-black tracking-tighter" style={{ color: m.color, fontFamily: "'Lora', serif", leading: 'none' }}>{m.value}</span>
                            <span className="text-xs opacity-50 mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div
                className="p-3 flex flex-col sm:flex-row items-center gap-3 backdrop-blur-md premium-card shadow-sm"
            >
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none" style={{ color: 'var(--text-muted)' }}>search</span>
                    <input
                        type="text"
                        placeholder="Search by medicine name, NDC, user, batch, supplier..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs outline-none transition-all duration-200 bg-[var(--card-bg)] border border-[var(--card-border)] focus:border-[var(--brand)] text-[var(--text-primary)]"
                    />
                </div>

                {/* Type filter pills */}
                <div
                    className="flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 flex-wrap border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
                >
                    {['All', 'Receive Stock', 'Dispense Stock', 'Adjustment', 'Expired', 'Archived'].map(f => {
                        const cfg = TYPE_CONFIG[f];
                        const isActive = typeFilter === f;
                        return (
                            <button
                                key={f}
                                onClick={() => setTypeFilter(f)}
                                className="px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
                                style={{
                                    background: isActive ? (cfg ? `${cfg.color}15` : 'var(--brand-dim)') : 'transparent',
                                    color: isActive ? (cfg ? cfg.color : 'var(--brand)') : 'var(--text-secondary)',
                                }}
                            >
                                {f}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Results count info */}
            <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Displaying <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> transactions
                    {typeFilter !== 'All' && <span> · filtered by <span style={{ color: TYPE_CONFIG[typeFilter]?.color || '#00B4D8', fontWeight: 600 }}>{typeFilter}</span></span>}
                </span>
            </div>

            {/* Transaction audit log card container */}
            <div
                className="overflow-hidden backdrop-blur-md overflow-x-auto w-full scrollable premium-card shadow-sm border border-[var(--card-border)]"
            >
                <div className="min-w-[850px]">
                    {/* Table header */}
                    <div
                        className="grid px-6 py-3 text-xs font-bold uppercase tracking-wide"
                        style={{
                            gridTemplateColumns: '1.8fr 1fr 1.1fr 90px 1fr 1.2fr 80px',
                            gap: '16px',
                            color: 'var(--text-muted)',
                        }}
                    >
                        <span>Medicine Line</span>
                        <span>Timestamp</span>
                        <span>Action Type</span>
                        <span>Change</span>
                        <span>User & Branch</span>
                        <span>Audit Notes</span>
                        <span />
                    </div>

                    {/* Rows container */}
                    <div className="p-2 flex flex-col gap-0.5">
                        {loading ? (
                            <div className="flex flex-col gap-2 p-4 relative overflow-hidden">
                                <div className="absolute inset-0 animate-shimmer" />
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className="grid items-center py-3.5 gap-4 border-b border-[var(--card-border)]"
                                        style={{ gridTemplateColumns: '1.8fr 1fr 1.1fr 90px 1fr 1.2fr 80px' }}>
                                        <div className="w-3/4 h-3.5 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-16 h-3 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-20 h-5 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-10 h-3 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-24 h-3 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-32 h-3 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-12 h-5 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <span className="material-symbols-rounded text-4xl" style={{ color: '#f87171' }}>error</span>
                                <span className="text-sm" style={{ color: '#fca5a5' }}>{error}</span>
                                <button onClick={fetchHistory} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}>
                                    Retry
                                </button>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
                                <span className="material-symbols-rounded text-4xl text-cyan-400 opacity-50">history</span>
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">No movements recorded yet</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
                                        Start by recording your first stock transaction to populate the branch history audit trail.
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/inventory/transaction-new')}
                                    className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-extrabold hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 transition-all flex items-center gap-1.5 mt-1"
                                >
                                    <span className="material-symbols-rounded text-sm">add</span>
                                    <span>Record Action</span>
                                </button>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
                                <span className="material-symbols-rounded text-4xl text-amber-400 opacity-50">search_off</span>
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">No matching movements</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
                                        We couldn't find any movements matching your search query or active filter settings.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setSearchQuery(''); setTypeFilter('All'); }}
                                    className="px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-[var(--text-primary)] border border-[var(--card-border)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mt-1"
                                >
                                    <span className="material-symbols-rounded text-sm">clear_all</span>
                                    <span>Clear Filters</span>
                                </button>
                            </div>
                        ) : (
                            filtered.map(t => (
                                <TransactionRow key={t._id} t={t} onView={id => navigate(`/inventory/transaction/${id}`)} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Slide Toast notification */}
            {activeToast && (
                <div 
                    className="fixed bottom-6 right-6 z-50 max-w-sm w-full rounded-2xl premium-card-elevated border border-[var(--card-border)] shadow-2xl p-4 flex items-start gap-3.5 animate-toast-slide"
                    style={{ background: 'rgba(20, 25, 41, 0.95)' }}
                >
                    {/* Icon matching the transaction type */}
                    <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: activeToast.type === 'Receive Stock' || activeToast.type === 'Stock In' ? 'rgba(52, 211, 153, 0.12)' :
                                        activeToast.type === 'Dispense Stock' || activeToast.type === 'Stock Out' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(167, 139, 250, 0.12)',
                            color: activeToast.type === 'Receive Stock' || activeToast.type === 'Stock In' ? '#34d399' :
                                   activeToast.type === 'Dispense Stock' || activeToast.type === 'Stock Out' ? '#60a5fa' : '#a78bfa',
                            border: `1px solid ${activeToast.type === 'Receive Stock' || activeToast.type === 'Stock In' ? 'rgba(52, 211, 153, 0.25)' :
                                                 activeToast.type === 'Dispense Stock' || activeToast.type === 'Stock Out' ? 'rgba(96, 165, 250, 0.25)' : 'rgba(167, 139, 250, 0.25)'}`
                        }}
                    >
                        <span className="material-symbols-rounded text-base font-bold">
                            {activeToast.type === 'Receive Stock' || activeToast.type === 'Stock In' ? 'add_circle' :
                             activeToast.type === 'Dispense Stock' || activeToast.type === 'Stock Out' ? 'remove_circle' : 'published_with_changes'}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-xs font-black text-[var(--text-primary)]" style={{ fontFamily: "'Lora', serif" }}>
                            {activeToast.medName} — {activeToast.qtyChanged} units {activeToast.type === 'Receive Stock' || activeToast.type === 'Stock In' ? 'received' : activeToast.type === 'Dispense Stock' || activeToast.type === 'Stock Out' ? 'dispensed' : 'adjusted'}. Stock now {activeToast.resultingStock}.
                        </span>
                        <p className="text-xs text-emerald-400 font-bold leading-relaxed mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Inventory ledger updated</span>
                        </p>
                    </div>

                    <button 
                        onClick={() => setActiveToast(null)} 
                        className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-rounded text-sm">close</span>
                    </button>
                </div>
            )}
        </div>
    );
}
