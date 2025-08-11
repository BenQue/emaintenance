"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("./routes/auth"));
const assets_1 = __importDefault(require("./routes/assets"));
const users_1 = __importDefault(require("./routes/users"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use(rateLimiter_1.generalRateLimit);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
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
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/assets', assets_1.default);
app.use('/api/users', users_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        service: 'user-service',
        timestamp: new Date().toISOString(),
    });
});
const server = app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] User service running on port ${PORT}`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
