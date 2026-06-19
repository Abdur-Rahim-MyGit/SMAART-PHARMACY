import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TYPE_CONFIG = {
    'Stock In':    { icon: 'add_circle',            color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)'  },
    'Stock Out':   { icon: 'remove_circle',          color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)'  },
    'Adjustment':  { icon: 'published_with_changes', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)' },
    'Expired':     { icon: 'event_busy',             color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)'  },
    'Archived':    { icon: 'archive',                color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
};

function TransactionRow({ t, onView }) {
    const cfg = TYPE_CONFIG[t.transactionType] || TYPE_CONFIG.Archived;
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
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; 
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
                            className="text-sm font-bold truncate transition-colors duration-200 group-hover:text-[#00c2cc]"
                            style={{ color: 'var(--text-primary)', fontFamily: "'Lora', serif" }}
                        >
                            {t.medicineId.name}
                        </span>
                        <span className="text-[11px] font-mono tracking-wider mt-0.5 opacity-60" style={{ color: 'var(--text-muted)' }}>
                            {t.medicineId.ndc}
                        </span>
                    </>
                ) : (
                    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Deleted medicine</span>
                )}
            </div>

            {/* Date */}
            <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                    {new Date(t.createdAt).toLocaleDateString()}
                </span>
                <span className="text-[11px] opacity-60" style={{ color: 'var(--text-muted)' }}>
                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Type badge */}
            <div>
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                >
                    <span className="material-symbols-rounded text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                    {t.transactionType}
                </span>
            </div>

            {/* Qty */}
            <div>
                <span className="text-sm font-black" style={{ color: qtyColor, fontFamily: "'Lora', serif" }}>
                    {isPositive ? `+${qty.toLocaleString('en-IN')}` : qty.toLocaleString('en-IN')}
                </span>
            </div>

            {/* User */}
            <div>
                <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00c2cc' }} />
                    {t.userId?.username || 'System'}
                </div>
            </div>

            {/* Reason / notes */}
            <div className="min-w-0">
                {t.reason && (
                    <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-secondary)' }}>
                        {t.reason}
                    </span>
                )}
                {t.notes && (
                    <span className="text-[11px] block truncate opacity-60" style={{ color: 'var(--text-muted)' }}>
                        {t.notes}
                    </span>
                )}
            </div>

            {/* Action */}
            <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => onView(t._id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100 bg-white/[0.03] hover:bg-[#00c2cc]/10 text-white/60 hover:text-[#00c2cc] border border-white/[0.05] hover:border-[#00c2cc]/20"
                >
                    <span className="material-symbols-rounded text-[11px]">receipt_long</span>
                    <span>Detail</span>
                </button>
            </div>
        </div>
    );
}

