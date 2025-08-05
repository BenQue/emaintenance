"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitLogger = exports.errorLogger = exports.requestLogger = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    // Add correlation ID to request headers for other middleware
    req.headers['x-correlation-id'] = correlationId;
    // Log incoming request
    logger_1.default.info('Incoming request', {
        correlationId,
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    });
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function (body) {
        const duration = Date.now() - startTime;
        // Log response details
        logger_1.default.info('Request completed', {
            correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            success: res.statusCode < 400
        });
        // Log error responses with more detail
        if (res.statusCode >= 400) {
            logger_1.default.warn('Request failed', {
                correlationId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                responseBody: body,
                timestamp: new Date().toISOString()
            });
        }
        return originalJson.call(this, body);
    };
    next();
};
exports.requestLogger = requestLogger;
/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    logger_1.default.error('Unhandled error in request', {
        correlationId,
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
    // Send error response
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack
        })
    });
};
exports.errorLogger = errorLogger;
/**
 * Rate limiting logging middleware
 */
const rateLimitLogger = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    // This would be called when rate limit is exceeded
    logger_1.default.warn('Rate limit exceeded', {
        correlationId,
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    });
    next();
};
exports.rateLimitLogger = rateLimitLogger;
