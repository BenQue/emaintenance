"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock Prisma globally
jest.mock('@emaintenance/database', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        asset: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        workOrder: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
        },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    })),
    Priority: {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        URGENT: 'URGENT',
    },
    WorkOrderStatus: {
        PENDING: 'PENDING',
        IN_PROGRESS: 'IN_PROGRESS',
        WAITING_PARTS: 'WAITING_PARTS',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED',
    },
    UserRole: {
        EMPLOYEE: 'EMPLOYEE',
        TECHNICIAN: 'TECHNICIAN',
        SUPERVISOR: 'SUPERVISOR',
        ADMIN: 'ADMIN',
    },
}));
// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
