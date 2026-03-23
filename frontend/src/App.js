import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Login from './pages/Login';
import StaffView from './pages/StaffView';
import ReceptionDashboard from './pages/ReceptionDashboard';
import AdminPanel from './pages/AdminPanel';
import HistoryPage from './pages/HistoryPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="text-white animate-pulse">Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'reception') return <Navigate to="/reception" replace />;
    return <Navigate to="/staff" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'reception') return <Navigate to="/reception" replace />;
  return <Navigate to="/staff" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Toaster position="top-center" toastOptions={{
            style: { borderRadius: '12px', fontFamily: 'system-ui', fontSize: '14px' },
            success: { style: { background: '#1a2a1a', color: '#86efac' } },
            error: { style: { background: '#2a1a1a', color: '#fca5a5' } },
          }} />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/staff" element={<ProtectedRoute roles={['staff','admin']}><StaffView /></ProtectedRoute>} />
            <Route path="/reception" element={<ProtectedRoute roles={['reception','admin']}><ReceptionDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}
