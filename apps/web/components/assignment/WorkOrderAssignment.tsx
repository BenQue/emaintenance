'use client';

import React, { useState, useEffect } from 'react';
import { useAssignmentStore } from '../../lib/stores/assignment-store';
import { assignmentService } from '../../lib/services/assignment-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface WorkOrderAssignmentProps {
  workOrder: WorkOrder;
  onAssigned?: () => void;
  onClose?: () => void;
}

export default function WorkOrderAssignment({ 
  workOrder, 
  onAssigned, 
  onClose 
}: WorkOrderAssignmentProps) {
  const { technicians, loadTechnicians, techniciansLoading } = useAssignmentStore();
  
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(
    workOrder.assignedToId || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  const handleAssign = async () => {
    if (!selectedTechnicianId) {
      setError('请选择技术员');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await assignmentService.assignWorkOrder(workOrder.id, selectedTechnicianId);
      setSuccess(true);
      
      // Show success message for a moment then call callback
      setTimeout(() => {
        if (onAssigned) {
          onAssigned();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分配失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedTechnician = Array.isArray(technicians) ? technicians.find(tech => tech.id === selectedTechnicianId) : undefined;
  const currentlyAssigned = workOrder.assignedTo;

  if (success) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-green-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">分配成功</h3>
          <p className="text-gray-600">
            工单已分配给 {selectedTechnician?.firstName} {selectedTechnician?.lastName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {currentlyAssigned ? '重新分配工单' : '分配工单'}
        </h3>
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium text-gray-900">{workOrder.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{workOrder.description}</p>
          <div className="flex items-center mt-2 space-x-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              workOrder.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
              workOrder.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
              workOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {workOrder.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              workOrder.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
              workOrder.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
              workOrder.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {workOrder.priority}
            </span>
          </div>
        </div>
      </div>

      {currentlyAssigned && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            当前负责人: {currentlyAssigned.firstName} {currentlyAssigned.lastName}
          </p>
        </div>
      )}

      <div className="mb-6 space-y-2">
        <Label htmlFor="technician">
          选择技术员 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedTechnicianId || 'NONE'}
          onValueChange={(value: string) => setSelectedTechnicianId(value === 'NONE' ? '' : value)}
          disabled={techniciansLoading || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="请选择技术员" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">请选择技术员</SelectItem>
            {Array.isArray(technicians) && technicians.map((technician) => (
              <SelectItem key={technician.id} value={technician.id}>
                {technician.firstName} {technician.lastName} ({technician.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {techniciansLoading && (
          <p className="mt-1 text-sm text-gray-500">加载技术员列表中...</p>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            取消
          </button>
        )}
        <button
          onClick={handleAssign}
          disabled={loading || !selectedTechnicianId}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? '分配中...' : currentlyAssigned ? '重新分配' : '分配工单'}
        </button>
      </div>
    </div>
  );
}