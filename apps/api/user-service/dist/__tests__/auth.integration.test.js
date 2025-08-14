"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = __importDefault(require("../routes/auth"));
const database_1 = require("@emaintenance/database");
// Mock the database
jest.mock('@emaintenance/database', () => {
    const mockUsers = [];
    return {
        prisma: {
            user: {
                create: jest.fn().mockImplementation((data) => {
                    const user = {
                        id: `user_${Date.now()}`,
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
            },
        },
        UserRole: {
            EMPLOYEE: 'EMPLOYEE',
            TECHNICIAN: 'TECHNICIAN',
            SUPERVISOR: 'SUPERVISOR',
            ADMIN: 'ADMIN',
        },
    };
});
describe('Auth Integration Tests', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use((0, helmet_1.default)());
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        app.use('/api/auth', auth_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/auth/register', () => {
        const validUserData = {
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            employeeId: 'EMP001',
        };
        it('should register a new user successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.user.email).toBe(validUserData.email);
            expect(response.body.data.user.username).toBe(validUserData.username);
            expect(response.body.data.user.firstName).toBe(validUserData.firstName);
            expect(response.body.data.user.lastName).toBe(validUserData.lastName);
            expect(response.body.data.user.role).toBe(database_1.UserRole.EMPLOYEE);
            expect(response.body.data.user.employeeId).toBe(validUserData.employeeId);
            expect(response.body.data.expiresIn).toBeDefined();
            expect(response.body.timestamp).toBeDefined();
        });
        it('should return validation error for invalid data', async () => {
            const invalidData = {
                email: 'invalid-email',
                username: 'ab', // too short
                password: '123', // too short
                firstName: '',
                lastName: '',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Validation failed');
        });
        it('should return error for duplicate email', async () => {
            // First registration
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(201);
            // Second registration with same email
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                ...validUserData,
                username: 'differentuser',
                employeeId: 'EMP002',
            })
                .expect(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Email already exists');
        });
        it('should return error for duplicate username', async () => {
            // First registration
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(201);
            // Second registration with same username
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                ...validUserData,
                email: 'different@example.com',
                employeeId: 'EMP002',
            })
                .expect(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Username already exists');
        });
        it('should register user with different role', async () => {
            const technicianData = {
                ...validUserData,
                email: 'tech@example.com',
                username: 'technician',
                employeeId: 'TECH001',
                role: database_1.UserRole.TECHNICIAN,
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(technicianData)
                .expect(201);
            expect(response.body.data.user.role).toBe(database_1.UserRole.TECHNICIAN);
        });
    });
    describe('POST /api/auth/login', () => {
        const userData = {
            email: 'login@example.com',
            username: 'loginuser',
            password: 'password123',
            firstName: 'Login',
            lastName: 'User',
        };
        beforeEach(async () => {
            // Register a user for login tests
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(userData);
        });
        it('should login with email successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: userData.email,
                password: userData.password,
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.user.username).toBe(userData.username);
        });
        it('should login with username successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: userData.username,
                password: userData.password,
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.user.username).toBe(userData.username);
        });
        it('should return error for invalid credentials', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: userData.email,
                password: 'wrongpassword',
            })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });
        it('should return error for non-existent user', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: 'nonexistent@example.com',
                password: 'password123',
            })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });
        it('should return validation error for missing data', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: '',
                password: '',
            })
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Validation failed');
        });
    });
    describe('GET /api/auth/profile', () => {
        let authToken;
        const userData = {
            email: 'profile@example.com',
            username: 'profileuser',
            password: 'password123',
            firstName: 'Profile',
            lastName: 'User',
        };
        beforeEach(async () => {
            // Register and login to get token
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(userData);
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                identifier: userData.email,
                password: userData.password,
            });
            authToken = loginResponse.body.data.token;
        });
        it('should get user profile with valid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.email).toBe(userData.email);
            expect(response.body.data.username).toBe(userData.username);
            expect(response.body.data.firstName).toBe(userData.firstName);
            expect(response.body.data.lastName).toBe(userData.lastName);
            expect(response.body.data.role).toBe(database_1.UserRole.EMPLOYEE);
            expect(response.body.data.isActive).toBe(true);
            expect(response.body.data.createdAt).toBeDefined();
        });
        it('should return error without token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/profile')
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Access token required');
        });
        it('should return error with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid or expired token');
        });
        it('should return error with malformed authorization header', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/profile')
                .set('Authorization', 'NotBearer token')
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Access token required');
        });
    });
});
