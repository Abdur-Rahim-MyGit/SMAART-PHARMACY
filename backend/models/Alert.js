import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info',
        required: true,
        index: true
    },
    alertType: {
        type: String,
        enum: ['Expiry', 'Stock', 'Health', 'General'],
        required: true,
        index: true
    },
    isRead: {
        type: Boolean,
        default: false,
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
