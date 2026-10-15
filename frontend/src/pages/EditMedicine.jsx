import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const inputStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: 'none',
    color: 'var(--text-primary)',
    caretColor: '#00B4D8',
};
const focusStyle = {
    background: 'rgba(255,255,255,0.04)',
    boxShadow: '0 0 0 1.5px rgba(0,194,204,0.35)',
};

const STATUS_CONFIG = {
    Active:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)'  },
    Inactive: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)'  },
    Archived: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
};

const CATEGORIES = ['General', 'Cardiovascular', 'Anti-infective', 'Endocrine', 'Neurological', 'Emergency', 'Analgesic', 'Gastrointestinal'];

function FormField({ label, required, children, fullWidth }) {
    return (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {label}{required && <span style={{ color: '#00B4D8' }} className="ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

export default function EditMedicine() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', ndc: '', category: 'General', stock: '', price: '', supplier: '', status: 'Active', expiryDate: '', reorderPoint: '20' });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [focused, setFocused] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/medicines/${id}`);
                if (!res.ok) { if (res.status === 401) navigate('/login'); throw new Error('Failed to load record.'); }
                const d = await res.json();
                setFormData({
                    name: d.name,
                    ndc: d.ndc,
                    category: d.category || 'General',
                    stock: d.stock.toString(),
                    price: d.price.toString(),
                    supplier: d.supplier || '',
                    status: d.status || 'Active',
                    expiryDate: d.expiryDate ? d.expiryDate.split('T')[0] : '',
                    reorderPoint: d.reorderPoint !== undefined && d.reorderPoint !== null ? d.reorderPoint.toString() : '20'
                });
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        load();
    }, [id, navigate]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.name || !formData.ndc || !formData.price) { setError('Name, NDC Code, and Unit Cost are required.'); return; }
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/medicines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    stock: Number(formData.stock),
                    price: Number(formData.price),
                    reorderPoint: Number(formData.reorderPoint)
                }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Failed to update record.');
            navigate('/medicines');
        } catch (err) { setError(err.message); }
        finally { setIsSubmitting(false); }
    };

    const getFieldStyle = (name) => ({
        onFocus: () => setFocused(name),
        onBlur: () => setFocused(null),
        style: focused === name ? { ...inputStyle, ...focusStyle } : inputStyle,
    });

    const baseClass = 'w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200';
    const statusCfg = STATUS_CONFIG[formData.status] || STATUS_CONFIG.Archived;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-3" style={{ color: 'var(--text-muted)' }}>
                <span className="material-symbols-rounded animate-spin text-3xl" style={{ color: '#00B4D8' }}>sync</span>
                <span className="text-sm">Loading record…</span>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fade-in relative">
            {/* Background glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(0,194,204,0.03) 0%, transparent 70%)', filter: 'blur(45px)', zIndex: -1 }} />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <button onClick={() => navigate('/medicines')} className="hover:text-[#00B4D8] transition-colors cursor-pointer">Ledger</button>
                <span className="material-symbols-rounded text-sm">chevron_right</span>
                <span style={{ color: 'var(--text-secondary)' }}>Edit Medicine</span>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-0.5">
                <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "'Lora', serif", letterSpacing: '-0.02em' }}>
                    Edit <span className="text-sky-400">Medicine</span>
                </h2>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Update catalog properties or change inventory status.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-xs animate-fade-in"
                    style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                    <span className="material-symbols-rounded text-base flex-shrink-0" style={{ color: '#f87171' }}>error</span>
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Main fields card */}
                <div className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-xl"
                    style={{ background: 'rgba(15,20,32,0.3)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Medicine Name" required fullWidth>
                            <input type="text" name="name" value={formData.name} onChange={handleChange}
                                className={baseClass} {...getFieldStyle('name')} />
                        </FormField>
                        <FormField label="NDC Code" required>
                            <input type="text" name="ndc" value={formData.ndc} onChange={handleChange}
                                className={`${baseClass} font-mono`} {...getFieldStyle('ndc')} />
                        </FormField>
                        <FormField label="Category">
                            <select name="category" value={formData.category} onChange={handleChange}
                                className={`${baseClass} cursor-pointer`} style={inputStyle}>
                                {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0f1420' }}>{c}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Unit Cost (₹)" required>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: '#00B4D8' }}>₹</span>
                                <input type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange}
                                    className={`${baseClass} pl-7`}
                                    onFocus={() => setFocused('price')} onBlur={() => setFocused(null)}
                                    style={focused === 'price' ? { ...inputStyle, ...focusStyle } : inputStyle} />
                            </div>
                        </FormField>
                        <FormField label="Stock Quantity">
                            <input type="number" name="stock" value={formData.stock} onChange={handleChange}
                                className={baseClass} {...getFieldStyle('stock')} />
                        </FormField>
                        <FormField label="Reorder Threshold (units)" required>
                            <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange}
                                className={baseClass} {...getFieldStyle('reorderPoint')} />
                        </FormField>
                        <FormField label="Supplier">
                            <input type="text" name="supplier" value={formData.supplier} onChange={handleChange}
                                className={baseClass} {...getFieldStyle('supplier')} />
                        </FormField>
                        <FormField label="Expiry Date">
                            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange}
                                className={`${baseClass} cursor-pointer`} {...getFieldStyle('expiryDate')} />
                        </FormField>
                    </div>
                </div>

                {/* Status card */}
                <div className="rounded-lg p-5 flex flex-col gap-4 backdrop-blur-xl"
                    style={{ background: 'rgba(15,20,32,0.3)' }}>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                            Inventory Status
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Medicines are never permanently deleted — only status changes.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                            const isActive = formData.status === status;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, status }))}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200"
                                    style={{
                                        background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                                        color: isActive ? cfg.color : 'var(--text-muted)',
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? cfg.color : 'rgba(255,255,255,0.2)' }} />
                                    {status}
                                </button>
                            );
                        })}
                    </div>

                    {/* Current status preview */}
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ background: statusCfg.bg, color: statusCfg.color }}
                    >
                        <span className="material-symbols-rounded text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {formData.status === 'Active' ? 'check_circle' : formData.status === 'Inactive' ? 'pause_circle' : 'archive'}
                        </span>
                        Medicine will be marked as <strong>{formData.status}</strong>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                    <button
                        type="button"
                        onClick={() => navigate(`/medicines/${id}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                        <span className="material-symbols-rounded text-base">visibility</span>
                        View Details
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/medicines')}
                            className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, #00B4D8 0%, #0099a8 100%)',
                                color: '#0a0d14',
                            }}
                        >
                            {isSubmitting && <span className="material-symbols-rounded animate-spin text-base">sync</span>}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
