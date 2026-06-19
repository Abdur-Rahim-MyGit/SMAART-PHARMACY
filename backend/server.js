import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { protect, requireRoles } from './middleware/authMiddleware.js';
import { login, logout, getMe, getPharmacies } from './controllers/authController.js';
import { getMedicines, getMedicineById, addMedicine, updateMedicine, getMedicineLogs } from './controllers/medicineController.js';
import { postStockIn, postStockOut, postAdjustment, getHistory } from './controllers/inventoryController.js';
import { getDashboardData, getAdminBranchesComparison } from './controllers/analyticsController.js';
import { getReorderQueue, createReorderRequest, completeReorderRequest, generateDraftPO } from './controllers/reorderController.js';
import { getAlerts, markAlertAsRead } from './controllers/alertController.js';
import { exportAuditTrailCSV } from './controllers/complianceController.js';
import {
    getPharmaciesAdmin,
    createPharmacyAdmin,
    updatePharmacyAdmin,
    archivePharmacyAdmin,
    getUsersAdmin,
    createUserAdmin,
    updateUserAdmin,
    resetPasswordAdmin,
    disableUserAdmin,
    getUserProfileDetails
} from './controllers/adminController.js';
import {
    getSuppliers,
    createSupplier,
    updateSupplier,
    getSupplierById,
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    getSupplierAnalytics,
    getSupplierAuditLogs
} from './controllers/supplierController.js';
import { getRevenueAnalytics, exportRevenueCSV } from './controllers/revenueController.js';
import { getBranchDetails, getBranchAuditTrail } from './controllers/branchController.js';
import {
    searchNetworkMedicine,
    getEmergencyRequests,
    createEmergencyRequest,
    updateEmergencyRequestStatus
} from './controllers/emergencyRequestController.js';

