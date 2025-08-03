"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const database_1 = require("@emaintanance/database");
const workOrders_1 = __importDefault(require("../routes/workOrders"));
// Mock Prisma
jest.mock('@emaintanance/database');
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/work-orders', workOrders_1.default);
// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            id: 'user-1',
            email: 'test@example.com',
            role: 'EMPLOYEE',
            firstName: 'Test',
            lastName: 'User',
        };
        next();
    },
    authorize: () => (req, res, next) => next(),
    checkWorkOrderAccess: (req, res, next) => next(),
}));
// Mock upload middleware
jest.mock('../middleware/upload', () => ({
    uploadSingle: (req, res, next) => next(),
    getFileUrl: (filename) => `http://localhost:3002/uploads/${filename}`,
    getFilenameFromUrl: (url) => url.split('/').pop(),
    deleteFile: jest.fn(() => true),
}));
describe('WorkOrderController', () => {
    let mockPrisma;
    beforeEach(() => {
        mockPrisma = new database_1.PrismaClient();
        jest.clearAllMocks();
    });
    describe('POST /api/work-orders', () => {
        it('should create a work order successfully', async () => {
            const mockWorkOrder = {
                id: 'wo-1',
                title: 'Test Work Order',
                description: 'Test Description',
                category: '电气设备',
                reason: '设备故障',
                priority: 'MEDIUM',
                status: 'PENDING',
                assetId: 'asset-1',
                createdById: 'user-1',
                attachments: [],
                reportedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                asset: {
                    id: 'asset-1',
                    assetCode: 'TEST001',
                    name: 'Test Asset',
                    location: 'Test Location',
                },
                createdBy: {
                    id: 'user-1',
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@example.com',
                },
                assignedTo: null,
            };
            // Mock asset lookup
            mockPrisma.asset.findUnique.mockResolvedValue({
                id: 'asset-1',
                isActive: true,
                location: 'Test Location',
            });
            // Mock work order creation
            mockPrisma.workOrder.create.mockResolvedValue(mockWorkOrder);
            const workOrderData = {
                title: 'Test Work Order',
                description: 'Test Description',
                category: '电气设备',
                reason: '设备故障',
                priority: 'MEDIUM',
                assetId: 'asset-1',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/work-orders')
                .send(workOrderData)
                .expect(201);
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('工单创建成功');
            expect(response.body.data.workOrder.title).toBe('Test Work Order');
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/work-orders')
                .send({})
                .expect(400);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('输入验证失败');
        });
    });
    describe('GET /api/work-orders/:id', () => {
        it('should get work order by id', async () => {
            const mockWorkOrder = {
                id: 'wo-1',
                title: 'Test Work Order',
                asset: { id: 'asset-1', assetCode: 'TEST001', name: 'Test Asset', location: 'Test Location' },
                createdBy: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
                assignedTo: null,
            };
            mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
            const response = await (0, supertest_1.default)(app)
                .get('/api/work-orders/wo-1')
                .expect(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.workOrder.id).toBe('wo-1');
        });
        it('should return 404 for non-existent work order', async () => {
            mockPrisma.workOrder.findUnique.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app)
                .get('/api/work-orders/non-existent')
                .expect(404);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('工单不存在');
        });
    });
    describe('GET /api/work-orders', () => {
        it('should get paginated work orders', async () => {
            const mockResult = {
                workOrders: [
                    {
                        id: 'wo-1',
                        title: 'Work Order 1',
                        asset: { id: 'asset-1', assetCode: 'TEST001', name: 'Test Asset', location: 'Test Location' },
                        createdBy: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
                    },
                ],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
            mockPrisma.workOrder.findMany.mockResolvedValue(mockResult.workOrders);
            mockPrisma.workOrder.count.mockResolvedValue(1);
            const response = await (0, supertest_1.default)(app)
                .get('/api/work-orders')
                .expect(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.workOrders).toHaveLength(1);
        });
    });
    describe('PUT /api/work-orders/:id', () => {
        it('should update work order', async () => {
            const mockWorkOrder = {
                id: 'wo-1',
                title: 'Updated Work Order',
                createdById: 'user-1',
                assignedToId: null,
            };
            mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
            mockPrisma.workOrder.update.mockResolvedValue(mockWorkOrder);
            const updateData = {
                title: 'Updated Work Order',
                description: 'Updated Description',
            };
            const response = await (0, supertest_1.default)(app)
                .put('/api/work-orders/wo-1')
                .send(updateData)
                .expect(200);
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('工单更新成功');
        });
    });
});
