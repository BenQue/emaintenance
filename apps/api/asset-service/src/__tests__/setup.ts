import { PrismaClient } from '@emaintenance/database';

// Mock Prisma client for tests
jest.mock('@emaintenance/database', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    asset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    workOrder: {
      count: jest.fn(),
    },
    maintenanceHistory: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
  UserRole: {
    EMPLOYEE: 'EMPLOYEE',
    TECHNICIAN: 'TECHNICIAN',
    SUPERVISOR: 'SUPERVISOR',
    ADMIN: 'ADMIN',
  },
}));

// Mock logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock QR code generator
jest.mock('../utils/qr-generator', () => ({
  generateAssetQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mocked-qr-code'),
  generateAssetQRCodeBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked-buffer')),
}));

// Mock JWT utilities
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'error'; // Minimize log output during tests

// Simple test to satisfy Jest requirement
describe('Test Setup', () => {
  it('should configure test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});