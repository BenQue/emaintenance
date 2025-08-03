import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // According to AC 1: Web 应用的主管视图首页即为 KPI 仪表板
  redirect('/dashboard/kpi');
}