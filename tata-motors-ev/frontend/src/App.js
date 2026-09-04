import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChatbotWidget from './components/Chatbot/ChatbotWidget';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ev-dark">
      <div className="w-8 h-8 border-2 border-ev-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard/*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    <ChatbotWidget />
    <Toaster position="top-right" toastOptions={{
      style: { background: '#0D1422', color: '#E8EDF5', border: '1px solid #1A2540' },
      success: { iconTheme: { primary: '#00FF88', secondary: '#0D1422' } },
      error: { iconTheme: { primary: '#FF4444', secondary: '#0D1422' } },
    }} />
  </>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
