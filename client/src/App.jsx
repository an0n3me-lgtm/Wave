import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import { useSocket } from './hooks/useSocket';
import AuthPage from './pages/AuthPage';
import ChatLayout from './pages/ChatLayout';
import ServerSetup from './pages/ServerSetup';

// Detect Capacitor (Android/iOS native)
const isCapacitor = () =>
  typeof window !== 'undefined' &&
  (window.Capacitor?.isNativePlatform?.() || navigator.userAgent.includes('capacitor'));

function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppInner() {
  const { user } = useAuthStore();
  const { fetchConversations } = useChatStore();
  const [serverReady, setServerReady] = useState(false);
  const [checking, setChecking] = useState(true);
  useSocket();

  useEffect(() => {
    const checkServer = async () => {
      const stored = localStorage.getItem('wave_server_url');
      const isNative = isCapacitor();

      if (isNative && !stored) {
        // First launch on Android — show server setup
        setChecking(false);
        return;
      }
      setServerReady(true);
      setChecking(false);
    };
    checkServer();
  }, []);

  useEffect(() => {
    if (user && serverReady) fetchConversations();
  }, [user, serverReady]);

  if (checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M4 20 Q9 10 14 20 Q19 30 24 20 Q29 10 29 16"
              stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading Wave…</p>
      </div>
    );
  }

  if (!serverReady) {
    return <ServerSetup onDone={() => setServerReady(true)} />;
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/*" element={
        <ProtectedRoute><ChatLayout /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return <AppInner />;
}
