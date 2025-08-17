"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
class BaseService {
    app;
    config;
    server;
    constructor(config) {
        this.app = (0, express_1.default)();
        this.config = {
            version: '1.0.0',
            corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            ...config,
        };
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)());
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: this.config.corsOrigin,
            credentials: true,
        }));
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });
    }
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: this.config.serviceName,
                version: this.config.version,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            });
        });
        // Let subclasses define their routes
        this.defineRoutes();
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                path: req.originalUrl,
                service: this.config.serviceName,
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupErrorHandling() {
        this.app.use((err, req, res, _next) => {
            console.error(`[${new Date().toISOString()}] Error in ${this.config.serviceName}:`, err.message);
            res.status(500).json({
                error: 'Internal Server Error',
                service: this.config.serviceName,
                timestamp: new Date().toISOString(),
            });
        });
    }
    start() {
        this.server = this.app.listen(this.config.port, () => {
            console.log(`[${new Date().toISOString()}] ${this.config.serviceName} running on port ${this.config.port}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log(`SIGTERM received, shutting down ${this.config.serviceName} gracefully`);
            this.server?.close(() => {
                console.log(`${this.config.serviceName} terminated`);
            });
        });
    }
}
exports.BaseService = BaseService;
