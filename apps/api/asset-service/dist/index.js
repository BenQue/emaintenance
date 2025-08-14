"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("@emaintenance/database");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3003;
const prisma = new database_1.PrismaClient();
// Global middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Trust proxy if behind load balancer
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
// API routes
app.use('/api', routes_1.default);
// Global error handler
app.use((err, req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `asset-${Date.now()}`;
    logger_1.default.error('Unhandled application error', {
        correlationId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack,
        }),
    });
});
// 404 handler
app.use('*', (req, res) => {
    logger_1.default.warn('Route not found', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });
    res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date().toISOString(),
    });
});
// Graceful shutdown
process.on('SIGINT', async () => {
    logger_1.default.info('Shutting down Asset Service...');
    try {
        await prisma.$disconnect();
        logger_1.default.info('Database connection closed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
    }
});
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully...');
    try {
        await prisma.$disconnect();
        logger_1.default.info('Database connection closed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
    }
});
// Start server
app.listen(PORT, () => {
    logger_1.default.info('Asset service started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
    });
});
