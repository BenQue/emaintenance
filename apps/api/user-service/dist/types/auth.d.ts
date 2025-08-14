import { UserRole } from '@emaintenance/database';
export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    employeeId?: string;
    role?: UserRole;
}
export interface LoginRequest {
    identifier: string;
    password: string;
}
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        employeeId?: string;
    };
    token: string;
    expiresIn: number;
}
export interface JWTPayload {
    userId: string;
    email: string;
    username: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
//# sourceMappingURL=auth.d.ts.map