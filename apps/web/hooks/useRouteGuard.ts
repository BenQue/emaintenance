'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useRouteGuard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const redirectBasedOnRole = () => {
    if (!user) return;

    const roleRoutes = {
      EMPLOYEE: '/dashboard/work-orders',
      TECHNICIAN: '/dashboard/my-tasks',
      SUPERVISOR: '/dashboard',
      ADMIN: '/dashboard',
    };

    const targetRoute = roleRoutes[user.role];
    if (targetRoute) {
      router.push(targetRoute);
    }
  };

  const canAccessRoute = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    redirectBasedOnRole,
    canAccessRoute,
  };
}