'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth-store';
import { KPIDataTable } from "@/components/kpi/kpi-data-table";
import { KPISectionCards } from "@/components/kpi/kpi-section-cards";
import { DashboardSettings } from "@/components/kpi/DashboardSettings";
import { WorkOrderMetrics } from "@/components/kpi/WorkOrderMetrics";
import { TimeMetrics } from "@/components/kpi/TimeMetrics";
import { AssetMetrics } from "@/components/kpi/AssetMetrics";
import { useDashboardSettingsStore } from "@/lib/stores/dashboard-settings-store";
import { useKPIDataStore } from "@/lib/stores/kpi-data-store";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, SettingsIcon, DownloadIcon } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const { settings } = useDashboardSettingsStore();
  const {
    workOrderKPI,
    timeKPI,
    assetKPI,
    workOrderLoading,
    timeLoading,
    assetLoading,
    workOrderError,
    timeError,
    assetError,
    loadAllKPI,
    refreshKPI,
  } = useKPIDataStore();
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

  // Load KPI data on component mount
  useEffect(() => {
    loadAllKPI();
  }, [loadAllKPI]);

  // Auto-refresh data every 30 seconds when detailed charts are visible
  useEffect(() => {
    const hasDetailedChartsVisible = settings.showWorkOrderMetrics || settings.showTimeMetrics || settings.showAssetMetrics;
    
    if (!hasDetailedChartsVisible) return;

    const interval = setInterval(() => {
      refreshKPI();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [settings.showWorkOrderMetrics, settings.showTimeMetrics, settings.showAssetMetrics, refreshKPI]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Trigger refresh by updating key which will cause child components to remount
    setRefreshKey(prev => prev + 1);
    // Also refresh KPI data
    await refreshKPI();
    // Add a small delay to show the loading state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, [refreshKPI]);


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
            <Button variant="outline" size="sm">
              <DownloadIcon className="mr-2 h-4 w-4" />
              导出报告
            </Button>
            <DashboardSettings />
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 md:gap-6 md:px-6 md:pb-6">
        {/* Modern Dashboard Components */}
        {settings.showModernKPICards && <KPISectionCards key={`cards-${refreshKey}`} />}
        {settings.showDataTable && <KPIDataTable key={`table-${refreshKey}`} />}

        {/* Detailed Chart Modules from Story 3.1 */}
        {settings.showWorkOrderMetrics && (
          <WorkOrderMetrics
            statistics={workOrderKPI?.statistics || {
              total: 0,
              byStatus: {},
              byPriority: {},
              averageResolutionTime: null
            }}
            trends={workOrderKPI?.trends}
            loading={workOrderLoading}
            error={workOrderError || undefined}
          />
        )}
        
        {settings.showTimeMetrics && (
          <TimeMetrics
            mttrData={timeKPI?.mttrData}
            resolutionTimeData={timeKPI?.resolutionTimeData}
            averageResponseTime={timeKPI?.averageResponseTime}
            loading={timeLoading}
            error={timeError || undefined}
          />
        )}
        
        {settings.showAssetMetrics && (
          <AssetMetrics
            downtimeRanking={assetKPI?.downtimeRanking}
            faultFrequencyRanking={assetKPI?.faultFrequencyRanking}
            maintenanceCostAnalysis={assetKPI?.maintenanceCostAnalysis}
            healthOverview={assetKPI?.healthOverview}
            loading={assetLoading}
            error={assetError || undefined}
          />
        )}
      </div>
    </div>
  );
}