import { KPIDashboard } from '../../../components/kpi';

export default function KPIDashboardPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <KPIDashboard 
        autoRefresh={true}
        refreshInterval={30}
      />
    </div>
  );
}