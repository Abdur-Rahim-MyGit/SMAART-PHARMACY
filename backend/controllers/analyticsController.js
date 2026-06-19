import Medicine from '../models/Medicine.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import BranchHealthHistory from '../models/BranchHealthHistory.js';
import Alert from '../models/Alert.js';
import ReorderRequest from '../models/ReorderRequest.js';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

export const getDashboardData = async (req, res) => {
    try {
        let pharmacyId = req.user.pharmacyId;
        // Support admin branch context override
        if (req.user.role === 'Admin' && req.query.branchId) {
            pharmacyId = req.query.branchId;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);

        // Fetch all non-archived medicines for this tenant
        const medicines = await Medicine.find({
            pharmacyId,
            status: { $ne: 'Archived' }
        });

        // 1. Basic Stats
        let totalValuation = 0;
        let activeChannelsCount = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        let expiredCount = 0;
        let nearExpiryCount = 0;
        let deadStockValue = 0;
        let atRiskValue = 0;

        const expiryAlerts = [];
        const lowStockAlerts = [];

        medicines.forEach(m => {
            const isZero = m.stock === 0;
            const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
            const isLow = m.stock > 0 && m.stock < reorderThreshold;

            if (m.status === 'Active') {
                activeChannelsCount++;
                if (isZero) outOfStockCount++;
                if (isLow) {
                    lowStockCount++;
                    lowStockAlerts.push(m);
                }
            }

            totalValuation += m.stock * m.price;

            if (m.expiryDate) {
                const expDate = new Date(m.expiryDate);
                const val = m.stock * m.price;
                if (expDate < today) {
                    expiredCount++;
                    deadStockValue += val;
                    expiryAlerts.push({
                        _id: m._id,
                        name: m.name,
                        ndc: m.ndc,
                        stock: m.stock,
                        price: m.price,
                        value: val,
                        expiryDate: m.expiryDate,
                        status: 'Expired',
                        category: m.category
                    });
                } else if (expDate <= thirtyDaysFromNow) {
                    nearExpiryCount++;
                    atRiskValue += val;
                    expiryAlerts.push({
                        _id: m._id,
                        name: m.name,
                        ndc: m.ndc,
                        stock: m.stock,
                        price: m.price,
                        value: val,
                        expiryDate: m.expiryDate,
                        status: 'Near Expiry',
                        category: m.category
                    });
                }
            }
        });

        // ── Health Score Calculation ──
        // Base: 100
        // - Expired: -15 points per SKU (with stock > 0), max 45
        // - Near Expiry: -5 points per SKU (with stock > 0), max 25
        // - Out of Stock (Active): -10 points per SKU, max 20
        // - Low Stock (Active): -5 points per SKU, max 20
        const expiredSKUCount = expiryAlerts.filter(x => x.status === 'Expired' && x.stock > 0).length;
        const nearExpirySKUCount = expiryAlerts.filter(x => x.status === 'Near Expiry' && x.stock > 0).length;

        const expiredDeduction = Math.min(45, expiredSKUCount * 15);
        const nearExpiryDeduction = Math.min(25, nearExpirySKUCount * 5);
        const outOfStockDeduction = Math.min(20, outOfStockCount * 10);
        const lowStockDeduction = Math.min(20, lowStockCount * 5);

        let healthScore = 100 - expiredDeduction - nearExpiryDeduction - outOfStockDeduction - lowStockDeduction;
        healthScore = Math.max(0, healthScore);

        // ── Health Score Drop Check ──
        // Find latest history entry before today
        const latestHistory = await BranchHealthHistory.findOne({
            pharmacyId,
            date: { $lt: today }
        }).sort({ date: -1 });

        if (latestHistory && latestHistory.healthScore - healthScore >= 5) {
            // Log a DB alert if we haven't today
            const todayAlert = await Alert.findOne({
                pharmacyId,
                alertType: 'Health',
                createdAt: { $gte: today }
            });
            if (!todayAlert) {
                await Alert.create({
                    pharmacyId,
                    title: 'Branch Health Score Drop Detected',
                    message: `Inventory health score has dropped from ${latestHistory.healthScore} to ${healthScore}. Review low stock or expired medications immediately.`,
                    severity: 'critical',
                    alertType: 'Health'
                });
            }
        }

        // Upsert today's branch health history
        const startOfToday = new Date(today);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        await BranchHealthHistory.findOneAndUpdate(
            { pharmacyId, date: { $gte: startOfToday, $lte: endOfToday } },
            { healthScore, date: new Date() },
            { upsert: true, new: true }
        );

        // 2. Recent Transactions
        const recentTransactions = await InventoryTransaction.find({ pharmacyId })
            .populate('medicineId', 'name ndc category')
            .populate('userId', 'username')
            .sort({ createdAt: -1 })
            .limit(5);

        // 3. Category Distribution
        const categoryMap = {};
        medicines.forEach(m => {
            if (!categoryMap[m.category]) {
                categoryMap[m.category] = { category: m.category, count: 0, valuation: 0 };
            }
            categoryMap[m.category].count += 1;
            categoryMap[m.category].valuation += m.stock * m.price;
        });
        const categoryData = Object.values(categoryMap);

        // 4. Daily Stock Movements (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const last7DaysTransactions = await InventoryTransaction.find({
            pharmacyId,
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: 1 });

        // Initialize 7 days list
        const dailyMovementsMap = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            dailyMovementsMap[dateStr] = { date: dateStr, label, stockIn: 0, stockOut: 0 };
        }

        last7DaysTransactions.forEach(t => {
            const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
            if (dailyMovementsMap[dateStr]) {
                if (t.transactionType === 'Stock In') {
                    dailyMovementsMap[dateStr].stockIn += Math.abs(t.quantityChanged);
                } else if (t.transactionType === 'Stock Out') {
                    dailyMovementsMap[dateStr].stockOut += Math.abs(t.quantityChanged);
                }
            }
        });

        const dailyMovements = Object.values(dailyMovementsMap);

        // 5. Active Alerts from Database
        const dbAlertsList = await Alert.find({ pharmacyId, isRead: false })
            .sort({ createdAt: -1 });

        // 6. Briefing Widget Summary
        const pendingOrdersCount = await ReorderRequest.countDocuments({ pharmacyId, status: 'Ordered' });
        const dailyTransactionsCount = await InventoryTransaction.countDocuments({ pharmacyId, createdAt: { $gte: today } });

        const briefing = [
            `Branch health stands at ${healthScore}/100. Dead stock is ₹${deadStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} at risk from expired medicines.`,
            `${lowStockCount} active items are below their reorder points. ${pendingOrdersCount} stock orders are currently pending arrival in transit.`,
            `Recorded ${dailyTransactionsCount} stock movements today by branch operators.`
        ];

        // 7. Critical Action Center Data Calculations
        // 7.1 Pending/Delayed Supplier Orders (status is Ordered or In Transit, and expectedDeliveryDate is past today)
        const delayedOrders = await PurchaseOrder.find({
            pharmacyId,
            status: { $in: ['Ordered', 'In Transit'] },
            expectedDeliveryDate: { $lt: new Date() }
        }).populate('supplierId', 'name contactPerson phone email');

        const delayedOrdersCount = delayedOrders.length;
        const delayedOrdersValue = delayedOrders.reduce((sum, po) => sum + po.totalCost, 0);

        // 7.2 Compliance Issues calculations
        const medicinesMissingInfo = await Medicine.countDocuments({
            pharmacyId,
            status: { $ne: 'Archived' },
            $or: [
                { ndc: { $in: [null, ''] } },
                { category: { $in: [null, ''] } },
                { price: { $in: [null, 0] } }
            ]
        });

        const medicinesMissingExpiry = await Medicine.countDocuments({
            pharmacyId,
            status: { $ne: 'Archived' },
            expiryDate: { $exists: false }
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const transactionsMissingBatch = await InventoryTransaction.countDocuments({
            pharmacyId,
            transactionType: 'Stock In',
            createdAt: { $gte: thirtyDaysAgo },
            $or: [
                { batchNumber: { $in: [null, ''] } }
            ]
        });

        // 7.3 Branches Requiring Attention (Admin only)
        let lowHealthBranches = [];
        if (req.user.role === 'Admin') {
            const activeBranches = await Pharmacy.find({ status: 'Active' });
            
            for (const b of activeBranches) {
                const meds = await Medicine.find({ pharmacyId: b._id, status: { $ne: 'Archived' } });
                
                let outOfStock = 0;
                let lowStock = 0;
                const branchExpiryAlerts = [];

                meds.forEach(m => {
                    const isZero = m.stock === 0;
                    const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
                    const isLow = m.stock > 0 && m.stock < reorderThreshold;

                    if (m.status === 'Active') {
                        if (isZero) outOfStock++;
                        if (isLow) lowStock++;
                    }

                    if (m.expiryDate) {
                        const expDate = new Date(m.expiryDate);
                        if (expDate < today) {
                            branchExpiryAlerts.push({ status: 'Expired', stock: m.stock });
                        } else if (expDate <= thirtyDaysFromNow) {
                            branchExpiryAlerts.push({ status: 'Near Expiry', stock: m.stock });
                        }
                    }
                });

                const expSKU = branchExpiryAlerts.filter(x => x.status === 'Expired' && x.stock > 0).length;
                const nearExpSKU = branchExpiryAlerts.filter(x => x.status === 'Near Expiry' && x.stock > 0).length;

                const expDed = Math.min(45, expSKU * 15);
                const nearExpDed = Math.min(25, nearExpSKU * 5);
                const oosDed = Math.min(20, outOfStock * 10);
                const lsDed = Math.min(20, lowStock * 5);

                const bHealthScore = Math.max(0, 100 - expDed - nearExpDed - oosDed - lsDed);

                if (bHealthScore < 85) {
                    lowHealthBranches.push({
                        id: b._id,
                        name: b.name,
                        branchCode: b.branchCode,
                        healthScore: bHealthScore
                    });
                }
            }
        }

        res.json({
            metrics: {
                totalValuation,
                activeChannels: activeChannelsCount,
                outOfStock: outOfStockCount,
                lowStock: lowStockCount,
                expired: expiredCount,
                nearExpiry: nearExpiryCount,
                expiredWithStock: expiredSKUCount,
                nearExpiryWithStock: nearExpirySKUCount,
                expiredDeduction,
                nearExpiryDeduction,
                outOfStockDeduction,
                lowStockDeduction,
                deadStockValue,
                atRiskValue,
                healthScore
            },
            expiryAlerts: expiryAlerts.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
            lowStockAlerts: lowStockAlerts.sort((a, b) => a.stock - b.stock),
            recentTransactions,
            categoryData,
            dailyMovements,
            dbAlerts: dbAlertsList,
            briefing,
            criticalActionCenter: {
                delayedOrdersCount,
                delayedOrdersValue,
                delayedOrders,
                complianceIssues: {
                    medicinesMissingInfo,
                    medicinesMissingExpiry,
                    transactionsMissingBatch
                },
                lowHealthBranches
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Admin Branches Comparison View Controller
export const getAdminBranchesComparison = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: only system admins can view comparisons.' });
        }

        const pharmacies = await Pharmacy.find({});
        const comparisonData = [];

        for (const p of pharmacies) {
            const medicines = await Medicine.find({
                pharmacyId: p._id,
                status: { $ne: 'Archived' }
            });

            const userCount = await User.countDocuments({ pharmacyId: p._id });
            const alertCount = await Alert.countDocuments({ pharmacyId: p._id, isRead: false });

            let totalValuation = 0;
            let outOfStockCount = 0;
            let lowStockCount = 0;
            let expiredSKUs = 0;
            let nearExpirySKUs = 0;
            let deadStockValue = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            thirtyDaysFromNow.setHours(23, 59, 59, 999);

            medicines.forEach(m => {
                totalValuation += m.stock * m.price;
                const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;

                if (m.status === 'Active') {
                    if (m.stock === 0) outOfStockCount++;
                    if (m.stock > 0 && m.stock < reorderThreshold) lowStockCount++;
                }

                if (m.expiryDate) {
                    const expDate = new Date(m.expiryDate);
                    if (expDate < today) {
                        if (m.stock > 0) expiredSKUs++;
                        deadStockValue += m.stock * m.price;
                    } else if (expDate <= thirtyDaysFromNow) {
                        if (m.stock > 0) nearExpirySKUs++;
                    }
                }
            });

            // Calculate Health Score
            const expiredDeduction = Math.min(45, expiredSKUs * 15);
            const nearExpiryDeduction = Math.min(25, nearExpirySKUs * 5);
            const outOfStockDeduction = Math.min(20, outOfStockCount * 10);
            const lowStockDeduction = Math.min(20, lowStockCount * 5);

            let healthScore = 100 - expiredDeduction - nearExpiryDeduction - outOfStockDeduction - lowStockDeduction;
            healthScore = Math.max(0, healthScore);

            comparisonData.push({
                pharmacyId: p._id,
                name: p.name,
                address: p.address,
                healthScore,
                totalValuation,
                deadStockValue,
                lowStockCount,
                userCount,
                alertCount
            });
        }

        res.json(comparisonData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/dashboard/priorities
export const getDashboardPriorities = async (req, res) => {
    try {
        let pharmacyId = req.user.pharmacyId;
        if (req.user.role === 'Admin' && req.query.branchId) {
            pharmacyId = req.query.branchId;
        }

        if (!pharmacyId) {
            return res.json({ priorities: [] });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);

        // 1. Medicines expiring within 30 days
        const expiringMeds = await Medicine.find({
            pharmacyId,
            status: { $ne: 'Archived' },
            stock: { $gt: 0 },
            expiryDate: { $lte: thirtyDaysFromNow }
        });
        const expiryCount = expiringMeds.length;
        const expiryVal = expiringMeds.reduce((sum, m) => sum + (m.stock * m.price), 0);

        // 2. Medicines below reorder point (currentStock <= reorderPoint)
        const lowStockCount = await Medicine.countDocuments({
            pharmacyId,
            status: 'Active',
            $expr: { $lte: ["$stock", "$reorderPoint"] }
        });

        // 3. Branch health score calculation
        const meds = await Medicine.find({ pharmacyId, status: { $ne: 'Archived' } });
        let outOfStock = 0;
        let lowStock = 0;
        let expiredSKU = 0;
        let nearExpirySKU = 0;

        meds.forEach(m => {
            const isZero = m.stock === 0;
            const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
            const isLow = m.stock > 0 && m.stock < reorderThreshold;

            if (m.status === 'Active') {
                if (isZero) outOfStock++;
                if (isLow) lowStock++;
            }

            if (m.expiryDate) {
                const expDate = new Date(m.expiryDate);
                if (expDate < today) {
                    if (m.stock > 0) expiredSKU++;
                } else if (expDate <= thirtyDaysFromNow) {
                    if (m.stock > 0) nearExpirySKU++;
                }
            }
        });

        const expiredDeduction = Math.min(45, expiredSKU * 15);
        const nearExpiryDeduction = Math.min(25, nearExpirySKU * 5);
        const outOfStockDeduction = Math.min(20, outOfStock * 10);
        const lowStockDeduction = Math.min(20, lowStock * 5);

        const healthScore = Math.max(0, 100 - expiredDeduction - nearExpiryDeduction - outOfStockDeduction - lowStockDeduction);

        let topReason = "General inventory imbalance";
        let maxDeduction = 0;
        if (expiredDeduction > maxDeduction) {
            maxDeduction = expiredDeduction;
            topReason = `${expiredSKU} expired medicines on shelves`;
        }
        if (nearExpiryDeduction > maxDeduction) {
            maxDeduction = nearExpiryDeduction;
            topReason = `${nearExpirySKU} medicines expiring within 30 days`;
        }
        if (outOfStockDeduction > maxDeduction) {
            maxDeduction = outOfStockDeduction;
            topReason = `${outOfStock} active medicines out of stock`;
        }
        if (lowStockDeduction > maxDeduction) {
            maxDeduction = lowStockDeduction;
            topReason = `${lowStock} medicines below safety stock levels`;
        }

        // Construct priorities feed
        const priorities = [];

        // Critical Expiries
        if (expiryCount > 0) {
            priorities.push({
                type: "expiry",
                severity: "critical",
                title: `${expiryCount} medicine${expiryCount > 1 ? 's' : ''} expire${expiryCount === 1 ? 's' : ''} within 30 days`,
                impact: `₹${expiryVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} at risk`,
                action: "Review Expiry",
                route: "/expiry-dashboard",
                role: "Manager",
                count: expiryCount
            });
        }

        // Warning Reorders
        if (lowStockCount > 0) {
            priorities.push({
                type: "reorder",
                severity: "warning",
                title: `${lowStockCount} medicine${lowStockCount > 1 ? 's' : ''} below safety stock limit`,
                impact: "Patient Outflow: Empty shelf risk",
                action: "Order Stock",
                route: "/reorder-intelligence",
                role: "Manager",
                count: lowStockCount
            });
        }

        // Watch Branch Health
        if (healthScore < 70) {
            priorities.push({
                type: "branch_health",
                severity: "watch",
                title: `Branch health score dropped to ${healthScore}%`,
                impact: `Reason: ${topReason}`,
                action: "Review Branch",
                route: "/branch-comparison",
                role: "Admin",
                count: 1
            });
        }

        res.json({ priorities });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
