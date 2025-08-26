import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { AppError } from '../utils/errorHandler';

export interface PhotoRecord {
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export class PhotoStorageService {
  private baseUploadDir = path.join(process.cwd(), 'uploads', 'work-orders');

  /**
   * Save photo with year/month directory structure and generate thumbnail
   */
  async savePhoto(file: Express.Multer.File, workOrderId: string): Promise<PhotoRecord> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      // Create year/month directory structure
      const yearMonthDir = path.join(this.baseUploadDir, year, month);
      const thumbnailDir = path.join(yearMonthDir, 'thumbnails');
      
      try {
        await fs.mkdir(yearMonthDir, { recursive: true });
        await fs.mkdir(thumbnailDir, { recursive: true });
      } catch (error) {
        // Directory might already exist or permission denied, continue if directory exists
        if (!await fs.access(yearMonthDir).then(() => true).catch(() => false)) {
          throw new Error(`Cannot create upload directory: ${error}`);
        }
      }
      
      // Generate unique filename with workOrderId prefix
      const timestamp = Date.now();
      const randomId = Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = `${workOrderId}-${timestamp}-${randomId}${ext}`;
      const thumbnailFilename = `thumb_${filename}`;
      
      // File paths
      const fullPath = path.join(yearMonthDir, filename);
      const thumbnailFullPath = path.join(thumbnailDir, thumbnailFilename);
      const relativePath = path.join(year, month, filename);
      const thumbnailRelativePath = path.join(year, month, 'thumbnails', thumbnailFilename);
      
      // Save original image
      await fs.writeFile(fullPath, file.buffer);
      
      // Generate thumbnail for image files
      let thumbnailPath: string | undefined;
      if (this.isImageFile(file.mimetype)) {
        await this.generateThumbnail(file.buffer, thumbnailFullPath);
        thumbnailPath = thumbnailRelativePath;
      }
      
      return {
        filename,
        originalName: file.originalname,
        filePath: relativePath,
        thumbnailPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: now,
      };
    } catch (error) {
      console.error('Error saving photo:', error);
      throw new AppError('照片保存失败', 500);
    }
  }

  /**
   * Get absolute path for a photo file with security validation
   */
  async getPhotoPath(relativePath: string): Promise<string> {
    // Security: Prevent path traversal attacks
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw new AppError('非法的文件路径', 400);
    }
    
    const fullPath = path.join(this.baseUploadDir, relativePath);
    
    // Security: Ensure resolved path is within upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(this.baseUploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new AppError('非法的文件路径', 400);
    }
    
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch (error) {
      throw new AppError('照片文件未找到', 404);
    }
  }

  /**
   * Get absolute path for a thumbnail file with security validation
   */
  async getThumbnailPath(relativePath: string): Promise<string> {
    // Security: Prevent path traversal attacks
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw new AppError('非法的文件路径', 400);
    }
    
    const fullPath = path.join(this.baseUploadDir, relativePath);
    
    // Security: Ensure resolved path is within upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(this.baseUploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new AppError('非法的文件路径', 400);
    }
    
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch (error) {
      throw new AppError('缩略图文件未找到', 404);
    }
  }

  /**
   * Delete photo and thumbnail files
   */
  async deletePhoto(relativePath: string, thumbnailRelativePath?: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseUploadDir, relativePath);
      
      // Delete original file
      try {
        await fs.unlink(fullPath);
      } catch (error) {
        console.error('Error deleting original file:', error);
      }
      
      // Delete thumbnail if exists
      if (thumbnailRelativePath) {
        try {
          const thumbnailFullPath = path.join(this.baseUploadDir, thumbnailRelativePath);
          await fs.unlink(thumbnailFullPath);
        } catch (error) {
          console.error('Error deleting thumbnail:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in deletePhoto:', error);
      return false;
    }
  }

  /**
   * Generate thumbnail using Sharp with optimized settings
   */
  private async generateThumbnail(imageBuffer: Buffer, outputPath: string): Promise<void> {
    try {
      await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          progressive: true,
          mozjpeg: true, // Better compression
        })
        .toFile(outputPath);
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      // Don't throw error for thumbnail generation failure
      // Original file save should still succeed
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(mimeType);
  }

  /**
   * Ensure base directory exists
   */
  async ensureDirectoryExists(): Promise<void> {
    await fs.mkdir(this.baseUploadDir, { recursive: true });
  }
}