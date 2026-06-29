import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ActionCenter() {
    const navigate = useNavigate();
    const { activeBranch, user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state for direct PO creation
    const [selectedMed, setSelectedMed] = useState(null);
    const [orderQty, setOrderQty] = useState(100);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [poSubmitting, setPoSubmitting] = useState(false);
    const [actioningId, setActioningId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Dashboard metrics (provides expiryAlerts, lowStockAlerts, dbAlerts)
            const dashUrl = activeBranch ? `/api/analytics/dashboard?branchId=${activeBranch.id}` : '/api/analytics/dashboard';
            const dashRes = await fetch(dashUrl);
            if (!dashRes.ok) throw new Error('Failed to load operational dashboard data.');
            const dash = await dashRes.json();
            setDashboardData(dash);

            // Fetch active alerts
            const alertsUrl = activeBranch?.id ? `/api/alerts?branchId=${activeBranch.id}` : '/api/alerts';
            const alertsRes = await fetch(alertsUrl);
            if (alertsRes.ok) {
                setAlerts(await alertsRes.json());
            }

            // Fetch suppliers
            const supUrl = activeBranch?.id ? `/api/suppliers?filter=Active&branchId=${activeBranch.id}` : '/api/suppliers?filter=Active';
            const supRes = await fetch(supUrl);
            if (supRes.ok) {
                setSuppliers(await supRes.json());
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

    const handleAcknowledgeAlert = async (alertId) => {
        setActioningId(alertId);
        try {
            const url = activeBranch?.id ? `/api/alerts/${alertId}/read?branchId=${activeBranch.id}` : `/api/alerts/${alertId}/read`;
            const res = await fetch(url, {
                method: 'PUT'
            });
            if (!res.ok) throw new Error('Failed to dismiss alert.');
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActioningId(null);
        }
    };

    const handleExecuteExpiryAction = async (medicineId, type, currentStock) => {
        if (!medicineId || currentStock <= 0) return;
        setActioningId(medicineId);
        let endpoint = '';
        let body = { medicineId };

        if (type === 'return') {
            endpoint = activeBranch?.id ? `/api/inventory/stock-out?branchId=${activeBranch.id}` : '/api/inventory/stock-out';
            body = {
                ...body,
                quantity: currentStock,
                reason: 'Return to Supplier',
                notes: 'Returned via Action Center priority queue.'
            };
        } else if (type === 'write-off') {
            endpoint = activeBranch?.id ? `/api/inventory/adjustment?branchId=${activeBranch.id}` : '/api/inventory/adjustment';
            body = {
                ...body,
                quantityChanged: -currentStock,
                transactionType: 'Expired',
                reason: 'Expired',
                notes: 'Written off via Action Center priority queue.'
            };
        } else if (type === 'discount') {
            endpoint = activeBranch?.id ? `/api/medicines/${medicineId}?branchId=${activeBranch.id}` : `/api/medicines/${medicineId}`;
            // Halve the price of the medicine
            const medUrl = activeBranch?.id ? `/api/medicines/${medicineId}?branchId=${activeBranch.id}` : `/api/medicines/${medicineId}`;
            const medRes = await fetch(medUrl);
            if (medRes.ok) {
                const medData = await medRes.json();
                body = {
                    price: Math.round(medData.price * 0.5)
                };
            }
        }

        try {
            const res = await fetch(type === 'discount' ? endpoint : endpoint, {
                method: type === 'discount' ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Operation failed.');
            }
            alert(type === 'discount' ? 'Medicine price reduced by 50% successfully!' : 'Inventory adjustment logged successfully!');
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActioningId(null);
        }
    };

    const handleOpenPoModal = (med, needed) => {
        setSelectedMed(med);
        setOrderQty(needed || 100);
        setSelectedSupplierId(med.primarySupplier?._id || med.primarySupplier || '');
    };

    const handleConfirmPO = async (e) => {
        e.preventDefault();
        if (!selectedMed) return;
        setPoSubmitting(true);
        try {
            const url = activeBranch?.id ? `/api/reorders/generate-po?branchId=${activeBranch.id}` : '/api/reorders/generate-po';
            const res = await fetch(url, {
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
                throw new Error(data.message || 'Failed to generate PO.');
            }
            alert(`Draft Supplier Order successfully generated for ${selectedMed.name}!`);
            setSelectedMed(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        } finally {
            setPoSubmitting(false);
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

                {/* Skeleton Action Queue Cards */}
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="rounded-xl p-5 border border-[var(--card-border)] backdrop-blur-md relative overflow-hidden h-44 flex flex-col justify-between"
                            style={{ background: 'rgba(15,20,32,0.25)' }}>
                            <div className="absolute inset-0 animate-shimmer" />
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-4 rounded bg-[var(--bg-secondary)]" />
                                <div className="w-44 h-4 rounded bg-[var(--bg-secondary)]" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--card-border)] pt-3 mt-2">
                                <div className="flex flex-col gap-1.5">
                                    <div className="w-24 h-2 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-full h-3 rounded bg-[var(--bg-secondary)]" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="w-24 h-2 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-full h-3 rounded bg-[var(--bg-secondary)]" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="w-24 h-2 rounded bg-[var(--bg-secondary)]" />
                                    <div className="w-full h-3 rounded bg-[var(--bg-secondary)]" />
                                </div>
                            </div>
                            <div className="w-32 h-3 rounded bg-[var(--bg-secondary)] mt-2" />
                        </div>
                    ))}
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
                    Retry Fetch
                </button>
            </div>
        );
    }

    // Compile dynamic priority issues list
    const priorityItems = [];

    // 1. Expiry Items: check near expiry and expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiryAlerts = dashboardData?.expiryAlerts || [];
    expiryAlerts.forEach(med => {
        if (med.stock <= 0) return;
        const expDate = new Date(med.expiryDate);
        const diff = expDate - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const val = med.value || med.stock * med.price;

        if (days <= 7) {
            priorityItems.push({
                type: 'expiry-critical',
                severity: 'critical',
                title: `🔴 Expiry Risk: ${med.name}`,
                problem: `${med.name} (${med.stock} units) ${days <= 0 ? 'has expired' : `expires in ${days} days (on ${expDate.toLocaleDateString()})`}.`,
                impact: `Inventory loss value: ₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })} at risk.`,
                recommendedAction: days <= 0 
                    ? "Medicine already expired. Dispose immediately and log write-off." 
                    : "Return stock to supplier before return window closes.",
                responsibleRole: "Branch Manager",
                actions: [
                    days <= 0 ? {
                        label: 'Dispose Expired',
                        onClick: () => handleExecuteExpiryAction(med._id || med.medicineId, 'write-off', med.stock),
                        style: 'bg-red-500 text-white font-bold border border-red-500'
                    } : {
                        label: 'Return to Supplier',
                        onClick: () => handleExecuteExpiryAction(med._id || med.medicineId, 'return', med.stock),
                        style: 'bg-[var(--brand)] text-white font-bold border border-[var(--brand)]'
                    },
                    days > 0 && {
                        label: 'Discount (50%)',
                        onClick: () => handleExecuteExpiryAction(med._id || med.medicineId, 'discount', med.stock),
                        style: 'bg-transparent text-amber-500 border border-amber-500/30'
                    }
                ].filter(Boolean)
            });
        } else if (days <= 30) {
            priorityItems.push({
                type: 'expiry-warning',
                severity: 'warning',
                title: `🟠 Expiry Watch: ${med.name}`,
                problem: `${med.name} (${med.stock} units) expires in ${days} days.`,
                impact: `Potential loss of ₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })} if unsold.`,
                recommendedAction: "Discount stock by 50% to accelerate sales clearance.",
                responsibleRole: "Branch Manager",
                actions: [
                    {
                        label: 'Discount (50%)',
                        onClick: () => handleExecuteExpiryAction(med._id || med.medicineId, 'discount', med.stock),
                        style: 'bg-amber-500 text-white font-bold'
                    },
                    {
                        label: 'Return to Supplier',
                        onClick: () => handleExecuteExpiryAction(med._id || med.medicineId, 'return', med.stock),
                        style: 'bg-transparent text-[var(--text-secondary)] border border-[var(--card-border)]'
                    }
                ]
            });
        }
    });

    // 2. Low Stock Items
    const lowStockAlerts = dashboardData?.lowStockAlerts || [];
    lowStockAlerts.forEach(med => {
        const reorderLimit = med.reorderPoint !== undefined ? med.reorderPoint : 20;
        const needed = reorderLimit * 2 - med.stock;
        priorityItems.push({
            type: 'low-stock',
            severity: 'warning',
            title: `🟠 Low Stock Warning: ${med.name}`,
            problem: `${med.name} stock level is ${med.stock} (safety reorder trigger is ${reorderLimit}).`,
            impact: "Out-of-stock risk is high. Leads to lost prescription revenue and patient complaints.",
            recommendedAction: `Procure ${needed} units immediately. Recommended supplier is ${med.supplier || 'assigned vendor'}.`,
            responsibleRole: "Branch Manager",
            actions: [
                {
                    label: 'Generate Auto-PO',
                    onClick: () => handleOpenPoModal(med, needed),
                    style: 'bg-[var(--brand)] text-white font-bold'
                }
            ]
        });
    });

    // 3. Alerts (unread)
    alerts.forEach(alert => {
        let severity = 'watch';
        let prefix = '🟡';
        if (alert.severity === 'critical') {
            severity = 'critical';
            prefix = '🔴';
        } else if (alert.severity === 'warning') {
            severity = 'warning';
            prefix = '🟠';
        }

        priorityItems.push({
            type: 'system-alert',
            severity,
            title: `${prefix} ${alert.title}`,
            problem: alert.message,
            impact: alert.title.includes('Health') 
                ? "Deduction applied to pharmacy health score. Lowers organization rating." 
                : "Compliance policy trace alert. Requires administrator response.",
            recommendedAction: "Review compliance sheet and dismiss alert log.",
            responsibleRole: alert.title.includes('Health') ? "Store Admin" : "Branch Manager",
            actions: [
                {
                    label: 'Acknowledge & Clear',
                    onClick: () => handleAcknowledgeAlert(alert._id),
                    style: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                }
            ]
        });
    });

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in relative z-10">
            {/* Header */}
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Operations Control Hub
                </span>
                <h2 className="text-3xl font-black text-[var(--text-primary)] font-serif tracking-tight leading-none">
                    Command <span className="text-[var(--brand)]">Action Center</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] max-w-xl">
                    Dynamic operational command queue. Inspect unresolved problems, assess business risks, and execute direct remediation.
                </p>
            </div>

            {/* List of actions */}
            <div className="flex flex-col gap-4">
                {priorityItems.length === 0 ? (
                    <div className="rounded-2xl p-16 flex flex-col items-center justify-center text-center premium-card border border-emerald-500/15 bg-emerald-500/[0.01] shadow-lg gap-4">
                        <span className="material-symbols-rounded text-4xl text-emerald-400 animate-pulse">verified</span>
                        <div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>
                                No alerts active yet
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-md mx-auto leading-relaxed">
                                Your system notifications and priority tasks will appear here. All branch health scores are healthy, and reorder safety margins are actively maintained.
                            </p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mt-2"
                        >
                            <span className="material-symbols-rounded text-sm">sync</span>
                            <span>Refresh Queue</span>
                        </button>
                    </div>
                ) : (
                    priorityItems.map((item, index) => {
                        let severityBorder = 'border-red-500/20 bg-red-500/[0.01]';
                        let badgeCol = 'text-red-400 bg-red-500/10';
                        let severityLabel = 'CRITICAL';
                        
                        if (item.severity === 'warning') {
                            severityBorder = 'border-amber-500/20 bg-amber-500/[0.01]';
                            badgeCol = 'text-amber-400 bg-amber-500/10';
                            severityLabel = 'WARNING';
                        } else if (item.severity === 'watch') {
                            severityBorder = 'border-cyan-500/20 bg-cyan-500/[0.01]';
                            badgeCol = 'text-cyan-400 bg-cyan-500/10';
                            severityLabel = 'ATTENTION';
                        }

                        return (
                            <div 
                                key={index} 
                                className={`rounded-xl p-5 border backdrop-blur-md premium-card flex flex-col md:flex-row justify-between items-start md:items-center gap-5 transition-all hover:bg-[var(--bg-secondary)] ${severityBorder}`}
                            >
                                <div className="flex flex-col gap-3.5 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wide ${badgeCol}`}>
                                            {severityLabel}
                                        </span>
                                        <span className="text-xs font-bold text-[var(--text-primary)] font-serif" style={{ fontFamily: "'Lora', serif" }}>
                                            {item.title}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--card-border)] pt-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">1. What is the Problem?</span>
                                            <p className="text-xs text-[var(--text-primary)] font-medium leading-normal">{item.problem}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">2. Why does it matter?</span>
                                            <p className="text-xs text-[var(--text-secondary)] leading-normal">{item.impact}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">3. What is Recommended?</span>
                                            <p className="text-xs text-[var(--brand)] font-semibold leading-normal">{item.recommendedAction}</p>
                                        </div>
                                    </div>

                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-1 font-medium">
                                        <span className="material-symbols-rounded text-xs">assignment_ind</span>
                                        <span>Responsible Party: <strong className="text-[var(--text-secondary)] font-bold">{item.responsibleRole}</strong></span>
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto items-stretch md:items-end justify-end flex-shrink-0 border-t md:border-t-0 border-[var(--card-border)] pt-3.5 md:pt-0">
                                    {item.actions.map((act, idx) => (
                                        <button
                                            key={idx}
                                            disabled={actioningId !== null}
                                            onClick={act.onClick}
                                            className={`px-4 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-all duration-200 text-center select-none flex items-center justify-center gap-1.5 ${
                                                act.style || 'bg-[var(--brand)] text-white'
                                            }`}
                                        >
                                            {actioningId === item.type ? (
                                                <span className="material-symbols-rounded text-xs animate-spin">sync</span>
                                            ) : (
                                                <span>{act.label}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Place Order Modal (generates PO) */}
            {selectedMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--card-bg)]/60 backdrop-blur-md px-4">
                    <div className="w-full max-w-md rounded-2xl p-6 premium-card-elevated border border-[var(--card-border)] shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedMed(null)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer font-bold animate-pulse-slow"
                        >
                            <span className="material-symbols-rounded text-lg">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-cyan-400">shopping_cart</span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif">Command Center Procurement Run</h3>
                        </div>

                        <form onSubmit={handleConfirmPO} className="flex flex-col gap-4">
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
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50 font-mono"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs uppercase font-bold text-[var(--text-secondary)] font-serif">Recommended Supplier Performance</label>
                                <select
                                    required
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400/50"
                                >
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => {
                                        const successRate = s.performanceMetrics?.totalOrders 
                                            ? ((s.performanceMetrics.completedOrders / s.performanceMetrics.totalOrders) * 100).toFixed(0)
                                            : 100;
                                        return (
                                            <option key={s._id} value={s._id}>
                                                {s.name} (Reliability: {s.healthScore}%, Avg Delivery: {s.performanceMetrics?.averageDeliveryTime}d, Success: {successRate}%)
                                            </option>
                                        );
                                    })}
                                </select>
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
                                    disabled={poSubmitting}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-[var(--text-primary)] text-xs font-black cursor-pointer shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    {poSubmitting ? 'Creating Order...' : 'Confirm & Create Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