export default function InventoryHistory() {
    const navigate = useNavigate();
    const location = useLocation();
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
            if (typeFilter !== 'All') url += `?transactionType=${typeFilter}`;
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 401) { navigate('/login'); return; }
                throw new Error('Failed to load stock movements.');
            }
            setTransactions(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, [typeFilter]);

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
    const stockIn = transactions.filter(t => t.transactionType === 'Stock In').reduce((a, t) => a + t.quantityChanged, 0);
    const stockOut = transactions.filter(t => t.transactionType === 'Stock Out').reduce((a, t) => a + Math.abs(t.quantityChanged), 0);
    const adjustments = transactions.filter(t => t.transactionType === 'Adjustment').length;

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto animate-fade-in relative z-10">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>Inventory Ledger</span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white mt-0.5" style={{ fontFamily: "'Lora', serif" }}>
                        Stock Movements
                    </h2>
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        Audit trail of every stock movement and manual correction.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => window.open('/api/compliance/export', '_blank')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer bg-white/[0.03] border border-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.06]"
                    >
                        <span className="material-symbols-rounded text-base">download</span>
                        <span>Compliance Export</span>
                    </button>
                    <button
                        onClick={() => navigate('/inventory/transaction-new')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                        style={{
                            background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)',
                            color: '#0a0d14',
                        }}
                    >
                        <span className="material-symbols-rounded text-base">add</span>
                        <span>New Transaction</span>
                    </button>
                </div>
            </div>

            {/* Summary KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                    { label: 'Stocked In', value: `+${stockIn.toLocaleString('en-IN')}`, color: '#34d399', icon: 'add_circle', desc: 'Added units across pharmacy' },
                    { label: 'Stocked Out', value: `-${stockOut.toLocaleString('en-IN')}`, color: '#60a5fa', icon: 'remove_circle', desc: 'Deducted/dispensed units' },
                    { label: 'Adjustments', value: adjustments.toLocaleString('en-IN'), color: '#a78bfa', icon: 'published_with_changes', desc: 'Manual stock rectifications' },
                ].map(m => (
                    <div
                        key={m.label}
                        className="rounded-lg p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-md"
                        style={{ background: 'rgba(15,20,32,0.3)' }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${m.color}08` }}>
                               <span className="material-symbols-rounded text-base" style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                            </div>
                        </div>

                        <div className="flex flex-col mt-3">
                            <span className="text-3xl md:text-[38px] font-black tracking-tighter" style={{ color: m.color, fontFamily: "'Lora', serif", leading: 'none' }}>{m.value}</span>
                            <span className="text-[11px] opacity-50 mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div
                className="rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 backdrop-blur-md"
                style={{ background: 'rgba(12,16,26,0.3)' }}
            >
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none" style={{ color: 'var(--text-muted)' }}>search</span>
                    <input
                        type="text"
                        placeholder="Search by medicine name, NDC, user, batch, supplier..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            color: 'var(--text-primary)',
                        }}
                    />
                </div>

                {/* Type filter pills */}
                <div
                    className="flex items-center gap-0.5 p-0.5 rounded-lg flex-shrink-0 flex-wrap"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                    {['All', 'Stock In', 'Stock Out', 'Adjustment', 'Expired', 'Archived'].map(f => {
                        const cfg = TYPE_CONFIG[f];
                        const isActive = typeFilter === f;
                        return (
                            <button
                                key={f}
                                onClick={() => setTypeFilter(f)}
                                className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
                                style={{
                                    background: isActive ? (cfg ? `${cfg.color}15` : 'rgba(0,194,204,0.1)') : 'transparent',
                                    color: isActive ? (cfg ? cfg.color : '#00c2cc') : 'var(--text-secondary)',
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
                    {typeFilter !== 'All' && <span> · filtered by <span style={{ color: TYPE_CONFIG[typeFilter]?.color || '#00c2cc', fontWeight: 600 }}>{typeFilter}</span></span>}
                </span>
            </div>

            {/* Transaction audit log card container */}
            <div
                className="rounded-xl overflow-hidden backdrop-blur-md"
                style={{ background: 'rgba(15,20,32,0.25)' }}
            >
                {/* Table header */}
                <div
                    className="grid px-6 py-3 text-[11px] font-bold uppercase tracking-wide"
                    style={{
                        gridTemplateColumns: '1.8fr 1fr 1.1fr 90px 1fr 1.2fr 80px',
                        gap: '16px',
                        color: 'var(--text-muted)',
                    }}
                >
                    <span>Medicine Line</span>
                    <span>Timestamp</span>
                    <span>Movement Type</span>
                    <span>Change</span>
                    <span>Authorized User</span>
                    <span>Audit Notes</span>
                    <span />
                </div>

                {/* Rows container */}
                <div className="p-2 flex flex-col gap-0.5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'var(--text-muted)' }}>
                            <span className="material-symbols-rounded animate-spin text-3xl" style={{ color: '#00c2cc' }}>sync</span>
                            <span className="text-xs">Loading audit record...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <span className="material-symbols-rounded text-4xl" style={{ color: '#f87171' }}>error</span>
                            <span className="text-sm" style={{ color: '#fca5a5' }}>{error}</span>
                            <button onClick={fetchHistory} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}>
                                Retry
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'var(--text-muted)' }}>
                            <span className="material-symbols-rounded text-4xl opacity-50">history</span>
                            <div className="text-center">
                                <span className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>No transactions found</span>
                                <span className="text-[11px] mt-1 block">Try recording a stock movement or adjust your filter query.</span>
                            </div>
                        </div>
                    ) : (
                        filtered.map(t => (
                            <TransactionRow key={t._id} t={t} onView={id => navigate(`/inventory/transaction/${id}`)} />
                        ))
                    )}
                </div>
            </div>

        {/* Slide Toast notification */}
            {activeToast && (
                <div 
                    className="fixed bottom-6 right-6 z-50 max-w-sm w-full rounded-2xl glass-elevated border border-white/[0.08] shadow-2xl p-4 flex items-start gap-3.5 animate-toast-slide"
                    style={{ background: 'rgba(20, 25, 41, 0.95)' }}
                >
                    {/* Icon matching the transaction type */}
                    <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: activeToast.type === 'Stock In' ? 'rgba(52, 211, 153, 0.12)' :
                                        activeToast.type === 'Stock Out' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(167, 139, 250, 0.12)',
                            color: activeToast.type === 'Stock In' ? '#34d399' :
                                   activeToast.type === 'Stock Out' ? '#60a5fa' : '#a78bfa',
                            border: `1px solid ${activeToast.type === 'Stock In' ? 'rgba(52, 211, 153, 0.25)' :
                                                 activeToast.type === 'Stock Out' ? 'rgba(96, 165, 250, 0.25)' : 'rgba(167, 139, 250, 0.25)'}`
                        }}
                    >
                        <span className="material-symbols-rounded text-base font-bold">
                            {activeToast.type === 'Stock In' ? 'add_circle' :
                             activeToast.type === 'Stock Out' ? 'remove_circle' : 'published_with_changes'}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-xs font-black text-white" style={{ fontFamily: "'Lora', serif" }}>
                            Transaction Posted Successfully
                        </span>
                        <p className="text-[11px] text-white/70 leading-relaxed mt-1">
                            <strong className="text-white">{activeToast.medName}</strong> — {activeToast.qtyChanged} units {activeToast.type === 'Stock In' ? 'added' : activeToast.type === 'Stock Out' ? 'deducted' : 'adjusted'}. New stock is <strong className="text-white">{activeToast.resultingStock}</strong>.
                        </p>
                    </div>

                    <button 
                        onClick={() => setActiveToast(null)} 
                        className="text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-rounded text-sm">close</span>
                    </button>
                </div>
            )}
        </div>
    );
}
