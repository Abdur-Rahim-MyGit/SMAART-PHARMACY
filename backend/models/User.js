import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        alias: 'branchId'
    },
    role: {
        type: String,
        enum: ['Admin', 'Pharmacist', 'Manager'],
        required: true
    },
    fullName: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    qualification: {
        type: String,
        enum: ['D.Pharm', 'B.Pharm', 'M.Pharm', 'Pharm.D', 'Other']
    },
    registrationNumber: {
        type: String,
        trim: true
    },
    shiftType: {
        type: String,
        enum: ['Day', 'Night', 'Rotational'],
        default: 'Day'
    },
    status: {
        type: String,
        enum: ['Active', 'Disabled', 'Inactive'],
        default: 'Active'
    },
    lastLogin: {
        type: Date
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

// Auto-hash password on creation or change
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Instance method to check password match
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
