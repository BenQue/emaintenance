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
  checkAuth: () => Promise<void>;
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

  checkAuth: async () => {
    // Auth check initiated
    set({ isLoading: true }); // Set loading state immediately
    
    const token = authService.getToken();
    if (token && await authService.validateToken()) {
      try {
        // Fetch complete user profile from server instead of relying on JWT payload
        const user = await authService.fetchProfile();
        // User profile fetched successfully
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false, 
          error: null 
        });
      } catch (error) {
        // If profile fetch fails, treat as unauthenticated
        // Profile fetch failed, clearing auth
        authService.removeToken();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } else {
      // No valid token, clearing auth
      authService.removeToken();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },
}));

export type { User };