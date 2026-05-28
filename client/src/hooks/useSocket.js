import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import api from '../api';

let socketInstance = null;

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const addMessage = useChatStore((s) => s.addMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const setUserOnline = useChatStore((s) => s.setUserOnline);
  const setOnlineUsers = useChatStore((s) => s.setOnlineUsers);

  useEffect(() => {
    if (!token) {
      if (socketInstance) { socketInstance.disconnect(); socketInstance = null; }
      return;
    }

    if (socketInstance?.connected) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance = socket;

    socket.on('connect', async () => {
      try {
        const { data } = await api.get('/api/users/online');
        setOnlineUsers(data);
      } catch {}
    });

    socket.on('message:new', addMessage);
    socket.on('message:edited', editMessage);
    socket.on('message:deleted', deleteMessage);
    socket.on('typing:start', ({ userId, conversation_id }) => setTyping(conversation_id, userId, true));
    socket.on('typing:stop', ({ userId, conversation_id }) => setTyping(conversation_id, userId, false));
    socket.on('user:online', ({ userId, online }) => setUserOnline(userId, online));

    return () => {
      socket.disconnect();
      socketInstance = null;
    };
  }, [token]);

  return socketInstance;
}

export function getSocket() {
  return socketInstance;
}
