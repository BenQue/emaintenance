"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const assets_1 = __importDefault(require("../routes/assets"));
const auth_1 = __importDefault(require("../routes/auth"));
const database_1 = require("@emaintenance/database");
const rateLimiter_1 = require("../middleware/rateLimiter");
// Mock the database
jest.mock('@emaintenance/database', () => {
    const mockUsers = [];
    const mockAssets = [];
    let assetIdCounter = 1;
    let userIdCounter = 1;
    return {
        prisma: {
            user: {
                create: jest.fn().mockImplementation((data) => {
                    const user = {
                        id: `user_${userIdCounter++}`,
                        ...data.data,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    mockUsers.push(user);
                    return Promise.resolve(user);
                }),
                findUnique: jest.fn().mockImplementation(({ where }) => {
                    const user = mockUsers.find((u) => {
                        if (where.email)
                            return u.email === where.email;
                        if (where.username)
                            return u.username === where.username;
                        if (where.id)
                            return u.id === where.id;
                        if (where.employeeId)
                            return u.employeeId === where.employeeId;
                        return false;
                    });
                    return Promise.resolve(user || null);
                }),
                findFirst: jest.fn().mockImplementation(({ where }) => {
                    const user = mockUsers.find((u) => {
                        if (where.OR) {
                            return where.OR.some((condition) => {
                                return (condition.email && u.email === condition.email) ||
                                    (condition.username && u.username === condition.username);
                            });
                        }
                        return false;
                    });
                    return Promise.resolve(user || null);
                }),
            },
            asset: {
                create: jest.fn().mockImplementation((data) => {
                    const asset = {
                        id: `asset_${assetIdCounter++}`,
                        ...data.data,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        owner: null,
                        administrator: null,
                        workOrders: [],
                    };
                    mockAssets.push(asset);
                    return Promise.resolve(asset);
                }),
                findUnique: jest.fn().mockImplementation(({ where }) => {
                    const asset = mockAssets.find((a) => {
                        if (where.id)
                            return a.id === where.id;
                        if (where.assetCode)
                            return a.assetCode === where.assetCode;
                        return false;
                    });
                    return Promise.resolve(asset || null);
                }),
                findMany: jest.fn().mockImplementation(({ where, skip = 0, take = 20 }) => {
                    let filteredAssets = [...mockAssets];
                    if (where) {
                        if (where.location?.contains) {
                            filteredAssets = filteredAssets.filter(a => a.location.toLowerCase().includes(where.location.contains.toLowerCase()));
                        }
                        if (where.isActive !== undefined) {
                            filteredAssets = filteredAssets.filter(a => a.isActive === where.isActive);
                        }
                        if (where.ownerId) {
                            filteredAssets = filteredAssets.filter(a => a.ownerId === where.ownerId);
                        }
                        if (where.administratorId) {
                            filteredAssets = filteredAssets.filter(a => a.administratorId === where.administratorId);
                        }
                    }
                    const paginatedAssets = filteredAssets.slice(skip, skip + take);
                    return Promise.resolve(paginatedAssets);
                }),
                findFirst: jest.fn().mockImplementation(({ where }) => {
                    const asset = mockAssets.find((a) => {
                        if (where.assetCode && where.id?.not) {
                            return a.assetCode === where.assetCode && a.id !== where.id.not;
                        }
                        if (where.assetCode) {
                            return a.assetCode === where.assetCode;
                        }
                        return false;
                    });
                    return Promise.resolve(asset ? { id: asset.id } : null);
                }),
                update: jest.fn().mockImplementation(({ where, data }) => {
                    const assetIndex = mockAssets.findIndex(a => a.id === where.id);
                    if (assetIndex === -1)
                        return Promise.resolve(null);
                    mockAssets[assetIndex] = {
                        ...mockAssets[assetIndex],
                        ...data,
                        updatedAt: new Date(),
                    };
                    return Promise.resolve(mockAssets[assetIndex]);
                }),
                count: jest.fn().mockImplementation(({ where }) => {
                    let filteredAssets = [...mockAssets];
                    if (where) {
                        if (where.location?.contains) {
                            filteredAssets = filteredAssets.filter(a => a.location.toLowerCase().includes(where.location.contains.toLowerCase()));
                        }
                        if (where.isActive !== undefined) {
                            filteredAssets = filteredAssets.filter(a => a.isActive === where.isActive);
                        }
                    }
                    return Promise.resolve(filteredAssets.length);
                }),
            },
            $transaction: jest.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    asset: {
                        create: jest.fn().mockImplementation((data) => {
                            const asset = {
                                id: `asset_${assetIdCounter++}`,
                                ...data.data,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                owner: null,
                                administrator: null,
                                workOrders: [],
                            };
                            mockAssets.push(asset);
                            return Promise.resolve(asset);
                        }),
                    },
                };
                return callback(mockTx);
            }),
        },
        UserRole: {
            EMPLOYEE: 'EMPLOYEE',
            TECHNICIAN: 'TECHNICIAN',
            SUPERVISOR: 'SUPERVISOR',
            ADMIN: 'ADMIN',
        },
    };
});
// Mock JWT utilities
jest.mock('../utils/jwt', () => ({
    generateToken: jest.fn(() => 'mock-jwt-token'),
    verifyToken: jest.fn(() => ({
        userId: 'user_1',
        role: 'SUPERVISOR',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    })),
    getExpirationTime: jest.fn(() => 3600),
}));
// Mock crypto utilities
jest.mock('../utils/crypto', () => ({
    hashPassword: jest.fn(() => Promise.resolve('hashed-password')),
    verifyPassword: jest.fn(() => Promise.resolve(true)),
}));
describe('Asset Management Integration Tests', () => {
    let app;
    let supervisorToken;
    beforeAll(async () => {
        app = (0, express_1.default)();
        app.use((0, helmet_1.default)());
        app.use(rateLimiter_1.generalRateLimit);
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        app.use('/api/auth', auth_1.default);
        app.use('/api/assets', assets_1.default);
        // Create and login a supervisor user for testing
        await (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({
            email: 'supervisor@test.com',
            username: 'supervisor',
            password: 'password123',
            firstName: 'Super',
            lastName: 'Visor',
            role: database_1.UserRole.SUPERVISOR,
        });
        const loginResponse = await (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({
            identifier: 'supervisor@test.com',
            password: 'password123',
        });
        supervisorToken = loginResponse.body.data.token;
    });
    beforeEach(() => {
        // Clear assets before each test
        const { prisma } = require('@emaintenance/database');
        const mockAssets = [];
        jest.clearAllMocks();
    });
    describe('POST /api/assets', () => {
        it('should create a new asset', async () => {
            const assetData = {
                assetCode: 'AC001',
                name: 'Test Asset',
                description: 'A test asset',
                location: 'Building A',
                model: 'Model X',
                manufacturer: 'ACME Corp',
                serialNumber: 'SN001',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(assetData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                assetCode: 'AC001',
                name: 'Test Asset',
                description: 'A test asset',
                location: 'Building A',
                model: 'Model X',
                manufacturer: 'ACME Corp',
                serialNumber: 'SN001',
                isActive: true,
            });
        });
        it('should require authentication', async () => {
            const assetData = {
                assetCode: 'AC002',
                name: 'Test Asset 2',
                location: 'Building B',
            };
            await (0, supertest_1.default)(app)
                .post('/api/assets')
                .send(assetData)
                .expect(401);
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                name: 'Test Asset',
                // Missing assetCode and location
            })
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Validation failed');
        });
    });
    describe('GET /api/assets', () => {
        beforeEach(async () => {
            // Create some test assets
            await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'AC100',
                name: 'Asset 1',
                location: 'Building A',
            });
            await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'AC101',
                name: 'Asset 2',
                location: 'Building B',
            });
        });
        it('should list assets with pagination', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.assets).toBeInstanceOf(Array);
            expect(response.body.data.pagination).toMatchObject({
                currentPage: 1,
                limit: 20,
            });
        });
        it('should filter by location', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/assets?location=Building A')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.assets).toBeInstanceOf(Array);
        });
        it('should support pagination parameters', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/assets?page=1&limit=10')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
            expect(response.body.data.pagination.limit).toBe(10);
        });
    });
    describe('GET /api/assets/:id', () => {
        let assetId;
        beforeEach(async () => {
            const createResponse = await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'AC200',
                name: 'Single Asset',
                location: 'Building C',
            });
            assetId = createResponse.body.data.id;
        });
        it('should get asset by ID', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/assets/${assetId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(assetId);
            expect(response.body.data.assetCode).toBe('AC200');
        });
        it('should return 404 for non-existent asset', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/assets/nonexistent')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(404);
        });
    });
    describe('PUT /api/assets/:id', () => {
        let assetId;
        beforeEach(async () => {
            const createResponse = await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'AC300',
                name: 'Update Asset',
                location: 'Building D',
            });
            assetId = createResponse.body.data.id;
        });
        it('should update asset', async () => {
            const updateData = {
                name: 'Updated Asset Name',
                description: 'Updated description',
            };
            const response = await (0, supertest_1.default)(app)
                .put(`/api/assets/${assetId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('Updated Asset Name');
            expect(response.body.data.description).toBe('Updated description');
        });
        it('should return 404 for non-existent asset', async () => {
            await (0, supertest_1.default)(app)
                .put('/api/assets/nonexistent')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ name: 'Updated' })
                .expect(404);
        });
    });
    describe('DELETE /api/assets/:id', () => {
        let assetId;
        beforeEach(async () => {
            const createResponse = await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'AC400',
                name: 'Delete Asset',
                location: 'Building E',
            });
            assetId = createResponse.body.data.id;
        });
        it('should soft delete asset', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/assets/${assetId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe('Asset deleted successfully');
            expect(response.body.data.asset.isActive).toBe(false);
        });
    });
    describe('POST /api/assets/bulk', () => {
        it('should bulk create assets', async () => {
            const bulkData = {
                assets: [
                    {
                        assetCode: 'BULK001',
                        name: 'Bulk Asset 1',
                        location: 'Warehouse A',
                    },
                    {
                        assetCode: 'BULK002',
                        name: 'Bulk Asset 2',
                        location: 'Warehouse B',
                    },
                ],
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/assets/bulk')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(bulkData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.created).toHaveLength(2);
            expect(response.body.data.summary.successfullyCreated).toBe(2);
            expect(response.body.data.summary.errors).toBe(0);
        });
        it('should validate bulk data', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/assets/bulk')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assets: [], // Empty array
            })
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Validation failed');
        });
    });
    describe('GET /api/assets/stats', () => {
        beforeEach(async () => {
            // Create some test assets for stats
            await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'STAT001',
                name: 'Stats Asset 1',
                location: 'Location A',
            });
            await (0, supertest_1.default)(app)
                .post('/api/assets')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                assetCode: 'STAT002',
                name: 'Stats Asset 2',
                location: 'Location B',
            });
        });
        it('should get asset statistics', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/assets/stats')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                total: expect.any(Number),
                active: expect.any(Number),
                inactive: expect.any(Number),
                byLocation: expect.any(Object),
            });
        });
    });
    describe('Authorization', () => {
        beforeAll(async () => {
            // Create an employee user (should not have access)
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'employee@test.com',
                username: 'employee',
                password: 'password123',
                firstName: 'Test',
                lastName: 'Employee',
                role: database_1.UserRole.EMPLOYEE,
            });
        });
        it('should deny access to employees', async () => {
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: 'employee@test.com',
                password: 'password123',
            });
            const employeeToken = loginResponse.body.data.token;
            await (0, supertest_1.default)(app)
                .get('/api/assets')
                .set('Authorization', `Bearer ${employeeToken}`)
                .expect(403);
        });
    });
});
