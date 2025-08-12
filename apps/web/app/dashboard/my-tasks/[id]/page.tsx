import { WorkOrderDetail } from '../../../../components/work-orders/WorkOrderDetail';

interface WorkOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkOrderDetailPage({ params }: WorkOrderDetailPageProps) {
  const { id } = await params;
  return <WorkOrderDetail workOrderId={id} />;
}