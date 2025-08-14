import jwt from 'jsonwebtoken';
import { UserRole } from '@emaintenance/database';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return 'dev-secret-key-change-in-production';
})();

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}