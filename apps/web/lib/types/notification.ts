export interface Notification {
  id: string;
  userId: string;
  type: 'WORK_ORDER_ASSIGNED' | 'WORK_ORDER_UPDATED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  isRead: boolean;
  workOrderId?: string;
  workOrder?: {
    id: string;
    title: string;
    status: string;
  };
  createdAt: string;
}

export interface NotificationFilter {
  type?: 'WORK_ORDER_ASSIGNED' | 'WORK_ORDER_UPDATED' | 'SYSTEM_ALERT';
  isRead?: boolean;
  workOrderId?: string;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<'WORK_ORDER_ASSIGNED' | 'WORK_ORDER_UPDATED' | 'SYSTEM_ALERT', number>;
}

export const NOTIFICATION_TYPE_LABELS = {
  WORK_ORDER_ASSIGNED: '工单分配',
  WORK_ORDER_UPDATED: '工单更新',
  SYSTEM_ALERT: '系统通知'
} as const;