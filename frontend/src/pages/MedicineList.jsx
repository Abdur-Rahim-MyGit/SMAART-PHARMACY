import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Health score 0-100 ──
function calcHealth(meds) {
    if (!meds.length) return 0;
    const active = meds.filter(m => m.status === 'Active');
    const total = meds.filter(m => m.status !== 'Archived');
    if (!total.length) return 0;
    const ratio = active.length / total.length;
    const low = active.filter(m => m.stock > 0 && m.stock < (m.reorderPoint !== undefined ? m.reorderPoint : 20)).length;
    const zero = active.filter(m => m.stock === 0).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expired = active.filter(m => m.expiryDate && new Date(m.expiryDate) < today).length;
    return Math.max(0, Math.min(100, Math.round(
        ratio * 100 - (low / (active.length || 1)) * 20 - (zero / (active.length || 1)) * 40 - (expired / (active.length || 1)) * 50
    )));
}

const CAT_COLORS = {
    Cardiovascular: '#f87171', 'Anti-infective': '#34d399', Endocrine: '#60a5fa',
    Emergency: '#f59e0b', Analgesic: '#a78bfa', Neurological: '#e879f9',
    Gastrointestinal: '#22d3ee', General: '#00B4D8',
};
const CAT_ICONS = {
    Cardiovascular: 'favorite', 'Anti-infective': 'coronavirus', Endocrine: 'opacity',
    Emergency: 'emergency', Analgesic: 'healing', Neurological: 'psychology',
    Gastrointestinal: 'bubble_chart', General: 'medication',
};
const STATUS_CFG = {
    Active:   { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
    Inactive: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
    Archived: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
};
const CATEGORIES = ['All', 'Cardiovascular', 'Anti-infective', 'Endocrine', 'Emergency', 'Analgesic', 'Neurological', 'Gastrointestinal', 'General'];

// ── AI insight blurbs (max 2, most critical) ──
function getInsights(meds) {
    const active = meds.filter(m => m.status === 'Active');
    const zero = active.filter(m => m.stock === 0);
    const low = active.filter(m => m.stock > 0 && m.stock < (m.reorderPoint !== undefined ? m.reorderPoint : 20));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expired = active.filter(m => m.expiryDate && new Date(m.expiryDate) < today);
    const nearExpiry = active.filter(m => m.expiryDate && new Date(m.expiryDate) >= today && new Date(m.expiryDate) <= thirtyDaysFromNow);

    const insights = [];
    if (expired.length) insights.push({ icon: 'event_busy', color: '#f87171', bg: 'rgba(248,113,113,0.04)', border: 'rgba(248,113,113,0.15)', text: `${expired.length} items expired.` });
    if (nearExpiry.length) insights.push({ icon: 'warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.15)', text: `${nearExpiry.length} items near expiry.` });
    if (zero.length) insights.push({ icon: 'error', color: '#f87171', bg: 'rgba(248,113,113,0.04)', border: 'rgba(248,113,113,0.15)', text: `${zero.length} items depleted.` });
    if (low.length) insights.push({ icon: 'warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.15)', text: `${low.length} items running low.` });
    if (!insights.length && active.length) insights.push({ icon: 'check_circle', color: '#34d399', bg: 'rgba(52,211,153,0.04)', border: 'rgba(52,211,153,0.15)', text: `All catalog channels active.` });
    return insights.slice(0, 2);
}

// ── Text Highlight Component ──
function HighlightText({ text, query }) {
    if (!query || !text) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() 
                    ? <span key={i} className="text-[#00e5ff] font-bold bg-[#00e5ff]/10 rounded-sm px-0.5">{part}</span> 
                    : <span key={i}>{part}</span>
            )}
        </span>
    );
}

// ── CountUp Metrics Component ──
function CountUp({ value, prefix = "", suffix = "", duration = 800 }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseFloat(value);
        if (isNaN(end)) {
            setCount(value);
            return;
        }

        const isInt = Number.isInteger(end);
        const startTime = performance.now();

        const updateCount = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const current = progress * end;
            setCount(isInt ? Math.floor(current) : parseFloat(current.toFixed(1)));

            if (progress < 1) {
                requestAnimationFrame(updateCount);
            } else {
                setCount(end);
            }
        };

        requestAnimationFrame(updateCount);
    }, [value, duration]);

    return (
        <span>
            {prefix}
            {count.toLocaleString('en-IN')}
            {suffix}
        </span>
    );
}

