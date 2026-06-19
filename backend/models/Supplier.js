import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactPerson: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    gstNumber: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Archived'],
        default: 'Active',
        required: true,
        index: true
    },
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    healthScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    performanceMetrics: {
        totalOrders: {
            type: Number,
            default: 0
        },
        completedOrders: {
            type: Number,
            default: 0
        },
        pendingOrders: {
            type: Number,
            default: 0
        },
        totalPurchaseValue: {
            type: Number,
            default: 0
        },
        lastDeliveryDate: {
            type: Date
        },
        averageDeliveryTime: {
            type: Number,
            default: 0 // In days
        },
        returnRate: {
            type: Number,
            default: 0 // Percentage
        }
    }
}, {
    timestamps: true
});

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
