import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PhotoStorageService } from '../PhotoStorageService';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('sharp');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedSharp = sharp as jest.MockedFunction<typeof sharp>;

describe('PhotoStorageService', () => {
  let photoStorageService: PhotoStorageService;
  const mockWorkOrderId = 'WO123';

  beforeEach(() => {
    photoStorageService = new PhotoStorageService();
    jest.clearAllMocks();
  });

  describe('savePhoto', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'photos',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 102400, // 100KB
      buffer: Buffer.from('mock image data'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    beforeEach(() => {
      // Mock fs.mkdir to resolve successfully
      mockedFs.mkdir.mockResolvedValue(undefined);
      // Mock fs.writeFile to resolve successfully
      mockedFs.writeFile.mockResolvedValue(undefined);
      
      // Mock sharp chain
      const mockSharp = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };
      mockedSharp.mockReturnValue(mockSharp as any);
    });

    it('should save photo with year/month directory structure', async () => {
      const result = await photoStorageService.savePhoto(mockFile, mockWorkOrderId);

      // Verify directory creation
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/work-orders\/\d{4}\/\d{2}$/),
        { recursive: true }
      );
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/work-orders\/\d{4}\/\d{2}\/thumbnails$/),
        { recursive: true }
      );

      // Verify file saving
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        mockFile.buffer
      );

      // Verify result structure
      expect(result).toEqual({
        filename: expect.stringMatching(new RegExp(`^${mockWorkOrderId}-\\d+-\\d+\\.jpg$`)),
        originalName: 'test-image.jpg',
        filePath: expect.stringMatching(/^\d{4}\/\d{2}\/WO123-\d+-\d+\.jpg$/),
        thumbnailPath: expect.stringMatching(/^\d{4}\/\d{2}\/thumbnails\/thumb_WO123-\d+-\d+\.jpg$/),
        fileSize: 102400,
        mimeType: 'image/jpeg',
        uploadedAt: expect.any(Date),
      });
    });

    it('should generate thumbnail for image files', async () => {
      await photoStorageService.savePhoto(mockFile, mockWorkOrderId);

      expect(mockedSharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockedSharp().resize).toHaveBeenCalledWith(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockedSharp().jpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
        mozjpeg: true,
      });
      expect(mockedSharp().toFile).toHaveBeenCalled();
    });

    it('should not generate thumbnail for non-image files', async () => {
      const pdfFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      const result = await photoStorageService.savePhoto(pdfFile, mockWorkOrderId);

      expect(mockedSharp).not.toHaveBeenCalled();
      expect(result.thumbnailPath).toBeUndefined();
    });

    it('should handle thumbnail generation failure gracefully', async () => {
      mockedSharp().toFile.mockRejectedValue(new Error('Sharp error'));

      // Should not throw error
      const result = await photoStorageService.savePhoto(mockFile, mockWorkOrderId);
      
      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
    });

    it('should throw error when file saving fails', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('File system error'));

      await expect(photoStorageService.savePhoto(mockFile, mockWorkOrderId))
        .rejects.toThrow('照片保存失败');
    });
  });

  describe('getPhotoPath', () => {
    it('should return absolute path for existing file', async () => {
      const relativePath = '2025/01/test.jpg';
      mockedFs.access.mockResolvedValue(undefined);

      const result = await photoStorageService.getPhotoPath(relativePath);

      expect(result).toMatch(/uploads\/work-orders\/2025\/01\/test\.jpg$/);
      expect(mockedFs.access).toHaveBeenCalledWith(expect.stringContaining(relativePath));
    });

    it('should throw error for non-existent file', async () => {
      const relativePath = '2025/01/nonexistent.jpg';
      mockedFs.access.mockRejectedValue(new Error('File not found'));

      await expect(photoStorageService.getPhotoPath(relativePath))
        .rejects.toThrow('照片文件未找到');
    });
  });

  describe('getThumbnailPath', () => {
    it('should return absolute path for existing thumbnail', async () => {
      const relativePath = '2025/01/thumbnails/thumb_test.jpg';
      mockedFs.access.mockResolvedValue(undefined);

      const result = await photoStorageService.getThumbnailPath(relativePath);

      expect(result).toMatch(/uploads\/work-orders\/2025\/01\/thumbnails\/thumb_test\.jpg$/);
    });

    it('should throw error for non-existent thumbnail', async () => {
      const relativePath = '2025/01/thumbnails/thumb_nonexistent.jpg';
      mockedFs.access.mockRejectedValue(new Error('File not found'));

      await expect(photoStorageService.getThumbnailPath(relativePath))
        .rejects.toThrow('缩略图文件未找到');
    });
  });

  describe('deletePhoto', () => {
    it('should delete both original and thumbnail files', async () => {
      const relativePath = '2025/01/test.jpg';
      const thumbnailRelativePath = '2025/01/thumbnails/thumb_test.jpg';
      mockedFs.unlink.mockResolvedValue(undefined);

      const result = await photoStorageService.deletePhoto(relativePath, thumbnailRelativePath);

      expect(result).toBe(true);
      expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockedFs.unlink).toHaveBeenCalledWith(expect.stringContaining(relativePath));
      expect(mockedFs.unlink).toHaveBeenCalledWith(expect.stringContaining(thumbnailRelativePath));
    });

    it('should handle errors gracefully and return true', async () => {
      const relativePath = '2025/01/test.jpg';
      mockedFs.unlink.mockRejectedValue(new Error('Delete failed'));

      const result = await photoStorageService.deletePhoto(relativePath);

      expect(result).toBe(true);
    });

    it('should only delete original file when no thumbnail path provided', async () => {
      const relativePath = '2025/01/test.jpg';
      mockedFs.unlink.mockResolvedValue(undefined);

      const result = await photoStorageService.deletePhoto(relativePath);

      expect(result).toBe(true);
      expect(mockedFs.unlink).toHaveBeenCalledTimes(1);
      expect(mockedFs.unlink).toHaveBeenCalledWith(expect.stringContaining(relativePath));
    });
  });

  describe('isImageFile', () => {
    it('should identify image MIME types correctly', () => {
      // Access private method via any type assertion
      const service = photoStorageService as any;
      
      expect(service.isImageFile('image/jpeg')).toBe(true);
      expect(service.isImageFile('image/png')).toBe(true);
      expect(service.isImageFile('image/gif')).toBe(true);
      expect(service.isImageFile('image/webp')).toBe(true);
      expect(service.isImageFile('application/pdf')).toBe(false);
      expect(service.isImageFile('text/plain')).toBe(false);
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create base directory if it does not exist', async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);

      await photoStorageService.ensureDirectoryExists();

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/work-orders$/),
        { recursive: true }
      );
    });
  });
});