import { create } from 'zustand';
import { authService, type LoginRequest, type LoginResponse } from '../services/auth-service';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response: LoginResponse = await authService.login(credentials);
      
      // Store token
      authService.storeToken(response.token);
      
      // Update state
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : '登录失败',
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  checkAuth: () => {
    const token = authService.getToken();
    if (token && !authService.isTokenExpired(token)) {
      try {
        // Extract user data from JWT token payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user: User = {
          id: payload.userId || payload.sub,
          email: payload.email,
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
          isActive: payload.isActive,
        };
        set({ user, isAuthenticated: true });
      } catch (error) {
        // If token is malformed, treat as unauthenticated
        authService.removeToken();
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      }
    } else {
      authService.removeToken();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },
}));

export type { User };