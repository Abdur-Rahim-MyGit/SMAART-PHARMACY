import Medicine from '../models/Medicine.js';
import InventoryLog from '../models/InventoryLog.js';

// Get all medicines belonging to the logged-in user's pharmacy
export const getMedicines = async (req, res) => {
    const { status, branchId } = req.query;
    try {
        let pharmacyId = req.user.pharmacyId;
        if (req.user.role === 'Admin' && branchId) {
            pharmacyId = branchId;
        }
        const query = { pharmacyId };
        
        if (status) {
            query.status = status;
        } else {
            // Default to Active and Inactive, hiding Archived records unless requested
            query.status = { $in: ['Active', 'Inactive'] };
        }

        const medicines = await Medicine.find(query).sort({ name: 1 });
        res.json(medicines);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Retrieve a single medicine record with tenant verification and substitute finder
export const getMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findOne({
            _id: req.params.id,
            pharmacyId: req.user.pharmacyId
        });
        
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        // Find similar medicines in-stock in the same category
        const similarInDb = await Medicine.find({
            pharmacyId: req.user.pharmacyId,
            category: medicine.category,
            _id: { $ne: medicine._id },
            status: 'Active',
            stock: { $gt: 0 }
        }).limit(3);

        let substitutes = similarInDb.map(m => m.name);

        // Standard brand name fallbacks for Paracetamol
        if (medicine.name.toLowerCase().includes('paracetamol')) {
            const standardSubstitutes = ['Dolo 650', 'Calpol 650', 'Crocin Advance'];
            substitutes = [...new Set([...substitutes, ...standardSubstitutes])].slice(0, 3);
        }

        res.json({
            ...medicine.toObject(),
            substitutes
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new medicine record
export const addMedicine = async (req, res) => {
    const { name, ndc, category, stock, price, supplier, expiryDate, reorderPoint } = req.body;
    try {
        if (!name || !ndc || price === undefined) {
            return res.status(400).json({ message: 'Name, NDC, and Price are required' });
        }

        const medicine = new Medicine({
            name,
            ndc,
            category,
            stock: stock || 0,
            price,
            supplier,
            status: 'Active',
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            pharmacyId: req.user.pharmacyId, // Always bind to user's pharmacy
            updatedBy: req.user.id,
            createdBy: req.user.id,
            reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : 20
        });

        const savedMedicine = await medicine.save();

        // Audit Log entry
        const log = new InventoryLog({
            medicineId: savedMedicine._id,
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            changeType: 'Create',
            quantityChanged: savedMedicine.stock,
            oldStock: 0,
            newStock: savedMedicine.stock,
            newStatus: savedMedicine.status,
            newPrice: savedMedicine.price,
            notes: 'Medication record created'
        });
        await log.save();

        res.status(201).json(savedMedicine);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update a medicine record (with status update support, preventing hard delete)
export const updateMedicine = async (req, res) => {
    const { name, ndc, category, stock, price, supplier, status, expiryDate, reorderPoint } = req.body;
    try {
        const medicine = await Medicine.findOne({
            _id: req.params.id,
            pharmacyId: req.user.pharmacyId
        });

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found or access denied' });
        }

        // Cache old values for change auditing
        const oldStock = medicine.stock;
        const oldPrice = medicine.price;
        const oldStatus = medicine.status;

        if (name !== undefined) medicine.name = name;
        if (ndc !== undefined) medicine.ndc = ndc;
        if (category !== undefined) medicine.category = category;
        if (stock !== undefined) medicine.stock = stock;
        if (price !== undefined) medicine.price = price;
        if (supplier !== undefined) medicine.supplier = supplier;
        if (expiryDate !== undefined) medicine.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
        if (reorderPoint !== undefined) medicine.reorderPoint = Number(reorderPoint);
        
        if (status !== undefined) {
            if (!['Active', 'Inactive', 'Archived'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status value' });
            }
            medicine.status = status;
        }

        medicine.updatedBy = req.user.id;

        const updatedMedicine = await medicine.save();

        // Audit Log entry
        const quantityChanged = (stock !== undefined) ? (stock - oldStock) : 0;
        
        let changeType = 'InfoUpdate';
        if (quantityChanged !== 0) {
            changeType = 'StockUpdate';
        } else if (status !== undefined && status !== oldStatus) {
            changeType = 'StatusChange';
        } else if (price !== undefined && price !== oldPrice) {
            changeType = 'PriceUpdate';
        }

        const log = new InventoryLog({
            medicineId: medicine._id,
            pharmacyId: req.user.pharmacyId,
            userId: req.user.id,
            changeType,
            quantityChanged,
            oldStock,
            newStock: medicine.stock,
            oldPrice,
            newPrice: medicine.price,
            oldStatus,
            newStatus: medicine.status,
            notes: `Medication updated by ${req.user.username}`
        });
        await log.save();

        res.json(updatedMedicine);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Retrieve audit logs for a single medicine record with tenant verification
export const getMedicineLogs = async (req, res) => {
    try {
        const logs = await InventoryLog.find({
            medicineId: req.params.id,
            pharmacyId: req.user.pharmacyId
        })
        .populate('userId', 'username')
        .sort({ createdAt: -1 });
        
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
