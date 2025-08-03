// Global test setup
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db?schema=public';

// Mock console.error to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
};