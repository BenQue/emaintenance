import { NotificationType } from '@emaintenance/database';

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  workOrderId?: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  workOrderId?: string;
  workOrder?: {
    id: string;
    title: string;
    status: string;
  };
  createdAt: Date;
}

export interface NotificationFilter {
  userId?: string;
  type?: NotificationType;
  isRead?: boolean;
  workOrderId?: string;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}