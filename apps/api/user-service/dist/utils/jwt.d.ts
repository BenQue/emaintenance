import { JWTPayload } from '../types/auth';
/**
 * Generate a JWT token for a user
 */
export declare function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
/**
 * Verify and decode a JWT token
 */
export declare function verifyToken(token: string): JWTPayload;
/**
 * Get expiration time in seconds from JWT_EXPIRES_IN
 */
export declare function getExpirationTime(): number;
//# sourceMappingURL=jwt.d.ts.map