import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ndc: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        trim: true,
        default: 'General'
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    supplier: {
        type: String,
        trim: true
    },
    primarySupplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        index: true
    },
    alternateSupplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    supplierCost: {
        type: Number,
        min: 0,
        default: 0
    },
    lastPurchasePrice: {
        type: Number,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Archived'],
        default: 'Active',
        required: true
    },
    expiryDate: {
        type: Date,
        index: true
    },
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true,
        alias: 'branchId'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reorderPoint: {
        type: Number,
        required: true,
        default: 20
    }
}, {
    timestamps: true
});

const Medicine = mongoose.model('Medicine', medicineSchema);
export default Medicine;
