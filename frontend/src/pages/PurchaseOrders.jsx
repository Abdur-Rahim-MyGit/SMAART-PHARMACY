import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PurchaseOrders() {
    const { user, activeBranch } = useAuth();

    // Data States
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Active View Tab (Procurement / Audit Trail)
    const [activeTab, setActiveTab] = useState('Procurement');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Form inputs
    const [supplierId, setSupplierId] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('Draft');
    const [poItems, setPoItems] = useState([{ medicineId: '', quantity: 100, unitCost: 0 }]);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Retrieve initial data
    const fetchPOData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch POs
            const poUrl = activeBranch?.id ? `/api/purchase-orders?branchId=${activeBranch.id}` : '/api/purchase-orders';
            const poRes = await fetch(poUrl);
            if (!poRes.ok) throw new Error('Failed to load purchase orders.');
            const poData = await poRes.json();
            setOrders(poData);

            // Fetch suppliers
            const supUrl = activeBranch?.id ? `/api/suppliers?filter=Active&branchId=${activeBranch.id}` : '/api/suppliers?filter=Active';
            const supRes = await fetch(supUrl);
            if (supRes.ok) {
                const supData = await supRes.json();
                setSuppliers(supData);
            }

            // Fetch medicines
            const medUrl = activeBranch?.id ? `/api/medicines?branchId=${activeBranch.id}` : '/api/medicines';
            const medRes = await fetch(medUrl);
            if (medRes.ok) {
                const medData = await medRes.json();
                setMedicines(medData.medicines || medData || []);
            }

            // Fetch audit logs if admin
            if (user?.role === 'Admin') {
                const auditUrl = activeBranch?.id ? `/api/suppliers-audit?branchId=${activeBranch.id}` : '/api/suppliers-audit';
                const auditRes = await fetch(auditUrl);
                if (auditRes.ok) {
                    const auditData = await auditRes.json();
                    setAuditLogs(auditData);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPOData();
    }, [user, activeBranch]);

    // Handle Item Fields Addition in Form
    const handleAddItemRow = () => {
        setPoItems([...poItems, { medicineId: '', quantity: 100, unitCost: 0 }]);
    };

    const handleRemoveItemRow = (index) => {
        if (poItems.length === 1) return;
        const newItems = [...poItems];
        newItems.splice(index, 1);
        setPoItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...poItems];
        newItems[index][field] = value;

        // Auto-fill Unit Cost if medicineId selection changes
        if (field === 'medicineId') {
            const med = medicines.find(m => m._id === value);
            if (med) {
                newItems[index].unitCost = med.supplierCost || 0;
            }
        }
        setPoItems(newItems);
    };

    // Calculate Grand Total
    const calculateGrandTotal = () => {
        return poItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
    };

    // Handle Create PO Submission
    const handleCreatePOSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!supplierId || poItems.some(item => !item.medicineId || item.quantity <= 0)) {
            setFormError('Supplier and valid medicine rows are required.');
            return;
        }

        setSubmitting(true);
        try {
            const url = activeBranch?.id ? `/api/purchase-orders?branchId=${activeBranch.id}` : '/api/purchase-orders';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId,
                    expectedDeliveryDate,
                    status,
                    notes,
                    medicines: poItems.map(item => ({
                        medicineId: item.medicineId,
                        quantity: Number(item.quantity),
                        unitCost: Number(item.unitCost)
                    }))
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to generate PO.');
            }

            setIsCreateOpen(false);
            resetForm();
            fetchPOData();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Status Change Action (Admin Only)
    const handleStatusTransition = async (orderId, targetStatus) => {
        const confirmMsg = `Transition order status to "${targetStatus}"?`;
        if (targetStatus === 'Delivered') {
            const doubleConfirm = window.confirm(`${confirmMsg}\n\nWARNING: Marking delivered will increment stock levels for all included items, generate Receive Stock audit logs, and calculate delivery times.`);
            if (!doubleConfirm) return;
        } else {
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            const url = activeBranch?.id ? `/api/purchase-orders/${orderId}?branchId=${activeBranch.id}` : `/api/purchase-orders/${orderId}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatus })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to transition status.');
            }

            setIsDetailsOpen(false);
            fetchPOData();
        } catch (err) {
            alert(err.message);
        }
    };

    const resetForm = () => {
        setSupplierId('');
        setExpectedDeliveryDate('');
        setNotes('');
        setStatus('Draft');
        setPoItems([{ medicineId: '', quantity: 100, unitCost: 0 }]);
        setFormError('');
    };

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setIsDetailsOpen(true);
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in pb-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Procurement Pipeline
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none font-serif">
                        Supplier <span className="text-cyan-400">Orders</span>
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Create supplier orders, track transit shipments, approve procurement runs, and view vendor logs.
                    </p>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsCreateOpen(true); }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-400 text-[var(--text-primary)] text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/20 transition-all flex items-center gap-1.5 self-start md:self-auto"
                >
                    <span className="material-symbols-rounded text-sm font-black">add_shopping_cart</span>
                    <span>Create Order</span>
                </button>
            </div>

            {/* Tabs (Admin only) */}
            {user?.role === 'Admin' && (
                <div className="flex border-b border-[var(--card-border)] pb-1 gap-2">
                    {['Procurement', 'System Audit Trail'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                                activeTab === tab 
                                    ? 'border-cyan-400 text-cyan-400' 
                                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            {/* Content Tab 1: Procurement */}
            {activeTab === 'Procurement' && (
                <div className="rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Procurement Ledger</h3>
                        <span className="text-xs text-[var(--text-secondary)] uppercase font-mono">Orders status flow</span>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex flex-col gap-2 p-4 relative overflow-hidden min-w-[850px]">
                                <div className="absolute inset-0 animate-shimmer" />
                                {Array.from({ length: 5 }).map((_, idx) => (
                                    <div key={idx} className="grid items-center py-3.5 border-b border-[var(--card-border)]"
                                        style={{ gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 1.2fr 1fr 1fr', gap: '16px' }}>
                                        <div className="w-24 h-4 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-40 h-4 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-20 h-4 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-20 h-4 rounded bg-[var(--bg-secondary)]" />
                                        <div className="w-20 h-4 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                        <div className="w-24 h-5 rounded bg-[var(--bg-secondary)] mx-auto" />
                                        <div className="w-16 h-6 rounded bg-[var(--bg-secondary)] justify-self-end" />
                                    </div>
                                ))}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center min-w-[850px]">
                                <span className="material-symbols-rounded text-4xl text-cyan-400 opacity-60">receipt_long</span>
                                <div>
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">No supplier orders created yet</h4>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
                                        No supplier orders created yet. Start by generating your first purchase order.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { resetForm(); setIsCreateOpen(true); }}
                                    className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-extrabold hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 transition-all flex items-center gap-1.5 mt-1 animate-pulse-slow"
                                >
                                    <span className="material-symbols-rounded text-sm">add_shopping_cart</span>
                                    <span>Create Order</span>
                                </button>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="border-b border-[var(--card-border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        <th className="pb-3 pl-2">Order Number</th>
                                        <th className="pb-3">Supplier</th>
                                        <th className="pb-3">Order Date</th>
                                        <th className="pb-3">Expected Date</th>
                                        <th className="pb-3 text-right">Grand Total</th>
                                        <th className="pb-3 text-center">Status</th>
                                        <th className="pb-3 pr-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((po) => {
                                        // Status Color Mapping
                                        let statusClass = 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
                                        if (po.status === 'Pending Approval') statusClass = 'bg-amber-400/10 text-amber-400';
                                        if (po.status === 'Ordered') statusClass = 'bg-blue-400/10 text-blue-400';
                                        if (po.status === 'In Transit') statusClass = 'bg-purple-400/10 text-purple-400';
                                        if (po.status === 'Delivered') statusClass = 'bg-emerald-400/10 text-emerald-400';
                                        if (po.status === 'Cancelled') statusClass = 'bg-red-400/10 text-red-400';

                                        return (
                                            <tr key={po._id} className="border-b border-[var(--card-border)] hover:bg-[var(--bg-secondary)] transition-all group">
                                                <td className="py-3.5 pl-2 font-mono text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                                                    {po.poNumber}
                                                </td>
                                                <td className="py-3.5 text-xs font-semibold text-slate-700">
                                                    {po.supplierId?.name || 'Legacy Supplier'}
                                                </td>
                                                <td className="py-3.5 text-xs text-[var(--text-secondary)]">
                                                    {new Date(po.orderDate).toLocaleDateString()}
                                                </td>
                                                <td className="py-3.5 text-xs text-[var(--text-secondary)]">
                                                    {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="py-3.5 text-right text-xs font-bold text-cyan-400 font-mono">
                                                    ₹{po.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3.5 text-center">
                                                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${statusClass}`}>
                                                        {po.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 pr-2 text-right">
                                                    <button 
                                                        onClick={() => handleViewDetails(po)}
                                                        className="px-2.5 py-1.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-primary)] cursor-pointer transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Content Tab 2: System Audit Trail */}
            {activeTab === 'System Audit Trail' && user?.role === 'Admin' && (
                <div className="rounded-xl premium-card border border-[var(--card-border)] p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Supplier & Order Audit Trail</h3>
                        <span className="text-xs text-[var(--text-secondary)] uppercase font-mono">Operations Log</span>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        {auditLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
                                <span className="material-symbols-rounded text-3xl">history</span>
                                <span className="text-xs">No supplier audit mutations registered yet.</span>
                            </div>
                        ) : (
                            auditLogs.map((log) => (
                                <div key={log._id} className="p-3.5 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] flex flex-col gap-2 transition-all">
                                    <div className="flex items-start justify-between text-xs gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-sm text-cyan-400">shield_person</span>
                                            <span className="font-bold text-[var(--text-primary)]">{log.action}</span>
                                            <span className="text-[var(--text-secondary)]">•</span>
                                            <span className="text-[var(--text-secondary)]">User: <strong className="text-slate-700">{log.username}</strong></span>
                                        </div>
                                        <span className="text-xs text-[var(--text-secondary)] font-mono">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                                        <span>Target Type: <strong className="text-[var(--text-secondary)] font-mono">{log.targetType}</strong></span>
                                        <span>Target Reference ID: <strong className="text-[var(--text-secondary)] font-mono">{log.targetId}</strong></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {/* Create Supplier Order Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative my-8 animate-slide-up">
                        
                        <button 
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
 
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-cyan-400 text-lg">shopping_cart</span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Initiate Supplier Order</h3>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreatePOSubmit} className="flex flex-col gap-4">
                            
                            {/* Supplier & Expected Date */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Select Supplier</label>
                                    <select 
                                        required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    >
                                        <option value="">-- Choose Vendor --</option>
                                        {suppliers.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} (Health Score: {s.healthScore})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Expected Delivery</label>
                                    <input 
                                        type="date" required
                                        value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                        className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Initial Status</label>
                                    <select 
                                        value={status} onChange={(e) => setStatus(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Pending Approval">Pending Approval</option>
                                        {user?.role === 'Admin' && (
                                            <>
                                                <option value="Ordered">Ordered</option>
                                                <option value="In Transit">In Transit</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <hr className="border-[var(--card-border)]" />

                            {/* Dynamic Medicine Rows */}
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between text-xs uppercase font-bold text-[var(--text-secondary)]">
                                    <span>Medicine Items List</span>
                                    <button 
                                        type="button" onClick={handleAddItemRow}
                                        className="text-cyan-400 hover:text-cyan-300 font-black flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <span className="material-symbols-rounded text-xs">add</span> Add Medicine
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                                    {poItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            
                                            {/* Med select */}
                                            <select 
                                                required value={item.medicineId} 
                                                onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                                                className="flex-1 px-2.5 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none"
                                            >
                                                <option value="">-- Select Medicine --</option>
                                                {medicines.map(m => (
                                                    <option key={m._id} value={m._id}>{m.name} (Stock: {m.stock})</option>
                                                ))}
                                            </select>

                                            {/* Quantity */}
                                            <input 
                                                type="number" required min="1" placeholder="Qty"
                                                value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                className="w-20 px-2.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none text-center"
                                            />

                                            {/* Unit cost */}
                                            <input 
                                                type="number" required min="0" step="0.01" placeholder="Unit Cost"
                                                value={item.unitCost} onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                                                className="w-24 px-2.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none text-right font-mono"
                                            />

                                            {/* Line total */}
                                            <span className="w-24 text-right text-xs font-bold text-[var(--text-secondary)] font-mono">
                                                ₹{(item.quantity * item.unitCost).toFixed(2)}
                                            </span>

                                            {/* Delete */}
                                            <button 
                                                type="button" onClick={() => handleRemoveItemRow(idx)}
                                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer disabled:opacity-40"
                                                disabled={poItems.length === 1}
                                            >
                                                <span className="material-symbols-rounded text-sm">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total and Notes */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mt-2">
                                <div className="flex-1 w-full flex flex-col gap-1.5">
                                    <label className="text-xs uppercase font-bold text-[var(--text-secondary)]">Procurement Notes</label>
                                    <input 
                                        type="text" placeholder="E.g. standard monthly stock reorder"
                                        value={notes} onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                    />
                                </div>
                                <div className="flex flex-col items-end gap-1 font-mono text-right w-full md:w-auto">
                                    <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Grand Total Cost</span>
                                    <span className="text-xl font-black text-cyan-400">
                                        ₹{calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4">
                                <button 
                                    type="button" onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-xs font-bold text-[var(--text-secondary)] border border-[var(--card-border)] cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[var(--text-primary)] text-xs font-black cursor-pointer shadow-lg transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Confirm Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Supplier Order Details Modal */}
            {isDetailsOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative my-8 animate-slide-up">
                        
                        <button 
                            onClick={() => { setIsDetailsOpen(false); setSelectedOrder(null); }}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>

                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3.5 mb-4 pr-6">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-cyan-400">receipt_long</span>
                                <h3 className="text-base font-bold text-[var(--text-primary)] font-serif">Supplier Order Details</h3>
                            </div>
                            <span className="font-mono text-xs text-cyan-400 font-bold">{selectedOrder.poNumber}</span>
                        </div>

                        {/* Order Metadata info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-5">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Supplier</span>
                                <span className="text-[var(--text-primary)] font-semibold">{selectedOrder.supplierId?.name || 'Legacy Supplier'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Order Date</span>
                                <span className="text-[var(--text-secondary)]">{new Date(selectedOrder.orderDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Expected Delivery</span>
                                <span className="text-[var(--text-secondary)]">{selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs uppercase font-bold text-[var(--text-secondary)]">Status</span>
                                <span className="text-[var(--text-primary)] font-semibold">{selectedOrder.status}</span>
                            </div>
                        </div>

                        {/* Items list */}
                        <div className="flex flex-col gap-2 mb-5">
                            <span className="text-xs uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--card-border)] pb-1 mb-1">Items Included</span>
                            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
                                {selectedOrder.medicines?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs border-b border-[var(--card-border)] pb-2">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[var(--text-primary)] font-semibold truncate">{item.name}</span>
                                            <span className="text-xs text-[var(--text-secondary)] mt-0.5">Qty Ordered: <strong className="text-slate-700">{item.quantity}</strong> @ ₹{item.unitCost.toFixed(2)}</span>
                                        </div>
                                        <span className="font-mono font-bold text-[var(--text-secondary)]">₹{item.totalCost.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center font-mono mt-2 pt-2 border-t border-[var(--card-border)]">
                                <span className="text-xs font-bold text-[var(--text-secondary)]">Grand Total</span>
                                <span className="text-base font-black text-cyan-400">₹{selectedOrder.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedOrder.notes && (
                            <div className="p-3.5 rounded bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
                                <span className="text-xs uppercase font-bold text-[var(--text-secondary)] block mb-0.5">Order Notes</span>
                                {selectedOrder.notes}
                            </div>
                        )}

                        {/* Operations Control Actions (RBAC: Admin approval buttons, Manager track only) */}
                        <div className="flex flex-wrap gap-2.5 border-t border-[var(--card-border)] pt-4">
                            {user?.role === 'Admin' ? (
                                <>
                                    {selectedOrder.status === 'Pending Approval' && (
                                        <button 
                                            onClick={() => handleStatusTransition(selectedOrder._id, 'Ordered')}
                                            className="px-4 py-2 rounded-lg bg-cyan-400 text-[var(--text-primary)] text-xs font-black hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-400/5 hover:shadow-cyan-400/25 transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-rounded text-sm">thumb_up</span>
                                            <span>Approve & Order</span>
                                        </button>
                                    )}
                                    {['Ordered', 'Pending Approval'].includes(selectedOrder.status) && (
                                        <button 
                                            onClick={() => handleStatusTransition(selectedOrder._id, 'In Transit')}
                                            className="px-4 py-2 rounded-lg bg-purple-500 text-[var(--text-primary)] text-xs font-black hover:bg-purple-400 cursor-pointer shadow-lg transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-rounded text-sm">local_shipping</span>
                                            <span>Mark In-Transit</span>
                                        </button>
                                    )}
                                    {['Ordered', 'In Transit'].includes(selectedOrder.status) && (
                                        <button 
                                            onClick={() => handleStatusTransition(selectedOrder._id, 'Delivered')}
                                            className="px-4 py-2 rounded-lg bg-emerald-500 text-[var(--text-primary)] text-xs font-black hover:bg-emerald-400 cursor-pointer shadow-lg transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-rounded text-sm">check_circle</span>
                                            <span>Mark Delivered</span>
                                        </button>
                                    )}
                                    {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
                                        <button 
                                            onClick={() => handleStatusTransition(selectedOrder._id, 'Cancelled')}
                                            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 cursor-pointer transition-all flex items-center gap-1 ml-auto"
                                        >
                                            <span className="material-symbols-rounded text-sm">cancel</span>
                                            <span>Cancel Order</span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                // Manager quick cancel (only drafts / pending approval)
                                ['Draft', 'Pending Approval'].includes(selectedOrder.status) && (
                                    <button 
                                        onClick={() => handleStatusTransition(selectedOrder._id, 'Cancelled')}
                                        className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 cursor-pointer transition-all flex items-center gap-1 ml-auto"
                                    >
                                        <span className="material-symbols-rounded text-sm">cancel</span>
                                        <span>Cancel Order</span>
                                    </button>
                                )
                            )}
                            <button 
                                type="button" onClick={() => { setIsDetailsOpen(false); setSelectedOrder(null); }}
                                className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--card-bg)]/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold border border-[var(--card-border)] cursor-pointer transition-colors ml-auto md:ml-0"
                            >
                                Close Details
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
