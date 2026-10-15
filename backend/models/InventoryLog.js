import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
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
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changeType: {
        type: String,
        enum: ['Create', 'StockUpdate', 'StatusChange', 'PriceUpdate', 'InfoUpdate'],
        required: true
    },
    quantityChanged: {
        type: Number,
        default: 0
    },
    oldStock: {
        type: Number,
        default: 0
    },
    newStock: {
        type: Number,
        default: 0
    },
    oldPrice: {
        type: Number
    },
    newPrice: {
        type: Number
    },
    oldStatus: {
        type: String
    },
    newStatus: {
        type: String
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

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
export default InventoryLog;
