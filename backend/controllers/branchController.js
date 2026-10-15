import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Alert from '../models/Alert.js';
import BranchAudit from '../models/BranchAudit.js';

// Dynamic Alert Generator for Branch
export const checkAndGenerateBranchAlerts = async (pharmacyId) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Staff Availability
        const staffCount = await User.countDocuments({ pharmacyId, status: 'Active' });
        if (staffCount < 2) {
            const alertExists = await Alert.findOne({
                pharmacyId,
                alertType: 'Health',
                title: 'Low Staff Availability',
                isRead: false
            });
            if (!alertExists) {
                await Alert.create({
                    pharmacyId,
                    title: 'Low Staff Availability',
                    message: `Branch active staff count is currently ${staffCount}. Minimum recommended staff level is 2.`,
                    severity: 'critical',
                    alertType: 'Health'
                });
            }
        }

        // 2. Health Score, Dead Stock, Expiry Risk
        const medicines = await Medicine.find({ pharmacyId, status: { $ne: 'Archived' } });
        let deadStockValue = 0;
        let expiredSKUCount = 0;
        let nearExpirySKUCount = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        medicines.forEach(m => {
            const isZero = m.stock === 0;
            const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
            const isLow = m.stock > 0 && m.stock < reorderThreshold;

            if (m.status === 'Active') {
                if (isZero) outOfStockCount++;
                if (isLow) lowStockCount++;
            }

            if (m.expiryDate) {
                const expDate = new Date(m.expiryDate);
                const val = m.stock * m.price;
                if (expDate < today) {
                    if (m.stock > 0) expiredSKUCount++;
                    deadStockValue += val;
                } else if (expDate <= thirtyDaysFromNow) {
                    if (m.stock > 0) nearExpirySKUCount++;
                }
            }
        });

        // Health score calc
        const expiredDeduction = Math.min(45, expiredSKUCount * 15);
        const nearExpiryDeduction = Math.min(25, nearExpirySKUCount * 5);
        const outOfStockDeduction = Math.min(20, outOfStockCount * 10);
        const lowStockDeduction = Math.min(20, lowStockCount * 5);

        let healthScore = 100 - expiredDeduction - nearExpiryDeduction - outOfStockDeduction - lowStockDeduction;
        healthScore = Math.max(0, healthScore);

        // Save health score back to Pharmacy record
        await Pharmacy.findByIdAndUpdate(pharmacyId, { healthScore });

        // Alert: Health score drop / low health
        if (healthScore < 80) {
            const alertExists = await Alert.findOne({
                pharmacyId,
                alertType: 'Health',
                title: 'Low Branch Health Score',
                isRead: false
            });
            if (!alertExists) {
                await Alert.create({
                    pharmacyId,
                    title: 'Low Branch Health Score',
                    message: `Inventory health score has dropped to ${healthScore}/100. Review low stock or expired medications immediately.`,
                    severity: 'critical',
                    alertType: 'Health'
                });
            }
        }

        // Alert: High Dead Stock Value
        if (deadStockValue > 15000) {
            const alertExists = await Alert.findOne({
                pharmacyId,
                alertType: 'Expiry',
                title: 'High Dead Stock Value Detected',
                isRead: false
            });
            if (!alertExists) {
                await Alert.create({
                    pharmacyId,
                    title: 'High Dead Stock Value Detected',
                    message: `Dead stock value is ₹${deadStockValue.toLocaleString('en-IN')}, exceeding the limit of ₹15,000.`,
                    severity: 'warning',
                    alertType: 'Expiry'
                });
            }
        }

        // Alert: Excess Expiry Risk
        if (expiredSKUCount + nearExpirySKUCount > 5) {
            const alertExists = await Alert.findOne({
                pharmacyId,
                alertType: 'Expiry',
                title: 'Excess Expiry Risk',
                isRead: false
            });
            if (!alertExists) {
                await Alert.create({
                    pharmacyId,
                    title: 'Excess Expiry Risk',
                    message: `There are ${expiredSKUCount + nearExpirySKUCount} items expired or expiring within 30 days. Action required.`,
                    severity: 'warning',
                    alertType: 'Expiry'
                });
            }
        }

        return healthScore;
    } catch (err) {
        console.error('Error generating branch alerts:', err);
        return 100;
    }
};

