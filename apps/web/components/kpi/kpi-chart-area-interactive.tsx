"use client"

import { useState } from "react"
import { CalendarIcon, TrendingUpIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

// Type assertions for Recharts v3 compatibility
const AreaChartComponent = AreaChart as any;
const AreaComponent = Area as any;
const CartesianGridComponent = CartesianGrid as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartData = [
  { month: "1月", 工单创建: 186, 工单完成: 180 },
  { month: "2月", 工单创建: 205, 工单完成: 200 },
  { month: "3月", 工单创建: 237, 工单完成: 230 },
  { month: "4月", 工单创建: 173, 工单完成: 168 },
  { month: "5月", 工单创建: 209, 工单完成: 205 },
  { month: "6月", 工单创建: 214, 工单完成: 210 },
]

const chartConfig = {
  工单创建: {
    label: "工单创建",
    color: "hsl(var(--chart-1))",
  },
  工单完成: {
    label: "工单完成",
    color: "hsl(var(--chart-2))",
  },
}

export function KPIChartAreaInteractive() {
  const [timeRange, setTimeRange] = useState("90d")

  const filteredData = chartData

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>工单趋势分析</CardTitle>
          <CardDescription>
            显示工单创建和完成的趋势变化
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(value: string) => setTimeRange(value)}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="选择时间范围"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder="选择范围" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              最近 90 天
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              最近 30 天
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              最近 7 天
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChartComponent data={filteredData}>
            <defs>
              <linearGradient id="fill工单创建" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-工单创建)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-工单创建)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fill工单完成" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-工单完成)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-工单完成)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGridComponent vertical={false} />
            <XAxisComponent
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxisComponent
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => value}
                  indicator="dot"
                />
              }
            />
            <AreaComponent
              dataKey="工单完成"
              type="natural"
              fill="url(#fill工单完成)"
              stroke="var(--color-工单完成)"
              stackId="a"
            />
            <AreaComponent
              dataKey="工单创建"
              type="natural"
              fill="url(#fill工单创建)"
              stroke="var(--color-工单创建)"
              stackId="a"
            />
          </AreaChartComponent>
        </ChartContainer>
        <div className="flex items-center gap-2 pt-4 text-sm">
          <TrendingUpIcon className="h-4 w-4 text-green-500" />
          <span className="text-green-600 font-medium">+5.2%</span>
          <span className="text-muted-foreground">较上月工单完成率提升</span>
        </div>
      </CardContent>
    </Card>
  )
}