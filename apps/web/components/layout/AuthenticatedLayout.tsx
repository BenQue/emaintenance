'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth-store';
import { SidebarNavigationLayout } from '../blocks/sidebar-navigation';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle hydration mismatch by ensuring component is mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      // Check authentication status on component mount
      console.log('AuthenticatedLayout: Checking auth status');
      const initAuth = async () => {
        await checkAuth();
        setIsInitializing(false);
      };
      initAuth();
    }
  }, [checkAuth, isMounted]);

  useEffect(() => {
    // Only redirect after initialization is complete and we're not loading
    if (isMounted && !isInitializing && !isLoading && !isAuthenticated) {
      console.log('AuthenticatedLayout: Redirecting to login - not authenticated', {
        isInitializing,
        isLoading,
        isAuthenticated,
        hasUser: !!user
      });
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isInitializing, router, user, isMounted]);

  // Show loading during SSR and initial client hydration
  if (!isMounted || isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">验证身份中...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">正在跳转...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarNavigationLayout>
      {children}
    </SidebarNavigationLayout>
  );
}