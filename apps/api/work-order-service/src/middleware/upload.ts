import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/errorHandler';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'work-orders');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
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
  // Allowed image types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // Allowed document types
  const allowedDocTypes = ['application/pdf', 'text/plain'];
  
  const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('不支持的文件类型。仅支持图片(JPEG, PNG, GIF, WebP)和文档(PDF, TXT)', 400));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single('attachment');

// Middleware for multiple file upload
export const uploadMultiple = upload.array('attachments', 5);

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