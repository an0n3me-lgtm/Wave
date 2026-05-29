import { create } from 'zustand';
import api from '../api';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},       // conversationId -> message[]
  typingUsers: {},    // conversationId -> Set of userIds
  onlineUsers: new Set(),
  searchResults: [],
  loadingConvs: false,
  loadingMsgs: false,

  setOnlineUsers: (ids) => set({ onlineUsers: new Set(ids) }),

  setUserOnline: (userId, online) => set((state) => {
    const next = new Set(state.onlineUsers);
    if (online) next.add(userId); else next.delete(userId);
    return { onlineUsers: next };
  }),

  fetchConversations: async () => {
    set({ loadingConvs: true });
    try {
      const { data } = await api.get('/api/conversations');
      set({ conversations: data });
    } finally {
      set({ loadingConvs: false });
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id && !get().messages[id]) {
      get().fetchMessages(id);
    }
  },

  fetchMessages: async (conversationId, before) => {
    set({ loadingMsgs: true });
    try {
      const url = before
        ? `/api/conversations/${conversationId}/messages?before=${before}`
        : `/api/conversations/${conversationId}/messages`;
      const { data } = await api.get(url);
      set((state) => {
        const existing = state.messages[conversationId] || [];
        const merged = before
          ? [...data, ...existing]
          : data;
        return { messages: { ...state.messages, [conversationId]: merged } };
      });
      // Mark conversation as read
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }));
      return data;
    } finally {
      set({ loadingMsgs: false });
    }
  },

  addMessage: (message) => {
    set((state) => {
      const convMsgs = state.messages[message.conversation_id] || [];
      if (convMsgs.find(m => m.id === message.id)) return {};

      const updatedConvs = state.conversations.map(c => {
        if (c.id !== message.conversation_id) return c;
        const isActive = state.activeConversationId === message.conversation_id;
        return {
          ...c,
          last_message: message.content,
          last_message_at: message.created_at,
          last_sender_id: message.sender_id,
          unread_count: isActive ? 0 : (c.unread_count || 0) + 1,
        };
      });

      // Move conversation to top
      const convIdx = updatedConvs.findIndex(c => c.id === message.conversation_id);
      if (convIdx > 0) {
        const conv = updatedConvs.splice(convIdx, 1)[0];
        updatedConvs.unshift(conv);
      }

      return {
        messages: {
          ...state.messages,
          [message.conversation_id]: [...convMsgs, message],
        },
        conversations: updatedConvs,
      };
    });
  },

  editMessage: ({ id, content, edited_at }) => {
    set((state) => {
      const updated = {};
      for (const [convId, msgs] of Object.entries(state.messages)) {
        updated[convId] = msgs.map(m => m.id === id ? { ...m, content, edited_at } : m);
      }
      return { messages: updated };
    });
  },

  deleteMessage: ({ id, conversation_id }) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversation_id]: (state.messages[conversation_id] || []).filter(m => m.id !== id),
      },
    }));
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const cur = new Set(state.typingUsers[conversationId] || []);
      if (isTyping) cur.add(userId); else cur.delete(userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: cur } };
    });
  },

  openConversation: async (userId) => {
    const { data } = await api.post('/api/conversations', { user_id: userId });
    set((state) => {
      const exists = state.conversations.find(c => c.id === data.id);
      const conversations = exists
        ? state.conversations
        : [data, ...state.conversations];
      return { conversations, activeConversationId: data.id };
    });
    return data;
  },

  searchUsers: async (q) => {
    if (!q.trim()) { set({ searchResults: [] }); return; }
    const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
    set({ searchResults: data });
  },

  clearSearch: () => set({ searchResults: [] }),
}));
