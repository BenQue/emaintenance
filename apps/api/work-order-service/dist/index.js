"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const workOrders_1 = __importDefault(require("./routes/workOrders"));
const assignmentRules_1 = __importDefault(require("./routes/assignmentRules"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const errorHandler_1 = require("./utils/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve static files for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'work-order-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API Routes
app.use('/api/work-orders', workOrders_1.default);
app.use('/api/assignment-rules', assignmentRules_1.default);
app.use('/api/notifications', notifications_1.default);
// 404 handler
app.all('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
    });
});
// Global error handler
app.use(errorHandler_1.globalErrorHandler);
app.listen(PORT, () => {
    console.log(`Work order service running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
