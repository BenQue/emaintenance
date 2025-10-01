'use client';

import { FaultSymptom, FaultSymptomLabels, FaultSymptomDescriptions } from '../../lib/types/work-order';
import { Badge } from '../ui/badge';
import {
  Power,
  Zap,
  Volume2,
  Droplet,
  Flame,
  Waves,
  Gauge,
  AlertCircle,
  PlayCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';

interface FaultSymptomsSelectorProps {
  selectedSymptoms: FaultSymptom[];
  onChange: (symptoms: FaultSymptom[]) => void;
  disabled?: boolean;
  error?: string;
}

// Map fault symptoms to lucide-react icons
const symptomIcons: Record<FaultSymptom, React.ElementType> = {
  [FaultSymptom.EQUIPMENT_SHUTDOWN]: Power,
  [FaultSymptom.POWER_OUTAGE]: Zap,
  [FaultSymptom.ABNORMAL_NOISE]: Volume2,
  [FaultSymptom.LEAKAGE]: Droplet,
  [FaultSymptom.OVERHEATING]: Flame,
  [FaultSymptom.ABNORMAL_VIBRATION]: Waves,
  [FaultSymptom.SPEED_ABNORMALITY]: Gauge,
  [FaultSymptom.DISPLAY_ERROR]: AlertCircle,
  [FaultSymptom.CANNOT_START]: PlayCircle,
  [FaultSymptom.FUNCTION_FAILURE]: XCircle,
  [FaultSymptom.OTHER]: MoreHorizontal,
};

export function FaultSymptomsSelector({
  selectedSymptoms,
  onChange,
  disabled = false,
  error,
}: FaultSymptomsSelectorProps) {
  const handleToggle = (symptom: FaultSymptom) => {
    if (disabled) return;

    const isSelected = selectedSymptoms.includes(symptom);

    if (isSelected) {
      onChange(selectedSymptoms.filter(s => s !== symptom));
    } else {
      onChange([...selectedSymptoms, symptom]);
    }
  };

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
        {Object.values(FaultSymptom).map((symptom) => {
          const isSelected = selectedSymptoms.includes(symptom);
          const Icon = symptomIcons[symptom];

          return (
            <button
              key={symptom}
              type="button"
              onClick={() => handleToggle(symptom)}
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
              title={FaultSymptomDescriptions[symptom]}
            >
              <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
              <span className="text-sm font-medium">
                {FaultSymptomLabels[symptom]}
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

      {selectedSymptoms.length > 0 && !error && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">已选择:</span>
          <div className="flex flex-wrap gap-1">
            {selectedSymptoms.map((symptom) => (
              <Badge key={symptom} variant="secondary" className="text-xs">
                {FaultSymptomLabels[symptom]}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}