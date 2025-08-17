'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/auth-store';
import { WorkOrderList } from '../../../components/work-orders/WorkOrderList';

export default function MyTasksPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      // 只有技术员可以访问"我的任务"页面
      if (user.role !== 'TECHNICIAN') {
        // 非技术员重定向到合适的页面
        if (user.role === 'SUPERVISOR' || user.role === 'ADMIN') {
          router.push('/dashboard');
        } else {
          router.push('/dashboard/work-orders');
        }
        return;
      }
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

  if (!user || user.role !== 'TECHNICIAN') {
    return null; // 会被重定向，不显示内容
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-gray-600">查看和管理分配给您的工单任务</p>
      </div>
      <WorkOrderList />
    </div>
  );
}