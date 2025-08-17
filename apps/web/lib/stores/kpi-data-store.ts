'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { workOrderService } from '../services/work-order-service';
import { assetService } from '../services/asset-service';

interface WorkOrderKPIData {
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number | null;
  };
  trends: {
    creationTrend: { date: string; count: number }[];
    completionTrend: { date: string; count: number }[];
  };
}

interface TimeKPIData {
  mttrData: {
    averageMTTR: number;
    mttrTrend: { period: string; mttr: number }[];
    byPriority: { priority: string; mttr: number }[];
    byCategory: { category: string; mttr: number }[];
  };
  resolutionTimeData: {
    date: string;
    hours: number;
  }[];
  averageResponseTime: number;
}

interface AssetKPIData {
  downtimeRanking: Array<{
    assetCode: string;
    assetName: string;
    totalDowntimeHours: number;
    downtimeIncidents: number;
  }>;
  faultFrequencyRanking: Array<{
    assetCode: string;
    assetName: string;
    faultFrequency: number;
    healthScore: number;
  }>;
  maintenanceCostAnalysis: Array<{
    assetCode: string;
    assetName: string;
    maintenanceCost: number;
    downtimeHours: number;
  }>;
  healthOverview: {
    totalAssets: number;
    activeAssets: number;
    assetsWithIssues: number;
    averageHealthScore: number;
    criticalAssets: Array<{
      assetCode: string;
      assetName: string;
      healthScore: number;
    }>;
  };
}

interface KPIDataState {
  // Data
  workOrderKPI: WorkOrderKPIData | null;
  timeKPI: TimeKPIData | null;
  assetKPI: AssetKPIData | null;

  // Loading states
  workOrderLoading: boolean;
  timeLoading: boolean;
  assetLoading: boolean;

  // Error states
  workOrderError: string | null;
  timeError: string | null;
  assetError: string | null;

  // Last updated timestamps
  lastUpdated: {
    workOrder: Date | null;
    time: Date | null;
    asset: Date | null;
  };

  // Actions
  loadWorkOrderKPI: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  loadTimeKPI: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  loadAssetKPI: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  loadAllKPI: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  clearErrors: () => void;
  refreshKPI: () => Promise<void>;
}

export const useKPIDataStore = create<KPIDataState>()(
  devtools(
    (set, get) => ({
      // Initial state
      workOrderKPI: null,
      timeKPI: null,
      assetKPI: null,
      workOrderLoading: false,
      timeLoading: false,
      assetLoading: false,
      workOrderError: null,
      timeError: null,
      assetError: null,
      lastUpdated: {
        workOrder: null,
        time: null,
        asset: null,
      },

      // Actions
      loadWorkOrderKPI: async (filters = {}) => {
        set({ workOrderLoading: true, workOrderError: null });
        try {
          // Fetch work order statistics and trends
          const [statistics, trends] = await Promise.all([
            workOrderService.getWorkOrderStatistics(filters),
            workOrderService.getWorkOrderTrends({
              timeRange: '30d',
              granularity: 'day',
              ...filters,
            }),
          ]);

          const workOrderKPI: WorkOrderKPIData = {
            statistics,
            trends: {
              creationTrend: trends.creationTrend || [],
              completionTrend: trends.completionTrend || [],
            },
          };

          set({
            workOrderKPI,
            workOrderLoading: false,
            lastUpdated: {
              ...get().lastUpdated,
              workOrder: new Date(),
            },
          });
        } catch (error) {
          set({
            workOrderError: error instanceof Error ? error.message : 'Failed to load work order KPI',
            workOrderLoading: false,
          });
        }
      },

      loadTimeKPI: async (filters = {}) => {
        set({ timeLoading: true, timeError: null });
        try {
          // Fetch MTTR and time-related statistics
          const mttrData = await workOrderService.getMTTRStatistics({
            timeRange: '30d',
            granularity: 'week',
            ...filters,
          });

          const timeKPI: TimeKPIData = {
            mttrData: {
              averageMTTR: mttrData.averageMTTR || 0,
              mttrTrend: mttrData.mttrTrend || [],
              byPriority: mttrData.byPriority || [],
              byCategory: mttrData.byCategory || [],
            },
            resolutionTimeData: mttrData.resolutionTimeData || [],
            averageResponseTime: mttrData.averageResponseTime || 0,
          };

          set({
            timeKPI,
            timeLoading: false,
            lastUpdated: {
              ...get().lastUpdated,
              time: new Date(),
            },
          });
        } catch (error) {
          set({
            timeError: error instanceof Error ? error.message : 'Failed to load time KPI',
            timeLoading: false,
          });
        }
      },

      loadAssetKPI: async (filters = {}) => {
        set({ assetLoading: true, assetError: null });
        try {
          // Fetch asset-related KPI data
          const [
            downtimeRanking,
            faultFrequencyRanking,
            maintenanceCostAnalysis,
            healthOverview,
          ] = await Promise.all([
            assetService.getDowntimeRanking(filters),
            assetService.getFaultFrequencyRanking(filters),
            assetService.getMaintenanceCostAnalysis(filters),
            assetService.getHealthOverview(filters),
          ]);

          const assetKPI: AssetKPIData = {
            downtimeRanking: downtimeRanking || [],
            faultFrequencyRanking: faultFrequencyRanking || [],
            maintenanceCostAnalysis: maintenanceCostAnalysis || [],
            healthOverview: healthOverview || {
              totalAssets: 0,
              activeAssets: 0,
              assetsWithIssues: 0,
              averageHealthScore: 0,
              criticalAssets: [],
            },
          };

          set({
            assetKPI,
            assetLoading: false,
            lastUpdated: {
              ...get().lastUpdated,
              asset: new Date(),
            },
          });
        } catch (error) {
          set({
            assetError: error instanceof Error ? error.message : 'Failed to load asset KPI',
            assetLoading: false,
          });
        }
      },

      loadAllKPI: async (filters = {}) => {
        const { loadWorkOrderKPI, loadTimeKPI, loadAssetKPI } = get();
        
        // Load all KPI data in parallel
        await Promise.all([
          loadWorkOrderKPI(filters),
          loadTimeKPI(filters),
          loadAssetKPI(filters),
        ]);
      },

      clearErrors: () => {
        set({
          workOrderError: null,
          timeError: null,
          assetError: null,
        });
      },

      refreshKPI: async () => {
        const { loadAllKPI } = get();
        await loadAllKPI();
      },
    }),
    {
      name: 'kpi-data-store',
    }
  )
);