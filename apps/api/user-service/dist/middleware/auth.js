"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTechnician = exports.requireSupervisor = exports.requireAdmin = exports.authorize = exports.authenticate = void 0;
const database_1 = require("@emaintenance/database");
const jwt_1 = require("../utils/jwt");
const AuthService_1 = require("../services/AuthService");
// Singleton AuthService instance to avoid creating new instances on every request
const authService = new AuthService_1.AuthService();
/**
 * JWT Authentication middleware
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
            const user = await authService.getUserById(payload.userId);
            if (!user || !user.isActive) {
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
            next();
        }
        catch (tokenError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('Authentication error:', error);
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
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date().toISOString(),
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                timestamp: new Date().toISOString(),
            });
        }
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
