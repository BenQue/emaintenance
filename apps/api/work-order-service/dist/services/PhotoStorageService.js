"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoStorageService = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const errorHandler_1 = require("../utils/errorHandler");
class PhotoStorageService {
    constructor() {
        this.baseUploadDir = path_1.default.join(process.cwd(), 'uploads', 'work-orders');
    }
    /**
     * Save photo with year/month directory structure and generate thumbnail
     */
    async savePhoto(file, workOrderId) {
        try {
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            // Create year/month directory structure
            const yearMonthDir = path_1.default.join(this.baseUploadDir, year, month);
            const thumbnailDir = path_1.default.join(yearMonthDir, 'thumbnails');
            await promises_1.default.mkdir(yearMonthDir, { recursive: true });
            await promises_1.default.mkdir(thumbnailDir, { recursive: true });
            // Generate unique filename with workOrderId prefix
            const timestamp = Date.now();
            const randomId = Math.round(Math.random() * 1E9);
            const ext = path_1.default.extname(file.originalname);
            const filename = `${workOrderId}-${timestamp}-${randomId}${ext}`;
            const thumbnailFilename = `thumb_${filename}`;
            // File paths
            const fullPath = path_1.default.join(yearMonthDir, filename);
            const thumbnailFullPath = path_1.default.join(thumbnailDir, thumbnailFilename);
            const relativePath = path_1.default.join(year, month, filename);
            const thumbnailRelativePath = path_1.default.join(year, month, 'thumbnails', thumbnailFilename);
            // Save original image
            await promises_1.default.writeFile(fullPath, file.buffer);
            // Generate thumbnail for image files
            let thumbnailPath;
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
        }
        catch (error) {
            console.error('Error saving photo:', error);
            throw new errorHandler_1.AppError('照片保存失败', 500);
        }
    }
    /**
     * Get absolute path for a photo file with security validation
     */
    async getPhotoPath(relativePath) {
        // Security: Prevent path traversal attacks
        if (relativePath.includes('..') || path_1.default.isAbsolute(relativePath)) {
            throw new errorHandler_1.AppError('非法的文件路径', 400);
        }
        const fullPath = path_1.default.join(this.baseUploadDir, relativePath);
        // Security: Ensure resolved path is within upload directory
        const resolvedPath = path_1.default.resolve(fullPath);
        const resolvedUploadDir = path_1.default.resolve(this.baseUploadDir);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            throw new errorHandler_1.AppError('非法的文件路径', 400);
        }
        try {
            await promises_1.default.access(fullPath);
            return fullPath;
        }
        catch (error) {
            throw new errorHandler_1.AppError('照片文件未找到', 404);
        }
    }
    /**
     * Get absolute path for a thumbnail file with security validation
     */
    async getThumbnailPath(relativePath) {
        // Security: Prevent path traversal attacks
        if (relativePath.includes('..') || path_1.default.isAbsolute(relativePath)) {
            throw new errorHandler_1.AppError('非法的文件路径', 400);
        }
        const fullPath = path_1.default.join(this.baseUploadDir, relativePath);
        // Security: Ensure resolved path is within upload directory
        const resolvedPath = path_1.default.resolve(fullPath);
        const resolvedUploadDir = path_1.default.resolve(this.baseUploadDir);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            throw new errorHandler_1.AppError('非法的文件路径', 400);
        }
        try {
            await promises_1.default.access(fullPath);
            return fullPath;
        }
        catch (error) {
            throw new errorHandler_1.AppError('缩略图文件未找到', 404);
        }
    }
    /**
     * Delete photo and thumbnail files
     */
    async deletePhoto(relativePath, thumbnailRelativePath) {
        try {
            const fullPath = path_1.default.join(this.baseUploadDir, relativePath);
            // Delete original file
            try {
                await promises_1.default.unlink(fullPath);
            }
            catch (error) {
                console.error('Error deleting original file:', error);
            }
            // Delete thumbnail if exists
            if (thumbnailRelativePath) {
                try {
                    const thumbnailFullPath = path_1.default.join(this.baseUploadDir, thumbnailRelativePath);
                    await promises_1.default.unlink(thumbnailFullPath);
                }
                catch (error) {
                    console.error('Error deleting thumbnail:', error);
                }
            }
            return true;
        }
        catch (error) {
            console.error('Error in deletePhoto:', error);
            return false;
        }
    }
    /**
     * Generate thumbnail using Sharp with optimized settings
     */
    async generateThumbnail(imageBuffer, outputPath) {
        try {
            await (0, sharp_1.default)(imageBuffer)
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
        }
        catch (error) {
            console.error('Error generating thumbnail:', error);
            // Don't throw error for thumbnail generation failure
            // Original file save should still succeed
        }
    }
    /**
     * Check if file is an image
     */
    isImageFile(mimeType) {
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return imageTypes.includes(mimeType);
    }
    /**
     * Ensure base directory exists
     */
    async ensureDirectoryExists() {
        await promises_1.default.mkdir(this.baseUploadDir, { recursive: true });
    }
}
exports.PhotoStorageService = PhotoStorageService;
