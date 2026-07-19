import { create } from 'zustand';
import api from '../lib/api';

function setTokenCookie(token: string) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; secure; samesite=strict`;
}

function clearTokenCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; path=/; max-age=0; secure; samesite=strict';
}

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    const { user, token } = data.data;
    localStorage.setItem('token', token);
    setTokenCookie(token);
    set({ user, token, isAuthenticated: true });
  },

  register: async (email, username, password) => {
    const { data } = await api.post('/api/auth/register', { email, username, password });
    const { user, token } = data.data;
    localStorage.setItem('token', token);
    setTokenCookie(token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    clearTokenCookie();
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data } = await api.get('/api/auth/me');
      const token = localStorage.getItem('token');
      if (token) setTokenCookie(token);
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
