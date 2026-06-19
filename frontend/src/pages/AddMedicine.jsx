import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Shared dark form input styles ──
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

function FormField({ label, required, children, fullWidth }) {
    return (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {label}{required && <span className="text-[#00c2cc] ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const CATEGORIES = ['General', 'Cardiovascular', 'Anti-infective', 'Endocrine', 'Neurological', 'Emergency', 'Analgesic', 'Gastrointestinal'];

const CATEGORY_COLORS = {
    Cardiovascular: '#f87171', 'Anti-infective': '#34d399', Endocrine: '#60a5fa',
    Emergency: '#f59e0b', Analgesic: '#a78bfa', Neurological: '#e879f9',
    Gastrointestinal: '#22d3ee', General: '#00c2cc',
};

export default function AddMedicine() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '', ndc: '', category: 'General', stock: '', price: '', supplier: '', expiryDate: '', reorderPoint: 20
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [focusedField, setFocusedField] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.name || !formData.ndc || !formData.price) {
            setError('Please fill in all required fields: Name, NDC Code, and Unit Cost.');
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/medicines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    stock: formData.stock ? Number(formData.stock) : 0,
                    price: Number(formData.price),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create medicine record.');
            navigate('/medicines');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getField = (name) => ({
        onFocus: () => setFocusedField(name),
        onBlur: () => setFocusedField(null),
        style: focusedField === name ? { ...inputStyle, ...inputFocusStyle } : inputStyle,
    });

    const catColor = CATEGORY_COLORS[formData.category] || '#00c2cc';

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fade-in relative">
            {/* Background glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(0,194,204,0.03) 0%, transparent 70%)', filter: 'blur(45px)', zIndex: -1 }} />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <button onClick={() => navigate('/medicines')} className="hover:text-[#00c2cc] transition-colors cursor-pointer">
                    Ledger
                </button>
                <span className="material-symbols-rounded text-sm">chevron_right</span>
                <span style={{ color: 'var(--text-secondary)' }}>New Medicine</span>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-0.5">
                <h2 className="text-3xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Lora', serif", letterSpacing: '-0.02em' }}>
                    Register <span className="text-sky-400">Medicine</span>
                </h2>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Add a new entry to the pharmaceutical catalog.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div
                    className="flex items-center gap-3 p-4 rounded-xl text-sm animate-fade-in"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#fca5a5' }}
                >
                    <span className="material-symbols-rounded text-base flex-shrink-0" style={{ color: '#f87171' }}>error</span>
                    <span className="text-xs">{error}</span>
                </div>
            )}

            {/* Category color preview */}
            {formData.name && (
                <div
                    className="flex items-center gap-3 p-4 rounded-xl animate-fade-in backdrop-blur-md"
                    style={{ background: `${catColor}05`, border: `1px solid ${catColor}15` }}
                >
                    <span className="material-symbols-rounded text-2xl" style={{ color: catColor, fontVariationSettings: "'FILL' 1" }}>medication</span>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formData.name}</span>
                        <span className="text-xs" style={{ color: catColor }}>{formData.category}</span>
                    </div>
                    {formData.price && (
                        <span className="ml-auto text-base font-bold" style={{ color: '#00c2cc', fontFamily: "'Lora', serif" }}>
                            ₹{Number(formData.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    )}
                </div>
            )}

            {/* Form card */}
            <form
                onSubmit={handleSubmit}
                className="rounded-lg p-5 flex flex-col gap-5 backdrop-blur-xl"
                style={{ background: 'rgba(15,20,32,0.3)' }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <FormField label="Medicine Name" required fullWidth>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Atorvastatin 20mg"
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                            {...getField('name')}
                        />
                    </FormField>

                    {/* NDC */}
                    <FormField label="NDC Code" required>
                        <input
                            type="text"
                            name="ndc"
                            value={formData.ndc}
                            onChange={handleChange}
                            placeholder="00000-0000-00"
                            className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none transition-all duration-200"
                            {...getField('ndc')}
                        />
                    </FormField>

                    {/* Category */}
                    <FormField label="Category">
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200 cursor-pointer"
                            style={inputStyle}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c} style={{ background: '#0f1420' }}>{c}</option>
                            ))}
                        </select>
                    </FormField>

                    {/* Price */}
                    <FormField label="Unit Cost (₹)" required>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: '#00c2cc' }}>₹</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                                onFocus={() => setFocusedField('price')}
                                onBlur={() => setFocusedField(null)}
                                style={focusedField === 'price' ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                            />
                        </div>
                    </FormField>

                    {/* Initial stock */}
                    <FormField label="Initial Stock (units)">
                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                            {...getField('stock')}
                        />
                    </FormField>

                    {/* Reorder Threshold */}
                    <FormField label="Reorder Threshold (units)" required>
                        <input
                            type="number"
                            name="reorderPoint"
                            value={formData.reorderPoint}
                            onChange={handleChange}
                            placeholder="20"
                            min="0"
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                            {...getField('reorderPoint')}
                        />
                    </FormField>

                    {/* Supplier */}
                    <FormField label="Supplier">
                        <input
                            type="text"
                            name="supplier"
                            value={formData.supplier}
                            onChange={handleChange}
                            placeholder="e.g. McKesson, Cardinal Health…"
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                            {...getField('supplier')}
                        />
                    </FormField>

                    {/* Expiry Date */}
                    <FormField label="Expiry Date">
                        <input
                            type="date"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200 cursor-pointer"
                            {...getField('expiryDate')}
                        />
                    </FormField>
                </div>

                {/* Stock note */}
                <div
                    className="flex items-start gap-2.5 p-3 rounded-lg"
                    style={{ background: 'rgba(0,194,204,0.03)' }}
                >
                    <span className="material-symbols-rounded text-sm mt-0.5" style={{ color: '#00c2cc', fontVariationSettings: "'FILL' 1" }}>info</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Medicines are <strong style={{ color: 'var(--text-primary)' }}>never deleted</strong>. They are set to Active, Inactive, or Archived. Stock changes should always be recorded as transactions.
                    </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/medicines')}
                        className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, #00c2cc 0%, #0099a8 100%)',
                            color: '#0a0d14',
                        }}
                    >
                        {isSubmitting && <span className="material-symbols-rounded animate-spin text-base">sync</span>}
                        <span>Save Medicine</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
