import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Billing from "@/pages/Billing";
import Customers from "@/pages/Customers";
import Expenses from "@/pages/Expenses";
import Analytics from "@/pages/Analytics";
import Inventory from "@/pages/Inventory";
import UserManagement from "@/pages/UserManagement";
import AuditLogs from "@/pages/AuditLogs";
import StockAlerts from "@/pages/StockAlerts";
import Refunds from "@/pages/Refunds";
import TransactionHistory from "@/pages/TransactionHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/auth" element={<Auth />} />
    
    {/* Root redirect */}
    <Route path="/" element={<Navigate to="/auth" replace />} />
    
    {/* Protected routes with layout */}
    <Route element={
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    }>
      {/* Owner & Admin routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <Products />
        </ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <Expenses />
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <Customers />
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <Analytics />
        </ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <Inventory />
        </ProtectedRoute>
      } />
      <Route path="/stock-alerts" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <StockAlerts />
        </ProtectedRoute>
      } />
      <Route path="/audit-logs" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <AuditLogs />
        </ProtectedRoute>
      } />
      <Route path="/refunds" element={
        <ProtectedRoute allowedRoles={['owner', 'admin', 'cashier']}>
          <Refunds />
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute allowedRoles={['owner', 'admin']}>
          <TransactionHistory />
        </ProtectedRoute>
      } />
      
      {/* Owner only routes */}
      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <UserManagement />
        </ProtectedRoute>
      } />
      
      {/* All authenticated users */}
      <Route path="/billing" element={<Billing />} />
    </Route>
    
    {/* Legacy redirect */}
    <Route path="/login" element={<Navigate to="/auth" replace />} />
    
    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
