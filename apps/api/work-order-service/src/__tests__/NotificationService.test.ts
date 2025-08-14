import { PrismaClient, NotificationType } from '@emaintenance/database';
import { NotificationService } from '../services/NotificationService';
import { CreateNotificationRequest } from '../types/notification';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
} as any as PrismaClient;

describe('NotificationService', () => {
  let service: NotificationService;
  const userId = 'user-id';
  const supervisorId = 'supervisor-id';
  const workOrderId = 'work-order-id';

  beforeEach(() => {
    service = new NotificationService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const notificationData: CreateNotificationRequest = {
      userId,
      type: NotificationType.WORK_ORDER_ASSIGNED,
      title: 'Test Notification',
      message: 'Test message',
      workOrderId,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ isActive: true });
    });

    it('should create notification successfully', async () => {
      const mockCreatedNotification = {
        id: 'notification-id',
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
        workOrder: {
          id: workOrderId,
          title: 'Test Work Order',
          status: 'PENDING',
        },
      };

      mockPrisma.notification.create.mockResolvedValue(mockCreatedNotification);

      const result = await service.createNotification(notificationData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { isActive: true },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: notificationData,
        include: {
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });
      expect(result).toEqual({
        id: 'notification-id',
        userId,
        type: NotificationType.WORK_ORDER_ASSIGNED,
        title: 'Test Notification',
        message: 'Test message',
        isRead: false,
        workOrderId,
        workOrder: {
          id: workOrderId,
          title: 'Test Work Order',
          status: 'PENDING',
        },
        createdAt: expect.any(Date),
      });
    });

    it('should throw error if target user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.createNotification(notificationData)).rejects.toThrow(
        'Target user not found or inactive'
      );
    });

    it('should throw error if target user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isActive: false });

      await expect(service.createNotification(notificationData)).rejects.toThrow(
        'Target user not found or inactive'
      );
    });
  });

  describe('createWorkOrderAssignmentNotification', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ isActive: true });
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-id',
        userId,
        type: NotificationType.WORK_ORDER_ASSIGNED,
        title: '新工单分配',
        message: '您已被分配新的工单: Test Work Order',
        isRead: false,
        workOrderId,
        createdAt: new Date(),
        workOrder: {
          id: workOrderId,
          title: 'Test Work Order',
          status: 'PENDING',
        },
      });
    });

    it('should create work order assignment notification', async () => {
      const result = await service.createWorkOrderAssignmentNotification(
        workOrderId,
        userId,
        'Test Work Order'
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: NotificationType.WORK_ORDER_ASSIGNED,
          title: '新工单分配',
          message: '您已被分配新的工单: Test Work Order',
          workOrderId,
        },
        include: expect.any(Object),
      });
      expect(result.type).toBe(NotificationType.WORK_ORDER_ASSIGNED);
      expect(result.message).toContain('Test Work Order');
    });
  });

  describe('createWorkOrderUpdateNotification', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ isActive: true });
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-id',
        userId,
        type: NotificationType.WORK_ORDER_UPDATED,
        title: '工单状态更新',
        message: '工单 "Test Work Order" 已更新状态',
        isRead: false,
        workOrderId,
        createdAt: new Date(),
        workOrder: {
          id: workOrderId,
          title: 'Test Work Order',
          status: 'IN_PROGRESS',
        },
      });
    });

    it('should create work order update notification', async () => {
      const result = await service.createWorkOrderUpdateNotification(
        workOrderId,
        userId,
        'Test Work Order',
        '已更新状态'
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: NotificationType.WORK_ORDER_UPDATED,
          title: '工单状态更新',
          message: '工单 "Test Work Order" 已更新状态',
          workOrderId,
        },
        include: expect.any(Object),
      });
      expect(result.type).toBe(NotificationType.WORK_ORDER_UPDATED);
    });
  });

  describe('getUserNotifications', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        userId,
        type: NotificationType.WORK_ORDER_ASSIGNED,
        title: 'Test 1',
        message: 'Message 1',
        isRead: false,
        workOrderId: 'wo-1',
        createdAt: new Date('2024-01-02'),
        workOrder: { id: 'wo-1', title: 'WO 1', status: 'PENDING' },
      },
      {
        id: 'notif-2',
        userId,
        type: NotificationType.WORK_ORDER_UPDATED,
        title: 'Test 2',
        message: 'Message 2',
        isRead: true,
        workOrderId: 'wo-2',
        createdAt: new Date('2024-01-01'),
        workOrder: { id: 'wo-2', title: 'WO 2', status: 'COMPLETED' },
      },
    ];

    beforeEach(() => {
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(2);
    });

    it('should get user notifications with pagination', async () => {
      const result = await service.getUserNotifications(userId, { page: 1, limit: 10 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, page: 1, limit: 10 },
        include: {
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter notifications by type', async () => {
      await service.getUserNotifications(userId, { 
        type: NotificationType.WORK_ORDER_ASSIGNED 
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { 
          userId, 
          type: NotificationType.WORK_ORDER_ASSIGNED 
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('markAsRead', () => {
    const notificationId = 'notification-id';

    it('should mark notification as read', async () => {
      const mockUpdatedNotification = {
        id: notificationId,
        userId,
        type: NotificationType.WORK_ORDER_ASSIGNED,
        title: 'Test',
        message: 'Test message',
        isRead: true,
        workOrderId,
        createdAt: new Date(),
        workOrder: {
          id: workOrderId,
          title: 'Test Work Order',
          status: 'PENDING',
        },
      };

      mockPrisma.notification.update.mockResolvedValue(mockUpdatedNotification);

      const result = await service.markAsRead(notificationId, userId);

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId, userId },
        data: { isRead: true },
        include: expect.any(Object),
      });
      expect(result?.isRead).toBe(true);
    });

    it('should return null if notification not found or user mismatch', async () => {
      mockPrisma.notification.update.mockRejectedValue(new Error('Not found'));

      const result = await service.markAsRead(notificationId, userId);

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(userId);

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      expect(result.count).toBe(5);
    });
  });

  describe('getUserStats', () => {
    beforeEach(() => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread
      
      mockPrisma.notification.groupBy.mockResolvedValue([
        { type: NotificationType.WORK_ORDER_ASSIGNED, _count: { type: 5 } },
        { type: NotificationType.WORK_ORDER_UPDATED, _count: { type: 3 } },
      ]);
    });

    it('should get user notification statistics', async () => {
      const result = await service.getUserStats(userId);

      expect(result).toEqual({
        total: 10,
        unread: 3,
        byType: {
          WORK_ORDER_ASSIGNED: 5,
          WORK_ORDER_UPDATED: 3,
          SYSTEM_ALERT: 0,
        },
      });
    });
  });

  describe('getNotificationsForSupervisor', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        role: 'SUPERVISOR', 
        isActive: true 
      });
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);
    });

    it('should allow supervisor to view all notifications', async () => {
      await service.getNotificationsForSupervisor({}, supervisorId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: supervisorId },
        select: { role: true, isActive: true },
      });
      expect(mockPrisma.notification.findMany).toHaveBeenCalled();
    });

    it('should throw error if user is not supervisor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        role: 'EMPLOYEE', 
        isActive: true 
      });

      await expect(
        service.getNotificationsForSupervisor({}, 'employee-id')
      ).rejects.toThrow('Access denied: Requires supervisor or admin role');
    });
  });
});