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
            alert('Please select a supplier to generate the supplier order.');
            return;
        }

        setSubmitting(true);
        try {
            // Call generateDraftPO to create a Draft Supplier Order
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
                throw new Error(data.message || 'Failed to generate draft supplier order.');
            }

            alert(`Draft Supplier Order successfully generated for ${selectedMed.name}!`);
            setSelectedMed(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReceiveShipment = async (requestId) => {
        if (!window.confirm('Mark this shipment as arrived? Stock levels will be updated and a Receive Stock audit log transaction will be generated.')) {
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
            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in relative z-10">
                {/* Skeleton Header */}
                <div className="flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute inset-0 animate-shimmer" />
                    <div className="w-48 h-3 rounded bg-[var(--bg-secondary)]" />
                    <div className="w-96 h-8 rounded bg-[var(--bg-secondary)] mt-1" />
                    <div className="w-128 h-4 rounded bg-[var(--bg-secondary)] mt-1" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column Skeleton */}
                    <div className="lg:col-span-7 rounded-xl overflow-hidden premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4 relative">
                        <div className="absolute inset-0 animate-shimmer" />
                        <div className="w-48 h-5 rounded bg-[var(--bg-secondary)] mb-2" />
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="p-3.5 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] flex items-center justify-between">
                                <div className="flex flex-col gap-2 flex-1 pr-4">
                                    <div className="w-1/3 h-4 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-1/2 h-3.5 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-2/3 h-3 rounded bg-[var(--bg-secondary)]" />
                                </div>
                                <div className="w-16 h-8 rounded bg-[var(--bg-secondary)] flex-shrink-0" />
                            </div>
                        ))}
                    </div>

                    {/* Right Column Skeleton */}
                    <div className="lg:col-span-5 flex flex-col gap-5">
                        <div className="rounded-xl overflow-hidden premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4 relative h-72">
                            <div className="absolute inset-0 animate-shimmer" />
                            <div className="w-44 h-5 rounded bg-[var(--bg-secondary)]" />
                            <div className="w-full h-8 rounded bg-[var(--bg-secondary)] mt-2" />
                            <div className="w-3/4 h-8 rounded bg-[var(--bg-secondary)]" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                <span className="material-symbols-rounded text-5xl text-red-400">error</span>
                <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                <button onClick={fetchData} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00B4D8]/5 border border-[#00B4D8]/15 text-[#00B4D8] cursor-pointer">
                    Retry Queue Check
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Inventory Replenishment
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none font-serif">
                    Reorder <span className="text-cyan-400">Intelligence</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                    Proactive reorder point tracking. Items below safety margins are auto-listed with vendor suggestions to speed up supplier order creation.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Reorder Queue */}
                <div className="lg:col-span-7 rounded-xl overflow-hidden premium-card border border-[var(--card-border)] shadow-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">auto_mode</span>
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Auto-Generated Reorder Queue ({queue.length})</h3>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {queue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-secondary)]">
                                <span className="material-symbols-rounded text-3xl text-emerald-400">check_circle</span>
                                <span className="text-xs font-semibold">All stock levels exceed configured safety margins.</span>
                            </div>
                        ) : (
                            queue.map((item, idx) => {
                                const preferredSup = item.medicineId.primarySupplier;
                                return (
                                    <div key={idx} className="p-3.5 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] flex items-center justify-between transition-all">
                                        <div className="flex flex-col min-w-0 gap-1">
                                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">{item.medicineId.name}</span>
                                            
                                            {/* Supplier Recommendation Badge */}
                                            {preferredSup ? (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded self-start mt-0.5">
                                                    <span className="material-symbols-rounded text-xs font-bold">verified</span>
                                                    <span>Recommended Supplier: {preferredSup.name || preferredSup}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)]0/10 px-2 py-0.5 rounded self-start mt-0.5">
                                                    <span className="material-symbols-rounded text-xs">warning</span>
                                                    <span>No primary supplier assigned</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                                                <span>Category: <strong className="text-[var(--text-secondary)]">{item.medicineId.category}</strong></span>
                                                <span>•</span>
                                                <span>Current Stock: <strong className="text-red-400 font-mono">{item.medicineId.stock}</strong></span>
                                                <span>•</span>
                                                <span>Safety Point: <strong className="text-[var(--text-secondary)] font-mono">{item.medicineId.reorderPoint !== undefined ? item.medicineId.reorderPoint : 20}</strong></span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handlePlaceOrderClick(item)}
                                            className="px-3.5 py-2 rounded-lg bg-cyan-400 text-[var(--text-primary)] text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/20 transition-all flex items-center gap-1 flex-shrink-0"
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
                <div className="lg:col-span-5 rounded-xl overflow-hidden premium-card border border-[var(--card-border)] shadow-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                        <span className="material-symbols-rounded text-amber-400 text-lg">local_shipping</span>
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Legacy Reorder Requests ({activeOrders.length})</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                        {activeOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-secondary)]">
                                <span className="material-symbols-rounded text-3xl">local_shipping</span>
                                <span className="text-xs">No legacy reorders currently in transit.</span>
                            </div>
                        ) : (
                            activeOrders.map((order) => (
                                <div key={order._id} className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.01] hover:bg-amber-500/[0.02] flex flex-col gap-3 transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">{order.medicineId?.name || 'Medication'}</span>
                                            <span className="text-xs text-[var(--text-secondary)] mt-1">
                                                Qty Ordered: <strong className="text-[var(--text-primary)] font-mono">{order.quantityNeeded}</strong> · Supplier: <strong className="text-[var(--text-primary)]">{order.supplier}</strong>
                                            </span>
                                            <span className="text-xs text-amber-400 mt-0.5 font-medium">
                                                Placed: {new Date(order.orderedDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase flex-shrink-0">
                                            {order.status}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => handleReceiveShipment(order._id)}
                                        className="w-full py-2 rounded-lg bg-emerald-500 text-[var(--text-primary)] text-xs font-black hover:bg-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-lg rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedMed(null)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer font-bold"
                        >
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-cyan-400">shopping_cart</span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Auto-Fill Procurement Run</h3>
                        </div>

                        <form onSubmit={handleConfirmOrder} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Medicine</label>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={selectedMed.name} 
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)]/60 outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Order Quantity</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1"
                                    value={orderQty} 
                                    onChange={(e) => setOrderQty(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Select Supplier</label>
                                <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                                    {suppliers.length === 0 ? (
                                        <div className="text-center text-xs text-[var(--text-secondary)] py-4">No active suppliers found</div>
                                    ) : (
                                        suppliers.map(s => {
                                            const isSelected = selectedSupplierId === s._id;
                                            const ratingStars = '★'.repeat(Math.round(s.rating || 0)) + '☆'.repeat(5 - Math.round(s.rating || 0));
                                            return (
                                                <div 
                                                    key={s._id}
                                                    onClick={() => setSelectedSupplierId(s._id)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                                                        isSelected 
                                                            ? 'border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-400/5' 
                                                            : 'border-[var(--card-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                                            {s.name}
                                                            {isSelected && (
                                                                <span className="material-symbols-rounded text-cyan-400 text-sm">check_circle</span>
                                                            )}
                                                        </span>
                                                        <span className={`text-xs font-black px-1.5 py-0.5 rounded font-mono ${
                                                            s.healthScore >= 90 ? 'text-emerald-400 bg-emerald-500/10' : s.healthScore >= 75 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
                                                        }`}>
                                                            Health: {s.healthScore}%
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 text-xs text-[var(--text-secondary)] font-medium">
                                                        <div className="flex flex-col">
                                                            <span className="text-[var(--text-secondary)] text-[9px] uppercase font-bold">Delivery Speed</span>
                                                            <span className="text-slate-700 mt-0.5 font-mono">{s.performanceMetrics?.averageDeliveryTime || 'N/A'} days</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[var(--text-secondary)] text-[9px] uppercase font-bold">Order Success</span>
                                                            <span className="text-slate-700 mt-0.5 font-mono">
                                                                {s.performanceMetrics?.totalOrders > 0 
                                                                    ? `${Math.round((s.performanceMetrics.completedOrders / s.performanceMetrics.totalOrders) * 100)}%` 
                                                                    : '100%'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[var(--text-secondary)] text-[9px] uppercase font-bold">Rating</span>
                                                            <span className="text-amber-400 mt-0.5 tracking-tight font-mono">{ratingStars}</span>
                                                        </div>
                                                    </div>

                                                    {s.mostSuppliedMedicines && s.mostSuppliedMedicines.length > 0 && (
                                                        <div className="text-[9px] text-[var(--text-secondary)] border-t border-[var(--card-border)] pt-1.5 flex items-center gap-1">
                                                            <span className="text-[var(--text-secondary)] font-bold uppercase">Supplies:</span>
                                                            <span className="truncate text-[var(--text-secondary)] font-medium">{s.mostSuppliedMedicines.join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedMed(null)}
                                    className="flex-1 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-secondary)] border border-[var(--card-border)] cursor-pointer transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[var(--text-primary)] text-xs font-black cursor-pointer shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    {submitting ? 'Creating Order...' : 'Generate Draft Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