// ── Deterministic Sparkline Generation ──
function getDeterministicPoints(id, stock) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate 7 points starting near the stock level
    const points = [];
    let current = stock;
    
    for (let i = 0; i < 7; i++) {
        // pseudo random value between -10 and +10
        const rand = ((hash >> (i * 2)) & 15) - 7.5;
        current = Math.max(0, current + rand);
        points.push(current);
    }
    
    return points;
}

function getSparklinePath(id, stock) {
    const points = getDeterministicPoints(id, stock);
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    const width = 60;
    const height = 20;
    const padding = 2;
    
    const coords = points.map((p, i) => {
        const x = (i / 6) * (width - 2 * padding) + padding;
        const y = height - ((p - min) / range) * (height - 2 * padding) - padding;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    return `M ${coords.join(' L ')}`;
}

// ── Premium medicine card ──
function MedCard({ item, query, index, onView, onEdit }) {
    const cc = CAT_COLORS[item.category] || '#00B4D8';
    const ci = CAT_ICONS[item.category] || 'medication';
    const sc = STATUS_CFG[item.status] || STATUS_CFG.Archived;
    const isZero = item.stock === 0;
    const reorderThreshold = item.reorderPoint !== undefined ? item.reorderPoint : 20;
    const isLow = item.stock > 0 && item.stock < reorderThreshold;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999);

    const expDate = item.expiryDate ? new Date(item.expiryDate) : null;
    const isExpired = expDate ? expDate < today : false;
    const isNearExpiry = expDate ? (expDate >= today && expDate <= thirtyDaysFromNow) : false;

    return (
        <div
            className="flex flex-col relative overflow-hidden cursor-pointer transition-all duration-300 group premium-card shadow-sm border animate-slide-up"
            style={{ 
                borderColor: 'var(--card-border)',
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'both'
            }}
            onMouseEnter={e => { 
                e.currentTarget.style.transform = 'translateY(-3px)'; 
                e.currentTarget.style.borderColor = `${cc}40`; 
                e.currentTarget.style.boxShadow = `0 8px 40px ${cc}15`; 
            }}
            onMouseLeave={e => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; 
            }}
            onClick={() => onView(item._id)}
        >
            {/* Header strip with soft gradient matching category */}
            <div className="relative h-16 flex items-center justify-between px-4 overflow-hidden border-b border-[var(--card-border)]">
                {/* Background glow matching category */}
                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none rounded-full"
                    style={{ background: `radial-gradient(circle, ${cc}15 0%, transparent 70%)`, filter: 'blur(15px)' }} />

                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                        style={{ background: `${cc}08` }}>
                        <span className="material-symbols-rounded"
                            style={{ fontSize: '18px', color: cc, fontVariationSettings: "'FILL' 1" }}>
                            {ci}
                        </span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{item.category}</span>
                </div>
                
                {/* Status indicator pill */}
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${item.status === 'Inactive' ? 'animate-pulse-slow' : ''}`}
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {item.status}
                </span>
            </div>

            {/* Body */}
            <div className="flex flex-col px-4 pb-4 pt-3.5 gap-2 relative z-10">
                <div className="flex flex-col gap-0.5">
                    <span className="text-base font-extrabold tracking-tight leading-snug line-clamp-1 text-[var(--text-primary)] group-hover:text-[#00e5ff] transition-colors duration-200"
                        style={{ fontFamily: "'Lora', serif" }}>
                        <HighlightText text={item.name} query={query} />
                    </span>
                    
                    {/* Thin Stock Level Progress Bar */}
                    <div className="w-full h-[3px] bg-[var(--card-border)] rounded-full overflow-hidden mt-1.5 mb-1 relative">
                        <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                                width: `${Math.min(100, (item.stock / (reorderThreshold * 2 || 100)) * 100)}%`,
                                background: (item.stock < reorderThreshold) ? '#f87171' : cc
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{item.ndc}</span>
                        {item.supplier && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-[var(--card-border)]" />
                                <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{item.supplier}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Expiry / Stock Out warnings */}
                <div className="flex flex-col gap-1 mt-0.5 min-h-[20px]">
                    {isExpired && (
                        <div className="text-xs font-extrabold px-2 py-0.5 rounded flex items-center gap-1.5 w-max"
                            style={{ background: 'rgba(248,113,113,0.06)', color: '#f87171', border: '1px solid rgba(248,113,113,0.12)' }}>
                            <span className="material-symbols-rounded text-xs">event_busy</span>
                            Expired
                        </div>
                    )}
                    {!isExpired && isNearExpiry && (
                        <div className="text-xs font-extrabold px-2 py-0.5 rounded flex items-center gap-1.5 w-max"
                            style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.12)' }}>
                            <span className="material-symbols-rounded text-xs">warning</span>
                            Expiring Soon
                        </div>
                    )}
                </div>

                {/* Price + stock row */}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--card-border)]">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Unit Cost</span>
                        <span className="text-lg font-black text-[var(--text-primary)] mt-0.5" style={{ fontFamily: "'Lora', serif" }}>
                            ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Deterministic Sparkline */}
                    {!isZero && (
                        <div className="flex items-center" title="7-day stock trend">
                            <svg width="60" height="20" className="opacity-80">
                                <path
                                    d={getSparklinePath(item._id, item.stock)}
                                    fill="none"
                                    stroke={isLow ? '#f59e0b' : '#34d399'}
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    )}

                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stock Level</span>
                        <span className="text-xs font-bold mt-0.5" style={{ color: isZero ? '#f87171' : isLow ? '#f59e0b' : '#34d399' }}>
                            {isZero ? 'Out of Stock' : `${item.stock.toLocaleString('en-IN')} units`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MedicineList() {
    const { activeBranch, user } = useAuth();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const searchInputRef = useRef(null);

    const fetchMedicines = async () => {
        setLoading(true); setError(null);
        try {
            let url = statusFilter !== 'All' ? `/api/medicines?status=${statusFilter}` : '/api/medicines';
            if (activeBranch) {
                url += statusFilter !== 'All' ? `&branchId=${activeBranch.id}` : `?branchId=${activeBranch.id}`;
            }
            const res = await fetch(url);
            if (!res.ok) { if (res.status === 401) { navigate('/login'); return; } throw new Error('Failed to load catalog.'); }
            setMedicines(await res.json());
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMedicines(); }, [statusFilter, activeBranch]);

    // Handle "/" keyboard shortcut to focus search input
    useEffect(() => {
        const handleSearchKey = (e) => {
            if (e.key === '/' && document.activeElement !== searchInputRef.current) {
                const active = document.activeElement;
                const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
                if (!isInput) {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
            }
        };
        window.addEventListener('keydown', handleSearchKey);
        return () => window.removeEventListener('keydown', handleSearchKey);
    }, []);

    const filtered = useMemo(() => medicines.filter(m => {
        const q = searchQuery.toLowerCase();
        return (!q || m.name.toLowerCase().includes(q) || m.ndc.includes(q) || m.category.toLowerCase().includes(q) || (m.supplier||'').toLowerCase().includes(q))
            && (categoryFilter === 'All' || m.category === categoryFilter);
    }), [medicines, searchQuery, categoryFilter]);

    const totalStock = medicines.reduce((a, m) => a + (m.status !== 'Archived' ? m.stock : 0), 0);
    const activeCount = medicines.filter(m => m.status === 'Active').length;
    const totalValue = medicines.reduce((a, m) => a + (m.status !== 'Archived' ? m.stock * m.price : 0), 0);
    const health = calcHealth(medicines);
    const insights = getInsights(medicines);
    const healthColor = health >= 80 ? '#34d399' : health >= 50 ? '#f59e0b' : '#f87171';

    // Compute category counts
    const activeCategoryCounts = useMemo(() => {
        const counts = {};
        CATEGORIES.forEach(cat => {
            if (cat === 'All') {
                counts['All'] = medicines.filter(m => m.status === 'Active').length;
            } else {
                counts[cat] = medicines.filter(m => m.status === 'Active' && m.category === cat).length;
            }
        });
        return counts;
    }, [medicines]);

    return (
        <div className="flex flex-col gap-4 max-w-7xl mx-auto animate-fade-in relative z-10">

            {/* ── Unified Split Hero & Key Metrics Banner ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left Area (Hero Typography + Search & Filters) */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    {/* Hero Typography */}
                    <div className="flex flex-col gap-1.5 pt-1">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Catalog Core
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none" style={{ fontFamily: "'Lora', serif" }}>
                            Intelligent <span className="text-sky-400">Medicine</span> Catalog
                        </h2>
                        <p className="text-[13px] max-w-lg leading-normal mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Monitor inventory health, track stock movements, and prevent shortages.
                        </p>
                    </div>

                    {/* ── Command Bar Search & Filters ── */}
                    <div className="p-4 rounded-xl flex flex-col gap-4 backdrop-blur-xl border border-[var(--card-border)] premium-card shadow-sm">
                        
                        {/* Search / Filter Row */}
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            {/* Search Field */}
                            <div className="relative flex-1 w-full">
                                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none text-[var(--brand)]">search</span>
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    placeholder="Search medication name, NDC, category... (Press '/' to focus)" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:border-[var(--brand)]"
                                />
                            </div>

                            {/* Status Selectors */}
                            <div className="flex items-center rounded-lg p-1 gap-1 flex-shrink-0 w-full md:w-auto border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
                                {['All', 'Active', 'Inactive', 'Archived'].map(f => (
                                    <button key={f} onClick={() => setStatusFilter(f)}
                                        className="flex-1 md:flex-initial px-4 py-2 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer"
                                        style={{
                                            background: statusFilter === f ? 'var(--brand-dim)' : 'transparent',
                                            color: statusFilter === f ? 'var(--brand)' : 'var(--text-secondary)',
                                        }}>
                                        {f}
                                    </button>
                                ))}
                            </div>

                            {/* New Medicine Action */}
                            {(user?.role === 'Pharmacist' || user?.role === 'Manager' || user?.role === 'Admin') && (
                                <button
                                    onClick={() => navigate('/medicines/add')}
                                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer w-full md:w-auto flex-shrink-0 text-white hover:shadow-lg bg-[var(--brand)]"
                                >
                                    <span className="material-symbols-rounded text-lg">add</span>
                                    <span>New Medicine</span>
                                </button>
                            )}
                        </div>

                        {/* Category Selection Row */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollable">
                            {CATEGORIES.map(cat => {
                                const cc = CAT_COLORS[cat] || '#00e5ff';
                                const active = categoryFilter === cat;
                                const count = activeCategoryCounts[cat] || 0;
                                return (
                                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex-shrink-0"
                                        style={{
                                            background: active ? `${cc}25` : 'transparent',
                                            color: active ? cc : 'var(--text-secondary)',
                                            border: active ? `1px solid ${cc}40` : '1px solid transparent',
                                        }}>
                                        {cat !== 'All' && <span className="material-symbols-rounded text-xs" style={{ fontVariationSettings: "'FILL' 1", color: active ? cc : 'inherit' }}>{CAT_ICONS[cat]}</span>}
                                        <span>{cat}</span>
                                        <span 
                                            className="text-xs px-1.5 py-0.5 rounded-full font-mono ml-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)]"
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Area (Connected Metrics Panel) */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-4 lg:pl-4 self-start pt-2 lg:pt-0">
                    {/* Inventory Health Card */}
                    <div className="rounded-lg p-3.5 flex flex-col gap-1.5 backdrop-blur-md premium-card shadow-sm border border-[var(--card-border)]">
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Inventory Health</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-3xl font-black leading-none tracking-tighter" style={{ fontFamily: "'Lora', serif", color: healthColor }}>
                                <CountUp value={health} suffix="%" />
                            </span>
                            <span className="text-xs font-bold px-1.5 py-0.2 rounded" style={{ background: `${healthColor}10`, color: healthColor }}>
                                {health >= 80 ? 'Optimal' : health >= 50 ? 'Warning' : 'Critical'}
                            </span>
                        </div>
                    </div>

                    {/* Stock Value Card */}
                    <div className="rounded-lg p-3.5 flex flex-col gap-1.5 backdrop-blur-md premium-card shadow-sm border border-[var(--card-border)]">
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Stock Value</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-3xl font-black text-[var(--text-primary)] leading-none tracking-tighter" style={{ fontFamily: "'Lora', serif" }}>
                                <CountUp value={(totalValue/100000)} prefix="₹" suffix="L" />
                            </span>
                            <span className="flex items-center text-xs font-bold text-emerald-500 gap-0.5 ml-1" title="Stock value trend versus last week">
                                <span className="material-symbols-rounded text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                                <span>↑4%</span>
                            </span>
                        </div>
                    </div>

                    {/* Smart Insights list Card */}
                    <div className="col-span-2 rounded-lg p-3.5 flex flex-col gap-2.5 backdrop-blur-md premium-card shadow-sm border border-[var(--card-border)]">
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Smart Insights</span>
                        <div className="flex flex-col gap-1.5">
                            {insights.map((ins, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ins.color }} />
                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ins.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Subtitle / Details row ── */}
            <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Showing <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> of {medicines.length} registered medications
                </span>
                {user?.role !== 'Admin' && (
                    <button onClick={() => navigate('/inventory/transaction-new')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                        <span className="material-symbols-rounded text-sm">swap_horiz</span>
                        <span>Record Movement</span>
                    </button>
                )}
            </div>

            {/* ── Catalog Grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl flex flex-col h-[185px] relative overflow-hidden border border-[var(--card-border)]"
                            style={{ background: 'rgba(15,20,32,0.3)' }}
                        >
                            {/* Skeleton Header */}
                            <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--card-border)] relative overflow-hidden">
                                <div className="absolute inset-0 animate-shimmer" />
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)]" />
                                    <div className="w-16 h-3.5 rounded bg-[var(--bg-secondary)]" />
                                </div>
                                <div className="w-12 h-5 rounded bg-[var(--bg-secondary)]" />
                            </div>
                            {/* Skeleton Body */}
                            <div className="flex flex-col px-4 pb-4 pt-3.5 gap-3 relative overflow-hidden flex-1 justify-between">
                                <div className="absolute inset-0 animate-shimmer" />
                                <div className="flex flex-col gap-2">
                                    <div className="w-3/4 h-5 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-1/2 h-3 rounded bg-[var(--bg-secondary)]" />
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="w-10 h-2.5 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-14 h-4 rounded bg-[var(--bg-secondary)]" />
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="w-12 h-2.5 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-16 h-4 rounded bg-[var(--bg-secondary)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-danger)]">
                    <span className="material-symbols-rounded text-4xl">error</span>
                    <span className="text-sm">{error}</span>
                    <button onClick={fetchMedicines} className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer bg-[var(--card-border)]/20 border border-[var(--card-border)]">Retry</button>
                </div>
            ) : medicines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center gap-4 animate-fade-in premium-card shadow-sm">
                    <span className="material-symbols-rounded text-4xl text-[var(--brand)] opacity-65">layers</span>
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>No medicines added yet</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
                            No medicines added yet. Start by adding your first medicine to the catalog.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/medicines/add')}
                        className="px-5 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer text-white hover:shadow-lg flex items-center gap-1.5 bg-[var(--brand)]"
                    >
                        <span className="material-symbols-rounded text-base">add</span>
                        <span>Add Medicine</span>
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center gap-4 animate-fade-in premium-card shadow-sm">
                    <span className="material-symbols-rounded text-4xl text-amber-500 opacity-65">search_off</span>
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>No matching medications found</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto leading-relaxed">
                            We couldn't find any medications matching "{searchQuery}" under the current filters. Please verify NDC spelling or category flags.
                        </p>
                    </div>
                    <button
                        onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }}
                        className="px-5 py-2.5 rounded-xl bg-[var(--card-border)]/20 hover:bg-[var(--card-border)]/40 text-[var(--text-primary)] border border-[var(--card-border)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mt-1 animate-pulse-slow"
                    >
                        <span className="material-symbols-rounded text-sm">clear_all</span>
                        <span>Clear Filters</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((item, index) => (
                        <MedCard key={item._id} item={item} query={searchQuery} index={index}
                            onView={id => navigate(`/medicines/${id}`)}
                            onEdit={id => navigate(`/medicines/edit/${id}`)} />
                    ))}
                </div>
            )}
        </div>
    );
}
