import { MaintenanceHistory } from '../../../../components/maintenance/MaintenanceHistory';

interface AssetDetailPageProps {
  params: {
    id: string;
  };
}

export default function AssetDetailPage({ params }: AssetDetailPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">设备维护历史</h1>
      <MaintenanceHistory assetId={params.id} />
    </div>
  );
}