import mongoose from 'mongoose';

const reorderRequestSchema = new mongoose.Schema({
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
    quantityNeeded: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Ordered', 'Completed'],
        default: 'Pending',
        required: true,
        index: true
    },
    orderedDate: {
        type: Date
    },
    arrivalDate: {
        type: Date
    },
    supplier: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const ReorderRequest = mongoose.model('ReorderRequest', reorderRequestSchema);
export default ReorderRequest;
