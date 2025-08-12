'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!hasRedirected.current) {
      checkAuth();
    }
  }, [checkAuth]);

  useEffect(() => {
    if (!hasRedirected.current && !isLoading) {
      hasRedirected.current = true;
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        // 根据用户角色导航到不同的首页
        if (user?.role === 'TECHNICIAN') {
          router.push('/dashboard/my-tasks');
        } else if (user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') {
          router.push('/dashboard');
        } else {
          // 默认情况下，员工也跳转到仪表板
          router.push('/dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return null;
}