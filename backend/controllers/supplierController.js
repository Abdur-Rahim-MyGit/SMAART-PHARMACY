import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import SupplierAudit from '../models/SupplierAudit.js';
import Medicine from '../models/Medicine.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import InventoryLog from '../models/InventoryLog.js';
import Alert from '../models/Alert.js';
import mongoose from 'mongoose';

// Utility helper for audit trail logging
const logAuditTrail = async ({ pharmacyId, userId, username, action, targetId, targetType, previousValue, newValue }) => {
    try {
        await SupplierAudit.create({
            pharmacyId,
            userId,
            username,
            action,
            targetId,
            targetType,
            previousValue,
            newValue
        });
    } catch (err) {
        console.error('Audit trail logging failed:', err);
    }
};

// Utility helper to recalculate health score & performance metrics
const updateSupplierMetrics = async (supplierId, pharmacyId) => {
    try {
        const supplier = await Supplier.findOne({ _id: supplierId, pharmacyId });
        if (!supplier) return;

        // Fetch all non-draft POs for this supplier
        const orders = await PurchaseOrder.find({ supplierId, pharmacyId, status: { $ne: 'Draft' } });

        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'Delivered').length;
        const pendingOrders = orders.filter(o => ['Pending Approval', 'Ordered', 'In Transit'].includes(o.status)).length;
        const totalPurchaseValue = orders
            .filter(o => o.status === 'Delivered')
            .reduce((sum, o) => sum + o.totalCost, 0);

        // Calculate Average Delivery Time (days) and Delivery Timeliness
        let totalDeliveryDays = 0;
        let deliveredOnTime = 0;
        let deliveredCount = 0;

        orders.forEach(order => {
            if (order.status === 'Delivered' && order.actualDeliveryDate) {
                deliveredCount++;
                const actual = new Date(order.actualDeliveryDate);
                const orderDate = new Date(order.orderDate);
                const deliveryTimeDiff = Math.max(0, (actual - orderDate) / (1000 * 60 * 60 * 24));
                totalDeliveryDays += deliveryTimeDiff;

                if (order.expectedDeliveryDate) {
                    const expected = new Date(order.expectedDeliveryDate);
                    if (actual <= expected) {
                        deliveredOnTime++;
                    }
                }
            }
        });

        const averageDeliveryTime = deliveredCount > 0 ? Math.round((totalDeliveryDays / deliveredCount) * 10) / 10 : 0;
        const timelinessRate = deliveredCount > 0 ? (deliveredOnTime / deliveredCount) * 100 : 100;

        // Calculate Order Completion Rate
        const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled').length;
        const completionRate = nonCancelledOrders > 0 ? (completedOrders / nonCancelledOrders) * 100 : 100;

        // Calculate return rate (mocked factor or based on return rate logs)
        const returnRate = supplier.performanceMetrics?.returnRate || 0;

        // Availability rate (ratio of completed/non-cancelled orders)
        const availabilityRate = nonCancelledOrders > 0 ? (orders.filter(o => o.status !== 'Cancelled').length / totalOrders) * 100 : 100;

        // Health Score (0 - 100)
        // Delivery Timeliness (30%), Completion Rate (30%), Availability (20%), Return Rate factor (20%)
        const calculatedHealth = (timelinessRate * 0.3) + (completionRate * 0.3) + (availabilityRate * 0.2) + ((100 - returnRate) * 0.2);
        const healthScore = Math.max(0, Math.min(100, Math.round(calculatedHealth)));

        // Find last delivery date
        const deliveredOrdersSorted = orders
            .filter(o => o.status === 'Delivered' && o.actualDeliveryDate)
            .sort((a, b) => new Date(b.actualDeliveryDate) - new Date(a.actualDeliveryDate));
        const lastDeliveryDate = deliveredOrdersSorted.length > 0 ? deliveredOrdersSorted[0].actualDeliveryDate : null;

        supplier.performanceMetrics = {
            totalOrders,
            completedOrders,
            pendingOrders,
            totalPurchaseValue,
            lastDeliveryDate,
            averageDeliveryTime,
            returnRate
        };
        supplier.healthScore = healthScore;
        
        // Map rating based on health score (0-5 stars)
        supplier.rating = Math.round((healthScore / 20) * 10) / 10;

        await supplier.save();
    } catch (err) {
        console.error('Recalculate supplier metrics failed:', err);
    }
};

// ── SUPPLIER ENDPOINTS ──

