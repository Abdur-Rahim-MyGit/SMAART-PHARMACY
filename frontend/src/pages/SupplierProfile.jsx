import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SupplierProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data States
    const [supplier, setSupplier] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSupplierDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/suppliers/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Supplier not found.');
                throw new Error('Failed to load supplier profile.');
            }
            const data = await res.json();
            setSupplier(data.supplier);
            setMedicines(data.medicines || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSupplierDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-slate-400 animate-fade-in">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400 font-bold">sync</span>
                <span className="text-xs">Loading supplier details & history catalog...</span>
            </div>
        );
    }

    if (error || !supplier) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center animate-fade-in">
                <span className="material-symbols-rounded text-5xl text-red-400">error</span>
                <p className="text-sm text-slate-300">{error || 'Supplier profile could not be loaded.'}</p>
                <button 
                    onClick={() => navigate('/suppliers')} 
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00c2cc]/5 border border-[#00c2cc]/15 text-[#00c2cc] cursor-pointer hover:bg-[#00c2cc]/10"
                >
                    Back to Suppliers
                </button>
            </div>
        );
    }

    // Health score indicators setup
    let healthBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    let healthIndicator = 'Excellent Vendor';
    let dotCol = 'bg-emerald-400';
    if (supplier.healthScore < 50) {
        healthBg = 'bg-red-500/10 border-red-500/20 text-red-400';
        healthIndicator = 'High Risk / Poor';
        dotCol = 'bg-red-400';
    } else if (supplier.healthScore < 80) {
        healthBg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
        healthIndicator = 'Average Performance';
        dotCol = 'bg-amber-400';
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Breadcrumb & Navigation Actions */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/suppliers')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                    <span className="material-symbols-rounded text-sm">arrow_back</span>
                    <span>Back to Directory</span>
                </button>

                <span className="text-[11px] text-slate-500 uppercase tracking-widest font-mono">
                    ID: {supplier._id}
                </span>
            </div>

            {/* Profile Overview Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Basic Details (Left Panel) */}
                <div className="lg:col-span-4 rounded-xl glass border border-white/5 p-6 flex flex-col gap-5 relative card-shine">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Verified Supplier</span>
                            <h3 className="text-2xl font-black text-white font-serif tracking-tight leading-tight">
                                {supplier.name}
                            </h3>
                        </div>
                        <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                            supplier.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                            {supplier.status}
                        </span>
                    </div>

                    <hr className="border-white/5" />

                    {/* Contact Credentials */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-rounded text-slate-400 text-sm mt-0.5">person</span>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase font-bold text-slate-400">Contact Person</span>
                                <span className="text-xs text-slate-200">{supplier.contactPerson}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-rounded text-slate-400 text-sm mt-0.5">phone</span>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase font-bold text-slate-400">Phone Number</span>
                                <span className="text-xs text-slate-200 font-mono">{supplier.phone}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-rounded text-slate-400 text-sm mt-0.5">mail</span>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase font-bold text-slate-400">Email Address</span>
                                <span className="text-xs text-slate-200">{supplier.email}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-rounded text-slate-400 text-sm mt-0.5">home</span>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase font-bold text-slate-400">Address</span>
                                <span className="text-xs text-slate-300 leading-normal">{supplier.address}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-rounded text-slate-400 text-sm mt-0.5">pin</span>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase font-bold text-slate-400">GST Registration</span>
                                <span className="text-xs text-slate-200 font-mono uppercase tracking-wide">{supplier.gstNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Health & Performance Metrics (Right Panel) */}
                <div className="lg:col-span-8 rounded-xl glass border border-white/5 p-6 flex flex-col justify-between gap-6">
                    
                    {/* Health score top banner */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${healthBg}`}>
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-lg bg-white/5 flex items-center justify-center relative">
                                <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${dotCol}`} />
                                <span className="absolute text-[11px] font-black text-white">{supplier.healthScore}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white leading-tight">Supplier Health Score</span>
                                <span className="text-[11px] text-slate-300 mt-0.5">Composite timeliness, completions, and returns rating.</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-black uppercase tracking-wider">{healthIndicator}</span>
                            <span className="text-[11px] text-yellow-400 mt-0.5">{supplier.rating.toFixed(1)} / 5.0 Rating</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Completed Orders', val: supplier.performanceMetrics?.completedOrders || 0, sub: 'Delivered', icon: 'done_all' },
                            { label: 'Pending Runs', val: supplier.performanceMetrics?.pendingOrders || 0, sub: 'In pipeline', icon: 'pending_actions' },
                            { label: 'Total Procured', val: `₹${((supplier.performanceMetrics?.totalPurchaseValue || 0) / 1000).toFixed(1)}k`, sub: 'Spend value', icon: 'currency_rupee' },
                            { label: 'Avg Delivery Time', val: `${supplier.performanceMetrics?.averageDeliveryTime || 0}d`, sub: 'Timeliness rate', icon: 'schedule' },
                        ].map((s, idx) => (
                            <div key={idx} className="p-4 rounded-lg bg-white/[0.01] border border-white/5 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-slate-400">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">{s.label}</span>
                                    <span className="material-symbols-rounded text-sm">{s.icon}</span>
                                </div>
                                <span className="text-xl font-black text-white mt-1 leading-none">{s.val}</span>
                                <span className="text-[11px] text-slate-400 mt-0.5">{s.sub}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between text-[11px] text-slate-400 border-t border-white/5 pt-4 gap-2">
                        <span>Last Delivery Date: <strong className="text-slate-200">
                            {supplier.performanceMetrics?.lastDeliveryDate ? new Date(supplier.performanceMetrics.lastDeliveryDate).toLocaleDateString() : 'N/A'}
                        </strong></span>
                        <span>Product Return Rate: <strong className="text-red-400 font-mono">{(supplier.performanceMetrics?.returnRate || 0).toFixed(1)}%</strong></span>
                    </div>

                </div>

            </div>

            {/* Mapped Medicines List */}
            <div className="rounded-xl glass border border-white/5 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-cyan-400">layers</span>
                        <h3 className="text-base font-bold text-white font-serif">Medicines Supplied ({medicines.length})</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">Catalog mapping</span>
                </div>

                <div className="overflow-x-auto">
                    {medicines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                            <span className="material-symbols-rounded text-3xl">layers</span>
                            <span className="text-xs">No catalog medicines are currently linked to this supplier.</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="pb-2 pl-2">Medicine Name</th>
                                    <th className="pb-2">NDC</th>
                                    <th className="pb-2">Category</th>
                                    <th className="pb-2 text-center">Current Stock</th>
                                    <th className="pb-2 text-right">Negotiated Cost</th>
                                    <th className="pb-2 text-right">Last Purchase Price</th>
                                    <th className="pb-2 text-right pr-2">Retail Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medicines.map((med) => {
                                    const isPrimary = med.primarySupplier?.toString() === supplier._id;
                                    return (
                                        <tr key={med._id} className="border-b border-white/5 hover:bg-white/[0.005] transition-all group">
                                            <td className="py-3 pl-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white">{med.name}</span>
                                                    {isPrimary ? (
                                                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                                                            Primary
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-black text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded uppercase">
                                                            Alternate
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 text-xs text-slate-300 font-mono">{med.ndc}</td>
                                            <td className="py-3 text-xs text-slate-400">{med.category}</td>
                                            <td className="py-3 text-center text-xs">
                                                <span className={med.stock <= med.reorderPoint ? 'text-red-400 font-bold font-mono' : 'text-slate-300 font-mono'}>
                                                    {med.stock}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right text-xs font-bold text-cyan-400 font-mono">₹{(med.supplierCost || 0).toFixed(2)}</td>
                                            <td className="py-3 text-right text-xs text-slate-300 font-mono">₹{(med.lastPurchasePrice || 0).toFixed(2)}</td>
                                            <td className="py-3 text-right text-xs text-emerald-400 font-mono pr-2">₹{med.price.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>
    );
}
