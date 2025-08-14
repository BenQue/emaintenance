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
/**
 * Verify and decode a JWT token
 */
export declare function verifyToken(token: string): JWTPayload;
//# sourceMappingURL=jwt.d.ts.map