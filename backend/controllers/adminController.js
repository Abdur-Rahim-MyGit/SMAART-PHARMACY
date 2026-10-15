import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import Medicine from '../models/Medicine.js';
import BranchAudit from '../models/BranchAudit.js';
import UserAudit from '../models/UserAudit.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Alert from '../models/Alert.js';

// ── PHARMACY ENDPOINTS ──

export const getPharmaciesAdmin = async (req, res) => {
    try {
        // Fetch all pharmacies that are not archived
        const pharmacies = await Pharmacy.find({ status: { $ne: 'Archived' } })
            .populate('assignedManager', 'username fullName role status')
            .sort({ name: 1 });
        
        // Enhance each pharmacy with staff count, total inventory valuation, and health details
        const enhancedPharmacies = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        for (const p of pharmacies) {
            const staffCount = await User.countDocuments({ pharmacyId: p._id });
            const medicines = await Medicine.find({ pharmacyId: p._id, status: { $ne: 'Archived' } });
            const totalInventoryValue = medicines.reduce((sum, med) => sum + (med.stock * med.price), 0);
            
            let lowStockCount = 0;
            let expiryRisks = 0;
            let deadStockRisk = 0;
            let expiredCount = 0;

            medicines.forEach(m => {
                const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
                if (m.status === 'Active' && m.stock <= reorderThreshold) {
                    lowStockCount++;
                }

                if (m.expiryDate && m.stock > 0) {
                    const expDate = new Date(m.expiryDate);
                    if (expDate < today) {
                        expiredCount++;
                        deadStockRisk += m.stock * m.price;
                    } else if (expDate <= thirtyDaysFromNow) {
                        expiryRisks++;
                    }
                }
            });

            const activeAlerts = await Alert.countDocuments({ pharmacyId: p._id, isRead: false });

            // Compile attention items
            const attentionNeeded = [];
            if (expiredCount > 0) {
                attentionNeeded.push({
                    problem: `${expiredCount} expired medicine(s) in stock`,
                    impact: `Dead stock valued at ₹${deadStockRisk.toLocaleString('en-IN', { maximumFractionDigits: 0 })} is unsellable.`,
                    recommendedAction: "Dispose or return expired items immediately to write off dead stock.",
                    responsibleRole: "Branch Manager",
                    route: "/expiry-dashboard"
                });
            }
            if (lowStockCount > 0) {
                attentionNeeded.push({
                    problem: `${lowStockCount} medicine(s) below reorder level`,
                    impact: "Risks critical stock-outs and business service disruption.",
                    recommendedAction: "Review safety margins and generate a new purchase order.",
                    responsibleRole: "Branch Manager",
                    route: "/reorder-intelligence"
                });
            }
            if (activeAlerts > 0) {
                attentionNeeded.push({
                    problem: `${activeAlerts} unresolved warning alert(s)`,
                    impact: "Operational or compliance indicators require verification.",
                    recommendedAction: "Review and dismiss open alert logs on the dashboard.",
                    responsibleRole: "Store Admin",
                    route: "/dashboard"
                });
            }

            enhancedPharmacies.push({
                ...p.toObject(),
                staffCount,
                totalInventoryValue,
                lowStockCount,
                expiryRisks,
                deadStockRisk,
                activeAlerts,
                attentionNeeded
            });
        }

        // Calculate KPIs
        const totalPharmacies = await Pharmacy.countDocuments({ status: { $ne: 'Archived' } });
        const activeBranches = await Pharmacy.countDocuments({ status: 'Active' });
        const inactiveBranches = await Pharmacy.countDocuments({ status: 'Inactive' });
        const totalStaff = await User.countDocuments({ status: 'Active' });
        
        const allMeds = await Medicine.find({});
        const totalInventoryValue = allMeds.reduce((sum, med) => sum + (med.stock * med.price), 0);

        // Average Branch Health Score
        const nonArchivedPharmacies = pharmacies.filter(p => p.status !== 'Archived');
        const sumHealth = nonArchivedPharmacies.reduce((sum, p) => sum + (p.healthScore || 100), 0);
        const averageBranchHealthScore = nonArchivedPharmacies.length > 0 
            ? Math.round(sumHealth / nonArchivedPharmacies.length) 
            : 100;

        res.json({
            pharmacies: enhancedPharmacies,
            kpis: {
                totalPharmacies,
                activeBranches,
                inactiveBranches,
                totalStaff,
                totalInventoryValue,
                averageBranchHealthScore
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createPharmacyAdmin = async (req, res) => {
    let { name, address, coordinator, contactPhone, gstin, drugLicence, email, openingHours, status, assignedManager, branchCode } = req.body;
    try {
        if (!name) {
            return res.status(400).json({ message: 'Pharmacy name is required' });
        }

        // Auto-generate branch code if not provided
        if (!branchCode) {
            const prefix = 'BR';
            let count = await Pharmacy.countDocuments({});
            let exists = true;
            while (exists) {
                count++;
                branchCode = `${prefix}-${String(count).padStart(3, '0')}`;
                const existing = await Pharmacy.findOne({ branchCode });
                if (!existing) {
                    exists = false;
                }
            }
        }

        // Verify manager user if provided
        if (assignedManager) {
            const managerUser = await User.findById(assignedManager);
            if (!managerUser || managerUser.role !== 'Manager') {
                return res.status(400).json({ message: 'Selected assigned manager must be a valid Manager user' });
            }
        }

        const pharmacy = await Pharmacy.create({
            name,
            address: address || '',
            coordinator: coordinator || '',
            contactPhone: contactPhone || '',
            gstin: gstin || '',
            drugLicence: drugLicence || '',
            email: email || '',
            openingHours: openingHours || '9:00 AM - 10:00 PM',
            status: status || 'Active',
            branchCode,
            assignedManager: assignedManager || undefined,
            healthScore: 100
        });

        // Update User ref if manager is assigned
        if (assignedManager) {
            await User.findByIdAndUpdate(assignedManager, { pharmacyId: pharmacy._id });
        }

        // Log Branch Creation in Audit
        await BranchAudit.create({
            pharmacyId: pharmacy._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: 'Branch Creation',
            newValue: pharmacy.toObject()
        });

        // Log Manager Assignment if assigned
        if (assignedManager) {
            await BranchAudit.create({
                pharmacyId: pharmacy._id,
                userId: req.user.id,
                username: req.user.username || 'admin',
                action: 'Manager Assignment',
                newValue: { assignedManager }
            });
        }

        res.status(201).json(pharmacy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updatePharmacyAdmin = async (req, res) => {
    const { id } = req.params;
    const { name, address, coordinator, contactPhone, gstin, drugLicence, email, openingHours, status, assignedManager, branchCode } = req.body;
    try {
        const pharmacy = await Pharmacy.findById(id);
        if (!pharmacy) {
            return res.status(404).json({ message: 'Pharmacy not found' });
        }

        const previousValue = pharmacy.toObject();

        // Check manager changes
        let managerChanged = false;
        let prevManager = pharmacy.assignedManager;
        if (assignedManager !== undefined && String(assignedManager || '') !== String(prevManager || '')) {
            if (assignedManager) {
                const managerUser = await User.findById(assignedManager);
                if (!managerUser || managerUser.role !== 'Manager') {
                    return res.status(400).json({ message: 'Selected assigned manager must be a valid Manager user' });
                }
            }
            managerChanged = true;
        }

        pharmacy.name = name !== undefined ? name : pharmacy.name;
        pharmacy.address = address !== undefined ? address : pharmacy.address;
        pharmacy.coordinator = coordinator !== undefined ? coordinator : pharmacy.coordinator;
        pharmacy.contactPhone = contactPhone !== undefined ? contactPhone : pharmacy.contactPhone;
        pharmacy.gstin = gstin !== undefined ? gstin : pharmacy.gstin;
        pharmacy.drugLicence = drugLicence !== undefined ? drugLicence : pharmacy.drugLicence;
        pharmacy.email = email !== undefined ? email : pharmacy.email;
        pharmacy.openingHours = openingHours !== undefined ? openingHours : pharmacy.openingHours;
        pharmacy.status = status !== undefined ? status : pharmacy.status;
        pharmacy.branchCode = branchCode !== undefined ? branchCode : pharmacy.branchCode;
        if (assignedManager !== undefined) {
            pharmacy.assignedManager = assignedManager ? assignedManager : undefined;
        }

        const updatedPharmacy = await pharmacy.save();

        // Update User ref if manager is assigned or changed
        if (managerChanged) {
            if (assignedManager) {
                await User.findByIdAndUpdate(assignedManager, { pharmacyId: updatedPharmacy._id });
            }
            // Log Manager Assignment
            await BranchAudit.create({
                pharmacyId: updatedPharmacy._id,
                userId: req.user.id,
                username: req.user.username || 'admin',
                action: 'Manager Assignment',
                previousValue: prevManager ? { assignedManager: prevManager } : null,
                newValue: assignedManager ? { assignedManager } : null
            });
        }

        // Log Branch Update
        await BranchAudit.create({
            pharmacyId: updatedPharmacy._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: status !== undefined && status !== previousValue.status ? 'Status Change' : 'Branch Update',
            previousValue,
            newValue: updatedPharmacy.toObject()
        });

        res.json(updatedPharmacy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const archivePharmacyAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        const pharmacy = await Pharmacy.findById(id);
        if (!pharmacy) {
            return res.status(404).json({ message: 'Pharmacy not found' });
        }
        
        const previousValue = pharmacy.toObject();
        pharmacy.status = 'Archived';
        const updatedPharmacy = await pharmacy.save();

        // Log Status Change in Audit
        await BranchAudit.create({
            pharmacyId: updatedPharmacy._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: 'Status Change',
            previousValue,
            newValue: updatedPharmacy.toObject()
        });

        res.json({ message: 'Pharmacy archived successfully', pharmacy: updatedPharmacy });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── USER ENDPOINTS ──

export const getUsersAdmin = async (req, res) => {
    try {
        const users = await User.find({}).populate('pharmacyId', 'name address').sort({ username: 1 });
        
        // Calculate KPIs
        const totalUsers = await User.countDocuments({});
        const activeUsers = await User.countDocuments({ status: 'Active' });
        const managers = await User.countDocuments({ role: 'Manager' });
        const pharmacists = await User.countDocuments({ role: 'Pharmacist' });
        const inactiveUsers = await User.countDocuments({ status: { $in: ['Inactive', 'Disabled'] } });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentlyAddedUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

        res.json({
            users,
            kpis: {
                totalUsers,
                activeUsers,
                managers,
                pharmacists,
                inactiveUsers,
                recentlyAddedUsers
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createUserAdmin = async (req, res) => {
    const { username, password, fullName, phone, email, qualification, registrationNumber, shiftType, role, pharmacyId, status } = req.body;
    try {
        if (!username || !password || !role || !pharmacyId) {
            return res.status(400).json({ message: 'Username, password, role, and pharmacy branch are required' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        const pharmacyExists = await Pharmacy.findById(pharmacyId);
        if (!pharmacyExists) {
            return res.status(400).json({ message: 'Selected pharmacy branch does not exist' });
        }

        const user = await User.create({
            username,
            password,
            fullName: fullName || '',
            phone: phone || '',
            email: email || '',
            qualification: qualification || undefined,
            registrationNumber: registrationNumber || '',
            shiftType: shiftType || 'Day',
            role,
            pharmacyId,
            status: status || 'Active'
        });

        // Log User Creation in UserAudit
        await UserAudit.create({
            targetUserId: user._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: 'User Creation',
            newValue: {
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                pharmacyId: user.pharmacyId,
                status: user.status
            }
        });

        const populatedUser = await User.findById(user._id).populate('pharmacyId', 'name address');
        res.status(201).json(populatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateUserAdmin = async (req, res) => {
    const { id } = req.params;
    const { username, fullName, phone, email, qualification, registrationNumber, shiftType, role, pharmacyId, status } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const previousValue = user.toObject();

        if (username && username !== user.username) {
            const exists = await User.findOne({ username });
            if (exists) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
            user.username = username;
        }

        if (pharmacyId) {
            const pharmacyExists = await Pharmacy.findById(pharmacyId);
            if (!pharmacyExists) {
                return res.status(400).json({ message: 'Selected pharmacy branch does not exist' });
            }
            // Check if branch changed
            if (String(user.pharmacyId) !== String(pharmacyId)) {
                await UserAudit.create({
                    targetUserId: user._id,
                    userId: req.user.id,
                    username: req.user.username || 'admin',
                    action: 'Branch Change',
                    previousValue: { pharmacyId: user.pharmacyId },
                    newValue: { pharmacyId }
                });
            }
            user.pharmacyId = pharmacyId;
        }

        if (role && role !== user.role) {
            await UserAudit.create({
                targetUserId: user._id,
                userId: req.user.id,
                username: req.user.username || 'admin',
                action: 'Role Change',
                previousValue: { role: user.role },
                newValue: { role }
            });
        }

        if (status && status !== user.status) {
            const action = status === 'Active' ? 'Account Enable' : 'Account Disable';
            await UserAudit.create({
                targetUserId: user._id,
                userId: req.user.id,
                username: req.user.username || 'admin',
                action,
                previousValue: { status: user.status },
                newValue: { status }
            });
        }

        user.fullName = fullName !== undefined ? fullName : user.fullName;
        user.phone = phone !== undefined ? phone : user.phone;
        user.email = email !== undefined ? email : user.email;
        user.qualification = qualification !== undefined ? qualification : user.qualification;
        user.registrationNumber = registrationNumber !== undefined ? registrationNumber : user.registrationNumber;
        user.shiftType = shiftType !== undefined ? shiftType : user.shiftType;
        user.role = role !== undefined ? role : user.role;
        user.status = status !== undefined ? status : user.status;

        const updatedUser = await user.save();

        // Log User Update Audit
        await UserAudit.create({
            targetUserId: updatedUser._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: 'User Update',
            previousValue: {
                fullName: previousValue.fullName,
                phone: previousValue.phone,
                email: previousValue.email,
                qualification: previousValue.qualification,
                shiftType: previousValue.shiftType
            },
            newValue: {
                fullName: updatedUser.fullName,
                phone: updatedUser.phone,
                email: updatedUser.email,
                qualification: updatedUser.qualification,
                shiftType: updatedUser.shiftType
            }
        });

        const populatedUser = await User.findById(updatedUser._id).populate('pharmacyId', 'name address');
        res.json(populatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const resetPasswordAdmin = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        if (!password) {
            return res.status(400).json({ message: 'New password is required' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = password;
        await user.save(); // auto hashes due to pre-save hook

        // Log Password Reset in UserAudit
        await UserAudit.create({
            targetUserId: user._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: 'Password Reset'
        });

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const disableUserAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const previousStatus = user.status;
        user.status = 'Disabled';
        const updatedUser = await user.save();

        // Log Account Disable in UserAudit
        await UserAudit.create({
            targetUserId: user._id,
            userId: req.user.id,
            username: req.user.username || 'admin',
            action: 'Account Disable',
            previousValue: { status: previousStatus },
            newValue: { status: 'Disabled' }
        });

        res.json({ message: 'User disabled successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Retrieve detailed account profile metadata (Admin, Manager, Pharmacist)
export const getUserProfileDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const targetUser = await User.findById(id).populate('pharmacyId', 'name address branchCode');
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Access scoping enforcement:
        // 1. Admin: full access
        // 2. Manager: only staff in their own branch
        // 3. Pharmacist: only own profile
        if (req.user.role === 'Pharmacist' && String(req.user.id) !== String(id)) {
            return res.status(403).json({ message: 'Forbidden: Pharmacists can only view their own profile details.' });
        }

        if (req.user.role === 'Manager') {
            const targetBranchId = targetUser.pharmacyId?._id || targetUser.pharmacyId;
            if (String(req.user.pharmacyId) !== String(targetBranchId)) {
                return res.status(403).json({ message: 'Forbidden: Managers can only view profile details for staff in their branch.' });
            }
        }

        // Activity metrics computations
        const medicinesAdded = await Medicine.countDocuments({ createdBy: id });
        const transactionsCreated = await InventoryTransaction.countDocuments({ userId: id });

        // Retrieve activities lists
        const recentMedicines = await Medicine.find({ createdBy: id })
            .sort({ createdAt: -1 })
            .limit(5);

        const recentTransactions = await InventoryTransaction.find({ userId: id })
            .populate('medicineId', 'name ndc category')
            .sort({ createdAt: -1 })
            .limit(5);

        const activityList = [];
        
        recentMedicines.forEach(m => {
            activityList.push({
                type: 'Medicine',
                action: `Added medicine "${m.name}" to the catalog`,
                date: m.createdAt
            });
        });

        recentTransactions.forEach(t => {
            activityList.push({
                type: 'Transaction',
                action: `Recorded ${t.transactionType} of ${Math.abs(t.quantityChanged)} units of "${t.medicineId?.name || 'Unknown'}"`,
                date: t.createdAt
            });
        });

        // Sort combined activity list descending
        activityList.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Retrieve audits history (Admin only)
        let auditTrail = [];
        if (req.user.role === 'Admin') {
            auditTrail = await UserAudit.find({ targetUserId: id })
                .populate('userId', 'username fullName role')
                .sort({ createdAt: -1 });
        }

        res.json({
            user: targetUser,
            metrics: {
                medicinesAdded,
                transactionsCreated
            },
            activities: activityList.slice(0, 10),
            audits: auditTrail
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
