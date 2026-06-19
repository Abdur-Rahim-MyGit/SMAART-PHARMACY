import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReorderIntelligence() {
    const { activeBranch } = useAuth();
    const [queue, setQueue] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state for placing order
    const [selectedMed, setSelectedMed] = useState(null);
    const [orderQty, setOrderQty] = useState(100);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch reorder queue
            const url = activeBranch ? `/api/reorders?branchId=${activeBranch.id}` : '/api/reorders';
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to retrieve reorder intelligence queue.');
            }
            const data = await res.json();
            setQueue(data.autoQueue || []);
            setActiveOrders(data.activeRequests || []);

            // Fetch suppliers for fallback/assignment
            const supRes = await fetch('/api/suppliers?filter=Active');
            if (supRes.ok) {
                const supData = await supRes.json();
                setSuppliers(supData);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeBranch]);

    const handlePlaceOrderClick = (item) => {
        const med = item.medicineId;
        setSelectedMed(med);
        setOrderQty(item.quantityNeeded);
        setSelectedSupplierId(med.primarySupplier?._id || med.primarySupplier || '');
    };

    const handleConfirmOrder = async (e) => {
        e.preventDefault();
        if (!selectedMed) return;
        if (!selectedSupplierId) {
            alert('Please select a supplier to generate the purchase order.');
            return;
        }

        setSubmitting(true);
        try {
            // Call generateDraftPO to create a Draft Purchase Order
            const res = await fetch('/api/reorders/generate-po', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicineId: selectedMed._id,
                    quantityNeeded: Number(orderQty),
                    supplierId: selectedSupplierId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to generate draft PO.');
            }

            alert(`Draft Purchase Order successfully generated for ${selectedMed.name}!`);
            setSelectedMed(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReceiveShipment = async (requestId) => {
        if (!window.confirm('Mark this shipment as arrived? Stock levels will be updated and a Stock In audit log transaction will be generated.')) {
            return;
        }
        try {
            const res = await fetch(`/api/reorders/${requestId}/complete`, {
                method: 'PUT'
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to complete shipment receipt.');
            }
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-44 gap-3 text-slate-400">
                <span className="material-symbols-rounded animate-spin text-3xl text-cyan-400">sync</span>
                <span className="text-sm">Calculating stock runout and reorder metrics…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                <span className="material-symbols-rounded text-5xl text-red-400">error</span>
                <p className="text-sm text-slate-400">{error}</p>
                <button onClick={fetchData} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00c2cc]/5 border border-[#00c2cc]/15 text-[#00c2cc] cursor-pointer">
                    Retry Queue Check
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    Inventory Replenishment
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none font-serif">
                    Reorder <span className="text-cyan-400">Intelligence</span>
                </h2>
                <p className="text-xs text-slate-300">
                    Proactive reorder point tracking. Items below safety margins are auto-listed with vendor suggestions to speed up PO generation.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Reorder Queue */}
                <div className="lg:col-span-7 rounded-xl overflow-hidden glass border border-white/5 shadow-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">auto_mode</span>
                            <h3 className="text-base font-bold text-white font-serif">Auto-Generated Reorder Queue ({queue.length})</h3>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {queue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                                <span className="material-symbols-rounded text-3xl text-emerald-400">check_circle</span>
                                <span className="text-xs font-semibold">All stock levels exceed configured safety margins.</span>
                            </div>
                        ) : (
                            queue.map((item, idx) => {
                                const preferredSup = item.medicineId.primarySupplier;
                                return (
                                    <div key={idx} className="p-3.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between transition-all">
                                        <div className="flex flex-col min-w-0 gap-1">
                                            <span className="text-xs font-bold text-white truncate">{item.medicineId.name}</span>
                                            
                                            {/* Supplier Recommendation Badge */}
                                            {preferredSup ? (
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded self-start mt-0.5">
                                                    <span className="material-symbols-rounded text-[11px] font-bold">verified</span>
                                                    <span>Recommended Supplier: {preferredSup.name || preferredSup}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded self-start mt-0.5">
                                                    <span className="material-symbols-rounded text-[11px]">warning</span>
                                                    <span>No primary supplier assigned</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                                <span>Category: <strong className="text-slate-300">{item.medicineId.category}</strong></span>
                                                <span>•</span>
                                                <span>Current Stock: <strong className="text-red-400 font-mono">{item.medicineId.stock}</strong></span>
                                                <span>•</span>
                                                <span>Safety Point: <strong className="text-slate-300 font-mono">{item.medicineId.reorderPoint !== undefined ? item.medicineId.reorderPoint : 20}</strong></span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handlePlaceOrderClick(item)}
                                            className="px-3.5 py-2 rounded-lg bg-cyan-400 text-slate-900 text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/20 transition-all flex items-center gap-1 flex-shrink-0"
                                        >
                                            <span className="material-symbols-rounded text-sm font-bold">shopping_cart</span>
                                            <span>Order</span>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. In Transit / Active Orders (legacy reorders tracking) */}
                <div className="lg:col-span-5 rounded-xl overflow-hidden glass border border-white/5 shadow-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="material-symbols-rounded text-amber-400 text-lg">local_shipping</span>
                        <h3 className="text-base font-bold text-white font-serif">Legacy Reorder Requests ({activeOrders.length})</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                        {activeOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
                                <span className="material-symbols-rounded text-3xl">local_shipping</span>
                                <span className="text-xs">No legacy reorders currently in transit.</span>
                            </div>
                        ) : (
                            activeOrders.map((order) => (
                                <div key={order._id} className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.01] hover:bg-amber-500/[0.02] flex flex-col gap-3 transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-white truncate">{order.medicineId?.name || 'Medication'}</span>
                                            <span className="text-[11px] text-slate-400 mt-1">
                                                Qty Ordered: <strong className="text-white font-mono">{order.quantityNeeded}</strong> · Supplier: <strong className="text-white">{order.supplier}</strong>
                                            </span>
                                            <span className="text-[11px] text-amber-400 mt-0.5 font-medium">
                                                Placed: {new Date(order.orderedDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase flex-shrink-0">
                                            {order.status}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => handleReceiveShipment(order._id)}
                                        className="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 text-xs font-black hover:bg-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-rounded text-sm font-bold">check_box</span>
                                        <span>Mark Shipment Arrived</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Place Order Modal (generates PO) */}
            {selectedMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-md rounded-2xl p-6 glass-elevated border border-white/10 shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedMed(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer font-bold"
                        >
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-cyan-400">shopping_cart</span>
                            <h3 className="text-lg font-bold text-white font-serif">Auto-Fill Procurement Run</h3>
                        </div>

                        <form onSubmit={handleConfirmOrder} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Medicine</label>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={selectedMed.name} 
                                    className="px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Order Quantity</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1"
                                    value={orderQty} 
                                    onChange={(e) => setOrderQty(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] uppercase font-bold text-slate-400">Preferred Supplier</label>
                                <select
                                    required
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white outline-none focus:border-cyan-400/50"
                                >
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s._id} value={s._id}>{s.name} (Health: {s.healthScore})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedMed(null)}
                                    className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 cursor-pointer transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-black cursor-pointer shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    {submitting ? 'Generating PO...' : 'Generate Draft PO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
