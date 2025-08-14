import { generateToken, verifyToken, getExpirationTime } from './jwt';
import { UserRole } from '@emaintenance/database';

describe('JWT Utils', () => {
  const mockPayload = {
    userId: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    role: UserRole.EMPLOYEE,
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for same payload', () => {
      const token1 = generateToken(mockPayload);
      const token2 = generateToken(mockPayload);
      
      expect(token1).not.toBe(token2); // Different iat timestamps
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should reject invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow('Invalid or expired token');
    });

    it('should reject malformed token', () => {
      expect(() => {
        verifyToken('not-a-jwt-token');
      }).toThrow('Invalid or expired token');
    });
  });

  describe('getExpirationTime', () => {
    beforeEach(() => {
      // Reset environment variable
      delete process.env.JWT_EXPIRES_IN;
    });

    it('should return default expiration time', () => {
      const expTime = getExpirationTime();
      expect(expTime).toBe(86400); // 24h in seconds
    });

    it('should parse hours correctly', () => {
      process.env.JWT_EXPIRES_IN = '2h';
      const expTime = getExpirationTime();
      expect(expTime).toBe(7200); // 2 hours in seconds
    });

    it('should parse days correctly', () => {
      process.env.JWT_EXPIRES_IN = '7d';
      const expTime = getExpirationTime();
      expect(expTime).toBe(604800); // 7 days in seconds
    });

    it('should parse minutes correctly', () => {
      process.env.JWT_EXPIRES_IN = '30m';
      const expTime = getExpirationTime();
      expect(expTime).toBe(1800); // 30 minutes in seconds
    });
  });
});