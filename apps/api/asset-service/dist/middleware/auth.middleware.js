"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTechnician = exports.requireSupervisor = exports.requireAdmin = exports.authorize = exports.authenticate = void 0;
const database_1 = require("@emaintenance/database");
const jwt_1 = require("../utils/jwt");
const logger_1 = __importDefault(require("../utils/logger"));
// Singleton Prisma instance for user verification
const prisma = new database_1.PrismaClient();
/**
 * JWT Authentication middleware
 */
const authenticate = async (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.default.warn('Authentication failed: No Bearer token provided', {
                correlationId,
                path: req.path,
                method: req.method
            });
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                timestamp: new Date().toISOString(),
            });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const payload = (0, jwt_1.verifyToken)(token);
            // Verify user still exists and is active
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, isActive: true, role: true }
            });
            if (!user || !user.isActive) {
                logger_1.default.warn('Authentication failed: User not found or inactive', {
                    correlationId,
                    userId: payload.userId,
                    userExists: !!user,
                    isActive: user?.isActive
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token',
                    timestamp: new Date().toISOString(),
                });
            }
            // Add user to request
            req.user = {
                ...payload,
                isActive: user.isActive,
            };
            logger_1.default.debug('User authenticated successfully', {
                correlationId,
                userId: payload.userId,
                role: payload.role
            });
            next();
        }
        catch (tokenError) {
            logger_1.default.warn('Authentication failed: Invalid token', {
                correlationId,
                error: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        logger_1.default.error('Authentication middleware error', {
            correlationId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
            timestamp: new Date().toISOString(),
        });
    }
};
exports.authenticate = authenticate;
/**
 * Role-based authorization middleware
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
        if (!req.user) {
            logger_1.default.warn('Authorization failed: User not authenticated', {
                correlationId,
                path: req.path
            });
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date().toISOString(),
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.default.warn('Authorization failed: Insufficient permissions', {
                correlationId,
                userId: req.user.userId,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                path: req.path
            });
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                timestamp: new Date().toISOString(),
            });
        }
        logger_1.default.debug('User authorized successfully', {
            correlationId,
            userId: req.user.userId,
            role: req.user.role,
            path: req.path
        });
        next();
    };
};
exports.authorize = authorize;
/**
 * Middleware to require admin role
 */
exports.requireAdmin = (0, exports.authorize)([database_1.UserRole.ADMIN]);
/**
 * Middleware to require supervisor or admin role
 */
exports.requireSupervisor = (0, exports.authorize)([database_1.UserRole.SUPERVISOR, database_1.UserRole.ADMIN]);
/**
 * Middleware to require technician, supervisor, or admin role
 */
exports.requireTechnician = (0, exports.authorize)([database_1.UserRole.TECHNICIAN, database_1.UserRole.SUPERVISOR, database_1.UserRole.ADMIN]);
