import InventoryTransaction from '../models/InventoryTransaction.js';
import Medicine from '../models/Medicine.js';

// Register Stock In Transaction
export const postStockIn = async (req, res) => {
    const { medicineId, quantity, batchNumber, supplier, receivedDate, notes } = req.body;
    try {
        if (!medicineId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Medicine ID and a valid positive quantity are required.' });
        }

        let pharmacyId = req.user.pharmacyId;
        if (req.user.role === 'Admin' && req.query.branchId) {
            pharmacyId = req.query.branchId;
        }

        // Find medicine and check tenant isolation
        const medicine = await Medicine.findOne({ _id: medicineId, pharmacyId });
        if (!medicine) {
            return res.status(404).json({ message: 'Medication not found in this store ledger.' });
        }

        // Increase stock count
        medicine.stock += Number(quantity);
        medicine.updatedBy = req.user.id;
        const savedMedicine = await medicine.save();

        // Create transaction audit record
        const transaction = new InventoryTransaction({
            medicineId,
            pharmacyId,
            userId: req.user.id,
            transactionType: 'Stock In',
            quantityChanged: Number(quantity),
            batchNumber,
            supplier,
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            notes: notes || 'New stock inventory received'
        });
        const savedTransaction = await transaction.save();

        res.status(201).json({
            message: 'Stock successfully checked in.',
            medicine: savedMedicine,
            transaction: savedTransaction
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Register Stock Out Transaction
export const postStockOut = async (req, res) => {
    const { medicineId, quantity, reason, notes } = req.body;
    try {
        if (!medicineId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Medicine ID and a valid positive quantity are required.' });
        }

        let pharmacyId = req.user.pharmacyId;
        if (req.user.role === 'Admin' && req.query.branchId) {
            pharmacyId = req.query.branchId;
        }

        // Find medicine and check tenant isolation
        const medicine = await Medicine.findOne({ _id: medicineId, pharmacyId });
        if (!medicine) {
            return res.status(404).json({ message: 'Medication not found in this store ledger.' });
        }

        // Enforce Business Rule: Never allow negative stock
        if (medicine.stock < Number(quantity)) {
            return res.status(400).json({ 
                message: `Insufficient stock. Current stock is ${medicine.stock}, but attempted to deduct ${quantity}.` 
            });
        }

        // Reduce stock count
        medicine.stock -= Number(quantity);
        medicine.updatedBy = req.user.id;
        const savedMedicine = await medicine.save();

        // Create transaction audit record
        const transaction = new InventoryTransaction({
            medicineId,
            pharmacyId,
            userId: req.user.id,
            transactionType: 'Stock Out',
            quantityChanged: -Number(quantity),
            reason: reason || 'Dispensed',
            notes: notes || 'Medication stock checked out'
        });
        const savedTransaction = await transaction.save();

        res.status(201).json({
            message: 'Stock successfully checked out.',
            medicine: savedMedicine,
            transaction: savedTransaction
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Register Stock Adjustment Transaction
export const postAdjustment = async (req, res) => {
    const { medicineId, quantityChanged, transactionType, reason, notes } = req.body;
    try {
        if (!medicineId || quantityChanged === undefined || quantityChanged === 0) {
            return res.status(400).json({ message: 'Medicine ID and a non-zero quantity change are required.' });
        }

        const validTypes = ['Adjustment', 'Expired', 'Archived'];
        if (!validTypes.includes(transactionType)) {
            return res.status(400).json({ message: 'Invalid transaction type for stock adjustments.' });
        }

        let pharmacyId = req.user.pharmacyId;
        if (req.user.role === 'Admin' && req.query.branchId) {
            pharmacyId = req.query.branchId;
        }

        // Find medicine and check tenant isolation
        const medicine = await Medicine.findOne({ _id: medicineId, pharmacyId });
        if (!medicine) {
            return res.status(404).json({ message: 'Medication not found in this store ledger.' });
        }

        // Enforce Business Rule: Never allow negative stock
        if (medicine.stock + Number(quantityChanged) < 0) {
            return res.status(400).json({ 
                message: `Adjustment rejected. Current stock is ${medicine.stock}, but adjustment would result in ${medicine.stock + Number(quantityChanged)}.` 
            });
        }

        // Apply adjustment
        medicine.stock += Number(quantityChanged);
        medicine.updatedBy = req.user.id;
        const savedMedicine = await medicine.save();

        // Create transaction audit record
        const transaction = new InventoryTransaction({
            medicineId,
            pharmacyId,
            userId: req.user.id,
            transactionType,
            quantityChanged: Number(quantityChanged),
            reason: reason || 'Inventory check adjustment',
            notes: notes || 'Manual inventory status correction'
        });
        const savedTransaction = await transaction.save();

        res.status(201).json({
            message: 'Stock successfully adjusted.',
            medicine: savedMedicine,
            transaction: savedTransaction
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Sorted, Filtered Transaction History scoped by pharmacyId
export const getHistory = async (req, res) => {
    const { id, medicineId, transactionType, branchId } = req.query;
    try {
        const query = {};

        if (id) {
            query._id = id;
        }

        if (medicineId) {
            query.medicineId = medicineId;
        }

        if (transactionType) {
            query.transactionType = transactionType;
        }

        let pharmacyId = req.user.pharmacyId;
        if (req.user.role === 'Admin') {
            if (branchId) {
                query.pharmacyId = branchId;
            }
        } else {
            // Managers and Pharmacists are isolated to their assigned branch
            query.pharmacyId = pharmacyId;
        }

        const history = await InventoryTransaction.find(query)
            .populate('medicineId', 'name ndc category')
            .populate('userId', 'username')
            .populate('pharmacyId', 'name branchCode')
            .sort({ createdAt: -1 });

        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
