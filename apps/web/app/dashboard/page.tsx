'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth-store';
import { KPIChartAreaInteractive } from "@/components/kpi/kpi-chart-area-interactive";
import { KPIDataTable } from "@/components/kpi/kpi-data-table";
import { KPISectionCards } from "@/components/kpi/kpi-section-cards";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, SettingsIcon } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      // 技术员重定向到我的任务
      if (user.role === 'TECHNICIAN') {
        router.push('/dashboard/my-tasks');
        return;
      }
      // 员工重定向到工单管理页面
      if (user.role === 'EMPLOYEE') {
        router.push('/dashboard/work-orders');
        return;
      }
    }
  }, [user, isLoading, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Trigger refresh by updating key which will cause child components to remount
    setRefreshKey(prev => prev + 1);
    // Add a small delay to show the loading state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const handleSettings = useCallback(() => {
    // Navigate to dashboard settings or open settings modal
    console.log('Dashboard settings clicked');
  }, []);

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

  // For TECHNICIAN and EMPLOYEE roles, the redirect will happen above
  if (!user || user.role === 'TECHNICIAN' || user.role === 'EMPLOYEE') {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">仪表面板</h1>
              <p className="text-muted-foreground">
                监控设备维护系统的关键指标和工单状态
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCwIcon className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
            <Button variant="outline" size="sm" onClick={handleSettings}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              仪表板设置
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 md:gap-6">
            <KPISectionCards key={`cards-${refreshKey}`} />
            <div className="px-0">
              <KPIChartAreaInteractive key={`chart-${refreshKey}`} />
            </div>
            <KPIDataTable key={`table-${refreshKey}`} />
          </div>
        </div>
      </div>
    </div>
  );
}