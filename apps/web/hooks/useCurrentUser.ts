import { useState, useEffect, useCallback } from 'react';
import { authService, LoginResponse } from '../lib/services/auth-service';
import { UserRole } from '../lib/types/user';

interface CurrentUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
}

export const useCurrentUser = (): UseCurrentUserReturn => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!authService.isAuthenticated()) {
        setUser(null);
        return;
      }

      const profile = await authService.fetchProfile();
      setUser({
        id: profile.id,
        email: profile.email,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role as UserRole,
        isActive: profile.isActive,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户信息失败';
      setError(errorMessage);
      setUser(null);
      
      // If authentication failed, redirect to login
      if (errorMessage.includes('Authentication expired')) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const isAdmin = user?.role === UserRole.ADMIN;

  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      [UserRole.EMPLOYEE]: 1,
      [UserRole.TECHNICIAN]: 2,
      [UserRole.SUPERVISOR]: 3,
      [UserRole.ADMIN]: 4,
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }, [user]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    isAdmin,
    hasRole,
  };
};