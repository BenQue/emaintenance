"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilenameFromUrl = exports.deleteFile = exports.getFileUrl = exports.uploadMultiple = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("../utils/errorHandler");
// Ensure upload directory exists
const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'work-orders');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        cb(null, `${uniqueSuffix}-${name}${ext}`);
    },
});
// File filter for images and documents
const fileFilter = (req, file, cb) => {
    // Allowed image types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    // Allowed document types
    const allowedDocTypes = ['application/pdf', 'text/plain'];
    const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError('不支持的文件类型。仅支持图片(JPEG, PNG, GIF, WebP)和文档(PDF, TXT)', 400));
    }
};
// Configure multer
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5, // Maximum 5 files per request
    },
});
// Middleware for single file upload
exports.uploadSingle = upload.single('attachment');
// Middleware for multiple file upload
exports.uploadMultiple = upload.array('attachments', 5);
// Helper function to get file URL
const getFileUrl = (filename) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
    return `${baseUrl}/uploads/work-orders/${filename}`;
};
exports.getFileUrl = getFileUrl;
// Helper function to delete file
const deleteFile = (filename) => {
    try {
        const filePath = path_1.default.join(uploadDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};
exports.deleteFile = deleteFile;
// Extract filename from URL
const getFilenameFromUrl = (url) => {
    return path_1.default.basename(url);
};
exports.getFilenameFromUrl = getFilenameFromUrl;
