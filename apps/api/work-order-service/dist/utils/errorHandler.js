"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.globalErrorHandler = exports.handlePrismaError = exports.handleValidationError = exports.AppError = void 0;
const zod_1 = require("zod");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const handleValidationError = (error) => {
    if (!error.errors || !Array.isArray(error.errors)) {
        return new AppError('输入验证失败', 400);
    }
    const errors = error.errors.map(err => ({
        field: err.path?.join?.('.') || 'unknown',
        message: err.message || 'Validation error',
    }));
    return new AppError(`输入验证失败: ${errors.map(e => e.message).join(', ')}`, 400);
};
exports.handleValidationError = handleValidationError;
const handlePrismaError = (error) => {
    if (error.code === 'P2002') {
        return new AppError('数据已存在，违反唯一性约束', 409);
    }
    if (error.code === 'P2025') {
        return new AppError('请求的记录未找到', 404);
    }
    if (error.code === 'P2003') {
        return new AppError('外键约束失败，相关记录不存在', 400);
    }
    return new AppError('数据库操作失败', 500);
};
exports.handlePrismaError = handlePrismaError;
const globalErrorHandler = (error, req, res, next) => {
    let err = error;
    // Handle Zod validation errors
    if (error instanceof zod_1.ZodError) {
        err = (0, exports.handleValidationError)(error);
    }
    // Handle Prisma errors
    if (error.message.includes('P2002') || error.message.includes('P2025') || error.message.includes('P2003')) {
        err = (0, exports.handlePrismaError)(error);
    }
    // Handle operational errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }
    // Handle programming errors
    console.error('ERROR:', error);
    return res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production'
            ? '服务器内部错误'
            : error.message,
    });
};
exports.globalErrorHandler = globalErrorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
