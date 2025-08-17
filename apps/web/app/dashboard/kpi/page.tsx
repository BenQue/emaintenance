import { KPIChartAreaInteractive } from "@/components/kpi/kpi-chart-area-interactive"
import { KPIDataTable } from "@/components/kpi/kpi-data-table"
import { KPISectionCards } from "@/components/kpi/kpi-section-cards"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon, SettingsIcon, DownloadIcon } from "lucide-react"

export default function KPIDashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">数据分析</h1>
              <p className="text-muted-foreground">
                关键绩效指标和详细的数据分析
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              刷新数据
            </Button>
            <Button variant="outline" size="sm">
              <DownloadIcon className="mr-2 h-4 w-4" />
              导出报告
            </Button>
            <Button variant="outline" size="sm">
              <SettingsIcon className="mr-2 h-4 w-4" />
              配置
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 md:gap-6">
            <KPISectionCards />
            <div className="px-0">
              <KPIChartAreaInteractive />
            </div>
            <KPIDataTable />
          </div>
        </div>
      </div>
    </div>
  )
}