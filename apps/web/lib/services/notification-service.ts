import { apiClient, ApiResponse } from './api-client';
import {
  Notification,
  NotificationFilter,
  NotificationStats
} from '../types/notification';

export class NotificationService {
  // User notifications API
  async getUserNotifications(filter?: NotificationFilter): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiClient.get<Notification[]>('/api/notifications/my', filter);
    return {
      notifications: response.data,
      ...response.pagination!,
    };
  }

  async getNotificationById(id: string): Promise<Notification> {
    const response = await apiClient.get<Notification>(`/api/notifications/my/${id}`);
    return response.data;
  }

  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.put<Notification>(`/api/notifications/my/${id}/read`);
    return response.data;
  }

  async markAllAsRead(): Promise<{ count: number }> {
    const response = await apiClient.put<{ count: number }>('/api/notifications/my/mark-all-read');
    return response.data;
  }

  async getUserStats(): Promise<NotificationStats> {
    const response = await apiClient.get<NotificationStats>('/api/notifications/my/stats');
    return response.data;
  }

  // Supervisor notifications API
  async getAllNotifications(filter?: NotificationFilter): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiClient.get<Notification[]>('/api/notifications/all', filter);
    return {
      notifications: response.data,
      ...response.pagination!,
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;