import { WorkOrderDetail } from '../../../../components/work-orders/WorkOrderDetail';

interface WorkOrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function WorkOrderDetailPage({ params }: WorkOrderDetailPageProps) {
  return <WorkOrderDetail workOrderId={params.id} />;
}