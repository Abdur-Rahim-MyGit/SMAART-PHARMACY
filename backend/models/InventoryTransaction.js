import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema({
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true,
        index: true
    },
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true,
        alias: 'branchId'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transactionType: {
        type: String,
        enum: ['Stock In', 'Stock Out', 'Adjustment', 'Expired', 'Archived'],
        required: true,
        index: true
    },
    quantityChanged: {
        type: Number,
        required: true
    },
    batchNumber: {
        type: String,
        trim: true
    },
    supplier: {
        type: String,
        trim: true
    },
    receivedDate: {
        type: Date
    },
    reason: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
export default InventoryTransaction;
