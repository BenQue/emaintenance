import { MaintenanceHistory } from '../../../../components/maintenance/MaintenanceHistory';

interface AssetDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = await params;
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">设备维护历史</h1>
      <MaintenanceHistory assetId={id} />
    </div>
  );
}