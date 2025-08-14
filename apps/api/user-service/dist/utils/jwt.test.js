"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("./jwt");
const database_1 = require("@emaintenance/database");
describe('JWT Utils', () => {
    const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        role: database_1.UserRole.EMPLOYEE,
    };
    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const token = (0, jwt_1.generateToken)(mockPayload);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });
        it('should generate different tokens for same payload', () => {
            const token1 = (0, jwt_1.generateToken)(mockPayload);
            const token2 = (0, jwt_1.generateToken)(mockPayload);
            expect(token1).not.toBe(token2); // Different iat timestamps
        });
    });
    describe('verifyToken', () => {
        it('should verify and decode a valid token', () => {
            const token = (0, jwt_1.generateToken)(mockPayload);
            const decoded = (0, jwt_1.verifyToken)(token);
            expect(decoded.userId).toBe(mockPayload.userId);
            expect(decoded.email).toBe(mockPayload.email);
            expect(decoded.username).toBe(mockPayload.username);
            expect(decoded.role).toBe(mockPayload.role);
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();
        });
        it('should reject invalid token', () => {
            expect(() => {
                (0, jwt_1.verifyToken)('invalid.token.here');
            }).toThrow('Invalid or expired token');
        });
        it('should reject malformed token', () => {
            expect(() => {
                (0, jwt_1.verifyToken)('not-a-jwt-token');
            }).toThrow('Invalid or expired token');
        });
    });
    describe('getExpirationTime', () => {
        beforeEach(() => {
            // Reset environment variable
            delete process.env.JWT_EXPIRES_IN;
        });
        it('should return default expiration time', () => {
            const expTime = (0, jwt_1.getExpirationTime)();
            expect(expTime).toBe(86400); // 24h in seconds
        });
        it('should parse hours correctly', () => {
            process.env.JWT_EXPIRES_IN = '2h';
            const expTime = (0, jwt_1.getExpirationTime)();
            expect(expTime).toBe(7200); // 2 hours in seconds
        });
        it('should parse days correctly', () => {
            process.env.JWT_EXPIRES_IN = '7d';
            const expTime = (0, jwt_1.getExpirationTime)();
            expect(expTime).toBe(604800); // 7 days in seconds
        });
        it('should parse minutes correctly', () => {
            process.env.JWT_EXPIRES_IN = '30m';
            const expTime = (0, jwt_1.getExpirationTime)();
            expect(expTime).toBe(1800); // 30 minutes in seconds
        });
    });
});
