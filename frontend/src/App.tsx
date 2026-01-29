import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { CopyTypes } from '@/pages/CopyTypes';
import { CopyGenerator } from '@/pages/CopyGenerator';
import { Checklist } from '@/pages/Checklist';
import { BestCopies } from '@/pages/BestCopies';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Pending from '@/pages/Pending';
import AdminUsers from '@/pages/AdminUsers';
import AdminTeams from '@/pages/AdminTeams';
import AdminReport from '@/pages/AdminReport';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending" element={<Pending />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout><Dashboard /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute>
              <MainLayout><Products /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/copy-types" element={
            <ProtectedRoute>
              <MainLayout><CopyTypes /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/generator" element={
            <ProtectedRoute>
              <MainLayout><CopyGenerator /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/checklist" element={
            <ProtectedRoute>
              <MainLayout><Checklist /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/best" element={
            <ProtectedRoute>
              <MainLayout><BestCopies /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/users" element={
            <ProtectedRoute requireRole="admin">
              <MainLayout><AdminUsers /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/teams" element={
            <ProtectedRoute requireRole="leader">
              <MainLayout><AdminTeams /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/report" element={
            <ProtectedRoute requireRole="admin">
              <MainLayout><AdminReport /></MainLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
