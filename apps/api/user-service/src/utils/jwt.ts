import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return 'dev-secret-key-change-in-production';
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'emaintanance-user-service',
  });
}

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

/**
 * Get expiration time in seconds from JWT_EXPIRES_IN
 */
export function getExpirationTime(): number {
  // Convert JWT_EXPIRES_IN to seconds
  const timeStr = JWT_EXPIRES_IN;
  const time = parseInt(timeStr);
  
  if (timeStr.endsWith('h')) {
    return time * 3600; // hours to seconds
  } else if (timeStr.endsWith('d')) {
    return time * 86400; // days to seconds
  } else if (timeStr.endsWith('m')) {
    return time * 60; // minutes to seconds
  }
  
  return time; // assume seconds
}