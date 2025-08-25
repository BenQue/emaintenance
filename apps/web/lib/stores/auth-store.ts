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
    console.log('AuthStore: checkAuth started');
    set({ isLoading: true });
    
    try {
      const token = authService.getToken();
      console.log('AuthStore: token exists:', !!token);
      
      if (!token) {
        console.log('AuthStore: no token found, clearing auth');
        authService.removeToken();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      console.log('AuthStore: validating token...');
      const isValid = await authService.validateToken();
      console.log('AuthStore: token validation result:', isValid);
      
      if (!isValid) {
        console.log('AuthStore: token invalid, clearing auth');
        authService.removeToken();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      console.log('AuthStore: fetching user profile...');
      const user = await authService.fetchProfile();
      console.log('AuthStore: profile fetched successfully:', user);
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false, 
        error: null 
      });
      
    } catch (error) {
      console.error('AuthStore: checkAuth failed:', error);
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