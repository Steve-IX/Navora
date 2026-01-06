import { create } from 'zustand';
import { authService, LoginDto, RegisterDto, AuthResponse } from '@/services/api/auth.service';

export interface AuthUser {
  id: string;
  email: string | null;
  isGuest?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user && !user.isGuest }),
  setToken: (token) => {
    set({ token });
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (data: LoginDto) => {
    set({ isLoading: true, error: null });
    try {
      const response: AuthResponse = await authService.login(data);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: !response.user.isGuest,
        isLoading: false,
      });
      get().setToken(response.access_token);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data: RegisterDto) => {
    set({ isLoading: true, error: null });
    try {
      const response: AuthResponse = await authService.register(data);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      get().setToken(response.access_token);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
    get().setToken(null);
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const userData = await authService.getMe();
      set({
        user: userData,
        token,
        isAuthenticated: !userData.isGuest,
        isLoading: false,
      });
      get().setToken(token);
    } catch (error: any) {
      // Token is invalid, clear it
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  refreshUser: async () => {
    if (!get().token) {
      return;
    }

    try {
      const userData = await authService.getMe();
      set({
        user: userData,
        isAuthenticated: !userData.isGuest,
      });
    } catch (error: any) {
      // If refresh fails, logout
      get().logout();
    }
  },

  initializeAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      await get().checkAuth();
    } else {
      // Create guest token if no token exists
      try {
        const response: AuthResponse = await authService.createGuestToken();
        set({
          user: response.user,
          token: response.access_token,
          isAuthenticated: false,
          isLoading: false,
        });
        get().setToken(response.access_token);
      } catch (error: any) {
        console.error('Failed to create guest token:', error);
        set({ isLoading: false });
      }
    }
  },
}));

