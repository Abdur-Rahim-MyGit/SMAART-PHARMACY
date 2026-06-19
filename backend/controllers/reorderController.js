import Medicine from '../models/Medicine.js';
import ReorderRequest from '../models/ReorderRequest.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import InventoryLog from '../models/InventoryLog.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';

// Get reorder queue (medicines below reorderPoint with no active orders, plus current active orders)
export const getReorderQueue = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;

        // Fetch all active/inactive medicines below reorderPoint, populating suppliers
        const medicines = await Medicine.find({
            pharmacyId,
            status: { $ne: 'Archived' }
        }).populate('primarySupplier alternateSupplier');

        // Fetch all active reorder requests (not completed)
        const activeRequests = await ReorderRequest.find({
            pharmacyId,
            status: { $in: ['Pending', 'Ordered'] }
        }).populate({
            path: 'medicineId',
            populate: { path: 'primarySupplier' }
        });

        // Create a set of medicineIds currently in the reorder requests
        const requestMedIds = new Set(activeRequests.map(r => r.medicineId?._id?.toString()));

        const autoQueue = [];
        medicines.forEach(m => {
            const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
            if (m.stock < reorderThreshold && !requestMedIds.has(m._id.toString())) {
                autoQueue.push({
                    medicineId: m,
                    quantityNeeded: Math.max(reorderThreshold * 2 - m.stock, 50) // Propose a sensible replenishment batch
                });
            }
        });

        res.json({
            autoQueue,
            activeRequests
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new reorder request (marks as ordered)
export const createReorderRequest = async (req, res) => {
    const { medicineId, quantityNeeded, supplier } = req.body;
    try {
        if (!medicineId || !quantityNeeded || quantityNeeded <= 0) {
            return res.status(400).json({ message: 'Medicine ID and a valid quantity are required.' });
        }

        const medicine = await Medicine.findOne({ _id: medicineId, pharmacyId: req.user.pharmacyId });
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        const request = new ReorderRequest({
            medicineId,
            pharmacyId: req.user.pharmacyId,
            quantityNeeded,
            supplier: supplier || medicine.supplier || 'Generic Supplier',
            status: 'Ordered',
            orderedDate: new Date(),
            createdBy: req.user.id
        });

        const savedRequest = await request.save();
        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Complete a reorder request (marks as arrived, updates stock, writes stock-in transaction)
export const completeReorderRequest = async (req, res) => {
    try {
        const request = await ReorderRequest.findOne({
            _id: req.params.id,
            pharmacyId: req.user.pharmacyId
        });

        if (!request) {
            return res.status(404).json({ message: 'Reorder request not found.' });
        }

        if (request.status === 'Completed') {
            return res.status(400).json({ message: 'This reorder request has already been completed.' });
        }

        const medicine = await Medicine.findOne({ _id: request.medicineId, pharmacyId: req.user.pharmacyId });
        if (!medicine) {
            return res.status(404).json({ message: 'Associated medicine not found in catalog.' });
        }

        // Apply changes
        const oldStock = medicine.stock;
        medicine.stock += request.quantityNeeded;
        medicine.updatedBy = req.user.id;
        const savedMedicine = await medicine.save();

        // Update request details
        request.status = 'Completed';
        request.arrivalDate = new Date();
        const savedRequest = await request.save();

        // Write Compliance transaction record
        const transaction = new InventoryTransaction({
            medicineId: medicine._id,
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            transactionType: 'Stock In',
            quantityChanged: request.quantityNeeded,
            supplier: request.supplier,
            receivedDate: new Date(),
            notes: `Auto-delivered via Reorder Request replenishment.`
        });
        await transaction.save();

        // Write Inventory Audit log record
        const log = new InventoryLog({
            medicineId: medicine._id,
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            changeType: 'StockUpdate',
            quantityChanged: request.quantityNeeded,
            oldStock,
            newStock: medicine.stock,
            notes: `Stock replenished from arrived order. Completed reorder request ${request._id}`
        });
        await log.save();

        res.json({
            message: 'Replenishment shipment received and logged successfully.',
            medicine: savedMedicine,
            reorderRequest: savedRequest
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Generate a Draft Purchase Order directly from Reorder Center
export const generateDraftPO = async (req, res) => {
    try {
        const { medicineId, quantityNeeded, supplierId } = req.body;
        if (!medicineId || !quantityNeeded || !supplierId) {
            return res.status(400).json({ message: 'Medicine ID, quantity, and supplier are required.' });
        }

        const supplier = await Supplier.findOne({ _id: supplierId, pharmacyId: req.user.pharmacyId });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }

        const medicine = await Medicine.findOne({ _id: medicineId, pharmacyId: req.user.pharmacyId });
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        // Calculate Cost
        const unitCost = medicine.supplierCost || 0;
        const totalCost = Number(quantityNeeded) * unitCost;

        // Generate PO Number
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
            medicines: [{
                medicineId,
                name: medicine.name,
                quantity: Number(quantityNeeded),
                unitCost,
                totalCost
            }],
            totalCost,
            expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days expected
            status: 'Draft',
            createdBy: req.user.id,
            notes: `Auto-generated via Reorder Intelligence run for ${medicine.name}.`
        });

        const savedPO = await po.save();
        res.status(201).json(savedPO);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