// Load models for seeder
import Pharmacy from './models/Pharmacy.js';
import EmergencyRequest from './models/EmergencyRequest.js';
import User from './models/User.js';
import Medicine from './models/Medicine.js';
import ReorderRequest from './models/ReorderRequest.js';
import BranchHealthHistory from './models/BranchHealthHistory.js';
import Alert from './models/Alert.js';
import InventoryTransaction from './models/InventoryTransaction.js';
import InventoryLog from './models/InventoryLog.js';
import Supplier from './models/Supplier.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import SupplierAudit from './models/SupplierAudit.js';
import BranchAudit from './models/BranchAudit.js';
import UserAudit from './models/UserAudit.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
app.use(cors({
    origin: true, // Allow frontend origin
    credentials: true // Allow session cookies to pass
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session structure using MongoStore
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-system';
app.use(session({
    secret: process.env.SESSION_SECRET || 'pharmacy-intelligence-secret-key-1984',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// API Routes
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', getMe);
app.get('/api/auth/pharmacies', getPharmacies);

// Admin Org Management Routes
app.get('/api/admin/pharmacies', protect, requireRoles(['Admin']), getPharmaciesAdmin);
app.post('/api/admin/pharmacies', protect, requireRoles(['Admin']), createPharmacyAdmin);
app.put('/api/admin/pharmacies/:id', protect, requireRoles(['Admin']), updatePharmacyAdmin);
app.put('/api/admin/pharmacies/:id/archive', protect, requireRoles(['Admin']), archivePharmacyAdmin);
app.get('/api/branches/:id', protect, getBranchDetails);
app.get('/api/branches/:id/audit-trail', protect, getBranchAuditTrail);

app.get('/api/admin/users', protect, requireRoles(['Admin']), getUsersAdmin);
app.post('/api/admin/users', protect, requireRoles(['Admin']), createUserAdmin);
app.put('/api/admin/users/:id', protect, requireRoles(['Admin']), updateUserAdmin);
app.put('/api/admin/users/:id/reset-password', protect, requireRoles(['Admin']), resetPasswordAdmin);
app.put('/api/admin/users/:id/disable', protect, requireRoles(['Admin']), disableUserAdmin);
app.get('/api/users/:id', protect, getUserProfileDetails);

app.get('/api/medicines', protect, getMedicines);
app.get('/api/medicines/:id', protect, getMedicineById);
app.post('/api/medicines', protect, addMedicine);
app.put('/api/medicines/:id', protect, updateMedicine);
app.get('/api/medicines/:id/logs', protect, getMedicineLogs);

app.post('/api/inventory/stock-in', protect, postStockIn);
app.post('/api/inventory/stock-out', protect, postStockOut);
app.post('/api/inventory/adjustment', protect, postAdjustment);
app.get('/api/inventory/history', protect, getHistory);

app.get('/api/analytics/dashboard', protect, getDashboardData);
app.get('/api/analytics/admin/branches', protect, getAdminBranchesComparison);

app.get('/api/reorders', protect, getReorderQueue);
app.post('/api/reorders', protect, createReorderRequest);
app.put('/api/reorders/:id/complete', protect, completeReorderRequest);

app.get('/api/alerts', protect, getAlerts);
app.put('/api/alerts/:id/read', protect, markAlertAsRead);

// Emergency Stock Request and Transfer Routes
app.get('/api/emergency/search', protect, searchNetworkMedicine);
app.get('/api/emergency/requests', protect, getEmergencyRequests);
app.post('/api/emergency/requests', protect, createEmergencyRequest);
app.put('/api/emergency/requests/:id', protect, updateEmergencyRequestStatus);

// Supplier & Purchase Order routes
app.get('/api/suppliers', protect, getSuppliers);
app.get('/api/suppliers/:id', protect, getSupplierById);
app.post('/api/suppliers', protect, requireRoles(['Admin']), createSupplier);
app.put('/api/suppliers/:id', protect, requireRoles(['Admin']), updateSupplier);

app.get('/api/purchase-orders', protect, requireRoles(['Admin', 'Manager']), getPurchaseOrders);
app.get('/api/purchase-orders/:id', protect, requireRoles(['Admin', 'Manager']), getPurchaseOrderById);
app.post('/api/purchase-orders', protect, requireRoles(['Admin', 'Manager']), createPurchaseOrder);
app.put('/api/purchase-orders/:id', protect, requireRoles(['Admin', 'Manager']), updatePurchaseOrder);

app.post('/api/reorders/generate-po', protect, requireRoles(['Admin', 'Manager']), generateDraftPO);

app.get('/api/suppliers-analytics', protect, requireRoles(['Admin', 'Manager']), getSupplierAnalytics);
app.get('/api/suppliers-audit', protect, requireRoles(['Admin']), getSupplierAuditLogs);

app.get('/api/compliance/export', protect, exportAuditTrailCSV);

// Revenue Analytics routes
app.get('/api/revenue/analytics', protect, requireRoles(['Admin', 'Manager']), getRevenueAnalytics);
app.get('/api/revenue/export', protect, requireRoles(['Admin', 'Manager']), exportRevenueCSV);

// Debug Seeder Route (for Phase 1 Manual Verification)
app.post('/api/debug/seed', async (req, res) => {
    try {
        // Clear existing database collections
        await Pharmacy.deleteMany({});
        await User.deleteMany({});
        await Medicine.deleteMany({});
        await EmergencyRequest.deleteMany({});
        await ReorderRequest.deleteMany({});
        await BranchHealthHistory.deleteMany({});
        await Alert.deleteMany({});
        await InventoryTransaction.deleteMany({});
        await InventoryLog.deleteMany({});
        await Supplier.deleteMany({});
        await PurchaseOrder.deleteMany({});
        await SupplierAudit.deleteMany({});
        await BranchAudit.deleteMany({});
        await UserAudit.deleteMany({});

        // 1. Create Pharmacies
        const pharmacyNorth = await Pharmacy.create({
            name: 'Northside Pharmacy',
            address: '456 Medical Ridge, Sector 4',
            coordinator: 'Dr. Rajesh Kumar',
            contactPhone: '+91 98765 43210',
            gstin: '07AAAAA1111A1Z1',
            drugLicence: 'DL-20-112233/21',
            email: 'northside@smaartpharmacy.in',
            openingHours: '24 Hours Open',
            status: 'Active',
            branchCode: 'BR-001',
            healthScore: 92,
            joinedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        });

        const pharmacyDowntown = await Pharmacy.create({
            name: 'Downtown Pharmacy',
            address: '101 Broadway Ave, City Center',
            coordinator: 'Dr. Anita Desai',
            contactPhone: '+91 87654 32109',
            gstin: '07BBBBB2222B2Z2',
            drugLicence: 'DL-20-445566/21',
            email: 'downtown@smaartpharmacy.in',
            openingHours: '9:00 AM - 10:00 PM',
            status: 'Active',
            branchCode: 'BR-002',
            healthScore: 85,
            joinedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        });

        // 2. Create Tenant Users
        const pharmacistUser = await User.create({
            username: 'pharmacist_northside',
            password: 'password123',
            pharmacyId: pharmacyNorth._id,
            role: 'Pharmacist',
            fullName: 'Rahul Sharma',
            phone: '+91 76543 21098',
            email: 'rahul.sharma@smaartpharmacy.in',
            qualification: 'B.Pharm',
            registrationNumber: 'UP-RPH-992211',
            shiftType: 'Day',
            status: 'Active',
            joinedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        });

        const managerUser = await User.create({
            username: 'manager_downtown',
            password: 'password123',
            pharmacyId: pharmacyDowntown._id,
            role: 'Manager',
            fullName: 'Vikram Malhotra',
            phone: '+91 65432 10987',
            email: 'vikram.m@smaartpharmacy.in',
            qualification: 'M.Pharm',
            registrationNumber: 'MH-RPH-554433',
            shiftType: 'Rotational',
            status: 'Active',
            joinedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        });

        const managerNorth = await User.create({
            username: 'manager_northside',
            password: 'password123',
            pharmacyId: pharmacyNorth._id,
            role: 'Manager',
            fullName: 'Rajesh Malhotra',
            phone: '+91 99887 76655',
            email: 'rajesh.m@smaartpharmacy.in',
            qualification: 'M.Pharm',
            registrationNumber: 'DL-RPH-334455',
            shiftType: 'Day',
            status: 'Active',
            joinedDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
        });

        const adminUser = await User.create({
            username: 'admin_sys',
            password: 'password123',
            pharmacyId: pharmacyNorth._id,
            role: 'Admin',
            fullName: 'System Admin',
            phone: '+91 54321 09876',
            email: 'admin@smaartpharmacy.in',
            qualification: 'Pharm.D',
            registrationNumber: 'DL-RPH-110022',
            shiftType: 'Day',
            status: 'Active',
            joinedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        });

        // Set manager assignments on Pharmacies
        pharmacyNorth.assignedManager = managerNorth._id;
        await pharmacyNorth.save();

        pharmacyDowntown.assignedManager = managerUser._id;
        await pharmacyDowntown.save();

        // Seed some Branch Audits
        await BranchAudit.create([
            {
                pharmacyId: pharmacyNorth._id,
                userId: adminUser._id,
                username: adminUser.username,
                action: 'Branch Creation',
                newValue: pharmacyNorth.toObject(),
                timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            },
            {
                pharmacyId: pharmacyNorth._id,
                userId: adminUser._id,
                username: adminUser.username,
                action: 'Manager Assignment',
                newValue: { assignedManager: managerNorth._id },
                timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
            },
            {
                pharmacyId: pharmacyDowntown._id,
                userId: adminUser._id,
                username: adminUser.username,
                action: 'Branch Creation',
                newValue: pharmacyDowntown.toObject(),
                timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            },
            {
                pharmacyId: pharmacyDowntown._id,
                userId: adminUser._id,
                username: adminUser.username,
                action: 'Manager Assignment',
                newValue: { assignedManager: managerUser._id },
                timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
            }
        ]);

        // 3. Create Suppliers for Northside
        const suppliersNorth = await Supplier.create([
            {
                name: 'Cipla Pharmaceuticals',
                contactPerson: 'Amit Patel',
                phone: '+91 91234 56789',
                email: 'info@ciplasupplies.com',
                address: 'Cipla House, Peninsula Business Park, Mumbai',
                gstNumber: '27AAACC1234K1Z1',
                status: 'Active',
                rating: 4.8,
                healthScore: 96,
                pharmacyId: pharmacyNorth._id,
                performanceMetrics: {
                    totalOrders: 15,
                    completedOrders: 12,
                    pendingOrders: 2,
                    totalPurchaseValue: 185000,
                    lastDeliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                    averageDeliveryTime: 3.5,
                    returnRate: 0.5
                }
            },
            {
                name: 'Sun Pharma Distributors',
                contactPerson: 'Sanjay Shah',
                phone: '+91 92345 67890',
                email: 'sales@sunpharma.com',
                address: 'Sun House, Western Express Highway, Goregaon, Mumbai',
                gstNumber: '27AAACC5678P1Z3',
                status: 'Active',
                rating: 4.2,
                healthScore: 84,
                pharmacyId: pharmacyNorth._id,
                performanceMetrics: {
                    totalOrders: 10,
                    completedOrders: 8,
                    pendingOrders: 1,
                    totalPurchaseValue: 120000,
                    lastDeliveryDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
                    averageDeliveryTime: 4.2,
                    returnRate: 1.2
                }
            },
            {
                name: 'Lupin Meds Supply',
                contactPerson: 'Neha Sharma',
                phone: '+91 93456 78901',
                email: 'procure@lupin.com',
                address: 'Lupin Ltd, Santacruz, Mumbai',
                gstNumber: '27AAACC9012L1Z5',
                status: 'Active',
                rating: 3.8,
                healthScore: 76,
                pharmacyId: pharmacyNorth._id,
                performanceMetrics: {
                    totalOrders: 8,
                    completedOrders: 6,
                    pendingOrders: 1,
                    totalPurchaseValue: 95000,
                    lastDeliveryDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
                    averageDeliveryTime: 5.5,
                    returnRate: 2.1
                }
            },
            {
                name: 'Abbott India Distribution',
                contactPerson: 'Rajesh Khanna',
                phone: '+91 94567 89012',
                email: 'supply@abbott.co.in',
                address: 'Godrej One, Vikhroli, Mumbai',
                gstNumber: '27AAACA9012F1Z8',
                status: 'Active',
                rating: 4.5,
                healthScore: 90,
                pharmacyId: pharmacyNorth._id,
                performanceMetrics: {
                    totalOrders: 12,
                    completedOrders: 11,
                    pendingOrders: 0,
                    totalPurchaseValue: 150000,
                    lastDeliveryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                    averageDeliveryTime: 3.8,
                    returnRate: 0.8
                }
            }
        ]);

        // Create Suppliers for Downtown
        const suppliersDowntown = await Supplier.create([
            {
                name: 'Cipla Pharmaceuticals (Downtown)',
                contactPerson: 'Jayesh Patel',
                phone: '+91 81234 56789',
                email: 'downtown.info@ciplasupplies.com',
                address: 'Cipla House, Peninsula Business Park, Mumbai',
                gstNumber: '27AAACC1234K1Z1',
                status: 'Active',
                rating: 4.6,
                healthScore: 92,
                pharmacyId: pharmacyDowntown._id,
                performanceMetrics: {
                    totalOrders: 14,
                    completedOrders: 12,
                    pendingOrders: 1,
                    totalPurchaseValue: 165000,
                    lastDeliveryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                    averageDeliveryTime: 3.6,
                    returnRate: 0.6
                }
            },
            {
                name: 'Sun Pharma Distributors (Downtown)',
                contactPerson: 'Vijay Shah',
                phone: '+91 82345 67890',
                email: 'downtown.sales@sunpharma.com',
                address: 'Sun House, Western Express Highway, Goregaon, Mumbai',
                gstNumber: '27AAACC5678P1Z3',
                status: 'Active',
                rating: 4.3,
                healthScore: 86,
                pharmacyId: pharmacyDowntown._id,
                performanceMetrics: {
                    totalOrders: 9,
                    completedOrders: 7,
                    pendingOrders: 1,
                    totalPurchaseValue: 105000,
                    lastDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    averageDeliveryTime: 4.1,
                    returnRate: 1.1
                }
            }
        ]);

        // 4. Create Tenant Medicines (mapping suppliers and costs)
        const northMeds = await Medicine.create([
            {
                name: 'Paracetamol 650mg',
                ndc: 'CI-PAR-650',
                category: 'Analgesic',
                stock: 1200,
                price: 15.00,
                supplier: 'Cipla Ltd',
                primarySupplier: suppliersNorth[0]._id,
                alternateSupplier: suppliersNorth[1]._id,
                supplierCost: 10.00,
                lastPurchasePrice: 11.20,
                status: 'Active',
                reorderPoint: 100,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            },
            {
                name: 'Amoxicillin 500mg',
                ndc: 'SP-AMO-500',
                category: 'Anti-infective',
                stock: 210,
                price: 45.50,
                supplier: 'Sun Pharma',
                primarySupplier: suppliersNorth[1]._id,
                alternateSupplier: suppliersNorth[0]._id,
                supplierCost: 35.00,
                lastPurchasePrice: 38.00,
                status: 'Active',
                reorderPoint: 50,
                expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            },
            {
                name: 'Metformin 500mg',
                ndc: 'AI-MET-500',
                category: 'Endocrine',
                stock: 12,
                price: 8.20,
                supplier: 'Abbott India',
                primarySupplier: suppliersNorth[3]._id,
                alternateSupplier: suppliersNorth[2]._id,
                supplierCost: 5.50,
                lastPurchasePrice: 6.00,
                status: 'Active',
                reorderPoint: 100,
                expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            },
            {
                name: 'Amlodipine 5mg',
                ndc: 'LL-AML-005',
                category: 'Cardiovascular',
                stock: 0,
                price: 12.00,
                supplier: 'Lupin Ltd',
                primarySupplier: suppliersNorth[2]._id,
                alternateSupplier: suppliersNorth[3]._id,
                supplierCost: 8.00,
                lastPurchasePrice: 8.50,
                status: 'Active',
                reorderPoint: 50,
                expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            },
            {
                name: 'Pantoprazole 40mg',
                ndc: 'AL-PAN-040',
                category: 'Gastrointestinal',
                stock: 5,
                price: 22.50,
                supplier: 'Alkem Laboratories',
                primarySupplier: suppliersNorth[0]._id,
                alternateSupplier: suppliersNorth[1]._id,
                supplierCost: 15.00,
                lastPurchasePrice: 16.50,
                status: 'Active',
                reorderPoint: 30,
                expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            },
            {
                name: 'Compliance Test Med 1',
                ndc: 'CI-CMP-001',
                category: '',
                stock: 50,
                price: 0,
                supplier: 'Cipla Ltd',
                primarySupplier: suppliersNorth[0]._id,
                alternateSupplier: suppliersNorth[1]._id,
                supplierCost: 10.00,
                lastPurchasePrice: 11.20,
                status: 'Active',
                reorderPoint: 100,
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            },
            {
                name: 'Compliance Test Med 2',
                ndc: 'CI-CMP-002',
                category: 'Analgesic',
                stock: 30,
                price: 15.00,
                supplier: 'Cipla Ltd',
                primarySupplier: suppliersNorth[0]._id,
                alternateSupplier: suppliersNorth[1]._id,
                supplierCost: 10.00,
                lastPurchasePrice: 11.20,
                status: 'Active',
                reorderPoint: 100,
                pharmacyId: pharmacyNorth._id,
                createdBy: pharmacistUser._id
            }
        ]);

        const downtownMeds = await Medicine.create([
            {
                name: 'Paracetamol 650mg',
                ndc: 'CI-PAR-650',
                category: 'Analgesic',
                stock: 800,
                price: 15.00,
                supplier: 'Cipla Ltd',
                primarySupplier: suppliersDowntown[0]._id,
                alternateSupplier: suppliersDowntown[1]._id,
                supplierCost: 10.00,
                lastPurchasePrice: 11.20,
                status: 'Active',
                reorderPoint: 100,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyDowntown._id,
                createdBy: managerUser._id
            },
            {
                name: 'Amoxicillin 500mg',
                ndc: 'SP-AMO-500',
                category: 'Anti-infective',
                stock: 15,
                price: 45.50,
                supplier: 'Sun Pharma',
                primarySupplier: suppliersDowntown[1]._id,
                alternateSupplier: suppliersDowntown[0]._id,
                supplierCost: 35.00,
                lastPurchasePrice: 38.00,
                status: 'Active',
                reorderPoint: 50,
                expiryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyDowntown._id,
                createdBy: managerUser._id
            },
            {
                name: 'Metformin 500mg',
                ndc: 'AI-MET-500',
                category: 'Endocrine',
                stock: 900,
                price: 8.20,
                supplier: 'Abbott India',
                primarySupplier: suppliersDowntown[0]._id,
                alternateSupplier: suppliersDowntown[1]._id,
                supplierCost: 5.50,
                lastPurchasePrice: 6.00,
                status: 'Active',
                reorderPoint: 100,
                expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyDowntown._id,
                createdBy: managerUser._id
            },
            {
                name: 'Amlodipine 5mg',
                ndc: 'LL-AML-005',
                category: 'Cardiovascular',
                stock: 60,
                price: 12.00,
                supplier: 'Lupin Ltd',
                primarySupplier: suppliersDowntown[1]._id,
                alternateSupplier: suppliersDowntown[0]._id,
                supplierCost: 8.00,
                lastPurchasePrice: 8.50,
                status: 'Active',
                reorderPoint: 50,
                expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                pharmacyId: pharmacyDowntown._id,
                createdBy: managerUser._id
            }
        ]);

        // 5. Seed Purchase Orders
        const purchaseOrders = await PurchaseOrder.create([
            {
                poNumber: 'PO-20260601-0001',
                supplierId: suppliersNorth[0]._id,
                pharmacyId: pharmacyNorth._id,
                branchName: 'Northside Pharmacy',
                medicines: [
                    {
                        medicineId: northMeds[0]._id,
                        name: 'Paracetamol 650mg',
                        quantity: 200,
                        unitCost: 10.00,
                        totalCost: 2000.00
                    }
                ],
                totalCost: 2000.00,
                orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                expectedDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                actualDeliveryDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
                status: 'Delivered',
                createdBy: adminUser._id,
                approvedBy: adminUser._id,
                notes: 'Initial seed completed order.'
            },
            {
                poNumber: 'PO-20260610-0001',
                supplierId: suppliersNorth[2]._id,
                pharmacyId: pharmacyNorth._id,
                branchName: 'Northside Pharmacy',
                medicines: [
                    {
                        medicineId: northMeds[3]._id,
                        name: 'Amlodipine 5mg',
                        quantity: 150,
                        unitCost: 8.00,
                        totalCost: 1200.00
                    }
                ],
                totalCost: 1200.00,
                orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                status: 'Ordered',
                createdBy: pharmacistUser._id,
                approvedBy: adminUser._id,
                notes: 'Active shipment in progress.'
            },
            {
                poNumber: 'PO-20260612-0001',
                supplierId: suppliersNorth[1]._id,
                pharmacyId: pharmacyNorth._id,
                branchName: 'Northside Pharmacy',
                medicines: [
                    {
                        medicineId: northMeds[1]._id,
                        name: 'Amoxicillin 500mg',
                        quantity: 100,
                        unitCost: 35.00,
                        totalCost: 3500.00
                    }
                ],
                totalCost: 3500.00,
                orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
                status: 'Pending Approval',
                createdBy: pharmacistUser._id,
                notes: 'Awaiting administrator verification.'
            },
            // Seed POs for Downtown to display in analytics
            {
                poNumber: 'PO-20260601-0002',
                supplierId: suppliersDowntown[0]._id,
                pharmacyId: pharmacyDowntown._id,
                branchName: 'Downtown Pharmacy',
                medicines: [
                    {
                        medicineId: downtownMeds[0]._id,
                        name: 'Paracetamol 650mg',
                        quantity: 150,
                        unitCost: 10.00,
                        totalCost: 1500.00
                    }
                ],
                totalCost: 1500.00,
                orderDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
                expectedDeliveryDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
                actualDeliveryDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
                status: 'Delivered',
                createdBy: managerUser._id,
                notes: 'Completed downtown purchase.'
            },
            {
                poNumber: 'PO-20260613-DELAYED-NS',
                supplierId: suppliersNorth[0]._id,
                pharmacyId: pharmacyNorth._id,
                branchName: 'Northside Pharmacy',
                medicines: [
                    {
                        medicineId: northMeds[0]._id,
                        name: 'Paracetamol 650mg',
                        quantity: 100,
                        unitCost: 10.00,
                        totalCost: 1000.00
                    }
                ],
                totalCost: 1000.00,
                orderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                expectedDeliveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                status: 'Ordered',
                createdBy: adminUser._id,
                approvedBy: adminUser._id,
                notes: 'Urgent shipment delayed.'
            },
            {
                poNumber: 'PO-20260613-DELAYED-DT',
                supplierId: suppliersDowntown[0]._id,
                pharmacyId: pharmacyDowntown._id,
                branchName: 'Downtown Pharmacy',
                medicines: [
                    {
                        medicineId: downtownMeds[0]._id,
                        name: 'Paracetamol 650mg',
                        quantity: 100,
                        unitCost: 10.00,
                        totalCost: 1000.00
                    }
                ],
                totalCost: 1000.00,
                orderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                expectedDeliveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                status: 'Ordered',
                createdBy: managerUser._id,
                notes: 'Downtown stock shipment delayed.'
            }
        ]);

        // 6. Seed Supplier Audit Trail
        await SupplierAudit.create([
            {
                pharmacyId: pharmacyNorth._id,
                userId: adminUser._id,
                username: adminUser.username,
                action: 'Supplier Creation',
                targetId: suppliersNorth[0]._id,
                targetType: 'Supplier',
                newValue: suppliersNorth[0].toObject(),
                timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
            },
            {
                pharmacyId: pharmacyNorth._id,
                userId: adminUser._id,
                username: adminUser.username,
                action: 'Supplier Creation',
                targetId: suppliersNorth[1]._id,
                targetType: 'Supplier',
                newValue: suppliersNorth[1].toObject(),
                timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
            },
            {
                pharmacyId: pharmacyNorth._id,
                userId: pharmacistUser._id,
                username: pharmacistUser.username,
                action: 'Purchase Order Creation',
                targetId: purchaseOrders[2]._id,
                targetType: 'PurchaseOrder',
                newValue: purchaseOrders[2].toObject(),
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ]);

        // 7. Create Historical health scores
        await BranchHealthHistory.create([
            { pharmacyId: pharmacyNorth._id, healthScore: 95, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { pharmacyId: pharmacyNorth._id, healthScore: 92, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { pharmacyId: pharmacyNorth._id, healthScore: 88, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            
            { pharmacyId: pharmacyDowntown._id, healthScore: 90, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { pharmacyId: pharmacyDowntown._id, healthScore: 85, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { pharmacyId: pharmacyDowntown._id, healthScore: 80, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
        ]);

        // 8. Create some seed alerts
        await Alert.create([
            {
                pharmacyId: pharmacyNorth._id,
                title: 'Audit Warning',
                message: 'Monthly drugs check compliance audit sheet is pending completion.',
                severity: 'warning',
                alertType: 'General'
            },
            {
                pharmacyId: pharmacyDowntown._id,
                title: 'Low Temperature Alert',
                message: 'Cold-chain storage refrigerator #2 temp warning logged.',
                severity: 'critical',
                alertType: 'General'
            }
        ]);

        // 9. Create active reorder request
        await ReorderRequest.create({
            medicineId: northMeds[3]._id, // Amlodipine 5mg
            pharmacyId: pharmacyNorth._id,
            quantityNeeded: 100,
            supplier: 'Lupin Ltd',
            status: 'Ordered',
            orderedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            createdBy: pharmacistUser._id
        });

        // 9.5 Seed Emergency Requests
        await EmergencyRequest.create([
            {
                sourcePharmacyId: pharmacyNorth._id,
                targetPharmacyId: pharmacyDowntown._id,
                medicineName: 'Amlodipine 5mg',
                ndc: 'LL-AML-005',
                quantityRequested: 30,
                urgency: 'Critical',
                status: 'Pending',
                notes: 'ICU patient requires Amlodipine 5mg immediately.',
                contactPhone: '+91 98765 43210',
                requestedBy: pharmacistUser._id
            },
            {
                sourcePharmacyId: pharmacyDowntown._id,
                targetPharmacyId: pharmacyNorth._id,
                medicineName: 'Paracetamol 650mg',
                ndc: 'CI-PAR-650',
                quantityRequested: 100,
                urgency: 'Medium',
                status: 'Approved',
                notes: 'Short shortage for upcoming community camp.',
                contactPhone: '+91 87654 32109',
                requestedBy: managerUser._id
            }
        ]);

        // 10. Seed inventory movements for past week chart & audit logs
        const days = 7;
        const txs = [];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Northside stock movements
            txs.push({
                medicineId: northMeds[0]._id, // Paracetamol
                pharmacyId: pharmacyNorth._id,
                userId: pharmacistUser._id,
                transactionType: 'Stock In',
                quantityChanged: Math.floor(Math.random() * 80) + 20,
                createdAt: date
            });

            txs.push({
                medicineId: northMeds[0]._id,
                pharmacyId: pharmacyNorth._id,
                userId: pharmacistUser._id,
                transactionType: 'Stock Out',
                quantityChanged: -(Math.floor(Math.random() * 50) + 10),
                createdAt: date
            });

            // Downtown stock movements
            txs.push({
                medicineId: downtownMeds[0]._id, // Paracetamol
                pharmacyId: pharmacyDowntown._id,
                userId: managerUser._id,
                transactionType: 'Stock In',
                quantityChanged: Math.floor(Math.random() * 60) + 15,
                createdAt: date
            });

            txs.push({
                medicineId: downtownMeds[0]._id,
                pharmacyId: pharmacyDowntown._id,
                userId: managerUser._id,
                transactionType: 'Stock Out',
                quantityChanged: -(Math.floor(Math.random() * 40) + 10),
                createdAt: date
            });
        }

        await InventoryTransaction.create(txs);

        res.json({
            message: 'Database seeded successfully with authentic Indian pharmaceutical data, alerts, reorders, and transactional activity!',
            pharmacies: [
                { id: pharmacyNorth._id, name: pharmacyNorth.name },
                { id: pharmacyDowntown._id, name: pharmacyDowntown.name }
            ],
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Root check
app.get('/', (req, res) => {
    res.send('Pharmacy System API running.');
});

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
