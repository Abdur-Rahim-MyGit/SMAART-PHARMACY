import mongoose from 'mongoose';

const emergencyRequestSchema = new mongoose.Schema({
    sourcePharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    targetPharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    medicineName: {
        type: String,
        required: true,
        trim: true
    },
    ndc: {
        type: String,
        required: true,
        trim: true
    },
    quantityRequested: {
        type: Number,
        required: true
    },
    urgency: {
        type: String,
        enum: ['Medium', 'High', 'Critical'],
        default: 'High',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Fulfilled'],
        default: 'Pending',
        required: true,
        index: true
    },
    notes: {
        type: String,
        trim: true
    },
    contactPhone: {
        type: String,
        trim: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema);
export default EmergencyRequest;
