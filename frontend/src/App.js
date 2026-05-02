import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/Dashboard';
import UploadMemory from './pages/UploadMemory';
import MemoryDetail from './pages/MemoryDetail';
import OnThisDay    from './pages/OnThisDay';
import SearchPage   from './pages/SearchPage';
import Community    from './pages/Community';

// Components
import Navbar        from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

// ── Protected Route wrapper ─────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ── Public Route — redirect to dashboard if already logged in ───────────────
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// ── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? 'page-wrapper' : ''}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected Routes */}
          <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload"          element={<ProtectedRoute><UploadMemory /></ProtectedRoute>} />
          <Route path="/memory/:id"      element={<ProtectedRoute><MemoryDetail /></ProtectedRoute>} />
          <Route path="/on-this-day"     element={<ProtectedRoute><OnThisDay /></ProtectedRoute>} />
          <Route path="/search"          element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/community"       element={<ProtectedRoute><Community /></ProtectedRoute>} />

          {/* Default redirect */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
