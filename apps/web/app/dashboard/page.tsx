'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth-store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      // 技术员重定向到我的任务
      if (user.role === 'TECHNICIAN') {
        router.push('/dashboard/my-tasks');
        return;
      }
      
      // 管理人员和主管跳转到 KPI 仪表板
      if (user.role === 'SUPERVISOR' || user.role === 'ADMIN') {
        router.push('/dashboard/kpi');
        return;
      }
      
      // 其他角色（如员工）也跳转到 KPI 仪表板
      router.push('/dashboard/kpi');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return null;
}