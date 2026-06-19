import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const inputStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: 'none',
    color: 'var(--text-primary)',
    caretColor: '#00c2cc',
};

const inputFocusStyle = {
    background: 'rgba(255,255,255,0.04)',
    boxShadow: '0 0 0 1.5px rgba(0,194,204,0.35)',
};

const TAB_CONFIG = {
    'stock-in': {
        label: 'Stock In',
        icon: 'add_circle',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.06)',
        border: 'rgba(52,211,153,0.18)',
        desc: 'Receive inbound supply',
    },
    'stock-out': {
        label: 'Stock Out',
        icon: 'remove_circle',
        color: '#60a5fa',
        bg: 'rgba(96,165,250,0.06)',
        border: 'rgba(96,165,250,0.18)',
        desc: 'Dispense medication',
    },
    adjustment: {
        label: 'Adjustment',
        icon: 'published_with_changes',
        color: '#a78bfa',
        bg: 'rgba(167,139,250,0.06)',
        border: 'rgba(167,139,250,0.18)',
        desc: 'Correct count error',
    },
};

function FormField({ label, required, children, fullWidth }) {
    return (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {label}{required && <span style={{ color: '#00c2cc' }} className="ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

export default function InventoryTransactionForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'stock-in');
    const [medicines, setMedicines] = useState([]);
    const [selectedMedId, setSelectedMedId] = useState(searchParams.get('medicineId') || '');
    const [selectedMed, setSelectedMed] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [focused, setFocused] = useState(null);

    const [formData, setFormData] = useState({
        quantity: '',
        quantityChanged: '',
        batchNumber: '',
        supplier: '',
        receivedDate: new Date().toISOString().split('T')[0],
        reason: 'Dispensed',
        adjustmentType: 'Adjustment',
        notes: '',
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/medicines');
                if (res.ok) {
                    const data = await res.json();
                    setMedicines(data);
                    const pre = searchParams.get('medicineId');
                    if (pre) setSelectedMed(data.find(m => m._id === pre) || null);
                }
            } catch (err) { console.error(err); }
        };
        load();
    }, [searchParams]);

    const handleMedChange = (e) => {
        const id = e.target.value;
        setSelectedMedId(id);
        setSelectedMed(medicines.find(m => m._id === id) || null);
        setError(null);
    };

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const getSimulatedStock = () => {
        if (!selectedMed) return null;
        if (activeTab === 'stock-in') return selectedMed.stock + (Number(formData.quantity) || 0);
        if (activeTab === 'stock-out') return selectedMed.stock - (Number(formData.quantity) || 0);
        return selectedMed.stock + (Number(formData.quantityChanged) || 0);
    };

    const simulatedStock = getSimulatedStock();
    const tabCfg = TAB_CONFIG[activeTab];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!selectedMedId) { setError('Please select a medication.'); return; }

        let endpoint = '';
        let body = { medicineId: selectedMedId, notes: formData.notes };

        if (activeTab === 'stock-in') {
            const qty = Number(formData.quantity);
            if (!qty || qty <= 0) { setError('Enter a valid positive quantity.'); return; }
            endpoint = '/api/inventory/stock-in';
            body = { ...body, quantity: qty, batchNumber: formData.batchNumber, supplier: formData.supplier || selectedMed?.supplier, receivedDate: formData.receivedDate };
        } else if (activeTab === 'stock-out') {
            const qty = Number(formData.quantity);
            if (!qty || qty <= 0) { setError('Enter a valid positive quantity.'); return; }
            if (selectedMed.stock < qty) { setError(`Cannot deduct ${qty} units — only ${selectedMed.stock} units available.`); return; }
            endpoint = '/api/inventory/stock-out';
            body = { ...body, quantity: qty, reason: formData.reason };
        } else {
            const qtyChange = Number(formData.quantityChanged);
            if (!qtyChange || qtyChange === 0) { setError('Enter a non-zero adjustment value (positive or negative).'); return; }
            if (selectedMed.stock + qtyChange < 0) { setError(`Result (${selectedMed.stock + qtyChange}) cannot be negative.`); return; }
            endpoint = '/api/inventory/adjustment';
            body = { ...body, quantityChanged: qtyChange, transactionType: formData.adjustmentType, reason: formData.reason || 'Manual correction' };
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Transaction failed.');
            const toastMsg = {
                medName: data.medicine?.name || selectedMed?.name || 'Medication',
                qtyChanged: Math.abs(data.transaction?.quantityChanged || body.quantity || body.quantityChanged),
                type: data.transaction?.transactionType || activeTab,
                resultingStock: data.medicine?.stock ?? 0,
                timestamp: new Date().toISOString()
            };
            navigate('/inventory/history', { state: { toast: toastMsg } });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFieldStyle = (name) => ({
        onFocus: () => setFocused(name),
        onBlur: () => setFocused(null),
        style: focused === name ? { ...inputStyle, ...inputFocusStyle } : inputStyle,
    });

    const baseInputClass = 'w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200';

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fade-in relative z-10">
            {/* Background glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(0,194,204,0.03) 0%, transparent 70%)', filter: 'blur(45px)', zIndex: -1 }} />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <button onClick={() => navigate('/inventory/history')} className="hover:text-[#00c2cc] transition-colors cursor-pointer">
                    Movements
                </button>
                <span className="material-symbols-rounded text-sm">chevron_right</span>
                <span style={{ color: 'var(--text-secondary)' }}>New Transaction</span>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-0.5">
                <h2 className="text-3xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Lora', serif", letterSpacing: '-0.02em' }}>
                    Post Stock Movement
                </h2>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Record an inventory transaction — inbound, outbound, or adjustment correction.
                </p>
            </div>

            {/* Transaction type selector segments */}
            <div
                className="grid grid-cols-3 gap-2 p-1 rounded-lg backdrop-blur-md"
                style={{ background: 'rgba(15,20,32,0.3)' }}
            >
                {Object.entries(TAB_CONFIG).map(([key, cfg]) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => { setActiveTab(key); setError(null); }}
                            className="flex flex-col items-center gap-1 py-2 rounded-md transition-all duration-300 cursor-pointer"
                            style={{
                                background: isActive ? cfg.bg : 'transparent',
                                color: isActive ? cfg.color : 'var(--text-muted)',
                            }}
                        >
                            <span className="material-symbols-rounded text-base transition-transform duration-200" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                                {cfg.icon}
                            </span>
                            <span className="text-[11px] font-bold">{cfg.label}</span>
                            <span className="text-[11px] font-medium opacity-65 text-center leading-tight px-1 hidden sm:block">{cfg.desc}</span>
                        </button>
                    );
                })}
            </div>

            {/* Error state */}
            {error && (
                <div
                    className="flex items-center gap-3 p-4 rounded-xl animate-fade-in"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#fca5a5' }}
                >
                    <span className="material-symbols-rounded text-base flex-shrink-0" style={{ color: '#f87171' }}>error</span>
                    <span className="text-xs">{error}</span>
                </div>
            )}

            {/* Form layout */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Medicine selector container */}
                <div
                    className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-xl"
                    style={{ background: 'rgba(15,20,32,0.3)' }}
                >
                    <FormField label="Select Catalog Medication" required>
                        <select
                            value={selectedMedId}
                            onChange={handleMedChange}
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200 cursor-pointer"
                            style={inputStyle}
                        >
                            <option value="" style={{ background: '#0f1420' }}>— Select from active catalog —</option>
                            {medicines.map(m => (
                                <option key={m._id} value={m._id} style={{ background: '#0f1420' }}>
                                    {m.name} · NDC: {m.ndc} · Current Stock: {m.stock}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    {/* Projected stock preview */}
                    {selectedMed && (
                        <div
                            className="grid grid-cols-2 gap-4 p-3 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Current Stock</span>
                                <span className="text-lg font-bold text-white" style={{ fontFamily: "'Lora', serif" }}>{selectedMed.stock.toLocaleString('en-IN')} units</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                    Projected Post-State
                                </span>
                                <span
                                    className="text-lg font-bold font-serif"
                                    style={{ 
                                        fontFamily: "'Lora', serif",
                                        color: simulatedStock !== null && simulatedStock < 0 ? '#f87171' : simulatedStock !== null && simulatedStock !== selectedMed.stock ? tabCfg.color : 'var(--text-secondary)' 
                                    }}
                                >
                                    {simulatedStock !== null ? `${simulatedStock.toLocaleString('en-IN')} units` : '—'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab-specific fields panel */}
                <div
                    className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-xl"
                    style={{ background: 'rgba(15,20,32,0.3)', boxShadow: `0 0 32px ${tabCfg.color}01` }}
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-base" style={{ color: tabCfg.color, fontVariationSettings: "'FILL' 1" }}>{tabCfg.icon}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: tabCfg.color }}>{tabCfg.label} Parameters</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeTab === 'stock-in' && (
                            <>
                                <FormField label="Quantity Received" required>
                                    <input type="number" name="quantity" value={formData.quantity} onChange={handleInput}
                                        placeholder="0" min="1" className={baseInputClass} {...getFieldStyle('quantity')} />
                                </FormField>
                                <FormField label="Batch / Lot Number">
                                    <input type="text" name="batchNumber" value={formData.batchNumber} onChange={handleInput}
                                        placeholder="LOT-2838" className={`${baseInputClass} font-mono`} {...getFieldStyle('batch')} />
                                </FormField>
                                <FormField label="Supplier">
                                    <input type="text" name="supplier" value={formData.supplier} onChange={handleInput}
                                        placeholder="e.g. Cardinal Health" className={baseInputClass} {...getFieldStyle('supplier')} />
                                </FormField>
                                <FormField label="Received Date">
                                    <input type="date" name="receivedDate" value={formData.receivedDate} onChange={handleInput}
                                        className={baseInputClass} {...getFieldStyle('date')} />
                                </FormField>
                            </>
                        )}

                        {activeTab === 'stock-out' && (
                            <>
                                <FormField label="Quantity Deducted" required>
                                    <input type="number" name="quantity" value={formData.quantity} onChange={handleInput}
                                        placeholder="0" min="1" className={baseInputClass} {...getFieldStyle('quantity')} />
                                </FormField>
                                <FormField label="Reason for Stock Out">
                                    <select name="reason" value={formData.reason} onChange={handleInput}
                                        className={`${baseInputClass} cursor-pointer`} style={inputStyle}>
                                        <option value="Dispensed" style={{ background: '#0f1420' }}>Dispensed (Prescription)</option>
                                        <option value="Loss/Damage" style={{ background: '#0f1420' }}>Loss / Damage Adjustment</option>
                                        <option value="Expired" style={{ background: '#0f1420' }}>Expired Stock Disposal</option>
                                        <option value="Return to Supplier" style={{ background: '#0f1420' }}>Return to Supplier</option>
                                    </select>
                                </FormField>
                            </>
                        )}

                        {activeTab === 'adjustment' && (
                            <>
                                <FormField label="Adjustment Quantity (+/-)" required>
                                    <input type="number" name="quantityChanged" value={formData.quantityChanged} onChange={handleInput}
                                        placeholder="+50 or -15" className={baseInputClass} {...getFieldStyle('qty')} />
                                </FormField>
                                <FormField label="Adjustment Type">
                                    <select name="adjustmentType" value={formData.adjustmentType} onChange={handleInput}
                                        className={`${baseInputClass} cursor-pointer`} style={inputStyle}>
                                        <option value="Adjustment" style={{ background: '#0f1420' }}>Manual Correction</option>
                                        <option value="Expired" style={{ background: '#0f1420' }}>Expired Waste</option>
                                        <option value="Archived" style={{ background: '#0f1420' }}>Archived Record</option>
                                    </select>
                                </FormField>
                                <FormField label="Correction Reason" fullWidth>
                                    <input type="text" name="reason" value={formData.reason} onChange={handleInput}
                                        placeholder="e.g. Audit mismatch count..." className={baseInputClass} {...getFieldStyle('reason')} />
                                </FormField>
                            </>
                        )}
                    </div>
                </div>

                {/* Audit notes remarks */}
                <div
                    className="rounded-lg p-5 backdrop-blur-xl"
                    style={{ background: 'rgba(15,20,32,0.3)' }}
                >
                    <FormField label="Audit Log Notes">
                        <textarea
                            name="notes"
                            rows="2"
                            value={formData.notes}
                            onChange={handleInput}
                            placeholder="Provide details or reference order numbers for the cryptographic audit trail..."
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200 resize-none font-sans"
                            onFocus={() => setFocused('notes')}
                            onBlur={() => setFocused(null)}
                            style={focused === 'notes' ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                        />
                    </FormField>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate('/inventory/history')}
                        className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{
                            background: `linear-gradient(135deg, ${tabCfg.color} 0%, ${tabCfg.color}cc 100%)`,
                            color: '#0a0d14',
                        }}
                    >
                        {isSubmitting && <span className="material-symbols-rounded animate-spin text-base">sync</span>}
                        <span className="material-symbols-rounded text-base">{tabCfg.icon}</span>
                        <span>Post {tabCfg.label}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
