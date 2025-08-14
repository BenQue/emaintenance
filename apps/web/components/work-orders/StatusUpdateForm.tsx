'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { WorkOrderStatus, WorkOrderStatusLabels, UpdateWorkOrderStatusRequest } from '../../lib/types/work-order';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface StatusUpdateFormProps {
  workOrderId: string;
  currentStatus: WorkOrderStatus;
  onSuccess?: () => void;
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
  const [newStatus, setNewStatus] = useState<WorkOrderStatus>(currentStatus);
  const [notes, setNotes] = useState('');

  const availableStatuses = statusTransitions[currentStatus] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newStatus === currentStatus) {
      return;
    }

    const statusUpdate: UpdateWorkOrderStatusRequest = {
      status: newStatus,
      notes: notes.trim() || undefined,
    };

    try {
      await updateWorkOrderStatus(workOrderId, statusUpdate);
      setNotes('');
      onSuccess?.();
    } catch (error) {
      // Error is handled by the store
    }
  };

  if (availableStatuses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">状态更新</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            当前状态无法进行变更
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">状态更新</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              当前状态
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              {WorkOrderStatusLabels[currentStatus]}
            </div>
          </div>

          {/* New Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              更新为 <span className="text-red-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as WorkOrderStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={currentStatus}>
                {WorkOrderStatusLabels[currentStatus]} (不变更)
              </option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {WorkOrderStatusLabels[status]}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注说明
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="请输入状态变更的备注说明..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {notes.length}/500 字符
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || newStatus === currentStatus}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? '更新中...' : '更新状态'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}