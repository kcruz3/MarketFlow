import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles.css";

import { AuthProvider } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

import MapPage from "./pages/consumer/MapPage";
import VendorsPage from "./pages/consumer/VendorsPage";
import VendorPage from "./pages/consumer/VendorPage";
import OrderHistoryPage from "./pages/consumer/OrderHistoryPage";

import DashboardPage from "./pages/admin/DashboardPage";
import AdminVendorsPage from "./pages/admin/VendorsPage";
import EventsPage from "./pages/admin/EventsPage";
import AdminApprovalsPage from "./pages/admin/AdminApprovalsPage";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";

import VendorApplyPage from "./pages/vendor/VendorApplyPage";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorProfilePage from "./pages/vendor/VendorProfilePage";

import OwnerUsersPage from "./pages/owner/OwnerUsersPage";

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/vendor/apply" element={<VendorApplyPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <VendorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendors/:slug"
            element={
              <ProtectedRoute>
                <VendorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute requiredRole="vendor">
                <VendorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/profile"
            element={
              <ProtectedRoute requiredRole="vendor">
                <VendorProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vendors"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminVendorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute requiredRole="admin">
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute requiredRole="admin">
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner/users"
            element={
              <ProtectedRoute requiredRole="owner">
                <OwnerUsersPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
