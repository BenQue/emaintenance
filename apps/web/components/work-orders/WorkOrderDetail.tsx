'use client';

import { useEffect, useState } from 'react';
import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  User, 
  Wrench, 
  AlertCircle, 
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { WorkOrderStatusLabels, PriorityLabels, StatusColors, PriorityColors, WorkOrderStatus, CreateResolutionRequest } from '../../lib/types/work-order';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { StatusHistory } from './StatusHistory';
import { StatusUpdateForm } from './StatusUpdateForm';
import { ResolutionRecordForm } from './ResolutionRecordForm';
import { ResolutionRecordDisplay } from './ResolutionRecordDisplay';
import { cn } from '../../lib/utils';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return '未设置';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (!isValid(date)) {
    console.warn('Invalid date value:', dateValue);
    return '无效日期';
  }
  
  return format(date, formatString, { locale: zhCN });
};

interface WorkOrderDetailProps {
  workOrderId: string;
}

export function WorkOrderDetail({ workOrderId }: WorkOrderDetailProps) {
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  
  const {
    currentWorkOrder,
    currentWorkOrderWithResolution,
    statusHistory,
    loading,
    error,
    loadWorkOrderWithHistory,
    loadWorkOrderWithResolution,
    completeWorkOrder,
    clearError,
    clearCurrentWorkOrder,
  } = useWorkOrderStore();

  useEffect(() => {
    loadWorkOrderWithHistory(workOrderId);
    loadWorkOrderWithResolution(workOrderId);
    
    return () => {
      clearCurrentWorkOrder();
    };
  }, [workOrderId, loadWorkOrderWithHistory, loadWorkOrderWithResolution, clearCurrentWorkOrder]);

  const handleStatusUpdateSuccess = () => {
    // Reload the work order to get updated data
    loadWorkOrderWithHistory(workOrderId);
    loadWorkOrderWithResolution(workOrderId);
  };

  const handleCompleteWorkOrder = async (resolutionData: CreateResolutionRequest) => {
    try {
      await completeWorkOrder(workOrderId, resolutionData);
      setShowCompletionForm(false);
      // Reload to get updated data
      loadWorkOrderWithHistory(workOrderId);
      loadWorkOrderWithResolution(workOrderId);
    } catch (error) {
      // Error is handled by the store
      console.error('Failed to complete work order:', error);
    }
  };

  const canCompleteWorkOrder = (workOrder: any) => {
    return workOrder?.status === WorkOrderStatus.IN_PROGRESS || 
           workOrder?.status === WorkOrderStatus.WAITING_PARTS || 
           workOrder?.status === WorkOrderStatus.WAITING_EXTERNAL;
  };

  if (loading && !currentWorkOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载工单详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !currentWorkOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">{error || '工单不存在'}</p>
            <div className="space-x-2">
              <Button onClick={() => { clearError(); loadWorkOrderWithHistory(workOrderId); }}>
                重试
              </Button>
              <Link href="/dashboard/my-tasks">
                <Button variant="outline">返回任务列表</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/my-tasks">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回任务列表
          </Button>
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentWorkOrder.title}
            </h1>
            <div className="flex items-center space-x-4">
              <Badge className={cn('text-sm', StatusColors[currentWorkOrder.status])}>
                {WorkOrderStatusLabels[currentWorkOrder.status]}
              </Badge>
              <Badge className={cn('text-sm', PriorityColors[currentWorkOrder.priority])}>
                {PriorityLabels[currentWorkOrder.priority]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">工单信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">描述</h4>
                <p className="text-gray-700">{currentWorkOrder.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">类别</h4>
                  <p className="text-gray-700">{currentWorkOrder.category}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">报修原因</h4>
                  <p className="text-gray-700">{currentWorkOrder.reason}</p>
                </div>
              </div>

              {currentWorkOrder.location && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">位置</h4>
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-4 h-4 mr-2" />
                    {currentWorkOrder.location}
                  </div>
                </div>
              )}

              {currentWorkOrder.solution && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">解决方案</h4>
                  <p className="text-gray-700">{currentWorkOrder.solution}</p>
                </div>
              )}

              {currentWorkOrder.faultCode && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">故障代码</h4>
                  <p className="text-gray-700">{currentWorkOrder.faultCode}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">设备信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <Wrench className="w-8 h-8 text-gray-400 mt-1" />
                <div>
                  {currentWorkOrder.asset ? (
                    <>
                      <h4 className="font-medium text-gray-900">{currentWorkOrder.asset.name}</h4>
                      <p className="text-gray-600">设备编号: {currentWorkOrder.asset.assetCode}</p>
                      <p className="text-gray-600">位置: {currentWorkOrder.asset.location}</p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium text-gray-900">设备信息不可用</h4>
                      <p className="text-gray-600">设备ID: {currentWorkOrder.assetId}</p>
                      <p className="text-gray-600 text-sm text-orange-600">正在加载设备信息...</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">时间线</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <span className="font-medium">报修时间: </span>
                  <span className="text-gray-700">
                    {safeFormatDate(currentWorkOrder.reportedAt, 'yyyy年MM月dd日 HH:mm')}
                  </span>
                </div>
              </div>

              {currentWorkOrder.startedAt && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <span className="font-medium">开始时间: </span>
                    <span className="text-gray-700">
                      {safeFormatDate(currentWorkOrder.startedAt, 'yyyy年MM月dd日 HH:mm')}
                    </span>
                  </div>
                </div>
              )}

              {currentWorkOrder.completedAt && (
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <span className="font-medium">完成时间: </span>
                    <span className="text-gray-700">
                      {safeFormatDate(currentWorkOrder.completedAt, 'yyyy年MM月dd日 HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <StatusHistory statusHistory={statusHistory} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Work Order Completion */}
          {canCompleteWorkOrder(currentWorkOrder) && !showCompletionForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  完成工单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  工单已完成维修，请记录解决方案并上传完成照片。
                </p>
                <Button
                  onClick={() => setShowCompletionForm(true)}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  完成工单
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resolution Record Form */}
          {showCompletionForm && (
            <ResolutionRecordForm
              workOrderId={currentWorkOrder.id}
              onSubmit={handleCompleteWorkOrder}
              onCancel={() => setShowCompletionForm(false)}
              loading={loading}
            />
          )}

          {/* Resolution Record Display */}
          {currentWorkOrderWithResolution?.resolutionRecord && (
            <ResolutionRecordDisplay 
              resolutionRecord={currentWorkOrderWithResolution.resolutionRecord} 
            />
          )}

          {/* Status Update Form - only show if not completed */}
          {currentWorkOrder.status !== WorkOrderStatus.COMPLETED && !showCompletionForm && (
            <StatusUpdateForm
              workOrderId={currentWorkOrder.id}
              currentStatus={currentWorkOrder.status}
              onSuccess={handleStatusUpdateSuccess}
            />
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">联系信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">报修人</h4>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {currentWorkOrder.createdBy ? 
                      `${currentWorkOrder.createdBy.firstName || '未知'} ${currentWorkOrder.createdBy.lastName || ''}`.trim() 
                      : '报修人信息不可用'
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  {currentWorkOrder.createdBy?.email || '邮箱信息不可用'}
                </p>
              </div>

              {currentWorkOrder.assignedTo && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">分配技术员</h4>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      {`${currentWorkOrder.assignedTo.firstName || '未知'} ${currentWorkOrder.assignedTo.lastName || ''}`.trim()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">{currentWorkOrder.assignedTo.email || '邮箱信息不可用'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {currentWorkOrder.attachments && currentWorkOrder.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">附件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(currentWorkOrder.attachments || []).map((attachment, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <a
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        附件 {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}