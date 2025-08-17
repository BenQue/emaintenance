'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardSettings {
  // Chart visibility settings
  showWorkOrderMetrics: boolean;
  showTimeMetrics: boolean;
  showAssetMetrics: boolean;
  showModernKPICards: boolean;
  showDataTable: boolean;
}

interface DashboardSettingsStore {
  settings: DashboardSettings;
  updateSetting: (key: keyof DashboardSettings, value: boolean) => void;
  resetToDefaults: () => void;
  toggleAllCharts: (visible: boolean) => void;
}

const defaultSettings: DashboardSettings = {
  // Show modern components by default
  showModernKPICards: true,
  showDataTable: true,
  // Hide detailed charts by default (user can enable them)
  showWorkOrderMetrics: false,
  showTimeMetrics: false,
  showAssetMetrics: false,
};

export const useDashboardSettingsStore = create<DashboardSettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSetting: (key: keyof DashboardSettings, value: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        }));
      },

      resetToDefaults: () => {
        set({ settings: defaultSettings });
      },

      toggleAllCharts: (visible: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            showWorkOrderMetrics: visible,
            showTimeMetrics: visible,
            showAssetMetrics: visible,
          },
        }));
      },
    }),
    {
      name: 'dashboard-settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);