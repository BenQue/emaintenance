import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@emaintenance/database';
import { createTestApp } from './test-utils';
import { WorkOrderController } from '../controllers/WorkOrderController';
import { PhotoStorageService } from '../services/PhotoStorageService';

// Mock PhotoStorageService
jest.mock('../services/PhotoStorageService');

const MockedPhotoStorageService = PhotoStorageService as jest.MockedClass<typeof PhotoStorageService>;

describe('WorkOrderController - Photo Endpoints', () => {
  let app: Express;
  let prisma: PrismaClient;
  let mockPhotoStorageService: jest.Mocked<PhotoStorageService>;

  beforeEach(() => {
    // Create test app with mocked dependencies
    ({ app, prisma } = createTestApp());
    
    // Mock PhotoStorageService instance
    mockPhotoStorageService = {
      savePhoto: jest.fn(),
      getPhotoPath: jest.fn(),
      getThumbnailPath: jest.fn(),
      deletePhoto: jest.fn(),
      ensureDirectoryExists: jest.fn(),
    } as any;
    
    MockedPhotoStorageService.mockImplementation(() => mockPhotoStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'TECHNICIAN',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockWorkOrder = {
    id: 'wo-1',
    title: 'Test Work Order',
    createdById: 'user-1',
    assignedToId: 'user-2',
  };

  const mockPhotoRecord = {
    filename: 'WO123-1234567890-test.jpg',
    originalName: 'test-image.jpg',
    filePath: '2025/01/WO123-1234567890-test.jpg',
    thumbnailPath: '2025/01/thumbnails/thumb_WO123-1234567890-test.jpg',
    fileSize: 102400,
    mimeType: 'image/jpeg',
    uploadedAt: new Date(),
  };

  describe('POST /api/work-orders/:id/work-order-photos', () => {
    beforeEach(() => {
      // Mock work order service methods
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(mockWorkOrder);
      prisma.workOrderPhoto.createMany = jest.fn().mockResolvedValue({ count: 1 });
      
      mockPhotoStorageService.savePhoto.mockResolvedValue(mockPhotoRecord);
    });

    it('should upload photos successfully', async () => {
      const response = await request(app)
        .post('/api/work-orders/wo-1/work-order-photos')
        .set('Authorization', `Bearer valid-jwt-token`)
        .attach('photos', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('工单照片上传成功');
      expect(response.body.data.uploadedPhotos).toHaveLength(1);
      expect(mockPhotoStorageService.savePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test.jpg',
        }),
        'wo-1'
      );
    });

    it('should reject upload without files', async () => {
      const response = await request(app)
        .post('/api/work-orders/wo-1/work-order-photos')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(400);

      expect(response.body.message).toBe('请选择要上传的图片文件');
    });

    it('should reject unauthorized access', async () => {
      await request(app)
        .post('/api/work-orders/wo-1/work-order-photos')
        .attach('photos', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(401);
    });

    it('should reject access to non-existent work order', async () => {
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/work-orders/nonexistent/work-order-photos')
        .set('Authorization', `Bearer valid-jwt-token`)
        .attach('photos', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(404);

      expect(response.body.message).toBe('工单不存在');
    });

    it('should enforce access permissions', async () => {
      const unauthorizedWorkOrder = {
        ...mockWorkOrder,
        createdById: 'other-user',
        assignedToId: 'another-user',
      };
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(unauthorizedWorkOrder);

      const response = await request(app)
        .post('/api/work-orders/wo-1/work-order-photos')
        .set('Authorization', `Bearer valid-jwt-token`)
        .attach('photos', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(403);

      expect(response.body.message).toBe('权限不足：无法访问此工单');
    });

    it('should allow SUPERVISOR access to any work order', async () => {
      const supervisorUser = { ...mockUser, role: 'SUPERVISOR' };
      const unauthorizedWorkOrder = {
        ...mockWorkOrder,
        createdById: 'other-user',
        assignedToId: 'another-user',
      };
      
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(unauthorizedWorkOrder);

      const response = await request(app)
        .post('/api/work-orders/wo-1/work-order-photos')
        .set('Authorization', `Bearer supervisor-jwt-token`)
        .attach('photos', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200);

      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /api/work-orders/:id/work-order-photos', () => {
    const mockPhotos = [
      {
        id: 'photo-1',
        filename: 'test1.jpg',
        originalName: 'original1.jpg',
        filePath: '2025/01/test1.jpg',
        thumbnailPath: '2025/01/thumbnails/thumb_test1.jpg',
        fileSize: 102400,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
      },
      {
        id: 'photo-2',
        filename: 'test2.jpg',
        originalName: 'original2.jpg',
        filePath: '2025/01/test2.jpg',
        thumbnailPath: null,
        fileSize: 204800,
        mimeType: 'image/png',
        uploadedAt: new Date(),
      },
    ];

    beforeEach(() => {
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(mockWorkOrder);
      prisma.workOrderPhoto.findMany = jest.fn().mockResolvedValue(mockPhotos);
    });

    it('should return photos list successfully', async () => {
      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.photos).toHaveLength(2);
      expect(response.body.data.photos[0]).toEqual(expect.objectContaining({
        id: 'photo-1',
        filename: 'test1.jpg',
        originalName: 'original1.jpg',
      }));
    });

    it('should enforce access permissions', async () => {
      const unauthorizedWorkOrder = {
        ...mockWorkOrder,
        createdById: 'other-user',
        assignedToId: 'another-user',
      };
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(unauthorizedWorkOrder);

      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(403);

      expect(response.body.message).toBe('权限不足：无法访问此工单');
    });
  });

  describe('GET /api/work-orders/:id/work-order-photos/:photoId', () => {
    const mockPhoto = {
      id: 'photo-1',
      filePath: '2025/01/test.jpg',
      originalName: 'test-image.jpg',
      mimeType: 'image/jpeg',
    };

    beforeEach(() => {
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(mockWorkOrder);
      prisma.workOrderPhoto.findUnique = jest.fn().mockResolvedValue(mockPhoto);
      mockPhotoStorageService.getPhotoPath.mockResolvedValue('/full/path/to/test.jpg');
    });

    it('should serve photo file successfully', async () => {
      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos/photo-1')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(200);

      expect(mockPhotoStorageService.getPhotoPath).toHaveBeenCalledWith('2025/01/test.jpg');
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.headers['cache-control']).toBe('public, max-age=86400');
    });

    it('should return 404 for non-existent photo', async () => {
      prisma.workOrderPhoto.findUnique = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos/nonexistent')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(404);

      expect(response.body.message).toBe('照片不存在');
    });

    it('should enforce access permissions', async () => {
      const unauthorizedWorkOrder = {
        ...mockWorkOrder,
        createdById: 'other-user',
        assignedToId: 'another-user',
      };
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(unauthorizedWorkOrder);

      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos/photo-1')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(403);

      expect(response.body.message).toBe('权限不足：无法访问此工单');
    });
  });

  describe('GET /api/work-orders/:id/work-order-photos/:photoId/thumbnail', () => {
    const mockPhoto = {
      id: 'photo-1',
      thumbnailPath: '2025/01/thumbnails/thumb_test.jpg',
      originalName: 'test-image.jpg',
    };

    beforeEach(() => {
      prisma.workOrder.findUnique = jest.fn().mockResolvedValue(mockWorkOrder);
      prisma.workOrderPhoto.findUnique = jest.fn().mockResolvedValue(mockPhoto);
      mockPhotoStorageService.getThumbnailPath.mockResolvedValue('/full/path/to/thumb_test.jpg');
    });

    it('should serve thumbnail successfully', async () => {
      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos/photo-1/thumbnail')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(200);

      expect(mockPhotoStorageService.getThumbnailPath).toHaveBeenCalledWith('2025/01/thumbnails/thumb_test.jpg');
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.headers['cache-control']).toBe('public, max-age=86400');
    });

    it('should return 404 for photo without thumbnail', async () => {
      const photoWithoutThumbnail = {
        ...mockPhoto,
        thumbnailPath: null,
      };
      prisma.workOrderPhoto.findUnique = jest.fn().mockResolvedValue(photoWithoutThumbnail);

      const response = await request(app)
        .get('/api/work-orders/wo-1/work-order-photos/photo-1/thumbnail')
        .set('Authorization', `Bearer valid-jwt-token`)
        .expect(404);

      expect(response.body.message).toBe('缩略图不存在');
    });
  });
});