import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
    'Receive Stock':  { icon: 'add_circle',            color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)'  },
    'Dispense Stock': { icon: 'remove_circle',          color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)'  },
    'Adjustment':     { icon: 'published_with_changes', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)' },
    'Expired':        { icon: 'event_busy',             color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)'  },
    'Archived':       { icon: 'archive',                color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
};

const STATUS_CONFIG = {
    Active:   { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)'  },
    Inactive: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)'  },
    Archived: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
};

const CATEGORY_COLORS = {
    Cardiovascular: '#f87171', 'Anti-infective': '#34d399', Endocrine: '#60a5fa',
    Emergency: '#f59e0b', Analgesic: '#a78bfa', Neurological: '#e879f9',
    Gastrointestinal: '#22d3ee', General: '#00B4D8',
};

const CATEGORY_ICONS = {
    Cardiovascular: 'favorite', 'Anti-infective': 'coronavirus', Endocrine: 'opacity',
    Emergency: 'emergency', Analgesic: 'healing', Neurological: 'psychology',
    Gastrointestinal: 'bubble_chart', General: 'medication',
};

function DetailField({ label, value, mono }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{value || '—'}</span>
        </div>
    );
}

export default function MedicineDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [medicine, setMedicine] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true); setError(null);
            try {
                const detRes = await fetch(`/api/medicines/${id}`);
                if (!detRes.ok) { if (detRes.status === 401) navigate('/login'); throw new Error('Failed to load medicine.'); }
                setMedicine(await detRes.json());
                const logRes = await fetch(`/api/inventory/history?medicineId=${id}`);
                if (logRes.ok) setLogs(await logRes.json());
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        load();
    }, [id, navigate]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-3" style={{ color: 'var(--text-muted)' }}>
            <span className="material-symbols-rounded animate-spin text-3xl" style={{ color: '#00B4D8' }}>sync</span>
            <span className="text-sm">Loading medicine details…</span>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <span className="material-symbols-rounded text-4xl" style={{ color: '#f87171' }}>error</span>
            <span className="text-sm" style={{ color: '#fca5a5' }}>{error}</span>
            <button onClick={() => navigate('/medicines')} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}>
                Back to Ledger
            </button>
        </div>
    );

    const catColor = CATEGORY_COLORS[medicine.category] || '#00B4D8';
    const catIcon = CATEGORY_ICONS[medicine.category] || 'medication';
    const statusCfg = STATUS_CONFIG[medicine.status] || STATUS_CONFIG.Archived;
    const assetValue = medicine.stock * medicine.price;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999);

    const expDate = medicine.expiryDate ? new Date(medicine.expiryDate) : null;
    const isExpired = expDate ? expDate < today : false;
    const isNearExpiry = expDate ? (expDate >= today && expDate <= thirtyDaysFromNow) : false;

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-7 animate-fade-in relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        <button onClick={() => navigate('/medicines')} className="hover:text-[#00B4D8] transition-colors cursor-pointer">Ledger</button>
                        <span className="material-symbols-rounded text-xs">chevron_right</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{medicine.name}</span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-[var(--text-primary)]" style={{ fontFamily: "'Lora', serif", letterSpacing: '-0.02em' }}>
                        {medicine.name}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/medicines/edit/${medicine._id}`)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                        <span className="material-symbols-rounded text-base">edit</span>
                        <span>Edit Details</span>
                    </button>
                    <button
                        onClick={() => navigate('/medicines')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                    >
                        <span className="material-symbols-rounded text-base">arrow_back</span>
                        <span>Back</span>
                    </button>
                </div>
            </div>

            {/* Expiry alerts banner */}
            {isExpired && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm animate-fade-in"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                    <span className="material-symbols-rounded text-lg text-[#f87171]">event_busy</span>
                    <div className="flex flex-col">
                        <span className="font-bold text-xs">MEDICATION EXPIRED</span>
                        <span className="text-xs opacity-80 font-medium">This medicine expired on {new Date(medicine.expiryDate).toLocaleDateString()}. Please record an Expired Waste transaction to adjust stock and dispose of it safely.</span>
                    </div>
                </div>
            )}
            {!isExpired && isNearExpiry && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm animate-fade-in"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                    <span className="material-symbols-rounded text-lg text-[#f59e0b]">warning</span>
                    <div className="flex flex-col">
                        <span className="font-bold text-xs">EXPIRING SOON</span>
                        <span className="text-xs opacity-80 font-medium font-sans">This medicine expires on {new Date(medicine.expiryDate).toLocaleDateString()}. Monitor stock closely to prevent waste.</span>
                    </div>
                </div>
            )}

            {/* Low stock alerts banner */}
            {medicine.stock <= (medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20) && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm animate-fade-in"
                    style={{ 
                        background: medicine.stock === 0 ? 'rgba(248,113,113,0.05)' : 'rgba(245,158,11,0.05)', 
                        border: medicine.stock === 0 ? '1px solid rgba(248,113,113,0.15)' : '1px solid rgba(245,158,11,0.15)', 
                        color: medicine.stock === 0 ? '#fca5a5' : '#fcd34d' 
                    }}>
                    <span className="material-symbols-rounded text-lg" style={{ color: medicine.stock === 0 ? '#f87171' : '#f59e0b' }}>
                        {medicine.stock === 0 ? 'gpp_bad' : 'gpp_maybe'}
                    </span>
                    <div className="flex flex-col">
                        <span className="font-bold text-xs">
                            {medicine.stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK ALERT'}
                        </span>
                        <span className="text-xs opacity-80 font-medium">
                            Current stock is {medicine.stock} units, which is {medicine.stock === 0 ? 'depleted' : `below the safety threshold of ${medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20} units`}. 
                            Please use the Reorder Intelligence system to replenish.
                        </span>
                    </div>
                </div>
            )}

            {/* Substitute Finder Banner */}
            {medicine.stock === 0 && medicine.substitutes && medicine.substitutes.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl text-sm animate-fade-in"
                    style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', color: '#bae6fd' }}>
                    <span className="material-symbols-rounded text-lg text-[#38bdf8] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>find_in_page</span>
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-xs text-[#38bdf8] uppercase tracking-wider">Similar Medicines Available (Substitutes)</span>
                        <span className="text-xs opacity-80 font-medium">Since this medication is currently out of stock, you can suggest these substitutes to the patient:</span>
                        <div className="flex gap-2 flex-wrap mt-0.5">
                            {medicine.substitutes.map((sub, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--text-primary)]"
                                    style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)' }}>
                                    {sub}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left column */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Medicine header card */}
                    <div
                        className="rounded-lg p-5 relative overflow-hidden backdrop-blur-md"
                        style={{
                            background: 'rgba(15,20,32,0.3)',
                        }}
                    >
                        {/* Glow backing */}
                        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none rounded-full" 
                            style={{ background: `radial-gradient(circle, ${catColor}08 0%, transparent 70%)`, filter: 'blur(30px)' }} />

                        <div className="flex items-start gap-4 relative z-10">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `${catColor}08` }}
                            >
                                <span className="material-symbols-rounded text-xl" style={{ color: catColor, fontVariationSettings: "'FILL' 1" }}>{catIcon}</span>
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className="px-2 py-0.5 rounded text-xs font-bold"
                                        style={{ background: statusCfg.bg, color: statusCfg.color }}
                                    >
                                        {medicine.status}
                                    </span>
                                    <span
                                        className="px-2 py-0.5 rounded text-xs font-bold"
                                        style={{ background: `${catColor}08`, color: catColor }}
                                    >
                                        {medicine.category}
                                    </span>
                                </div>
                                <div className="font-mono text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>NDC: {medicine.ndc}</div>
                                {medicine.supplier && (
                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        <span className="opacity-60">Supplier: </span>
                                        <strong className="text-[var(--text-primary)]">{medicine.supplier}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* KPI metrics row */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { 
                                label: 'Stock Level', 
                                value: medicine.stock.toLocaleString('en-IN'), 
                                sub: medicine.stock <= (medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20) 
                                    ? `Below threshold (${medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20})` 
                                    : `Safe threshold (${medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20})`, 
                                color: medicine.stock === 0 
                                    ? '#f87171' 
                                    : medicine.stock <= (medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20) 
                                        ? '#f59e0b' 
                                        : '#34d399', 
                                icon: 'inventory' 
                            },
                            { label: 'Unit Cost', value: `₹${medicine.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'per unit', color: '#00B4D8', icon: 'payments' },
                            { label: 'Asset Value', value: `₹${assetValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: 'total valuation', color: '#a78bfa', icon: 'account_balance_wallet' },
                        ].map(k => (
                            <div key={k.label} className="rounded-lg p-4 flex flex-col gap-2 backdrop-blur-md"
                                style={{ background: 'rgba(15,20,32,0.3)' }}>
                                <div className="w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{ background: `${k.color}08` }}>
                                    <span className="material-symbols-rounded text-base" style={{ color: k.color, fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tighter" style={{ fontFamily: "'Lora', serif", leading: 'none' }}>{k.value}</span>
                                    <span className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>{k.label}</span>
                                    <span className="text-xs opacity-50 mt-0.5" style={{ color: 'var(--text-muted)' }}>{k.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stock actions */}
                    <div className="rounded-lg p-4 flex flex-col gap-3 backdrop-blur-md"
                        style={{ background: 'rgba(15,20,32,0.3)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Inventory Actions</span>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Receive Stock', type: 'stock-in', icon: 'add_circle', color: '#34d399' },
                                { label: 'Dispense Stock', type: 'stock-out', icon: 'remove_circle', color: '#60a5fa' },
                                { label: 'Adjust Stock', type: 'adjustment', icon: 'published_with_changes', color: '#a78bfa' },
                            ].map(a => (
                                <button key={a.type}
                                    onClick={() => navigate(`/inventory/transaction-new?medicineId=${medicine._id}&type=${a.type}`)}
                                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg cursor-pointer transition-all duration-200"
                                    style={{ background: `${a.color}06`, color: a.color }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${a.color}10`; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `${a.color}06`; }}
                                >
                                    <span className="material-symbols-rounded text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                                    <span className="text-xs font-bold">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md"
                        style={{ background: 'rgba(15,20,32,0.3)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Record Overview</span>
                        <div className="grid grid-cols-2 gap-4">
                            <DetailField label="Medicine Name" value={medicine.name} />
                            <DetailField label="NDC Code" value={medicine.ndc} mono />
                            <DetailField label="Category" value={medicine.category} />
                            <DetailField label="Supplier" value={medicine.supplier} />
                            <DetailField label="Status" value={medicine.status} />
                            <DetailField label="Reorder Threshold" value={`${medicine.reorderPoint !== undefined ? medicine.reorderPoint : 20} units`} />
                            <DetailField label="Expiry Date" value={medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString() : 'No Expiry Set'} />
                            <DetailField label="Registered" value={new Date(medicine.createdAt).toLocaleDateString()} />
                        </div>
                    </div>
                </div>

                {/* Right column — transaction timeline */}
                <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Transaction History ({logs.length})
                    </span>
                    <div
                        className="rounded-lg flex-1 overflow-hidden backdrop-blur-md"
                        style={{ background: 'rgba(15,20,32,0.3)', maxHeight: '600px', overflowY: 'auto' }}
                    >
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
                                <span className="material-symbols-rounded text-4xl opacity-55">history</span>
                                <span className="text-xs">No records available</span>
                            </div>
                        ) : (
                            <div className="p-4 flex flex-col gap-0">
                                {/* Timeline line */}
                                <div className="relative">
                                    <div className="absolute left-3.5 top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                    <div className="flex flex-col gap-4">
                                        {logs.map((log) => {
                                            const displayType = log.transactionType === 'Stock In' ? 'Receive Stock' : log.transactionType === 'Stock Out' ? 'Dispense Stock' : log.transactionType;
                                            const cfg = TYPE_CONFIG[displayType] || TYPE_CONFIG.Archived;
                                            const qty = log.quantityChanged;
                                            return (
                                                <div key={log._id} className="relative pl-10">
                                                    {/* Timeline dot */}
                                                    <div
                                                        className="absolute left-0 top-1 w-7 h-7 rounded-lg flex items-center justify-center"
                                                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                                                    >
                                                        <span className="material-symbols-rounded text-sm" style={{ color: cfg.color, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                                                    </div>
 
                                                    {/* Content */}
                                                    <div className="flex flex-col gap-1.5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <div className="flex items-center justify-between">
                                                            <span
                                                                className="text-xs font-semibold cursor-pointer hover:text-[#00B4D8] transition-colors"
                                                                style={{ color: cfg.color }}
                                                                onClick={() => navigate(`/inventory/transaction/${log._id}`)}
                                                            >
                                                                {displayType}
                                                            </span>
                                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                {new Date(log.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                                                            style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}
                                                        >
                                                            <span className="text-xs font-bold" style={{ color: qty > 0 ? '#34d399' : qty < 0 ? '#f87171' : 'var(--text-muted)' }}>
                                                                {qty > 0 ? `+${qty.toLocaleString('en-IN')}` : qty.toLocaleString('en-IN')}
                                                            </span>
                                                            {log.reason && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {log.reason}</span>}
                                                        </div>

                                                        {log.notes && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{log.notes}</p>}
                                                        {log.batchNumber && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Batch: {log.batchNumber}</span>}
                                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Authorized: {log.userId?.username || 'System'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
