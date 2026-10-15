import mongoose from 'mongoose';

const pharmacySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    coordinator: {
        type: String,
        trim: true
    },
    contactPhone: {
        type: String,
        trim: true
    },
    gstin: {
        type: String,
        trim: true
    },
    drugLicence: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    openingHours: {
        type: String,
        trim: true,
        default: '9:00 AM - 10:00 PM'
    },
    branchCode: {
        type: String,
        unique: true,
        sparse: true
    },
    assignedManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    healthScore: {
        type: Number,
        default: 100
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Archived'],
        default: 'Active'
    },
    joinedDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);
export default Pharmacy;
