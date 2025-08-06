"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Import the app setup logic separately for testing
const createApp = () => {
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json());
    // Health check
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
    app.get('/api/users', (req, res) => {
        res.json({
            message: 'User service running',
            service: 'user-service',
            timestamp: new Date().toISOString(),
        });
    });
    return app;
};
describe('User Service', () => {
    let app;
    beforeEach(() => {
        app = createApp();
    });
    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/health')
                .expect(200);
            expect(response.body).toMatchObject({
                status: 'ok',
                service: 'user-service',
                version: '1.0.0',
            });
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.uptime).toBeDefined();
        });
    });
    describe('GET /api/users', () => {
        it('should return users endpoint message', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/users')
                .expect(200);
            expect(response.body).toMatchObject({
                message: 'User service running',
                service: 'user-service',
            });
            expect(response.body.timestamp).toBeDefined();
        });
    });
    describe('404 handling', () => {
        it('should return 404 for non-existent routes', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/nonexistent')
                .expect(404);
            expect(response.body.error).toBe('Not Found');
        });
    });
});
