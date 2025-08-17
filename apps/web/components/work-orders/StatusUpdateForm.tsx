'use client';

import { useForm } from 'react-hook-form';
import { WorkOrderStatus, WorkOrderStatusLabels, UpdateWorkOrderStatusRequest } from '../../lib/types/work-order';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { FormWrapper } from '../forms/unified/FormWrapper';
import { UnifiedFormField } from '../forms/unified/FormField';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';

interface StatusUpdateFormProps {
  workOrderId: string;
  currentStatus: WorkOrderStatus;
  onSuccess?: () => void;
}

interface StatusUpdateFormData {
  newStatus: WorkOrderStatus;
  notes: string;
}

// Define valid status transitions
// Note: COMPLETED status is handled through dedicated completion workflow
const statusTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.PENDING]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.WAITING_PARTS,
    WorkOrderStatus.WAITING_EXTERNAL,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.WAITING_PARTS]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.WAITING_EXTERNAL]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.COMPLETED]: [], // Cannot transition from completed
  [WorkOrderStatus.CANCELLED]: [], // Cannot transition from cancelled
};

export function StatusUpdateForm({ workOrderId, currentStatus, onSuccess }: StatusUpdateFormProps) {
  const { updateWorkOrderStatus, loading, error } = useWorkOrderStore();
  const availableStatuses = statusTransitions[currentStatus] || [];

  // React Hook Form setup
  const form = useForm<StatusUpdateFormData>({
    defaultValues: {
      newStatus: currentStatus,
      notes: '',
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: StatusUpdateFormData) => {
    if (data.newStatus === currentStatus) {
      return;
    }

    const statusUpdate: UpdateWorkOrderStatusRequest = {
      status: data.newStatus,
      notes: data.notes.trim() || undefined,
    };

    try {
      await updateWorkOrderStatus(workOrderId, statusUpdate);
      form.reset();
      onSuccess?.();
    } catch (error) {
      // Error is handled by the store
    }
  };

  if (availableStatuses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-bizlink-700">状态更新</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            当前状态无法进行变更
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-bizlink-700">状态更新</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Status Display */}
        <div className="space-y-2 mb-6">
          <Label className="text-sm font-medium text-bizlink-700">当前状态</Label>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
            {WorkOrderStatusLabels[currentStatus]}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormWrapper
          form={form}
          onSubmit={onSubmit}
          submitButtonText={loading ? '更新中...' : '更新状态'}
          loading={loading}
          className="space-y-4"
        >
          {/* New Status Selection */}
          <UnifiedFormField
            control={form.control}
            name="newStatus"
            label="更新为"
            type="select"
            placeholder="选择新状态"
            options={[
              {
                value: currentStatus,
                label: `${WorkOrderStatusLabels[currentStatus]} (不变更)`
              },
              ...availableStatuses.map(status => ({
                value: status,
                label: WorkOrderStatusLabels[status]
              }))
            ]}
            description="选择工单的新状态"
          />

          {/* Notes Field */}
          <UnifiedFormField
            control={form.control}
            name="notes"
            label="备注说明"
            type="textarea"
            placeholder="请输入状态变更的备注说明..."
            description="描述状态变更的原因或相关信息"
            className="min-h-[80px]"
          />

          {/* Character Count */}
          <div className="text-xs text-muted-foreground">
            {form.watch('notes')?.length || 0}/500 字符
          </div>
        </FormWrapper>
      </CardContent>
    </Card>
  );
}