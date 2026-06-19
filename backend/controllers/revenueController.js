import InventoryTransaction from '../models/InventoryTransaction.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
import mongoose from 'mongoose';

// GET /api/revenue/analytics
export const getRevenueAnalytics = async (req, res) => {
    try {
        let queryPharmacyId = null;
        
        // Role Access Enforcement
        if (req.user.role === 'Pharmacist') {
            return res.status(403).json({ message: 'Forbidden: Pharmacists have no access to revenue details.' });
        } else if (req.user.role === 'Manager') {
            // Managers can ONLY query their assigned branch
            queryPharmacyId = new mongoose.Types.ObjectId(req.user.pharmacyId);
        } else if (req.user.role === 'Admin') {
            // Admin can query a specific branch or all
            if (req.query.branchId) {
                queryPharmacyId = new mongoose.Types.ObjectId(req.query.branchId);
            }
        }

        // Match Query
        const matchStage = { transactionType: 'Stock Out' };
        if (queryPharmacyId) {
            matchStage.pharmacyId = queryPharmacyId;
        }

        // Aggregate Financial Data
        const financeAgg = await InventoryTransaction.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'medicines',
                    localField: 'medicineId',
                    foreignField: '_id',
                    as: 'medicine'
                }
            },
            { $unwind: '$medicine' },
            {
                $project: {
                    pharmacyId: 1,
                    medicineId: 1,
                    name: '$medicine.name',
                    qty: { $abs: '$quantityChanged' },
                    price: '$medicine.price',
                    cost: { $ifNull: ['$medicine.supplierCost', { $multiply: ['$medicine.price', 0.7] }] },
                    createdAt: 1
                }
            },
            {
                $project: {
                    pharmacyId: 1,
                    medicineId: 1,
                    name: 1,
                    qty: 1,
                    revenue: { $multiply: ['$qty', '$price'] },
                    cogs: { $multiply: ['$qty', '$cost'] },
                    createdAt: 1
                }
            },
            {
                $project: {
                    pharmacyId: 1,
                    medicineId: 1,
                    name: 1,
                    qty: 1,
                    revenue: 1,
                    cogs: 1,
                    profit: { $subtract: ['$revenue', '$cogs'] },
                    createdAt: 1
                }
            }
        ]);

        // 1. Calculate Summary Metrics
        const totalRevenue = financeAgg.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = financeAgg.reduce((sum, item) => sum + item.profit, 0);
        const totalUnitsSold = financeAgg.reduce((sum, item) => sum + item.qty, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // 2. Aggregate Spend/Revenue Trends by Month (Last 6 Months)
        const trendMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7); // YYYY-MM
            trendMap[key] = { month: key, revenue: 0, profit: 0 };
        }

        financeAgg.forEach(item => {
            const key = new Date(item.createdAt).toISOString().slice(0, 7);
            if (trendMap[key]) {
                trendMap[key].revenue += item.revenue;
                trendMap[key].profit += item.profit;
            }
        });
        const monthlyTrends = Object.values(trendMap);

        // 3. Aggregate Top Selling Medicines
        const medicineSalesMap = {};
        financeAgg.forEach(item => {
            const medId = item.medicineId.toString();
            if (!medicineSalesMap[medId]) {
                medicineSalesMap[medId] = { name: item.name, totalQuantity: 0, revenue: 0, profit: 0 };
            }
            medicineSalesMap[medId].totalQuantity += item.qty;
            medicineSalesMap[medId].revenue += item.revenue;
            medicineSalesMap[medId].profit += item.profit;
        });
        const topMedicines = Object.values(medicineSalesMap)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 5);

        // 4. Branch Comparison (Admin Only, when query is system-wide)
        let branchPerformance = [];
        if (req.user.role === 'Admin' && !req.query.branchId) {
            const branchMap = {};
            financeAgg.forEach(item => {
                const bId = item.pharmacyId.toString();
                if (!branchMap[bId]) {
                    branchMap[bId] = { pharmacyId: bId, revenue: 0, profit: 0, unitsSold: 0 };
                }
                branchMap[bId].revenue += item.revenue;
                branchMap[bId].profit += item.profit;
                branchMap[bId].unitsSold += item.qty;
            });

            const pharmacies = await Pharmacy.find({});
            branchPerformance = Object.values(branchMap).map(b => {
                const pharmacy = pharmacies.find(p => p._id.toString() === b.pharmacyId);
                const margin = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
                return {
                    pharmacyId: b.pharmacyId,
                    name: pharmacy ? pharmacy.name : 'Unknown Branch',
                    revenue: b.revenue,
                    profit: b.profit,
                    margin,
                    unitsSold: b.unitsSold
                };
            });
        }

        res.json({
            metrics: {
                totalRevenue,
                totalProfit,
                profitMargin,
                totalUnitsSold
            },
            monthlyTrends,
            topMedicines,
            branchPerformance
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/revenue/export
export const exportRevenueCSV = async (req, res) => {
    try {
        let queryPharmacyId = null;
        
        // Access rules
        if (req.user.role === 'Pharmacist') {
            return res.status(403).json({ message: 'Access Denied.' });
        } else if (req.user.role === 'Manager') {
            queryPharmacyId = new mongoose.Types.ObjectId(req.user.pharmacyId);
        } else if (req.user.role === 'Admin' && req.query.branchId) {
            queryPharmacyId = new mongoose.Types.ObjectId(req.query.branchId);
        }

        const matchStage = { transactionType: 'Stock Out' };
        if (queryPharmacyId) {
            matchStage.pharmacyId = queryPharmacyId;
        }

        const transactions = await InventoryTransaction.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'medicines',
                    localField: 'medicineId',
                    foreignField: '_id',
                    as: 'medicine'
                }
            },
            { $unwind: '$medicine' },
            {
                $project: {
                    createdAt: 1,
                    medicineName: '$medicine.name',
                    qty: { $abs: '$quantityChanged' },
                    price: '$medicine.price',
                    cost: { $ifNull: ['$medicine.supplierCost', { $multiply: ['$medicine.price', 0.7] }] }
                }
            }
        ]);

        // Build CSV Content
        let csv = 'Timestamp,Medicine Name,Quantity Sold,Unit Retail Price (INR),Unit Supplier Cost (INR),Total Revenue (INR),Total Profit (INR)\n';
        transactions.forEach(tx => {
            const revenue = tx.qty * tx.price;
            const cost = tx.qty * tx.cost;
            const profit = revenue - cost;
            const dateStr = new Date(tx.createdAt).toISOString();
            csv += `"${dateStr}","${tx.medicineName}",${tx.qty},${tx.price.toFixed(2)},${tx.cost.toFixed(2)},${revenue.toFixed(2)},${profit.toFixed(2)}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=financial-report-${new Date().toISOString().slice(0, 10)}.csv`);
        res.status(200).send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
