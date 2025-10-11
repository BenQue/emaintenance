'use client';

import { useState, useEffect } from 'react';
import { SettingsService, FaultSymptom } from '../../lib/services/settings-service';
import { Badge } from '../ui/badge';
import { AlertCircle } from 'lucide-react';
import { AVAILABLE_ICONS } from '../settings/IconSelector';

interface FaultSymptomsSelectorProps {
  selectedSymptomIds: string[];
  onChange: (symptomIds: string[]) => void;
  disabled?: boolean;
  error?: string;
}

// Helper function to get icon component from icon name
const getIconComponent = (iconName?: string) => {
  if (!iconName) return AlertCircle;
  const iconConfig = AVAILABLE_ICONS.find(i => i.name === iconName);
  return iconConfig?.icon || AlertCircle;
};

export function FaultSymptomsSelector({
  selectedSymptomIds,
  onChange,
  disabled = false,
  error,
}: FaultSymptomsSelectorProps) {
  const [faultSymptoms, setFaultSymptoms] = useState<FaultSymptom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFaultSymptoms = async () => {
      try {
        console.log('[FaultSymptomsSelector] Starting to load fault symptoms...');
        const response = await SettingsService.getFaultSymptoms({ isActive: true, limit: 100 });
        console.log('[FaultSymptomsSelector] API Response:', response);
        console.log('[FaultSymptomsSelector] Fault symptoms count:', response.items?.length || 0);
        setFaultSymptoms(response.items);
      } catch (error) {
        console.error('[FaultSymptomsSelector] Failed to load fault symptoms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFaultSymptoms();
  }, []);

  const handleToggle = (symptomId: string) => {
    if (disabled) return;

    const isSelected = selectedSymptomIds.includes(symptomId);

    if (isSelected) {
      onChange(selectedSymptomIds.filter(id => id !== symptomId));
    } else {
      onChange([...selectedSymptomIds, symptomId]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <label className="text-sm font-medium text-bizlink-700">
            故障表现 <span className="text-red-500">*</span>
          </label>
        </div>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">加载故障表现...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <label className="text-sm font-medium text-bizlink-700">
            故障表现 <span className="text-red-500">*</span>
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-semibold mb-1">故障表现说明</p>
              <p>请选择一个或多个故障表现（可多选）。描述您观察到的现象，无需分析故障原因。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {faultSymptoms.map((symptom) => {
          const isSelected = selectedSymptomIds.includes(symptom.id);
          // Use database icon field if available
          const Icon = getIconComponent(symptom.icon);

          return (
            <button
              key={symptom.id}
              type="button"
              onClick={() => handleToggle(symptom.id)}
              disabled={disabled}
              className={`
                inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              `}
              title={symptom.description || symptom.name}
            >
              <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
              <span className="text-sm font-medium">
                {symptom.name}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center space-x-1">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </p>
      )}

      {selectedSymptomIds.length > 0 && !error && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">已选择:</span>
          <div className="flex flex-wrap gap-1">
            {selectedSymptomIds.map((symptomId) => {
              const symptom = faultSymptoms.find(s => s.id === symptomId);
              return symptom ? (
                <Badge key={symptomId} variant="secondary" className="text-xs">
                  {symptom.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}