// GET /api/suppliers
export const getSuppliers = async (req, res) => {
    try {
        const { filter, search } = req.query;
        let query = { pharmacyId: req.user.pharmacyId };

        if (filter === 'Active') {
            query.status = 'Active';
        } else if (filter === 'Inactive') {
            query.status = 'Inactive';
        } else if (filter === 'Top Rated') {
            query.status = 'Active';
            query.healthScore = { $gte: 80 };
        } else if (filter === 'Recently Added') {
            query.status = 'Active';
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contactPerson: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        let suppliers = await Supplier.find(query);

        // Sort for Recently Added
        if (filter === 'Recently Added') {
            suppliers.sort((a, b) => b.createdAt - a.createdAt);
        } else {
            suppliers.sort((a, b) => b.healthScore - a.healthScore);
        }

        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/suppliers/:id
export const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findOne({ _id: req.params.id, pharmacyId: req.user.pharmacyId });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Fetch medicines supplied by this supplier
        const medicines = await Medicine.find({
            pharmacyId: req.user.pharmacyId,
            $or: [
                { primarySupplier: supplier._id },
                { alternateSupplier: supplier._id }
            ]
        });

        res.json({ supplier, medicines });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/suppliers
export const createSupplier = async (req, res) => {
    try {
        const { name, contactPerson, phone, email, address, gstNumber } = req.body;
        
        if (!name || !contactPerson || !phone || !email || !address || !gstNumber) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const supplier = new Supplier({
            name,
            contactPerson,
            phone,
            email,
            address,
            gstNumber,
            pharmacyId: req.user.pharmacyId
        });

        const savedSupplier = await supplier.save();

        // Log audit trail
        await logAuditTrail({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            username: req.session.username || 'System User',
            action: 'Supplier Creation',
            targetId: savedSupplier._id,
            targetType: 'Supplier',
            newValue: savedSupplier.toObject()
        });

        res.status(201).json(savedSupplier);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
    try {
        const { name, contactPerson, phone, email, address, gstNumber, status } = req.body;
        const supplier = await Supplier.findOne({ _id: req.params.id, pharmacyId: req.user.pharmacyId });

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        const previousValue = supplier.toObject();

        if (name) supplier.name = name;
        if (contactPerson) supplier.contactPerson = contactPerson;
        if (phone) supplier.phone = phone;
        if (email) supplier.email = email;
        if (address) supplier.address = address;
        if (gstNumber) supplier.gstNumber = gstNumber;
        
        let deactivationTriggered = false;
        if (status && status !== supplier.status) {
            if (status === 'Inactive') {
                deactivationTriggered = true;
            }
            supplier.status = status;
        }

        const updatedSupplier = await supplier.save();

        // Create notification for Supplier Inactivity / Deactivation
        if (deactivationTriggered) {
            await Alert.create({
                pharmacyId: req.user.pharmacyId,
                title: 'Supplier Deactivated',
                message: `Supplier ${supplier.name} has been set to Inactive status.`,
                severity: 'warning',
                alertType: 'General'
            });

            await logAuditTrail({
                pharmacyId: req.user.pharmacyId,
                userId: req.user.id,
                username: req.session.username || 'System User',
                action: 'Supplier Deactivation',
                targetId: updatedSupplier._id,
                targetType: 'Supplier',
                previousValue,
                newValue: updatedSupplier.toObject()
            });
        } else {
            await logAuditTrail({
                pharmacyId: req.user.pharmacyId,
                userId: req.user.id,
                username: req.session.username || 'System User',
                action: 'Supplier Update',
                targetId: updatedSupplier._id,
                targetType: 'Supplier',
                previousValue,
                newValue: updatedSupplier.toObject()
            });
        }

        res.json(updatedSupplier);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── PURCHASE ORDER ENDPOINTS ──

// GET /api/purchase-orders
export const getPurchaseOrders = async (req, res) => {
    try {
        const query = { pharmacyId: req.user.pharmacyId };
        const orders = await PurchaseOrder.find(query)
            .populate('supplierId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/purchase-orders/:id
export const getPurchaseOrderById = async (req, res) => {
    try {
        const order = await PurchaseOrder.findOne({ _id: req.params.id, pharmacyId: req.user.pharmacyId })
            .populate('supplierId')
            .populate('createdBy', 'fullName role')
            .populate('approvedBy', 'fullName role');
        if (!order) {
            return res.status(404).json({ message: 'Purchase order not found.' });
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/purchase-orders
export const createPurchaseOrder = async (req, res) => {
    try {
        const { supplierId, medicines, expectedDeliveryDate, status, notes } = req.body;
        
        if (!supplierId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({ message: 'Supplier and medicine items list are required.' });
        }

        // Validate supplier
        const supplier = await Supplier.findOne({ _id: supplierId, pharmacyId: req.user.pharmacyId });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        // Enforce role status limits
        let targetStatus = status || 'Draft';
        if (req.user.role === 'Manager') {
            // Managers can only create Draft or Pending Approval POs
            if (!['Draft', 'Pending Approval'].includes(targetStatus)) {
                return res.status(403).json({ message: 'Managers are restricted to Draft or Pending Approval statuses.' });
            }
        }

        // Calculate costs
        let grandTotal = 0;
        const items = [];
        for (const item of medicines) {
            const med = await Medicine.findOne({ _id: item.medicineId, pharmacyId: req.user.pharmacyId });
            if (!med) {
                return res.status(404).json({ message: `Medicine ID ${item.medicineId} not found in catalog.` });
            }
            const unitCost = Number(item.unitCost) >= 0 ? Number(item.unitCost) : med.supplierCost || 0;
            const quantity = Number(item.quantity);
            const lineTotal = quantity * unitCost;
            grandTotal += lineTotal;
            items.push({
                medicineId: item.medicineId,
                name: med.name,
                quantity,
                unitCost,
                totalCost: lineTotal
            });
        }

        // Generate PO Number (PO-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await PurchaseOrder.countDocuments({
            poNumber: { $regex: `^PO-${dateStr}-` }
        });
        const seq = String(count + 1).padStart(4, '0');
        const poNumber = `PO-${dateStr}-${seq}`;

        const po = new PurchaseOrder({
            poNumber,
            supplierId,
            pharmacyId: req.user.pharmacyId,
            medicines: items,
            totalCost: grandTotal,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: targetStatus,
            createdBy: req.user.id,
            notes
        });

        const savedPO = await po.save();

        // Write Audit log
        await logAuditTrail({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            username: req.session.username || 'System User',
            action: 'Purchase Order Creation',
            targetId: savedPO._id,
            targetType: 'PurchaseOrder',
            newValue: savedPO.toObject()
        });

        // Trigger notification if Pending Approval
        if (targetStatus === 'Pending Approval') {
            await Alert.create({
                pharmacyId: req.user.pharmacyId,
                title: 'Pending Purchase Order',
                message: `New Purchase Order ${poNumber} requires Admin approval.`,
                severity: 'info',
                alertType: 'General'
            });
        }

        // Recalculate metrics
        await updateSupplierMetrics(supplierId, req.user.pharmacyId);

        res.status(201).json(savedPO);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/purchase-orders/:id
export const updatePurchaseOrder = async (req, res) => {
    try {
        const { status, expectedDeliveryDate, medicines, notes } = req.body;
        const po = await PurchaseOrder.findOne({ _id: req.params.id, pharmacyId: req.user.pharmacyId });

        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found.' });
        }

        const previousValue = po.toObject();
        const previousStatus = po.status;

        // Check Role limits on transition
        if (status && status !== po.status) {
            if (req.user.role === 'Manager') {
                // Manager can only transition to/from Draft / Pending Approval / Cancelled
                if (!['Draft', 'Pending Approval', 'Cancelled'].includes(status)) {
                    return res.status(403).json({ message: 'Managers cannot approve or transition PO to Ordered/In Transit/Delivered.' });
                }
            } else if (req.user.role === 'Admin') {
                if (status === 'Ordered') {
                    po.approvedBy = req.user.id;
                }
            }
            po.status = status;
        }

        if (expectedDeliveryDate) po.expectedDeliveryDate = new Date(expectedDeliveryDate);
        if (notes) po.notes = notes;

        // If in Draft, allow updating medicines list and recalculate costs
        if (po.status === 'Draft' && medicines && Array.isArray(medicines)) {
            let grandTotal = 0;
            const items = [];
            for (const item of medicines) {
                const med = await Medicine.findOne({ _id: item.medicineId, pharmacyId: req.user.pharmacyId });
                if (med) {
                    const unitCost = Number(item.unitCost) >= 0 ? Number(item.unitCost) : med.supplierCost || 0;
                    const quantity = Number(item.quantity);
                    const lineTotal = quantity * unitCost;
                    grandTotal += lineTotal;
                    items.push({
                        medicineId: item.medicineId,
                        name: med.name,
                        quantity,
                        unitCost,
                        totalCost: lineTotal
                    });
                }
            }
            po.medicines = items;
            po.totalCost = grandTotal;
        }

        // Handle Delivered status (Receive inventory)
        if (po.status === 'Delivered' && previousStatus !== 'Delivered') {
            po.actualDeliveryDate = new Date();
            
            // Loop items and increment stock levels
            for (const item of po.medicines) {
                const med = await Medicine.findOne({ _id: item.medicineId, pharmacyId: req.user.pharmacyId });
                if (med) {
                    const oldStock = med.stock;
                    med.stock += item.quantity;
                    med.lastPurchasePrice = item.unitCost;
                    med.updatedBy = req.user.id;
                    await med.save();

                    // Generate Inventory Transaction log
                    await InventoryTransaction.create({
                        medicineId: med._id,
                        pharmacyId: req.user.pharmacyId,
                        userId: req.user.id,
                        transactionType: 'Stock In',
                        quantityChanged: item.quantity,
                        supplier: po.branchName || 'Supplier order receipt',
                        receivedDate: new Date(),
                        notes: `Procured via Purchase Order ${po.poNumber}`
                    });

                    // Generate Inventory Log audit
                    await InventoryLog.create({
                        medicineId: med._id,
                        pharmacyId: req.user.pharmacyId,
                        userId: req.user.id,
                        changeType: 'StockUpdate',
                        quantityChanged: item.quantity,
                        oldStock,
                        newStock: med.stock,
                        notes: `Received batch from PO ${po.poNumber}`
                    });
                }
            }
        }

        const savedPO = await po.save();

        // Write audit log for status change
        await logAuditTrail({
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            username: req.session.username || 'System User',
            action: previousStatus !== savedPO.status ? 'PO Status Changed' : 'PO Updated',
            targetId: savedPO._id,
            targetType: 'PurchaseOrder',
            previousValue,
            newValue: savedPO.toObject()
        });

        // Trigger Alerts for Delayed Deliveries, Rejected Orders, and Pending Approval
        if (savedPO.status === 'Cancelled' && previousStatus !== 'Cancelled') {
            await Alert.create({
                pharmacyId: req.user.pharmacyId,
                title: 'Rejected Purchase Order',
                message: `Purchase Order ${po.poNumber} has been rejected or cancelled.`,
                severity: 'critical',
                alertType: 'General'
            });
        }

        // Recalculate metrics
        await updateSupplierMetrics(po.supplierId, req.user.pharmacyId);

        res.json(savedPO);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/suppliers-analytics
export const getSupplierAnalytics = async (req, res) => {
    try {
        const pharmacyId = new mongoose.Types.ObjectId(req.user.pharmacyId);

        // 1. Spend per month (Last 6 Months)
        const spendByMonth = await PurchaseOrder.aggregate([
            { $match: { pharmacyId, status: 'Delivered' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
                    totalSpend: { $sum: '$totalCost' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } },
            { $limit: 6 }
        ]);

        // 2. Spend per Supplier
        const spendBySupplier = await PurchaseOrder.aggregate([
            { $match: { pharmacyId, status: 'Delivered' } },
            {
                $group: {
                    _id: '$supplierId',
                    totalSpend: { $sum: '$totalCost' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'suppliers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'supplier'
                }
            },
            { $unwind: '$supplier' },
            {
                $project: {
                    name: '$supplier.name',
                    totalSpend: 1,
                    orderCount: 1
                }
            },
            { $sort: { totalSpend: -1 } }
        ]);

        // 3. Top Suppliers (by Rating/Health)
        const topSuppliers = await Supplier.find({ pharmacyId, status: 'Active' })
            .sort({ healthScore: -1 })
            .limit(5);

        // 4. Most Purchased Medicines
        const mostPurchased = await PurchaseOrder.aggregate([
            { $match: { pharmacyId, status: 'Delivered' } },
            { $unwind: '$medicines' },
            {
                $group: {
                    _id: '$medicines.medicineId',
                    name: { $first: '$medicines.name' },
                    totalQuantity: { $sum: '$medicines.quantity' },
                    totalSpend: { $sum: '$medicines.totalCost' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);

        // 5. Delayed delivery trends
        // Average delay in days per month
        const deliveryPerformance = await PurchaseOrder.aggregate([
            { $match: { pharmacyId, status: 'Delivered', expectedDeliveryDate: { $exists: true } } },
            {
                $project: {
                    month: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
                    delay: {
                        $divide: [
                            { $subtract: ['$actualDeliveryDate', '$expectedDeliveryDate'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$month',
                    avgDelayDays: { $avg: '$delay' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            spendByMonth,
            spendBySupplier,
            topSuppliers,
            mostPurchased,
            deliveryPerformance
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/suppliers-audit
export const getSupplierAuditLogs = async (req, res) => {
    try {
        const query = { pharmacyId: req.user.pharmacyId };
        const logs = await SupplierAudit.find(query).sort({ timestamp: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
