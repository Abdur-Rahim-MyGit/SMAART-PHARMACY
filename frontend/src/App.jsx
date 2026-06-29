import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import MedicineList from './pages/MedicineList';
import AddMedicine from './pages/AddMedicine';
import EditMedicine from './pages/EditMedicine';
import MedicineDetails from './pages/MedicineDetails';
import InventoryHistory from './pages/InventoryHistory';
import InventoryTransactionForm from './pages/InventoryTransactionForm';
import TransactionDetails from './pages/TransactionDetails';
import Dashboard from './pages/Dashboard';
import ExpiryDashboard from './pages/ExpiryDashboard';
import BranchComparison from './pages/BranchComparison';
import ReorderIntelligence from './pages/ReorderIntelligence';
import Pharmacies from './pages/Pharmacies';
import BranchProfile from './pages/BranchProfile';
import Users from './pages/Users';
import UserProfile from './pages/UserProfile';
import Suppliers from './pages/Suppliers';
import SupplierProfile from './pages/SupplierProfile';
import PurchaseOrders from './pages/PurchaseOrders';
import RevenueAnalytics from './pages/RevenueAnalytics';
import EmergencySupport from './pages/EmergencySupport';
import ActionCenter from './pages/ActionCenter';
import RouteChangeSplash from './components/transitions/RouteChangeSplash';

function FallbackRedirect() {
    const { user } = useAuth();
    if (user?.role === 'Pharmacist') {
        return <Navigate to="/medicines" replace />;
    }
    return <Navigate to="/dashboard" replace />;
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <RouteChangeSplash>
                    <Routes>
                        {/* Public Auth Endpoint */}
                        <Route path="/login" element={<Login />} />

                        {/* Authenticated Application Shell */}
                        <Route element={<ProtectedRoute />}>
                            <Route element={<Layout />}>
                                {/* Shared Routes */}
                                <Route path="/medicines" element={<MedicineList />} />
                                <Route path="/medicines/:id" element={<MedicineDetails />} />
                                <Route path="/medicines/add" element={<AddMedicine />} />
                                <Route path="/inventory/transaction-new" element={<InventoryTransactionForm />} />
                                <Route path="/inventory/transaction/:id" element={<TransactionDetails />} />
                                <Route path="/pharmacies/:id" element={<BranchProfile />} />
                                <Route path="/users/:id" element={<UserProfile />} />
                                <Route path="/emergency-support" element={<EmergencySupport />} />

                                {/* Manager & Admin Only Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager']} />}>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/action-center" element={<ActionCenter />} />
                                    <Route path="/medicines/edit/:id" element={<EditMedicine />} />
                                    <Route path="/inventory/history" element={<InventoryHistory />} />
                                    <Route path="/expiry-dashboard" element={<ExpiryDashboard />} />
                                    <Route path="/reorder-intelligence" element={<ReorderIntelligence />} />
                                    <Route path="/suppliers" element={<Suppliers />} />
                                    <Route path="/suppliers/:id" element={<SupplierProfile />} />
                                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                                    <Route path="/revenue" element={<RevenueAnalytics />} />
                                </Route>

                                {/* Admin Only Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                                    <Route path="/branch-comparison" element={<BranchComparison />} />
                                    <Route path="/pharmacies" element={<Pharmacies />} />
                                    <Route path="/users" element={<Users />} />
                                </Route>
                                
                                {/* Fallback routes redirection */}
                                <Route path="*" element={<FallbackRedirect />} />
                            </Route>
                        </Route>
                    </Routes>
                </RouteChangeSplash>
            </AuthProvider>
        </Router>
    );
}

