import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
// import ChatbotWidget from './components/Chatbot/ChatbotWidget';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080C14' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #0066FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
    {/* <ChatbotWidget /> */}
    <Toaster
      position="top-right"
      toastOptions={{
        style: { background: '#0D1422', color: '#E8EDF5', border: '1px solid #1A2540' },
        success: { iconTheme: { primary: '#00FF88', secondary: '#0D1422' } },
        error:   { iconTheme: { primary: '#FF4444', secondary: '#0D1422' } },
      }}
    />
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