// Get Branch Details
export const getBranchDetails = async (req, res) => {
    const { id } = req.params;
    try {
        // Enforce role-based access scoping
        if (req.user.role !== 'Admin' && String(req.user.pharmacyId) !== String(id)) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to view this branch details' });
        }

        const pharmacy = await Pharmacy.findById(id).populate('assignedManager', 'username fullName email phone status');
        if (!pharmacy) {
            return res.status(404).json({ message: 'Pharmacy branch not found' });
        }

        // Run dynamic alert generator first
        const currentHealthScore = await checkAndGenerateBranchAlerts(id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // Fetch medicines for performance and inventory overview
        const medicines = await Medicine.find({ pharmacyId: id, status: { $ne: 'Archived' } });
        
        let totalMedicines = medicines.length;
        let inventoryValue = 0;
        let lowStockCount = 0;
        let expiredStockCount = 0;
        let deadStockValue = 0;

        const reorderAlerts = [];
        const expiryAlerts = [];

        medicines.forEach(m => {
            const val = m.stock * m.price;
            inventoryValue += val;

            const reorderThreshold = m.reorderPoint !== undefined ? m.reorderPoint : 20;
            if (m.stock > 0 && m.stock < reorderThreshold) {
                lowStockCount++;
                reorderAlerts.push({
                    _id: m._id,
                    name: m.name,
                    ndc: m.ndc,
                    stock: m.stock,
                    reorderPoint: reorderThreshold
                });
            }

            if (m.expiryDate) {
                const expDate = new Date(m.expiryDate);
                if (expDate < today) {
                    expiredStockCount++;
                    deadStockValue += val;
                    if (m.stock > 0) {
                        expiryAlerts.push({
                            _id: m._id,
                            name: m.name,
                            ndc: m.ndc,
                            stock: m.stock,
                            expiryDate: m.expiryDate,
                            status: 'Expired'
                        });
                    }
                } else if (expDate <= thirtyDaysFromNow && m.stock > 0) {
                    expiryAlerts.push({
                        _id: m._id,
                        name: m.name,
                        ndc: m.ndc,
                        stock: m.stock,
                        expiryDate: m.expiryDate,
                        status: 'Near Expiry'
                    });
                }
            }
        });

        // Top medicines by valuation
        const topMedicines = [...medicines]
            .sort((a, b) => (b.stock * b.price) - (a.stock * a.price))
            .slice(0, 5)
            .map(m => ({
                _id: m._id,
                name: m.name,
                ndc: m.ndc,
                stock: m.stock,
                price: m.price,
                valuation: m.stock * m.price
            }));

        // Staff details
        const staff = await User.find({ pharmacyId: id }).select('-password');
        const totalManagers = staff.filter(u => u.role === 'Manager').length;
        const totalPharmacists = staff.filter(u => u.role === 'Pharmacist').length;
        const activeUsers = staff.filter(u => u.status === 'Active').length;
        const inactiveUsers = staff.filter(u => u.status === 'Disabled').length;

        // Recent transactions
        const recentTransactions = await InventoryTransaction.find({ pharmacyId: id })
            .populate('medicineId', 'name ndc category')
            .populate('userId', 'username fullName')
            .sort({ createdAt: -1 })
            .limit(5);

        // Unread branch alerts
        const branchAlerts = await Alert.find({ pharmacyId: id, isRead: false })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            pharmacy: {
                ...pharmacy.toObject(),
                healthScore: currentHealthScore
            },
            performance: {
                healthScore: currentHealthScore,
                totalMedicines,
                inventoryValue,
                lowStockCount,
                expiredStockCount,
                deadStockValue
            },
            staff: {
                users: staff,
                totalManagers,
                totalPharmacists,
                activeUsers,
                inactiveUsers
            },
            inventory: {
                topMedicines,
                recentTransactions,
                reorderAlerts,
                expiryAlerts,
                alerts: branchAlerts
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Branch Audit Trail
export const getBranchAuditTrail = async (req, res) => {
    const { id } = req.params;
    try {
        // Enforce role-based access scoping
        if (req.user.role !== 'Admin' && String(req.user.pharmacyId) !== String(id)) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to view this branch audit trail' });
        }

        // Pharmacist cannot view audit trails
        if (req.user.role === 'Pharmacist') {
            return res.status(403).json({ message: 'Forbidden: Pharmacists do not have access to view audit trails' });
        }

        const audits = await BranchAudit.find({ pharmacyId: id })
            .populate('userId', 'username fullName role')
            .sort({ createdAt: -1 });

        res.json(audits);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
