import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import { useSocket } from './hooks/useSocket';
import AuthPage from './pages/AuthPage';
import ChatLayout from './pages/ChatLayout';

function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppInner() {
  const { user } = useAuthStore();
  const { fetchConversations } = useChatStore();
  useSocket();

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return <AppInner />;
}
