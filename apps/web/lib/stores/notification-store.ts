import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Notification, NotificationFilter, NotificationStats } from '../types/notification';
import { notificationService } from '../services/notification-service';

interface NotificationState {
  // Notifications
  notifications: Notification[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  
  // Stats
  stats: NotificationStats | null;
  statsLoading: boolean;
  
  // Pagination
  totalNotifications: number;
  currentPage: number;
  pageLimit: number;
  
  // Actions
  loadNotifications: (page?: number, filter?: NotificationFilter) => Promise<void>;
  loadStats: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      notifications: [],
      notificationsLoading: false,
      notificationsError: null,
      stats: null,
      statsLoading: false,
      totalNotifications: 0,
      currentPage: 1,
      pageLimit: 20,

      // Actions
      loadNotifications: async (page = 1, filter = {}) => {
        set({ notificationsLoading: true, notificationsError: null });
        try {
          const { notifications, total } = await notificationService.getUserNotifications({
            ...filter,
            page,
            limit: get().pageLimit,
          });
          set({
            notifications,
            totalNotifications: total,
            currentPage: page,
            notificationsLoading: false,
          });
        } catch (error) {
          set({
            notificationsError: error instanceof Error ? error.message : 'Failed to load notifications',
            notificationsLoading: false,
          });
        }
      },

      loadStats: async () => {
        set({ statsLoading: true });
        try {
          const stats = await notificationService.getUserStats();
          set({ stats, statsLoading: false });
        } catch (error) {
          console.error('Failed to load notification stats:', error);
          set({ statsLoading: false });
        }
      },

      markAsRead: async (id: string) => {
        try {
          await notificationService.markAsRead(id);
          set((state) => ({
            notifications: state.notifications.map((notification) =>
              notification.id === id ? { ...notification, isRead: true } : notification
            ),
            stats: state.stats ? {
              ...state.stats,
              unread: Math.max(0, state.stats.unread - 1)
            } : null,
          }));
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      },

      markAllAsRead: async () => {
        try {
          await notificationService.markAllAsRead();
          set((state) => ({
            notifications: state.notifications.map((notification) => ({
              ...notification,
              isRead: true
            })),
            stats: state.stats ? {
              ...state.stats,
              unread: 0
            } : null,
          }));
        } catch (error) {
          console.error('Failed to mark all notifications as read:', error);
        }
      },

      setCurrentPage: (page: number) => {
        set({ currentPage: page });
      },

      clearError: () => {
        set({ notificationsError: null });
      },
    }),
    {
      name: 'notification-store',
    }
  )
);