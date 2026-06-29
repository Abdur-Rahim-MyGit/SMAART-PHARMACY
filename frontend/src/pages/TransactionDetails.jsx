import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
    'Receive Stock':  { icon: 'add_circle',            color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)'  },
    'Dispense Stock': { icon: 'remove_circle',          color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  },
    'Adjustment':     { icon: 'published_with_changes', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
    'Expired':        { icon: 'event_busy',             color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
    'Archived':       { icon: 'archive',                color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)'  },
};

export default function TransactionDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tx, setTx] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true); setError(null);
            try {
                const res = await fetch(`/api/inventory/history?id=${id}`);
                if (!res.ok) { if (res.status === 401) navigate('/login'); throw new Error('Failed to load receipt.'); }
                const data = await res.json();
                if (!data.length) throw new Error('Transaction not found.');
                setTx(data[0]);
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        load();
    }, [id, navigate]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-3" style={{ color: 'var(--text-muted)' }}>
            <span className="material-symbols-rounded animate-spin text-3xl" style={{ color: '#00B4D8' }}>sync</span>
            <span className="text-base">Loading receipt…</span>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <span className="material-symbols-rounded text-5xl" style={{ color: '#f87171' }}>error</span>
            <span className="text-base" style={{ color: '#fca5a5' }}>{error}</span>
            <button onClick={() => navigate('/inventory/history')} className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                Back to History
            </button>
        </div>
    );

    const displayType = tx.transactionType === 'Stock In' ? 'Receive Stock' : tx.transactionType === 'Stock Out' ? 'Dispense Stock' : tx.transactionType;
    const cfg = TYPE_CONFIG[displayType] || TYPE_CONFIG.Archived;
    const qty = tx.quantityChanged;
    const qtyColor = qty > 0 ? '#34d399' : qty < 0 ? '#f87171' : 'var(--text-muted)';

    return (
        <div className="max-w-lg mx-auto flex flex-col gap-7 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        <button onClick={() => navigate('/inventory/history')} className="hover:text-[#00B4D8] transition-colors cursor-pointer">Movements</button>
                        <span className="material-symbols-rounded text-sm">chevron_right</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Receipt</span>
                    </div>
                    <h2 className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)', fontFamily: "'Lora', serif", letterSpacing: '-0.01em' }}>
                        Transaction Receipt
                    </h2>
                </div>
                <button onClick={() => navigate('/inventory/history')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                    <span className="material-symbols-rounded text-base">arrow_back</span> Back
                </button>
            </div>

            {/* Receipt card */}
            <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(15,20,32,0.95)', border: `1px solid ${cfg.border}`, boxShadow: `0 0 48px ${cfg.color}08` }}>
                {/* Type accent bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}50, transparent)` }} />

                <div className="p-7 flex flex-col gap-6">
                    {/* ID + Type */}
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Transaction ID</p>
                            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>{tx._id}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                            <span className="material-symbols-rounded text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                            {displayType}
                        </span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* Medicine */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Medication</p>
                        {tx.medicineId ? (
                            <div className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                onClick={() => navigate(`/medicines/${tx.medicineId._id}`)}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,194,204,0.3)'; e.currentTarget.style.background = 'rgba(0,194,204,0.04)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
                                <span className="material-symbols-rounded text-2xl" style={{ color: '#00B4D8', fontVariationSettings: "'FILL' 1" }}>medication</span>
                                <div className="flex flex-col">
                                    <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{tx.medicineId.name}</span>
                                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>NDC: {tx.medicineId.ndc}</span>
                                </div>
                                <span className="material-symbols-rounded ml-auto" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
                            </div>
                        ) : (
                            <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Medicine record deleted</span>
                        )}
                    </div>

                    {/* Qty + User */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Quantity</p>
                            <p className="text-3xl font-bold mt-1" style={{ color: qtyColor, fontFamily: "'Lora', serif" }}>
                                {qty > 0 ? `+${qty.toLocaleString()}` : qty.toLocaleString()}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>units</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Authorized By</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                    style={{ background: 'rgba(0,194,204,0.15)', color: '#00B4D8', border: '1px solid rgba(0,194,204,0.25)' }}>
                                    {(tx.userId?.username || 'S').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{tx.userId?.username || 'System'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stock In batch */}
                    {(tx.transactionType === 'Stock In' || displayType === 'Receive Stock') && (
                        <>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Batch Tracking</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[['Batch / Lot', tx.batchNumber, true], ['Supplier', tx.supplier, false], ['Date Received', tx.receivedDate ? new Date(tx.receivedDate).toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString(), false]].map(([label, val, mono]) => (
                                        <div key={label}>
                                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                                            <p className={`text-sm font-medium mt-0.5 ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{val || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Reason */}
                    {tx.reason && (
                        <>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Reason</p>
                                <p className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
                                    {tx.reason}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Audit Notes</p>
                        <p className="text-sm italic leading-relaxed px-4 py-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)', fontFamily: "'Lora', serif" }}>
                            "{tx.notes || 'No audit remarks recorded.'}"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
