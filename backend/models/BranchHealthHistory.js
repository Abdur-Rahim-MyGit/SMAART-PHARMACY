import mongoose from 'mongoose';

const branchHealthHistorySchema = new mongoose.Schema({
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    healthScore: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const BranchHealthHistory = mongoose.model('BranchHealthHistory', branchHealthHistorySchema);
export default BranchHealthHistory;
