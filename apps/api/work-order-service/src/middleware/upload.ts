import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/errorHandler';

// Upload directory (assumed to exist via Docker volume mount)
const uploadDir = path.join(process.cwd(), 'uploads', 'work-orders');
console.log('Using upload directory:', uploadDir);
// Note: Directory creation handled by Docker container setup

// Configure multer storage - use memory storage for photo processing
const storage = multer.memoryStorage();

// Legacy disk storage for backward compatibility
const diskStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  },
});

// File filter for images and documents
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Log file details for debugging
  console.log('FileFilter - 收到文件:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
    encoding: file.encoding,
  });
  
  // Allowed image types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // Allowed document types
  const allowedDocTypes = ['application/pdf', 'text/plain'];
  
  const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('FileFilter - 文件类型验证通过:', file.mimetype);
    cb(null, true);
  } else {
    console.log('FileFilter - 文件类型验证失败:', file.mimetype, '允许的类型:', allowedTypes);
    cb(new AppError('不支持的文件类型。仅支持图片(JPEG, PNG, GIF, WebP)和文档(PDF, TXT)', 400));
  }
};

// Configure multer for photo uploads (memory storage)
const photoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

// Configure multer for legacy uploads (disk storage)
const legacyUpload = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

// Middleware for single file upload (legacy)
export const uploadSingle = legacyUpload.single('attachment');

// Middleware for multiple file upload (legacy)
export const uploadMultiple = legacyUpload.array('attachments', 5);

// Middleware for photo uploads
export const uploadPhotos = photoUpload.array('photos', 5);

// Helper function to get file URL
export const getFileUrl = (filename: string): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  return `${baseUrl}/uploads/work-orders/${filename}`;
};

// Helper function to delete file
export const deleteFile = (filename: string): boolean => {
  try {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Extract filename from URL
export const getFilenameFromUrl = (url: string): string => {
  return path.basename(url);
};