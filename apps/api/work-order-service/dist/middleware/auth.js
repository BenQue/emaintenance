"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWorkOrderAccess = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("@emaintenance/database");
const errorHandler_1 = require("../utils/errorHandler");
const prisma = new database_1.PrismaClient();
exports.authenticate = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new errorHandler_1.AppError('请提供有效的认证token', 401);
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new errorHandler_1.AppError('认证token缺失', 401);
    }
    try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errorHandler_1.AppError('JWT密钥未配置', 500);
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('用户不存在', 401);
        }
        if (!user.isActive) {
            throw new errorHandler_1.AppError('用户账户已被禁用', 401);
        }
        // Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errorHandler_1.AppError('无效的认证token', 401);
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errorHandler_1.AppError('认证token已过期', 401);
        }
        throw error;
    }
});
const authorize = (...roles) => {
    return (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            throw new errorHandler_1.AppError('用户未认证', 401);
        }
        if (!roles.includes(req.user.role)) {
            throw new errorHandler_1.AppError('权限不足', 403);
        }
        next();
    });
};
exports.authorize = authorize;
// Middleware to check if user can access work order
exports.checkWorkOrderAccess = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('用户未认证', 401);
    }
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    // Admins and supervisors have access to all work orders
    if (['ADMIN', 'SUPERVISOR'].includes(userRole)) {
        next();
        return;
    }
    // For other roles, check if they created or are assigned to the work order
    const workOrder = await prisma.workOrder.findUnique({
        where: { id },
        select: {
            createdById: true,
            assignedToId: true,
        },
    });
    if (!workOrder) {
        throw new errorHandler_1.AppError('工单不存在', 404);
    }
    const hasAccess = workOrder.createdById === userId ||
        workOrder.assignedToId === userId;
    if (!hasAccess) {
        throw new errorHandler_1.AppError('无权访问此工单', 403);
    }
    next();
});
