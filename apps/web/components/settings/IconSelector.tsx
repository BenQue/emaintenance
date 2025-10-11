'use client';

import { useState } from 'react';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Power,
  Zap,
  Volume2,
  Droplet,
  Flame,
  Activity,
  Sliders,
  AlertTriangle,
  MoreHorizontal,
  Thermometer,
  TrendingDown,
  Gauge,
  AlertCircle,
  PlayCircle,
  XCircle,
  Settings,
  Wrench,
  Cog,
  CircuitBoard,
  Cpu,
  HardDrive,
  type LucideIcon
} from 'lucide-react';

// 预定义的图标列表
export const AVAILABLE_ICONS: Array<{ name: string; icon: LucideIcon; label: string }> = [
  { name: 'power-off', icon: Power, label: '电源/停机' },
  { name: 'zap', icon: Zap, label: '电气/闪电' },
  { name: 'volume-2', icon: Volume2, label: '声音/噪音' },
  { name: 'droplet', icon: Droplet, label: '液体/泄漏' },
  { name: 'thermometer', icon: Thermometer, label: '温度/过热' },
  { name: 'activity', icon: Activity, label: '震动/活动' },
  { name: 'sliders', icon: Sliders, label: '控制/调节' },
  { name: 'alert-triangle', icon: AlertTriangle, label: '警告/质量' },
  { name: 'trending-down', icon: TrendingDown, label: '性能下降' },
  { name: 'more-horizontal', icon: MoreHorizontal, label: '其他' },
  { name: 'gauge', icon: Gauge, label: '速度/压力' },
  { name: 'alert-circle', icon: AlertCircle, label: '错误/警报' },
  { name: 'play-circle', icon: PlayCircle, label: '启动' },
  { name: 'x-circle', icon: XCircle, label: '故障/失败' },
  { name: 'settings', icon: Settings, label: '设置/配置' },
  { name: 'wrench', icon: Wrench, label: '维修/工具' },
  { name: 'cog', icon: Cog, label: '机械/齿轮' },
  { name: 'circuit-board', icon: CircuitBoard, label: '电路板' },
  { name: 'cpu', icon: Cpu, label: 'CPU/处理器' },
  { name: 'hard-drive', icon: HardDrive, label: '硬盘/存储' },
];

interface IconSelectorProps {
  value?: string;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

export function IconSelector({ value, onChange, disabled = false }: IconSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedIcon = AVAILABLE_ICONS.find(icon => icon.name === value);
  const SelectedIconComponent = selectedIcon?.icon || AlertCircle;

  return (
    <div className="space-y-2">
      <Label htmlFor="icon">图标</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-start"
          >
            <SelectedIconComponent className="mr-2 h-4 w-4" />
            {selectedIcon ? selectedIcon.label : '选择图标（可选）'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-2">
            <Label className="text-sm font-medium">选择图标</Label>
            <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
              {AVAILABLE_ICONS.map((iconOption) => {
                const IconComponent = iconOption.icon;
                const isSelected = value === iconOption.name;

                return (
                  <button
                    key={iconOption.name}
                    type="button"
                    onClick={() => {
                      onChange(iconOption.name);
                      setOpen(false);
                    }}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                      }
                    `}
                    title={iconOption.label}
                  >
                    <IconComponent className="h-6 w-6 mb-1" />
                    <span className="text-xs text-center line-clamp-2">
                      {iconOption.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="w-full mt-2"
              >
                清除选择
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <p className="text-xs text-gray-500">
          已选择: {value}
        </p>
      )}
    </div>
  );
}
