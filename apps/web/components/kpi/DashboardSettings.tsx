'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useDashboardSettingsStore } from "@/lib/stores/dashboard-settings-store";
import { SettingsIcon, RefreshCwIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export function DashboardSettings() {
  const [open, setOpen] = useState(false);
  const { settings, updateSetting, resetToDefaults, toggleAllCharts } = useDashboardSettingsStore();

  console.log('DashboardSettings render - open state:', open);

  const handleSwitchChange = (key: keyof typeof settings, checked: boolean) => {
    updateSetting(key, checked);
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log('Dialog open change:', newOpen);
    setOpen(newOpen);
  };

  const allChartsVisible = settings.showWorkOrderMetrics && settings.showTimeMetrics && settings.showAssetMetrics;
  const someChartsVisible = settings.showWorkOrderMetrics || settings.showTimeMetrics || settings.showAssetMetrics;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          type="button"
        >
          <SettingsIcon className="mr-2 h-4 w-4" />
          仪表板设置
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="sticky top-2 bg-background z-[1] pb-4 pr-16">
          <DialogTitle>仪表板设置</DialogTitle>
          <DialogDescription className="pr-14">
            自定义您的KPI仪表板显示内容。您可以选择显示或隐藏不同的图表模块。
          </DialogDescription>
        </div>

        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto space-y-6 pr-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">快速操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllCharts(true)}
                  disabled={allChartsVisible}
                >
                  <EyeIcon className="mr-2 h-4 w-4" />
                  显示所有图表
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllCharts(false)}
                  disabled={!someChartsVisible}
                >
                  <EyeOffIcon className="mr-2 h-4 w-4" />
                  隐藏所有图表
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                >
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                  重置默认
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Modern Dashboard Components */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">现代仪表板组件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="modern-kpi-cards">KPI 概览卡片</Label>
                  <p className="text-sm text-muted-foreground">
                    显示关键绩效指标的概览卡片
                  </p>
                </div>
                <Switch
                  id="modern-kpi-cards"
                  checked={settings.showModernKPICards}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('showModernKPICards', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="data-table">数据表格</Label>
                  <p className="text-sm text-muted-foreground">
                    显示详细的数据表格视图
                  </p>
                </div>
                <Switch
                  id="data-table"
                  checked={settings.showDataTable}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('showDataTable', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Detailed Chart Modules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">详细图表模块</CardTitle>
              <p className="text-sm text-muted-foreground">
                来自原有KPI系统的详细分析图表，包含更多深入的数据可视化
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="work-order-metrics">工单指标图表</Label>
                  <p className="text-sm text-muted-foreground">
                    工单状态分布、优先级分布、创建和完成趋势图表
                  </p>
                </div>
                <Switch
                  id="work-order-metrics"
                  checked={settings.showWorkOrderMetrics}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('showWorkOrderMetrics', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="time-metrics">时间指标图表</Label>
                  <p className="text-sm text-muted-foreground">
                    MTTR分析、响应时间、效率趋势、分类别和优先级分析
                  </p>
                </div>
                <Switch
                  id="time-metrics"
                  checked={settings.showTimeMetrics}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('showTimeMetrics', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="asset-metrics">资产指标图表</Label>
                  <p className="text-sm text-muted-foreground">
                    设备停机时间排行、故障频率排行、维护成本分析、关键风险设备
                  </p>
                </div>
                <Switch
                  id="asset-metrics"
                  checked={settings.showAssetMetrics}
                  onCheckedChange={(checked: boolean) => handleSwitchChange('showAssetMetrics', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings Summary */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">当前设置总结</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium mb-1">现代组件:</p>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>• KPI卡片: {settings.showModernKPICards ? '✓' : '✗'}</div>
                    <div>• 数据表格: {settings.showDataTable ? '✓' : '✗'}</div>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-1">详细图表:</p>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>• 工单指标: {settings.showWorkOrderMetrics ? '✓' : '✗'}</div>
                    <div>• 时间指标: {settings.showTimeMetrics ? '✓' : '✗'}</div>
                    <div>• 资产指标: {settings.showAssetMetrics ? '✓' : '✗'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}