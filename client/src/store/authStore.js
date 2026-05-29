import { create } from 'zustand';
import api from '../api';

const stored = localStorage.getItem('wave_user');

export const useAuthStore = create((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: localStorage.getItem('wave_token') || null,

  login: async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password });
    localStorage.setItem('wave_token', data.token);
    localStorage.setItem('wave_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data.user;
  },

  register: async (username, display_name, password) => {
    const { data } = await api.post('/api/auth/register', { username, display_name, password });
    localStorage.setItem('wave_token', data.token);
    localStorage.setItem('wave_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
    return data.user;
  },

  updateProfile: async (updates) => {
    const { data } = await api.patch('/api/users/me', updates);
    localStorage.setItem('wave_user', JSON.stringify(data));
    set({ user: data });
    return data;
  },

  logout: () => {
    localStorage.removeItem('wave_token');
    localStorage.removeItem('wave_user');
    set({ user: null, token: null });
  },
}));
