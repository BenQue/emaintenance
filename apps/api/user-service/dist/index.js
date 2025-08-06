"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3005;
// Middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
// Global error handler
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        service: 'user-service',
        timestamp: new Date().toISOString(),
    });
});
// Health check with enhanced info
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'user-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Simple test route
app.post('/api/auth/login', (req, res) => {
    res.json({ message: 'test login endpoint', success: true });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        service: 'user-service',
        timestamp: new Date().toISOString(),
    });
});
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[${new Date().toISOString()}] User service running on port ${PORT}`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
